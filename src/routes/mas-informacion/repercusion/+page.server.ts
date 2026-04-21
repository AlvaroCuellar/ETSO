import { getImpactView } from '$lib/server/catalog-local';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const impactView = getImpactView();
	return {
		impactView
	};
};
