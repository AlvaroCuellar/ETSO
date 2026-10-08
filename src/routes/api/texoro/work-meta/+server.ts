import { json } from '@sveltejs/kit';
import { getTexoroWorkMeta } from '$lib/server/texoro-runtime';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const worksMeta = await getTexoroWorkMeta(url.searchParams.get('indexVersion') || undefined);

	return json(worksMeta, {
		headers: {
			'cache-control': 'public, max-age=0, must-revalidate'
		}
	});
};
