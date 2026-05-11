import { getAllWorks, getCatalogStats } from '$lib/server/catalog-runtime';
import { env as publicEnv } from '$env/dynamic/public';

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

const resolveTexoroIndexBaseUrl = (): string => {
	const publicAssetsBaseUrl = stripTrailingSlash(
		publicEnv.PUBLIC_R2_PUBLIC_ASSETS_BASE_URL || publicEnv.PUBLIC_R2_BASE_URL || ''
	);
	return stripTrailingSlash(
		publicEnv.PUBLIC_TEXORO_INDEX_BASE_URL ||
			(publicAssetsBaseUrl ? joinUrl(publicAssetsBaseUrl, 'search') : '')
	);
};

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
	const worksMeta = works.map((work) => ({
		id: work.id,
		title: work.title,
		titleVariants: work.titleVariants,
		slug: work.slug,
		genre: work.genre,
		textState: work.textState,
		shortSummary: work.shortSummary,
		traditionalAttribution: work.traditionalAttribution,
		stylometryAttribution: work.stylometryAttribution
	}));

	return {
		indexInfo,
		stats,
		worksMeta
	};
};
