import { error, redirect } from '@sveltejs/kit';
import { ambitos, type Ambito, type InformeDistanceView } from '$lib/domain/catalog';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import {
	getAllAuthors,
	getInformeBibliographyByInformeId,
	getInformeById,
	getInformeByReportSlug,
	getInformeByWorkSlug,
	getInformeDistanceRows,
	getWorkById,
	withWorkReportResults
} from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const informe = await getInformeByReportSlug(params.id);
	if (!informe) {
		const workSlugInforme = await getInformeByWorkSlug(params.id);
		if (workSlugInforme) {
			throw redirect(308, `/informes/${workSlugInforme.slug}`);
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

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		informe,
		work: await withWorkReportResults(work),
		distances,
		authors,
		bibliography
	};
};
