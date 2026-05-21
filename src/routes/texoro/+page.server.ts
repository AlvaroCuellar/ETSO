import { getAllWorks, getCatalogStats } from '$lib/server/catalog-runtime';
import { env as publicEnv } from '$env/dynamic/public';

import type { AttributionSet } from '$lib/domain/catalog';
import type { TexoroIndexManifest } from '$lib/search';
import type { PageServerLoad } from './$types';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const joinUrl = (base: string, path: string): string =>
	`${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;
const TEXORO_INDEX_INFO_CACHE_MS = 5 * 60 * 1000;
const SLOW_TEXORO_INDEX_INFO_MS = 700;

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

let cachedIndexInfo:
	| {
			baseUrl: string;
			cachedAt: number;
			value: TexoroInitialIndexInfo;
	  }
	| null = null;
let cachedIndexInfoPromise: Promise<TexoroInitialIndexInfo | null> | null = null;

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
	const now = Date.now();
	if (
		cachedIndexInfo &&
		cachedIndexInfo.baseUrl === texoroIndexBaseUrl &&
		now - cachedIndexInfo.cachedAt < TEXORO_INDEX_INFO_CACHE_MS
	) {
		return cachedIndexInfo.value;
	}
	if (cachedIndexInfoPromise) return cachedIndexInfoPromise;

	cachedIndexInfoPromise = (async () => {
		const startedAt = Date.now();
		try {
			const response = await fetch(joinUrl(texoroIndexBaseUrl, 'manifest.json'));
			if (!response.ok) return cachedIndexInfo?.baseUrl === texoroIndexBaseUrl ? cachedIndexInfo.value : null;

			const manifest = (await response.json()) as TexoroIndexManifest;
			const value = {
				stats: {
					works: manifest.stats.works,
					tokens: manifest.stats.tokens,
					vocabSize: manifest.stats.vocabSize
				},
				indexVersion: manifest.indexVersion,
				preserveEnie: manifest.normalization.preserveEnie
			};
			cachedIndexInfo = {
				baseUrl: texoroIndexBaseUrl,
				cachedAt: Date.now(),
				value
			};
			const elapsed = Date.now() - startedAt;
			if (elapsed >= SLOW_TEXORO_INDEX_INFO_MS) {
				console.warn(`[texoro] slow initial manifest load: ${elapsed}ms`);
			}
			return value;
		} catch (cause) {
			console.warn('[texoro] initial manifest load failed', cause);
			return cachedIndexInfo?.baseUrl === texoroIndexBaseUrl ? cachedIndexInfo.value : null;
		} finally {
			cachedIndexInfoPromise = null;
		}
	})();

	return cachedIndexInfoPromise;
};

export const load: PageServerLoad = async ({ fetch }) => {
	const [works, stats, indexInfo] = await Promise.all([
		getAllWorks(),
		getCatalogStats(),
		getTexoroInitialIndexInfo(fetch)
	]);
	const authorOptions = collectAuthorOptions(works);

	return {
		texoroIndexBaseUrl: resolveTexoroIndexBaseUrl(),
		indexInfo,
		stats: {
			...stats,
			authors: authorOptions.length
		},
		filterOptions: {
			authors: authorOptions,
			genres: collectStringOptions(works.map((work) => work.genre)),
			states: collectStringOptions(works.map((work) => work.textState))
		}
	};
};
