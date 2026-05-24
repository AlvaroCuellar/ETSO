import { getCollaboratorsView } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const collaboratorsView = getCollaboratorsView();
	return {
		collaboratorsView
	};
};
