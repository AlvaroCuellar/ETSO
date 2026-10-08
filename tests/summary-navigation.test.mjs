import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { buildSummaryCorrectionText } from '../src/lib/utils/summary-correction-text.ts';

// Execute the actual page effects and download formatter as Svelte reuses the page
// between two work URLs. No browser, database or correction submission is needed.
const source = await readFile(new URL('../src/routes/obras/[slug]/resumen/+page.svelte', import.meta.url), 'utf8');
const editableFormatter = source.slice(source.indexOf('\tconst buildEditableSummaryText ='), source.indexOf('\n\tconst openSummaryCorrectionForm'));
const handlers = source.slice(source.indexOf('\t$effect.pre(() => {'), source.indexOf('\tconst downloadSummary ='));
const fixture = () => {
	const compiled = ts.transpileModule(`
		let data, summary, displayWorkTitle, summaryAuthor, resumenBreveText;
		let summaryCorrectionWorkId, isSummaryCorrectionFormOpen = false;
		let summaryCorrectionText = '', hasInitializedSummaryCorrectionText = false;
		let lastSummaryCorrectionAlertMessage = '', summaryCorrectionFeedback = null;
		const summaryError = '', hasDownloadableSummary = true;
		const summaryCitationPlainText = 'Referencia académica';
		const hasPublishedOn = false, formattedPublishedOn = '';
		const before = [], after = [];
		const $effect = (fn) => after.push(fn); $effect.pre = (fn) => before.push(fn);
		const localizeLiteral = (value) => value;
		${editableFormatter}
		${handlers}
		return {
			navigate(id, title, author, text) {
				data = {work: {id}}; displayWorkTitle = title; summaryAuthor = author;
				resumenBreveText = text;
				summary = {resumenBreve:[text],resumenLargo:[text+' largo'],personajes:[],espacios:[],tematicas:[]};
				before.forEach((fn) => fn()); after.forEach((fn) => fn());
			},
			edit(text) { summaryCorrectionText = text; isSummaryCorrectionFormOpen = true; },
			state() { return {text:summaryCorrectionText, open:isSummaryCorrectionFormOpen}; },
			download: buildDownloadedSummaryText
		};
	`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
	return new Function('buildSummaryCorrectionText', compiled)(buildSummaryCorrectionText);
};

test('changing works resets an edited correction and binds download content to the new work', () => {
	const page = fixture();
	page.navigate('quijote', 'Don Quijote', 'Cervantes', 'Alonso Quijano muere.');
	page.edit('Una corrección del Quijote.');
	page.navigate('sonetos', 'Corpus de Sonetos', 'Varios', 'Colección poética.');
	assert.deepEqual(page.state(), {text:buildSummaryCorrectionText({shortSummary:'Colección poética.',resumenLargo:['Colección poética. largo'],personajes:[],espacios:[],tematicas:[]}),open:false});
	const download = page.download();
	assert.match(download, /Obra resumida: Corpus de Sonetos/);
	assert.match(download, /Atribución tradicional: Varios/);
	assert.match(download, /Colección poética\./);
	assert.doesNotMatch(download, /Quijote|Quijano|Cervantes/);
});

test('refreshing the same work preserves the user correction in progress', () => {
	const page = fixture();
	page.navigate('quijote', 'Don Quijote', 'Cervantes', 'Alonso Quijano muere.');
	page.edit('Mi propuesta aún sin enviar.');
	page.navigate('quijote', 'Don Quijote', 'Cervantes', 'Texto actualizado.');
	assert.deepEqual(page.state(), {text:'Mi propuesta aún sin enviar.',open:true});
	assert.match(page.download(), /Texto actualizado\./);
});
