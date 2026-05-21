import { error, json } from '@sveltejs/kit';
import { getServerTexoroEngine } from '$lib/server/texoro-runtime';

import type { RequestHandler } from './$types';
import type { SearchResultMatch } from '$lib/search';

const SLOW_API_LOG_MS = 700;
const PREVIEW_REQUEST_ITEM_LIMIT = 20;

const asPositiveNumber = (value: unknown, fallback: number, max: number): number => {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
	return Math.min(Math.floor(value), max);
};

const normalizeMatch = (value: unknown): SearchResultMatch | null => {
	if (!value || typeof value !== 'object') return null;
	const raw = value as Record<string, unknown>;
	const kind =
		raw.kind === 'phrase' ? 'phrase' : raw.kind === 'term' ? 'term' : raw.kind === 'proximity' ? 'proximity' : null;
	const source = typeof raw.source === 'string' ? raw.source : '';
	const occurrences =
		typeof raw.occurrences === 'number' && Number.isFinite(raw.occurrences)
			? Math.max(0, Math.floor(raw.occurrences))
			: 0;
	if (!kind || !source.trim()) return null;
	return { kind, source, occurrences };
};

export const POST: RequestHandler = async ({ request }) => {
	const startedAt = Date.now();
	const body = (await request.json().catch(() => null)) as
		| { items?: unknown; options?: Record<string, unknown> }
		| null;
	const rawItems = Array.isArray(body?.items) ? body.items.slice(0, PREVIEW_REQUEST_ITEM_LIMIT) : [];
	const items = rawItems
		.map((item) => {
			if (!item || typeof item !== 'object') return null;
			const raw = item as Record<string, unknown>;
			const docId =
				typeof raw.docId === 'number' && Number.isInteger(raw.docId) && raw.docId >= 0 ? raw.docId : null;
			const workId = typeof raw.workId === 'string' ? raw.workId.trim() : '';
			const matches = Array.isArray(raw.matches)
				? raw.matches.map(normalizeMatch).filter((match): match is SearchResultMatch => Boolean(match))
				: [];
			if (docId === null || !workId || matches.length === 0) return null;
			return { docId, workId, matches };
		})
		.filter((item): item is { docId: number; workId: string; matches: SearchResultMatch[] } => Boolean(item));

	if (items.length === 0) throw error(400, 'Parametros de previews invalidos');

	const rawOptions = body?.options ?? {};
	const options = {
		maxItemsPerDoc: asPositiveNumber(rawOptions.maxItemsPerDoc, 3, 10),
		snippetRadius: asPositiveNumber(rawOptions.snippetRadius, 115, 220)
	};

	try {
		const engine = await getServerTexoroEngine();
		const result = await engine.getPreviewsForResults(items, options);
		const elapsed = Date.now() - startedAt;
		if (elapsed >= SLOW_API_LOG_MS) {
			console.warn(`[api/texoro/previews] slow request: ${elapsed}ms`);
		}
		return json(result);
	} catch (cause) {
		console.error('[api/texoro/previews] Unable to load previews', cause);
		throw error(500, cause instanceof Error ? cause.message : 'No se pudieron cargar los fragmentos');
	}
};
