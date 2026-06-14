import { getComoCitarnosBibliography } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const bibliography = getComoCitarnosBibliography();
	return {
		bibliography
	};
};
