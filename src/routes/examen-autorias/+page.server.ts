import { getAllAuthors, getAllWorks, listGenres } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [works, authorOptions, genreOptions] = await Promise.all([
		getAllWorks(),
		getAllAuthors(),
		listGenres()
	]);

	return {
		works,
		authorOptions,
		genreOptions
	};
};
