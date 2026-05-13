import { error, redirect } from '@sveltejs/kit';
import { ambitos, type Ambito, type InformeDistanceView } from '$lib/domain/catalog';
import {
	getAllAuthors,
	getInformeBibliographyByInformeId,
	getInformeById,
	getInformeByReportSlug,
	getInformeByWorkSlug,
	getInformeDistanceRows,
	getWorkById
} from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const informe = await getInformeByReportSlug(params.id);
	if (!informe) {
		const legacyWorkSlugInforme = await getInformeByWorkSlug(params.id);
		if (legacyWorkSlugInforme) {
			throw redirect(308, `/informes/${legacyWorkSlugInforme.slug}`);
		}

		const legacyInforme = await getInformeById(params.id);
		if (legacyInforme) {
			throw redirect(308, `/informes/${legacyInforme.slug}`);
		}
		throw error(404, 'Informe no encontrado');
	}

	const work = await getWorkById(informe.workId);
	if (!work) throw error(500, 'Obra del informe no disponible');
	if (params.id !== informe.slug) throw redirect(308, `/informes/${informe.slug}`);

	const [distanceEntries, authors] = await Promise.all([
		Promise.all(ambitos.map(async (ambito) => [ambito, await getInformeDistanceRows(informe, ambito)] as const)),
		getAllAuthors()
	]);
	const distances = Object.fromEntries(distanceEntries) as Record<Ambito, InformeDistanceView[]>;
	const bibliography = getInformeBibliographyByInformeId(informe.id);

	return {
		informe,
		work,
		distances,
		authors,
		bibliography
	};
};
