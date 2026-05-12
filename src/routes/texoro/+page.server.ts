import { getAllWorks, getCatalogStats } from '$lib/server/catalog-runtime';
import { env as publicEnv } from '$env/dynamic/public';

import type { AttributionSet } from '$lib/domain/catalog';
import type { TexoroIndexManifest } from '$lib/search';
import type { PageServerLoad } from './$types';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const joinUrl = (base: string, path: string): string =>
	`${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;
const withCacheBuster = (url: string): string => {
	const separator = url.includes('?') ? '&' : '?';
	return `${url}${separator}t=${Date.now()}`;
};

interface TexoroInitialIndexInfo {
	stats: {
		works: number;
		tokens: number;
		vocabSize: number;
	};
	indexVersion: string;
	preserveEnie: boolean;
}

interface TokenOption {
	id: string;
	label: string;
}

const resolveTexoroIndexBaseUrl = (): string => {
	const publicAssetsBaseUrl = stripTrailingSlash(
		publicEnv.PUBLIC_R2_PUBLIC_ASSETS_BASE_URL || publicEnv.PUBLIC_R2_BASE_URL || ''
	);
	return stripTrailingSlash(
		publicEnv.PUBLIC_TEXORO_INDEX_BASE_URL ||
			(publicAssetsBaseUrl ? joinUrl(publicAssetsBaseUrl, 'search') : '')
	);
};

const collectAuthorOptions = (
	works: Awaited<ReturnType<typeof getAllWorks>>
): TokenOption[] => {
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

const collectStringOptions = (
	values: string[]
): TokenOption[] =>
	Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
		.sort((a, b) => a.localeCompare(b, 'es'))
		.map((value) => ({ id: value, label: value }));

const getTexoroInitialIndexInfo = async (fetch: typeof globalThis.fetch): Promise<TexoroInitialIndexInfo | null> => {
	const texoroIndexBaseUrl = resolveTexoroIndexBaseUrl();
	if (!texoroIndexBaseUrl) return null;

	try {
		const response = await fetch(withCacheBuster(joinUrl(texoroIndexBaseUrl, 'manifest.json')), {
			cache: 'no-store'
		});
		if (!response.ok) return null;

		const manifest = (await response.json()) as TexoroIndexManifest;
		return {
			stats: {
				works: manifest.stats.works,
				tokens: manifest.stats.tokens,
				vocabSize: manifest.stats.vocabSize
			},
			indexVersion: manifest.indexVersion,
			preserveEnie: manifest.normalization.preserveEnie
		};
	} catch {
		return null;
	}
};

export const load: PageServerLoad = async ({ fetch }) => {
	const [works, stats, indexInfo] = await Promise.all([
		getAllWorks(),
		getCatalogStats(),
		getTexoroInitialIndexInfo(fetch)
	]);

	return {
		indexInfo,
		stats,
		filterOptions: {
			authors: collectAuthorOptions(works),
			genres: collectStringOptions(works.map((work) => work.genre)),
			states: collectStringOptions(works.map((work) => work.textState))
		}
	};
};
