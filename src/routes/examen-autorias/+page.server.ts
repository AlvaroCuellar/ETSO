import { getSelectedExamenFilterOptions } from '$lib/server/catalog-runtime';
import { EXAMEN_PAGE_SIZE, parseExamenFilters, parseExamenPage } from '$lib/server/examen-query';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const filters = parseExamenFilters(url.searchParams);
	const requestedPage = parseExamenPage(url.searchParams);
	const filterOptions = await getSelectedExamenFilterOptions(filters);

	return {
		authorOptions: filterOptions.authors,
		genreOptions: filterOptions.genres,
		stateOptions: filterOptions.states,
		filters,
		page: requestedPage,
		pageSize: EXAMEN_PAGE_SIZE
	};
};
