import { error, isHttpError, json } from '@sveltejs/kit';
import { executeTexoroSearchRequest } from '$lib/server/texoro-search-api';

import type { RequestHandler } from './$types';

const SLOW_API_LOG_MS = 700;

export const POST: RequestHandler = async ({ request }) => {
	const startedAt = Date.now();
	try {
		const result = await executeTexoroSearchRequest(request);
		const elapsed = Date.now() - startedAt;
		if (elapsed >= SLOW_API_LOG_MS) console.warn(`[api/texoro/search-ui] slow request: ${elapsed}ms`);
		return json(result);
	} catch (cause) {
		if (isHttpError(cause)) throw cause;
		console.error('[api/texoro/search-ui] Unable to search', cause);
		throw error(500, cause instanceof Error ? cause.message : 'Error ejecutando la busqueda');
	}
};
