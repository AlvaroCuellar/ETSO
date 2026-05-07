import { error, json } from '@sveltejs/kit';
import { getServerTexoroEngine } from '$lib/server/texoro-runtime';

import type { RequestHandler } from './$types';
import type { SearchResultMatch } from '$lib/search';

const asPositiveNumber = (value: unknown, fallback: number, max: number): number => {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
	return Math.min(Math.floor(value), max);
};

const normalizeSnippetMode = (value: unknown): 'chars' | 'lines' =>
	value === 'lines' ? 'lines' : 'chars';

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
	return {
		kind,
		source,
		occurrences
	};
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as
		| {
				docId?: unknown;
				workId?: unknown;
				match?: unknown;
				options?: Record<string, unknown>;
		  }
		| null;
	const docId =
		typeof body?.docId === 'number' && Number.isInteger(body.docId) && body.docId >= 0 ? body.docId : null;
	const workId = typeof body?.workId === 'string' ? body.workId.trim() : '';
	const match = normalizeMatch(body?.match);
	if (docId === null || !workId || !match) {
		throw error(400, 'Parametros de concurrencias invalidos');
	}

	const rawOptions = body?.options ?? {};
	const options = {
		maxItems: asPositiveNumber(rawOptions.maxItems, 300, 500),
		snippetRadius: asPositiveNumber(rawOptions.snippetRadius, 115, 220),
		snippetMode: normalizeSnippetMode(rawOptions.snippetMode),
		lineContext: asPositiveNumber(rawOptions.lineContext, 3, 10)
	};

	try {
		const engine = await getServerTexoroEngine();
		return json(await engine.getOccurrencesForMatch({ docId, workId }, match, options));
	} catch (cause) {
		console.error('[api/texoro/occurrences] Unable to load occurrences', cause);
		throw error(500, cause instanceof Error ? cause.message : 'No se pudieron cargar las concurrencias');
	}
};
