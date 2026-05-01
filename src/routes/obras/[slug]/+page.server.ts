import { error } from '@sveltejs/kit';
import { getInformeByWorkId, getWorkBySlug } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const work = await getWorkBySlug(params.slug);
	if (!work) throw error(404, 'Obra no encontrada');

	return {
		work,
		informe: await getInformeByWorkId(work.id)
	};
};
