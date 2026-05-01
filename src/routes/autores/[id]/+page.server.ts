import { error } from '@sveltejs/kit';
import { getAuthorById, getAuthorMetrics, getAuthorWorks } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const author = await getAuthorById(params.id);
	if (!author) throw error(404, 'Autor no encontrado');

	const [works, metrics] = await Promise.all([getAuthorWorks(author.id), getAuthorMetrics(author.id)]);

	return {
		author,
		works,
		metrics
	};
};
