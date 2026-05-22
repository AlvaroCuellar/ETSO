import { error } from '@sveltejs/kit';
import { getImpactView } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	error(404, 'Not found');

	const impactView = getImpactView();
	return {
		impactView
	};
};
