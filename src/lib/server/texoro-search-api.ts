import { error } from '@sveltejs/kit';
import { searchTexoro } from '$lib/server/texoro-runtime';

import type { SearchOptions } from '$lib/search';

const asPositiveNumber = (value: unknown, fallback: number, max: number): number => {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
	return Math.min(Math.floor(value), max);
};

const normalizeStringList = (value: unknown, max = 5_000): string[] =>
	Array.isArray(value)
		? Array.from(
				new Set(value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))
			).slice(0, max)
		: [];

const normalizeMatchMode = (value: unknown): 'or' | 'and' => (value === 'and' ? 'and' : 'or');

export const executeTexoroSearchRequest = async (request: Request) => {
	const body = (await request.json().catch(() => null)) as
		| { query?: unknown; structuredQuery?: unknown; structuredClauses?: unknown; options?: Record<string, unknown> }
		| null;
	const query = typeof body?.query === 'string' ? body.query : '';
	if (!query.trim()) throw error(400, 'Consulta vacia');

	const rawOptions = body?.options ?? {};
	const options: SearchOptions = {
		limit: asPositiveNumber(rawOptions.limit, 35, 100),
		maxPhraseVerificationDocs: asPositiveNumber(rawOptions.maxPhraseVerificationDocs, 220, 500),
		snippetRadius: asPositiveNumber(rawOptions.snippetRadius, 115, 220),
		includeSnippets: false,
		workIds: normalizeStringList(rawOptions.workIds),
		genres: normalizeStringList(rawOptions.genres),
		states: normalizeStringList(rawOptions.states),
		traditionalAuthorIds: normalizeStringList(rawOptions.traditionalAuthorIds),
		traditionalMatch: normalizeMatchMode(rawOptions.traditionalMatch),
		stylometryAuthorIds: normalizeStringList(rawOptions.stylometryAuthorIds),
		stylometryMatch: normalizeMatchMode(rawOptions.stylometryMatch),
		structuredQuery:
			body?.structuredQuery && typeof body.structuredQuery === 'object'
				? (body.structuredQuery as SearchOptions['structuredQuery'])
				: undefined,
		structuredClauses: Array.isArray(body?.structuredClauses)
			? (body.structuredClauses as SearchOptions['structuredClauses'])
			: undefined
	};

	return searchTexoro(query, options);
};
