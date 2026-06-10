import { json } from '@sveltejs/kit';
import { getTexoroOptions } from '$lib/server/texoro-runtime';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const options = await getTexoroOptions();

	return json(options, {
		headers: {
			'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
		}
	});
};
