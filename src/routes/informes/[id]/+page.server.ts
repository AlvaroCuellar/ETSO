import { error } from '@sveltejs/kit';
import { ambitos, type Ambito, type InformeDistanceView } from '$lib/domain/catalog';
import {
	getInformeBibliographyByInformeId,
	getInformeById,
	getInformeDistanceRows,
	getWorkById
} from '$lib/server/catalog-local';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const informe = getInformeById(params.id);
	if (!informe) throw error(404, 'Informe no encontrado');

	const work = getWorkById(informe.workId);
	if (!work) throw error(500, 'Obra del informe no disponible');

	const distances = ambitos.reduce(
		(acc, ambito) => {
			acc[ambito] = getInformeDistanceRows(informe, ambito);
			return acc;
		},
		{} as Record<Ambito, InformeDistanceView[]>
	);
	const bibliography = getInformeBibliographyByInformeId(informe.id);

	return {
		informe,
		work,
		distances,
		bibliography
	};
};
