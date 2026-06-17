import { createHash } from 'node:crypto';
import { getWorkNetworkGraph } from '$lib/server/catalog-runtime';

import type { RequestHandler } from './$types';

const CACHE_CONTROL = 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=31536000';
const CDN_CACHE_CONTROL = 'public, max-age=31536000, stale-while-revalidate=31536000';

interface CachedGraphResponse {
	body: string;
	etag: string;
	headers: HeadersInit;
}

let cachedGraphResponse: Promise<CachedGraphResponse> | null = null;

const buildCachedGraphResponse = async (): Promise<CachedGraphResponse> => {
	const body = JSON.stringify(await getWorkNetworkGraph(3));
	const etag = `"${createHash('sha256').update(body).digest('base64url')}"`;
	const headers = {
		'content-type': 'application/json',
		'cache-control': CACHE_CONTROL,
		'cdn-cache-control': CDN_CACHE_CONTROL,
		'vercel-cdn-cache-control': CDN_CACHE_CONTROL,
		etag,
		'x-content-type-options': 'nosniff'
	};
	return { body, etag, headers };
};

const getCachedGraphResponse = async (): Promise<CachedGraphResponse> => {
	if (cachedGraphResponse) return cachedGraphResponse;
	cachedGraphResponse = buildCachedGraphResponse().catch((cause) => {
		cachedGraphResponse = null;
		throw cause;
	});
	return cachedGraphResponse;
};

export const GET: RequestHandler = async ({ request }) => {
	const cached = await getCachedGraphResponse();
	if (request.headers.get('if-none-match') === cached.etag) {
		return new Response(null, {
			status: 304,
			headers: cached.headers
		});
	}

	return new Response(cached.body, {
		headers: cached.headers
	});
};
