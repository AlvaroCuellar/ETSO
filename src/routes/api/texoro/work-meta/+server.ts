import { json } from '@sveltejs/kit';
import { getTexoroWorkMeta } from '$lib/server/texoro-runtime';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const worksMeta = await getTexoroWorkMeta();

	return json(worksMeta, {
		headers: {
			'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
		}
	});
};
