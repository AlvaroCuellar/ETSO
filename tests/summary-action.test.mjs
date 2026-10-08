import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { buildSummaryCorrectionText } from '../src/lib/utils/summary-correction-text.ts';

// Exercise the actual route with a mocked asset and email boundary. No message is sent.
const source = await readFile(new URL('../src/routes/obras/[slug]/resumen/+page.server.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace(/^import\b[\s\S]*?;\n/gm, '').replace(/export const /g, 'const '), {
	compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }
}).outputText;

const fixture = (result) => {
	let submitted;
	const dependencies = {
		error: (status, message) => { throw new Error(`${status}: ${message}`); },
		fail: (status, data) => ({status, data}),
		redirect: () => { throw new Error('Unexpected redirect'); },
		setPublicCatalogCacheHeaders: (setHeaders) => setHeaders({'cache-control':'public'}),
		localizePath: (value) => value,
		getWorkByPublicId: async () => undefined,
		getWorkBySlug: async () => ({id:'quijote',slug:'quijote',title:'Don Quijote',shortSummary:'Sin resumen breve disponible.'}),
		getPublicSummaryAssetUrl: (value) => `/public/${value}`,
		submitCorrectionEmail: async (value) => { submitted = value; return {emailDelivered:true}; },
		buildSummaryCorrectionText,
		loadSummaryDocument: async () => result
	};
	const route = new Function(...Object.keys(dependencies), `${compiled}\nreturn {load, action: actions.default};`)(...Object.values(dependencies));
	return {route, submitted: () => submitted};
};

test('correction original includes the actual brief summary shown in SSR', async () => {
	const summary = {resumenBreve:['Alonso Quijano recobra el juicio.', 'Muere en su aldea.'],resumenLargo:['Desenlace completo.'],personajes:[],espacios:[],tematicas:[]};
	const {route, submitted} = fixture({document:summary,unavailable:false});
	const result = await route.action({request:{formData:async () => new FormData()},params:{slug:'quijote'},url:new URL('https://etso.es/obras/quijote/resumen'),getClientAddress:() => '127.0.0.1',fetch});
	assert.equal(result.summaryCorrectionProposal.ok, true);
	assert.match(submitted().originalText, /Alonso Quijano recobra el juicio\. Muere en su aldea\./);
	assert.doesNotMatch(submitted().originalText, /Sin resumen breve disponible/);
	assert.match(submitted().originalText, /Desenlace completo/);
});

test('missing or unavailable assets prevent correction submission and empty-page CDN caching', async () => {
	for (const unavailable of [false, true]) {
		const {route, submitted} = fixture({document:null,unavailable});
		const failure = await route.action({params:{slug:'quijote'},fetch});
		assert.equal(failure.status, unavailable ? 503 : 404);
		assert.equal(submitted(), undefined);
		let headers;
		const data = await route.load({locals:{locale:'es'},params:{slug:'quijote'},fetch,setHeaders:(value) => {headers=value;}});
		assert.equal(headers['cache-control'], 'no-store');
		assert.equal(data.summaryUnavailable, unavailable);
	}
});
