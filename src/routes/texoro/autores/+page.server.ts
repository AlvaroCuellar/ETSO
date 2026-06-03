import { getAllAuthors, getAllWorks } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [works, authors] = await Promise.all([getAllWorks(), getAllAuthors()]);
	const worksByTraditionalAuthorId = new Map<
		string,
		Array<{ slug: string; title: string; titleVariants: string[]; genre: string }>
	>();

	for (const work of works) {
		if (work.traditionalAttribution.unresolved) continue;
		for (const group of work.traditionalAttribution.groups) {
			for (const member of group.members) {
				const authorId = member.authorId.trim();
				if (!authorId) continue;

				const authorWorks = worksByTraditionalAuthorId.get(authorId) ?? [];
				authorWorks.push({
					slug: work.slug,
					title: work.title,
					titleVariants: work.titleVariants,
					genre: work.genre
				});
				worksByTraditionalAuthorId.set(authorId, authorWorks);
			}
		}
	}

	return {
		authors: authors
			.filter((author) => worksByTraditionalAuthorId.has(author.id))
			.map((author) => ({
				id: author.id,
				name: author.name,
				nameVariants: author.nameVariants,
				works: (worksByTraditionalAuthorId.get(author.id) ?? []).sort((a, b) => {
					const titleComparison = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
					if (titleComparison !== 0) return titleComparison;
					return a.slug.localeCompare(b.slug, 'es', { sensitivity: 'base' });
				})
			}))
			.sort((a, b) => {
				const nameComparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
				if (nameComparison !== 0) return nameComparison;
				return a.id.localeCompare(b.id, 'es', { sensitivity: 'base' });
			})
	};
};
