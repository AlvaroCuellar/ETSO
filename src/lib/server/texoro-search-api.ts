import { error } from '@sveltejs/kit';
import { searchTexoro } from '$lib/server/texoro-runtime';

import type { SearchOptions } from '$lib/search';

const MAX_UI_SEARCH_TERMS = 10;

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

const isObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isOptionalArrayOf = (value: unknown, matches: (item: unknown) => boolean): boolean =>
	value == null || (Array.isArray(value) && value.every(matches));

const isQueryValue = (value: unknown): boolean => isObject(value) && isString(value.value);

const readStructuredQuery = (value: unknown): SearchOptions['structuredQuery'] => {
	if (value == null) return undefined;
	if (
		!isObject(value) ||
		!isString(value.main) ||
		!isOptionalArrayOf(value.additionalTerms, isString) ||
		!isOptionalArrayOf(value.proximityTerms, isQueryValue)
	) {
		throw error(400, 'Consulta estructurada no válida');
	}
	return value as unknown as SearchOptions['structuredQuery'];
};

const readStructuredClauses = (value: unknown): SearchOptions['structuredClauses'] => {
	if (value == null) return undefined;
	if (!Array.isArray(value) || !value.every(isQueryValue)) {
		throw error(400, 'Condiciones de búsqueda no válidas');
	}
	return value;
};

export const executeTexoroSearchRequest = async (request: Request, { fromUi = false } = {}) => {
	const body = (await request.json().catch(() => null)) as
		| { query?: unknown; structuredQuery?: unknown; structuredClauses?: unknown; options?: Record<string, unknown> }
		| null;
	const query = typeof body?.query === 'string' ? body.query : '';
	if (!query.trim()) throw error(400, 'Consulta vacia');
	const structuredQuery = readStructuredQuery(body?.structuredQuery);
	const structuredClauses = structuredQuery ? undefined : readStructuredClauses(body?.structuredClauses);
	if (fromUi) {
		const termCount = structuredQuery
			? 1 + (structuredQuery.additionalTerms?.length ?? 0) + (structuredQuery.proximityTerms?.length ?? 0)
			: (structuredClauses?.length ?? 0);
		if (termCount > MAX_UI_SEARCH_TERMS) {
			throw error(400, `La consulta admite un máximo de ${MAX_UI_SEARCH_TERMS} términos en total.`);
		}
	}

	const rawOptions = body?.options ?? {};
	const options: SearchOptions = {
		limit: asPositiveNumber(rawOptions.limit, 35, 100),
		maxPhraseVerificationDocs: asPositiveNumber(rawOptions.maxPhraseVerificationDocs, 220, 500),
		snippetRadius: asPositiveNumber(rawOptions.snippetRadius, 115, 220),
		includeSnippets: false,
		workIds: normalizeStringList(rawOptions.workIds),
		genres: normalizeStringList(rawOptions.genres),
		generalGenres: normalizeStringList(rawOptions.generalGenres),
		states: normalizeStringList(rawOptions.states),
		traditionalAuthorIds: normalizeStringList(rawOptions.traditionalAuthorIds),
		traditionalMatch: normalizeMatchMode(rawOptions.traditionalMatch),
		stylometryAuthorIds: normalizeStringList(rawOptions.stylometryAuthorIds),
		stylometryMatch: normalizeMatchMode(rawOptions.stylometryMatch),
		structuredQuery,
		structuredClauses
	};

	return searchTexoro(query, options);
};
