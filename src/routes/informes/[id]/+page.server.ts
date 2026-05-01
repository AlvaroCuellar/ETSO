import { error } from '@sveltejs/kit';
import { ambitos, type Ambito, type InformeDistanceView } from '$lib/domain/catalog';
import {
	getInformeBibliographyByInformeId,
	getInformeById,
	getInformeDistanceRows,
	getWorkById
} from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const informe = await getInformeById(params.id);
	if (!informe) throw error(404, 'Informe no encontrado');

	const work = await getWorkById(informe.workId);
	if (!work) throw error(500, 'Obra del informe no disponible');

	const distanceEntries = await Promise.all(
		ambitos.map(async (ambito) => [ambito, await getInformeDistanceRows(informe, ambito)] as const)
	);
	const distances = Object.fromEntries(distanceEntries) as Record<Ambito, InformeDistanceView[]>;
	const bibliography = getInformeBibliographyByInformeId(informe.id);

	return {
		informe,
		work,
		distances,
		bibliography
	};
};
