import { json } from '@sveltejs/kit';
import { getAllWorks } from '$lib/server/catalog-runtime';
import { toTexoroWorkMeta } from '$lib/server/texoro-runtime';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const worksMeta = (await getAllWorks()).map(toTexoroWorkMeta);

	return json(worksMeta, {
		headers: {
			'cache-control': 'public, max-age=300'
		}
	});
};
