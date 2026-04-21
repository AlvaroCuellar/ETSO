import { getAllAuthors } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	dramaturgos: getAllAuthors()
		.map((author) => ({
			id: author.id,
			name: author.name,
			nameVariants: author.nameVariants
		}))
		.sort((a, b) => {
			const nameComparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
			if (nameComparison !== 0) return nameComparison;
			return a.id.localeCompare(b.id, 'es', { sensitivity: 'base' });
		})
});
