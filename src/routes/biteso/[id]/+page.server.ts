import { error, redirect } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import {
	buildBitesoCitation,
	getBitesoBySlug,
	getBitesoWorkBySlug,
	getWorkById
} from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const biteso = await getBitesoBySlug(params.id);
	if (!biteso) {
		const bitesoWork = await getBitesoWorkBySlug(params.id);
		if (bitesoWork) {
			throw error(
				500,
				`Texto BITESO no disponible en R2 para ${bitesoWork.id}. Revisa R2_TEXT_PREFIX y la clave ${bitesoWork.id}.txt.`
			);
		}

		const legacyWork = await getWorkById(params.id);
		const bitesoLink = legacyWork?.textLinks.find((link) => link.kind === 'biteso');
		if (bitesoLink) {
			throw redirect(308, bitesoLink.href);
		}
		throw error(404, 'Texto BITESO no encontrado');
	}

	const work = await getWorkById(biteso.workId);
	if (!work) throw error(500, 'Obra vinculada no disponible');
	if (params.id !== biteso.id) throw redirect(308, `/biteso/${biteso.id}`);

	const canonicalUrl = `https://etso.es/biteso/${biteso.id}`;
	const citation = buildBitesoCitation({
		bitesoNombre: biteso.bitesoNombre,
		title: work.title,
		canonicalUrl
	});

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		biteso,
		work,
		citation,
		canonicalUrl
	};
};
