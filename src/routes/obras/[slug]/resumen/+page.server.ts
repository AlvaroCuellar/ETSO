import { error } from '@sveltejs/kit';
import { getWorkBySlug, getWorkSummaryDetailById } from '$lib/server/catalog-local';
import type { WorkSummaryDetail } from '$lib/domain/catalog';

import type { PageServerLoad } from './$types';

const emptySummaryDetail: WorkSummaryDetail = {
	resumenLargo: [],
	personajes: [],
	espacios: [],
	tematicas: []
};

export const load: PageServerLoad = ({ params }) => {
	const work = getWorkBySlug(params.slug);
	if (!work) throw error(404, 'Obra no encontrada');

	return {
		work,
		summary: getWorkSummaryDetailById(work.id) ?? emptySummaryDetail
	};
};
