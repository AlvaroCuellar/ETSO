import { env as publicEnv } from '$env/dynamic/public';
import { json } from '@sveltejs/kit';
import { getAllWorks } from '$lib/server/catalog-runtime';

import type { AttributionSet } from '$lib/domain/catalog';
import type { TexoroIndexManifest } from '$lib/search';
import type { RequestHandler } from './$types';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const joinUrl = (base: string, path: string): string =>
	`${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;

const resolveTexoroIndexBaseUrl = (): string => {
	const publicAssetsBaseUrl = stripTrailingSlash(
		publicEnv.PUBLIC_R2_PUBLIC_ASSETS_BASE_URL || publicEnv.PUBLIC_R2_BASE_URL || ''
	);
	return stripTrailingSlash(
		publicEnv.PUBLIC_TEXORO_INDEX_BASE_URL ||
			(publicAssetsBaseUrl ? joinUrl(publicAssetsBaseUrl, 'search') : '')
	);
};

const fetchIndexManifest = async (fetch: typeof globalThis.fetch): Promise<TexoroIndexManifest | null> => {
	const baseUrl = resolveTexoroIndexBaseUrl();
	if (!baseUrl) return null;
	const response = await fetch(joinUrl(baseUrl, 'manifest.json'));
	if (!response.ok) return null;
	return (await response.json()) as TexoroIndexManifest;
};

const countAttributedAuthors = (works: Awaited<ReturnType<typeof getAllWorks>>): number => {
	const ids = new Set<string>();
	for (const work of works) {
		for (const set of [work.traditionalAttribution, work.stylometryAttribution] satisfies AttributionSet[]) {
			if (set.unresolved) continue;
			for (const group of set.groups) {
				for (const member of group.members) {
					const id = member.authorId?.trim();
					if (id) ids.add(id);
				}
			}
		}
	}
	return ids.size;
};

export const GET: RequestHandler = async ({ fetch }) => {
	const [works, manifest] = await Promise.all([getAllWorks(), fetchIndexManifest(fetch)]);

	return json(
		{
			works: manifest?.stats.works ?? works.length,
			authors: countAttributedAuthors(works),
			tokens: manifest?.stats.tokens ?? 0,
			vocabSize: manifest?.stats.vocabSize ?? 0,
			indexVersion: manifest?.indexVersion ?? 'n/d',
			preserveEnie: manifest?.normalization.preserveEnie ?? true
		},
		{
			headers: {
				'cache-control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=1800'
			}
		}
	);
};
