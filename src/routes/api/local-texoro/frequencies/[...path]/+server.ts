import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { readLocalTexoroFrequencyJson } from '$lib/server/texoro-frequency-index';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!dev || env.LOCAL_CATALOG_ONLY !== 'true') throw error(404, 'No disponible');
	const directory = env.LOCAL_TEXORO_INDEX_PATH?.trim();
	if (!directory) throw error(500, 'Falta el índice local de TEXORO');

	const body = await readLocalTexoroFrequencyJson(directory, params.path);
	if (body === null) throw error(404, 'No disponible');
	return new Response(body, {
		headers: {
			'content-type': 'application/json',
			'cache-control': 'no-store',
			'x-content-type-options': 'nosniff'
		}
	});
};
