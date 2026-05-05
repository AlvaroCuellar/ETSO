import { error, json } from '@sveltejs/kit';
import { searchTexoro } from '$lib/server/texoro-runtime';

import type { RequestHandler } from './$types';
import type { SearchOptions } from '$lib/search';

const asPositiveNumber = (value: unknown, fallback: number, max: number): number => {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
	return Math.min(Math.floor(value), max);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as
		| { query?: unknown; structuredClauses?: unknown; options?: Record<string, unknown> }
		| null;
	const query = typeof body?.query === 'string' ? body.query : '';
	if (!query.trim()) {
		throw error(400, 'Consulta vacia');
	}

	const rawOptions = body?.options ?? {};
	const options: SearchOptions = {
		limit: asPositiveNumber(rawOptions.limit, 35, 100),
		maxPhraseVerificationDocs: asPositiveNumber(rawOptions.maxPhraseVerificationDocs, 220, 500),
		snippetRadius: asPositiveNumber(rawOptions.snippetRadius, 115, 220),
		includeSnippets: rawOptions.includeSnippets === true,
		structuredClauses: Array.isArray(body?.structuredClauses)
			? (body.structuredClauses as SearchOptions['structuredClauses'])
			: undefined
	};

	try {
		return json(await searchTexoro(query, options));
	} catch (cause) {
		console.error('[api/texoro/search] Unable to search', cause);
		throw error(500, cause instanceof Error ? cause.message : 'Error ejecutando la busqueda');
	}
};
