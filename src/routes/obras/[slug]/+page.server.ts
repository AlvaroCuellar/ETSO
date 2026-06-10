import { error } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { getInformeByWorkId, getWorkBySlug, withWorkShortSummary } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const work = await getWorkBySlug(params.slug);
	if (!work) throw error(404, 'Obra no encontrada');

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		work: await withWorkShortSummary(work),
		informe: await getInformeByWorkId(work.id)
	};
};
