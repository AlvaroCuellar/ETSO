import { getComoCitarnosBibliography } from '$lib/server/catalog-local';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const bibliography = getComoCitarnosBibliography();
	return {
		bibliography
	};
};
