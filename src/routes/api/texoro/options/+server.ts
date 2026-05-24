import { json } from '@sveltejs/kit';
import { getAllWorks } from '$lib/server/catalog-runtime';
import { buildWorkTitleSearchText, formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';

import type { AttributionSet } from '$lib/domain/catalog';
import type { RequestHandler } from './$types';

interface TokenOption {
	id: string;
	label: string;
	searchText?: string;
}

const collectAuthorOptions = (works: Awaited<ReturnType<typeof getAllWorks>>): TokenOption[] => {
	const byId = new Map<string, string>();
	for (const work of works) {
		for (const set of [work.traditionalAttribution, work.stylometryAttribution] satisfies AttributionSet[]) {
			if (set.unresolved) continue;
			for (const group of set.groups) {
				for (const member of group.members) {
					const id = member.authorId?.trim();
					const name = member.authorName?.trim();
					if (!id || !name || byId.has(id)) continue;
					byId.set(id, name);
				}
			}
		}
	}
	return Array.from(byId.entries())
		.map(([id, label]) => ({ id, label }))
		.sort((a, b) => a.label.localeCompare(b.label, 'es'));
};

const collectStringOptions = (values: string[]): TokenOption[] =>
	Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
		.sort((a, b) => a.localeCompare(b, 'es'))
		.map((value) => ({ id: value, label: value }));

const collectTitleOptions = (works: Awaited<ReturnType<typeof getAllWorks>>): TokenOption[] =>
	works
		.map((work) => ({
			id: work.id,
			label: formatDisplayWorkTitle(work.title),
			searchText: buildWorkTitleSearchText(work.title, work.titleVariants)
		}))
		.sort((a, b) => a.label.localeCompare(b.label, 'es'));

export const GET: RequestHandler = async () => {
	const works = await getAllWorks();

	return json(
		{
			titles: collectTitleOptions(works),
			authors: collectAuthorOptions(works),
			genres: collectStringOptions(works.map((work) => work.genre)),
			states: collectStringOptions(works.map((work) => work.textState))
		},
		{
			headers: {
				'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600'
			}
		}
	);
};
