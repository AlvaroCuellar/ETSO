import { getAllWorks } from '$lib/server/catalog-local';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	works: getAllWorks()
		.map((work) => ({
			slug: work.slug,
			title: work.title,
			titleVariants: work.titleVariants
		}))
		.sort((a, b) => {
			const titleComparison = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			if (titleComparison !== 0) return titleComparison;
			return a.slug.localeCompare(b.slug, 'es', { sensitivity: 'base' });
		})
});
