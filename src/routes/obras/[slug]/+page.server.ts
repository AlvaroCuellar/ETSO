import { error, redirect } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { localizePath } from '$lib/i18n';
import {
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
		// The work snapshot already tells us whether a public report exists and
		// contains its canonical slug. Loading the complete report here used to
		// query all of its distance rows just to decide whether to render a link.
		// On a crawler burst across many uncached work pages, that multiplied the
		// Turso load and could turn the whole route into 5xx responses.
		informe: work.reportSlug ? { slug: work.reportSlug } : undefined
	};
};
