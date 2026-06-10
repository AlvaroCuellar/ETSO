import { json } from '@sveltejs/kit';
import { getExamenCatalogStats } from '$lib/server/catalog-runtime';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const stats = await getExamenCatalogStats();

	return json(stats, {
		headers: {
			'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
		}
	});
};
