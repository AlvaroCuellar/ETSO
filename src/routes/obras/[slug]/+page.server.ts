import { error, redirect } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { localizePath } from '$lib/i18n';
import {
	getInformeByWorkId,
	getWorkByPublicId,
	getWorkBySlug,
	withWorkShortSummary
} from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	const work = await getWorkBySlug(params.slug);
	if (!work) {
		const publicId = /^\d+$/.test(params.slug) ? Number.parseInt(params.slug, 10) : null;
		const publicIdWork = publicId === null ? undefined : await getWorkByPublicId(publicId);
		if (publicIdWork) {
			throw redirect(308, localizePath(`/obras/${publicIdWork.slug}`, locals.locale));
		}
		throw error(404, 'Obra no encontrada');
	}

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		work: await withWorkShortSummary(work),
		informe: await getInformeByWorkId(work.id)
	};
};
