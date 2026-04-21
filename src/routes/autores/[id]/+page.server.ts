import { error } from '@sveltejs/kit';
import { getAuthorById, getAuthorMetrics, getAuthorWorks } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const author = getAuthorById(params.id);
	if (!author) throw error(404, 'Autor no encontrado');

	return {
		author,
		works: getAuthorWorks(author.id),
		metrics: getAuthorMetrics(author.id)
	};
};
