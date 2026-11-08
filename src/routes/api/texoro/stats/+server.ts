import { json } from '@sveltejs/kit';
import { getTexoroStats } from '$lib/server/texoro-runtime';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const stats = await getTexoroStats();

	return json(stats, {
		headers: {
			'cache-control': 'public, max-age=0, must-revalidate'
		}
	});
};
