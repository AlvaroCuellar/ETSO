import { error } from '@sveltejs/kit';
import { buildBicuveCitation, getBicuveById, getWorkById } from '$lib/server/catalog-local';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const bicuve = getBicuveById(params.id);
	if (!bicuve) throw error(404, 'Texto BICUVE no encontrado');

	const work = getWorkById(bicuve.workId);
	if (!work) throw error(500, 'Obra vinculada no disponible');

	const canonicalUrl = `https://etso.es/bicuve/${bicuve.id}`;
	const citation = buildBicuveCitation({
		bicuveNombre: bicuve.bicuveNombre,
		title: work.title,
		canonicalUrl
	});

	return {
		bicuve,
		work,
		citation,
		canonicalUrl
	};
};
