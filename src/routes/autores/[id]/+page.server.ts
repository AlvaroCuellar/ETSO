import { error, redirect } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { localizePath } from '$lib/i18n';
import {
	getAuthorById,
	getAuthorByPublicId,
	getAuthorMetrics,
	getAuthorWorks
} from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	const author = await getAuthorById(params.id);
	if (!author) {
		const publicId = /^\d+$/.test(params.id) ? Number.parseInt(params.id, 10) : null;
		const publicIdAuthor = publicId === null ? undefined : await getAuthorByPublicId(publicId);
		if (publicIdAuthor) {
			throw redirect(308, localizePath(`/autores/${publicIdAuthor.id}`, locals.locale));
		}
		throw error(404, 'Autor no encontrado');
	}

	const [works, metrics] = await Promise.all([getAuthorWorks(author.id), getAuthorMetrics(author.id)]);

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		author,
		works,
		metrics
	};
};
