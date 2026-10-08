import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual author-page script with controlled navigation and timers.
// Derived getters model a new dependency value after a server response.
const createPage = () => {
	const source = readFileSync(new URL('../src/routes/autores/[id]/+page.svelte', import.meta.url), 'utf8')
		.match(/<script lang="ts">([\s\S]*?)<\/script>/)[1];
	const ast = ts.createSourceFile('author-page.ts', source, ts.ScriptTarget.Latest, true);
	const edits = [];
	for (const statement of ast.statements) {
		if (ts.isImportDeclaration(statement)) edits.push([statement.getStart(ast), statement.end, '']);
		if (!ts.isVariableStatement(statement)) continue;
		const declarations = statement.declarationList.declarations;
		if (declarations.length !== 1) continue;
		const declaration = declarations[0];
		const call = declaration.initializer;
		if (!call || !ts.isCallExpression(call)) continue;
		const callee = call.expression.getText(ast);
		if (!['$derived', '$derived.by'].includes(callee)) continue;
		const expression = callee.endsWith('.by') ? `(${call.arguments[0].getText(ast)})()` : call.arguments[0].getText(ast);
		const name = declaration.name.getText(ast);
		edits.push([statement.getStart(ast), statement.end, `{
			let version = -1, override;
			Object.defineProperty(globalThis, ${JSON.stringify(name)}, {
				get: () => version === __dataVersion ? override : (${expression}),
				set: value => { version = __dataVersion; override = value; }
			});
		}`]);
	}
	let script = source;
	for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0])) {
		script = script.slice(0, start) + replacement + script.slice(end);
	}
	const timers = new Map();
	const requests = [];
	let timerId = 0, before = () => {}, after = () => {};
	const initialData = {
		author: { id: 'vega_carpio_lope_de', name: 'Lope de Vega Carpio' },
		metrics: { relatedAny: 557 }, works: [], locale: 'es',
		filters: { title: '', genre: '', filter: 'related_any' }
	};
	const navigation = (path, type = 'goto') => ({ type, to: { url: new URL(path, 'http://localhost') } });
	const context = vm.createContext({
		__dataVersion: 0, URLSearchParams,
		$props: () => ({ data: initialData }), $state: value => value,
		untrack: fn => fn(), onDestroy: () => {},
		translateText: (_, value) => value, localizePath: path => path,
		beforeNavigate: fn => { before = fn; }, afterNavigate: fn => { after = fn; },
		setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
		clearTimeout: id => timers.delete(id),
		goto: path => {
			before(navigation(path));
			return new Promise(resolve => requests.push({ path, resolve }));
		}
	});
	const exposed = `
		globalThis.__test = {
			input(value) { titleFilter = value; queueTitleFilter(); },
			setData(next) { data = { ...data, ...next }; __dataVersion++; },
			get title() { return titleFilter; }, get genre() { return genreFilter; }
		};`;
	vm.runInContext(ts.transpileModule(script + exposed, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText, context);
	return {
		api: context.__test, requests,
		fireTimers() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
		commit(request, filters) {
			context.__test.setData({ filters });
			after(navigation(request.path)); request.resolve();
		},
		navigate(path, filters, type = 'link') {
			before(navigation(path, type)); context.__test.setData({ filters }); after(navigation(path, type));
		}
	};
};

test('an earlier filter response preserves newly typed text and submits the latest draft', async () => {
	const page = createPage();
	page.api.input('el'); page.fireTimers();
	assert.equal(page.requests.length, 1);
	page.api.input('el rey');
	page.commit(page.requests[0], { title: 'el', genre: '', filter: 'related_any' });
	assert.equal(page.api.title, 'el rey', 'the earlier response must not erase new keystrokes');
	page.fireTimers();
	assert.equal(new URL(page.requests[1].path, 'http://localhost').searchParams.get('title'), 'el rey');
	page.commit(page.requests[1], { title: 'el rey', genre: '', filter: 'related_any' });
	await Promise.resolve();
});

test('manual pagination cancels a pending filter timer, and history restores the URL filters', () => {
	const page = createPage();
	page.api.input('el');
	page.navigate('/autores/vega_carpio_lope_de?title=el&page=2', { title: 'el', genre: '', filter: 'related_any' });
	page.fireTimers();
	assert.equal(page.requests.length, 0, 'the cancelled timer must not return to page one');
	page.api.input('new draft');
	page.navigate('/autores/vega_carpio_lope_de?genre=Auto', { title: '', genre: 'Auto', filter: 'related_any' }, 'popstate');
	page.fireTimers();
	assert.equal(page.requests.length, 0);
	assert.equal(page.api.title, '');
	assert.equal(page.api.genre, 'Auto');
});
