import { json } from '@sveltejs/kit';
import { getWorkNetworkGraph } from '$lib/server/catalog-runtime';

export const GET = async () =>
	json(await getWorkNetworkGraph(3), {
		headers: {
			'cache-control': 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=1209600'
		}
	});
