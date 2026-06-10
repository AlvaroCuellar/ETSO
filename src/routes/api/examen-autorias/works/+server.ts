import { json } from '@sveltejs/kit';
import { getExamenWorksPage } from '$lib/server/catalog-runtime';
import { EXAMEN_PAGE_SIZE, parseExamenFilters, parseExamenPage } from '$lib/server/examen-query';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const filters = parseExamenFilters(url.searchParams);
	const requestedPage = parseExamenPage(url.searchParams);
	const pageResult = await getExamenWorksPage(filters, requestedPage, EXAMEN_PAGE_SIZE);

	return json({
		works: pageResult.works,
		page: pageResult.page,
		pageSize: EXAMEN_PAGE_SIZE,
		totalPages: pageResult.totalPages,
		totalResults: pageResult.totalResults
	}, {
		headers: {
			'cache-control': 'public, max-age=30, s-maxage=300, stale-while-revalidate=1800'
		}
	});
};
