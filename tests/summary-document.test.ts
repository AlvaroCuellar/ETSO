import assert from 'node:assert/strict';
import test from 'node:test';
import { createSummaryDocumentLoader, normalizeSummaryDocument } from '../src/lib/server/summary-document.ts';

const summary = { resumen_breve: [' Alonso Quijano muere. '], resumen_largo: ['Final de la obra.'] };

test('normalizes all summary sections and ignores malformed entries', () => {
	assert.deepEqual(normalizeSummaryDocument({
		...summary,
		resumen_breve: [' Texto ', null, 7, ''],
		personajes_principales: [{ nombre: ' Quijote ', descripcion: ' Hidalgo ' }, null, {}],
		espacios_principales: [{ nombre: ' La Mancha ' }],
		tematicas_principales: [{ tema: ' Desengaño ', descripcion: ' Final ' }]
	}), {
		resumenBreve: ['Texto'], resumenLargo: ['Final de la obra.'],
		personajes: [{ nombre: 'Quijote', descripcion: 'Hidalgo' }],
		espacios: [{ nombre: 'La Mancha', descripcion: '' }],
		tematicas: [{ tema: 'Desengaño', descripcion: 'Final' }]
	});
});

test('shares concurrent loads, bounds the cache and refreshes expired documents', async () => {
	let clock = 0;
	let calls = 0;
	const loader = createSummaryDocumentLoader({ maxEntries: 2, ttlMs: 100, now: () => clock });
	const fetcher = (async () => { calls++; return Response.json(summary); }) as typeof fetch;
	const [first, second] = await Promise.all([loader('/one', fetcher), loader('/one', fetcher)]);
	assert.deepEqual(first, second);
	assert.equal(calls, 1);
	await loader('/two', fetcher);
	await loader('/three', fetcher);
	await loader('/one', fetcher);
	assert.equal(calls, 4, 'oldest entry was evicted');
	clock = 101;
	await loader('/one', fetcher);
	assert.equal(calls, 5, 'expired entry was refreshed');
});

test('asset failures retain previously loaded content but never masquerade as a missing summary', async () => {
	let clock = 0;
	const loader = createSummaryDocumentLoader({ ttlMs: 1, now: () => clock });
	const good = (async () => Response.json(summary)) as typeof fetch;
	const failed = (async () => new Response('', { status: 503 })) as typeof fetch;
	const first = await loader('/existing', good);
	clock = 2;
	assert.deepEqual(await loader('/existing', failed), first);
	assert.deepEqual(await loader('/new', failed), { document: null, unavailable: true });
	assert.deepEqual(await loader('/missing', (async () => new Response('', { status: 404 })) as typeof fetch), {
		document: null, unavailable: false
	});
});

test('aborts slow requests and permits a later successful retry', async () => {
	const loader = createSummaryDocumentLoader({ timeoutMs: 5 });
	const stalled = ((_url, init) => new Promise<Response>((_resolve, reject) => {
		init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
	})) as typeof fetch;
	assert.deepEqual(await loader('/slow', stalled), { document: null, unavailable: true });
	assert.equal((await loader('/slow', (async () => Response.json(summary)) as typeof fetch)).unavailable, false);
});

test('bounds internal fetch adapters even when they ignore the abort signal', async () => {
	const loader = createSummaryDocumentLoader({ timeoutMs: 5 });
	const uncooperative = (() => new Promise<Response>(() => {})) as typeof fetch;
	assert.deepEqual(await loader('/internal', uncooperative), { document: null, unavailable: true });
});
