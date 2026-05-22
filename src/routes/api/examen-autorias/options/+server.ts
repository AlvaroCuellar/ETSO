import { json } from '@sveltejs/kit';
import { getExamenFilterOptions } from '$lib/server/catalog-runtime';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const options = await getExamenFilterOptions();

	return json(options, {
		headers: {
			'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600'
		}
	});
};
