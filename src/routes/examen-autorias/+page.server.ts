import { getAllAuthors, getAllWorks, listGenres } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	works: getAllWorks(),
	authorOptions: getAllAuthors(),
	genreOptions: listGenres()
});
