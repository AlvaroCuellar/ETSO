import { json } from '@sveltejs/kit';
import { getWorkNetworkGraph } from '$lib/server/catalog-runtime';

export const GET = async () => json(await getWorkNetworkGraph(3));
