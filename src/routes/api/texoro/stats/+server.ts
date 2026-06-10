import { json } from '@sveltejs/kit';
import { getTexoroStats } from '$lib/server/texoro-runtime';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	const stats = await getTexoroStats(fetch);

	return json(stats, {
		headers: {
			'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
		}
	});
};
