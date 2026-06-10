import { env as publicEnv } from '$env/dynamic/public';
import { TexoroSearchEngine, buildWorkMetaMap } from '$lib/search';
import { getAllWorks } from '$lib/server/catalog-runtime';
import { readPrivateTextByTextKey } from '$lib/server/r2-private';
import { getTexoroIndexBaseUrl } from '$lib/server/r2-public';
import { buildWorkTitleSearchText, formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';

import type { AttributionSet, CatalogWork } from '$lib/domain/catalog';
import type { SearchOptions, TexoroIndexManifest, TexoroWorkMeta } from '$lib/search';

interface TexoroTokenOption {
	id: string;
	label: string;
	searchText?: string;
}

export interface TexoroOptions {
	titles: TexoroTokenOption[];
	authors: TexoroTokenOption[];
	genres: TexoroTokenOption[];
	states: TexoroTokenOption[];
}

export interface TexoroStats {
	works: number;
	authors: number;
	tokens: number;
	vocabSize: number;
	indexVersion: string;
	preserveEnie: boolean;
}

let engine: TexoroSearchEngine | null = null;
let enginePromise: Promise<TexoroSearchEngine> | null = null;
const DEFAULT_TEXORO_GLOBAL_CACHE_MS = 10 * 60 * 1000;
const configuredTexoroGlobalCacheMs = Number.parseInt(process.env.TEXORO_GLOBAL_CACHE_MS ?? '', 10);
const TEXORO_GLOBAL_CACHE_MS =
	Number.isFinite(configuredTexoroGlobalCacheMs) && configuredTexoroGlobalCacheMs > 0
		? configuredTexoroGlobalCacheMs
		: DEFAULT_TEXORO_GLOBAL_CACHE_MS;
let cachedTexoroWorkMeta: { cachedAt: number; value: TexoroWorkMeta[] } | null = null;
let cachedTexoroOptions: { cachedAt: number; value: TexoroOptions } | null = null;
let cachedTexoroStats: { cachedAt: number; value: TexoroStats } | null = null;

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const joinUrl = (base: string, path: string): string =>
	`${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;

export const toTexoroWorkMeta = (work: CatalogWork): TexoroWorkMeta => ({
	id: work.id,
	title: work.title,
	titleVariants: work.titleVariants,
	slug: work.slug,
	genre: work.genre,
	textState: work.textState,
	shortSummary: work.shortSummary,
	traditionalAttribution: work.traditionalAttribution,
	stylometryAttribution: work.stylometryAttribution,
	textLinks: work.textLinks
});

const collectAuthorOptions = (works: CatalogWork[]): TexoroTokenOption[] => {
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

const collectStringOptions = (values: string[]): TexoroTokenOption[] =>
	Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
		.sort((a, b) => a.localeCompare(b, 'es'))
		.map((value) => ({ id: value, label: value }));

const collectTitleOptions = (works: CatalogWork[]): TexoroTokenOption[] =>
	works
		.map((work) => ({
			id: work.id,
			label: formatDisplayWorkTitle(work.title),
			searchText: buildWorkTitleSearchText(work.title, work.titleVariants)
		}))
		.sort((a, b) => a.label.localeCompare(b.label, 'es'));

const countAttributedAuthors = (works: CatalogWork[]): number => {
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

export const getTexoroWorkMeta = async (): Promise<TexoroWorkMeta[]> => {
	const now = Date.now();
	if (cachedTexoroWorkMeta && now - cachedTexoroWorkMeta.cachedAt < TEXORO_GLOBAL_CACHE_MS) {
		return cachedTexoroWorkMeta.value;
	}

	const value = (await getAllWorks()).map(toTexoroWorkMeta);
	cachedTexoroWorkMeta = { cachedAt: Date.now(), value };
	return value;
};

export const getTexoroOptions = async (): Promise<TexoroOptions> => {
	const now = Date.now();
	if (cachedTexoroOptions && now - cachedTexoroOptions.cachedAt < TEXORO_GLOBAL_CACHE_MS) {
		return cachedTexoroOptions.value;
	}

	const works = await getAllWorks();
	const value = {
		titles: collectTitleOptions(works),
		authors: collectAuthorOptions(works),
		genres: collectStringOptions(works.map((work) => work.genre)),
		states: collectStringOptions(works.map((work) => work.textState))
	};
	cachedTexoroOptions = { cachedAt: Date.now(), value };
	return value;
};

export const getTexoroStats = async (fetch: typeof globalThis.fetch): Promise<TexoroStats> => {
	const now = Date.now();
	if (cachedTexoroStats && now - cachedTexoroStats.cachedAt < TEXORO_GLOBAL_CACHE_MS) {
		return cachedTexoroStats.value;
	}

	const [works, manifest] = await Promise.all([getAllWorks(), fetchIndexManifest(fetch)]);
	const value = {
		works: manifest?.stats.works ?? works.length,
		authors: countAttributedAuthors(works),
		tokens: manifest?.stats.tokens ?? 0,
		vocabSize: manifest?.stats.vocabSize ?? 0,
		indexVersion: manifest?.indexVersion ?? 'n/d',
		preserveEnie: manifest?.normalization.preserveEnie ?? true
	};
	cachedTexoroStats = { cachedAt: Date.now(), value };
	return value;
};

export const getServerTexoroEngine = async (): Promise<TexoroSearchEngine> => {
	if (engine) return engine;
	if (!enginePromise) {
		enginePromise = (async () => {
			const created = new TexoroSearchEngine({
				indexBaseUrl: getTexoroIndexBaseUrl(),
				textLoader: readPrivateTextByTextKey,
				cacheInIndexedDb: false,
				preparedTextCacheMaxDocs: Number.parseInt(process.env.TEXORO_PREPARED_TEXT_CACHE_MAX_DOCS ?? '64', 10)
			});
			await created.initialize();
			engine = created;
			return created;
		})().catch((cause) => {
			enginePromise = null;
			throw cause;
		});
	}

	return enginePromise;
};

export const searchTexoro = async (query: string, options: SearchOptions = {}) => {
	const [searchEngine, works] = await Promise.all([getServerTexoroEngine(), getAllWorks()]);
	const workMeta = buildWorkMetaMap(works.map(toTexoroWorkMeta));
	return searchEngine.search(query, workMeta, options);
};
