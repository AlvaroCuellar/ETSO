import { error } from '@sveltejs/kit';
import { getWorkBySlug } from '$lib/server/catalog-runtime';
import { getSummariesBaseUrl } from '$lib/server/r2-public';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const work = await getWorkBySlug(params.slug);
	if (!work) throw error(404, 'Obra no encontrada');

	return {
		work,
		summaryUrl: `${getSummariesBaseUrl()}/${encodeURIComponent(work.id)}.json`,
		summaryProxyUrl: `/api/r2-public/resumenes/${encodeURIComponent(work.id)}.json`
	};
};
