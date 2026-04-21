import { error } from '@sveltejs/kit';
import { getInformeByWorkId, getWorkBySlug } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const work = getWorkBySlug(params.slug);
	if (!work) throw error(404, 'Obra no encontrada');

	return {
		work,
		informe: getInformeByWorkId(work.id)
	};
};
