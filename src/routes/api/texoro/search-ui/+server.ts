import { error, isHttpError, json } from '@sveltejs/kit';
import { executeTexoroSearchRequest } from '$lib/server/texoro-search-api';

import type { RequestHandler } from './$types';
import type { AttributionSet } from '$lib/domain/catalog';
import type { SearchResult, SearchUiExecution, SearchUiResult } from '$lib/search';

const SLOW_API_LOG_MS = 700;

const toUiAttribution = ({ groups, connector, unresolved }: AttributionSet): AttributionSet => ({
	groups: groups.map(({ members }) => ({
		members: members.map(({ authorId, authorName }) => ({ authorId, authorName }))
	})),
	connector,
	unresolved
});

const toUiResult = ({ meta, ...result }: SearchResult): SearchUiResult => ({
	...result,
	meta: meta && {
		inAuthorshipExam: meta.inAuthorshipExam,
		title: meta.title,
		slug: meta.slug,
		genre: meta.genre,
		generalGenre: meta.generalGenre,
		collectionSize: meta.collectionSize,
		textState: meta.textState,
		traditionalAttribution: toUiAttribution(meta.traditionalAttribution),
		stylometryAttribution: toUiAttribution(meta.stylometryAttribution),
		textLinks: meta.textLinks
	}
});

export const POST: RequestHandler = async ({ request }) => {
	const startedAt = Date.now();
	try {
		const result = await executeTexoroSearchRequest(request, { fromUi: true });
		const allResults = result.allResults.map(toUiResult);
		const response: SearchUiExecution = {
			...result,
			results: allResults.slice(0, result.results.length),
			allResults
		};
		const elapsed = Date.now() - startedAt;
		if (elapsed >= SLOW_API_LOG_MS) console.warn(`[api/texoro/search-ui] slow request: ${elapsed}ms`);
		return json(response);
	} catch (cause) {
		if (isHttpError(cause)) throw cause;
		console.error('[api/texoro/search-ui] Unable to search', cause);
		throw error(500, cause instanceof Error ? cause.message : 'Error ejecutando la busqueda');
	}
};
