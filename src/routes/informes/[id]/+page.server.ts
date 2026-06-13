import { error, redirect } from '@sveltejs/kit';
import { ambitos, type Ambito, type InformeDistanceView } from '$lib/domain/catalog';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { localizePath } from '$lib/i18n';
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

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	const informe = await getInformeByReportSlug(params.id);
	if (!informe) {
		const workSlugInforme = await getInformeByWorkSlug(params.id);
		if (workSlugInforme) {
			throw redirect(308, localizePath(`/informes/${workSlugInforme.slug}`, locals.locale));
		}

		const legacyInforme = await getInformeById(params.id);
		if (legacyInforme) {
			throw redirect(308, localizePath(`/informes/${legacyInforme.slug}`, locals.locale));
		}
		throw error(404, 'Informe no encontrado');
	}

	const work = await getWorkById(informe.workId);
	if (!work) throw error(500, 'Obra del informe no disponible');
	if (params.id !== informe.slug) throw redirect(308, localizePath(`/informes/${informe.slug}`, locals.locale));

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
