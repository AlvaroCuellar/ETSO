import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Exercise the actual page handlers with deferred HTTP responses, without a browser or database.
const page = await readFile(new URL('../src/routes/texoro/+page.svelte', import.meta.url), 'utf8');
const handlers = page.slice(page.indexOf('\tconst closeOccurrenceModal ='), page.indexOf('\tconst closeInfoModal ='));
const fixture = () => {
	const requests = [];
	const compiled = ts.transpileModule(`
	let indexVersion = 'v1';
	let occurrenceDetailsVersion = 0;
	let occurrenceDetailsCache = new Map();
	let occurrenceDetailsLoads = new Map();
	let occurrenceModal = null, occurrenceModalOpener = null, occurrenceLoading = false;
	let occurrenceError = '', openingOccurrenceKey = null;
	const OCCURRENCE_DETAILS_CACHE_LIMIT = 30, OCCURRENCE_MODAL_MAX_ITEMS = 100;
	${handlers}
	return {
		key: occurrenceDetailsKey, load: loadOccurrenceDetails, open: openOccurrenceModal,
		reset() { occurrenceDetailsVersion++; occurrenceDetailsCache = new Map(); occurrenceDetailsLoads = new Map(); closeOccurrenceModal(); },
		version(value) { indexVersion = value; },
		state() { return { cache: occurrenceDetailsCache, loads: occurrenceDetailsLoads, modal: occurrenceModal, opening: openingOccurrenceKey }; }
	};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
	const api = new Function('postJson', compiled)((url, payload) => new Promise((resolve, reject) => requests.push({ payload, resolve, reject })));
	return { api, requests };
};
const result = { docId: 1, workId: 'collection', publicId: 99 };
const assignment = (authors) => ({ key: 'term:amor', match: { kind: 'term', source: 'amor', occurrences: 1, poemAuthorFilter: { authorIds: authors, match: 'or' } } });

test('occurrence identity separates poets and index versions, while canonicalizing author order', () => {
	const { api } = fixture();
	assert.notEqual(api.key(result, assignment(['lope'])), api.key(result, assignment(['cervantes'])));
	assert.equal(api.key(result, assignment(['lope', 'cervantes'])), api.key(result, assignment(['cervantes', 'lope'])));
	const previous = api.key(result, assignment(['lope']));
	api.version('v2');
	assert.notEqual(api.key(result, assignment(['lope'])), previous);
});

test('old poet response cannot repopulate cache or open a modal after a new search', async () => {
	const { api, requests } = fixture();
	const old = api.open(result, assignment(['lope']), {});
	api.reset();
	const current = api.open(result, assignment(['cervantes']), {});
	requests[0].resolve({ count: 3, items: [{ snippet: 'Lope' }] });
	await old;
	assert.equal(api.state().cache.size, 0);
	assert.equal(api.state().modal, null);
	assert.equal(api.state().loads.size, 1);
	requests[1].resolve({ count: 1, items: [{ snippet: 'Cervantes' }] });
	await current;
	assert.equal(api.state().cache.size, 1);
	assert.equal(api.state().modal.details.items[0].snippet, 'Cervantes');
});

test('old same-key response cannot remove a newer pending request or supply its modal', async () => {
	const { api, requests } = fixture();
	const selected = assignment(['lope']);
	const old = api.open(result, selected, {});
	api.reset();
	const current = api.open(result, selected, {});
	requests[0].resolve({ count: 3, items: [{ snippet: 'previous search' }] });
	await old;
	assert.equal(api.state().cache.size, 0);
	assert.equal(api.state().loads.size, 1);
	assert.equal(api.state().modal, null);
	const duplicate = api.load(result, selected);
	assert.equal(requests.length, 2, 'the newer pending request remains shared');
	requests[1].resolve({ count: 1, items: [{ snippet: 'current search' }] });
	await Promise.all([current, duplicate]);
	assert.equal(api.state().modal.details.items[0].snippet, 'current search');
	assert.equal(api.state().loads.size, 0);
});
