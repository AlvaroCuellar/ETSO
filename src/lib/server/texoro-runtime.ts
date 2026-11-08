import { isPersonAuthor } from '$lib/domain/catalog';
import { TexoroSearchEngine, buildWorkMetaMap } from '$lib/search';
import { getAllWorks, refreshCatalogSnapshot } from '$lib/server/catalog-runtime';
import { clearPrivateTextCache, readPrivateTextByTextKey } from '$lib/server/r2-private';
import { readPrivateTexoroIndexJson, TexoroIndexReleaseMissingError } from '$lib/server/texoro-index-private';
import { buildWorkTitleSearchText, formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';

import type { AttributionSet, CatalogWork } from '$lib/domain/catalog';
import type { SearchExecution, SearchOptions, TexoroIndexManifest, TexoroWorkMeta } from '$lib/search';

interface TexoroTokenOption {
	id: string;
	label: string;
	searchText?: string;
}

export interface TexoroOptions {
	titles: TexoroTokenOption[];
	authors: TexoroTokenOption[];
	genres: TexoroTokenOption[];
	generalGenres: TexoroTokenOption[];
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
const ENGINE_VERSION_CHECK_MS = 60_000;
let engineVersionCheckedAt = 0;
const DEFAULT_TEXORO_GLOBAL_CACHE_MS = 10 * 60 * 1000;
const configuredTexoroGlobalCacheMs = Number.parseInt(process.env.TEXORO_GLOBAL_CACHE_MS ?? '', 10);
const TEXORO_GLOBAL_CACHE_MS =
	Number.isFinite(configuredTexoroGlobalCacheMs) && configuredTexoroGlobalCacheMs > 0
		? configuredTexoroGlobalCacheMs
		: DEFAULT_TEXORO_GLOBAL_CACHE_MS;
let cachedTexoroWorkMeta: { cachedAt: number; value: TexoroWorkMeta[] } | null = null;
let cachedTexoroOptions: { cachedAt: number; value: TexoroOptions } | null = null;
let cachedTexoroStats: { cachedAt: number; value: TexoroStats } | null = null;
let refreshedCatalogIndexVersion: string | null = null;
let catalogVersionRefreshPromise: Promise<void> | null = null;

const refreshCatalogForIndexVersion = async (indexVersion: string): Promise<void> => {
	while (catalogVersionRefreshPromise) await catalogVersionRefreshPromise;
	if (refreshedCatalogIndexVersion === indexVersion) return;
	const nextRefreshPromise = (async () => {
		await refreshCatalogSnapshot();
		cachedTexoroWorkMeta = null;
		cachedTexoroOptions = null;
		cachedTexoroStats = null;
		refreshedCatalogIndexVersion = indexVersion;
	})().finally(() => {
		if (catalogVersionRefreshPromise === nextRefreshPromise) catalogVersionRefreshPromise = null;
	});
	catalogVersionRefreshPromise = nextRefreshPromise;
	await nextRefreshPromise;
};

export const toTexoroWorkMeta = (work: CatalogWork): TexoroWorkMeta => ({
	id: work.id,
	inAuthorshipExam: work.inAuthorshipExam,
	title: work.title,
	titleVariants: work.titleVariants,
	slug: work.slug,
	genre: work.genre,
	generalGenre: work.generalGenre || 'Teatro',
	collectionSize: work.collectionSize,
	origin: work.origin,
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
		.sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base', ignorePunctuation: true }));

const countAttributedAuthors = (works: CatalogWork[]): number => {
	const ids = new Set<string>();
	for (const work of works) {
		for (const set of [work.traditionalAttribution, work.stylometryAttribution] satisfies AttributionSet[]) {
			if (set.unresolved) continue;
			for (const group of set.groups) {
				for (const member of group.members) {
					const id = member.authorId?.trim();
					if (id && isPersonAuthor(id)) ids.add(id);
				}
			}
		}
	}
	return ids.size;
};

const fetchIndexManifest = async (): Promise<TexoroIndexManifest> =>
	(await readPrivateTexoroIndexJson('manifest.json', null)) as TexoroIndexManifest;

export const getTexoroWorkMeta = async (expectedIndexVersion?: string): Promise<TexoroWorkMeta[]> => {
	if (expectedIndexVersion) {
		const manifest = await fetchIndexManifest();
		// An arbitrary caller-supplied version must never force another Turso read.
		if (manifest.indexVersion === expectedIndexVersion) {
			// Equal counts can still conceal replaced work IDs. An explicit request
			// for the verified version refreshes once, shared with server updates.
			await refreshCatalogForIndexVersion(manifest.indexVersion);
		}
	}
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
		generalGenres: collectStringOptions(works.map((work) => work.generalGenre || 'Teatro')),
		states: collectStringOptions(works.map((work) => work.textState))
	};
	cachedTexoroOptions = { cachedAt: Date.now(), value };
	return value;
};

export const getTexoroStats = async (): Promise<TexoroStats> => {
	const now = Date.now();
	if (cachedTexoroStats && now - cachedTexoroStats.cachedAt < TEXORO_GLOBAL_CACHE_MS) {
		return cachedTexoroStats.value;
	}

	const [works, manifest] = await Promise.all([getAllWorks(), fetchIndexManifest()]);
	const value = {
		works: manifest.stats.works,
		authors: countAttributedAuthors(works),
		tokens: manifest.stats.tokens,
		vocabSize: manifest.stats.vocabSize,
		indexVersion: manifest.indexVersion,
		preserveEnie: manifest.normalization.preserveEnie
	};
	cachedTexoroStats = { cachedAt: Date.now(), value };
	return value;
};

const getServerTexoroEngineOnce = async (
	missingRelease?: TexoroIndexReleaseMissingError
): Promise<TexoroSearchEngine> => {
	// An earlier version check may have started before the release was retired.
	if (missingRelease && enginePromise) await enginePromise;
	if (engine && engine.manifest?.indexVersion !== missingRelease?.indexVersion &&
		Date.now() - engineVersionCheckedAt < ENGINE_VERSION_CHECK_MS) return engine;
	if (!enginePromise) {
		enginePromise = (async () => {
			if (engine || missingRelease) {
				const manifest = await fetchIndexManifest();
				if (missingRelease && manifest.indexVersion === missingRelease.indexVersion) throw missingRelease;
				if (engine && manifest.indexVersion === engine.manifest?.indexVersion) {
					engineVersionCheckedAt = Date.now();
					return engine;
				}
			}
			const created = new TexoroSearchEngine({
				indexLoader: readPrivateTexoroIndexJson,
				textLoader: readPrivateTextByTextKey,
				cacheInIndexedDb: false,
				preparedTextCacheMaxDocs: Number.parseInt(process.env.TEXORO_PREPARED_TEXT_CACHE_MAX_DOCS ?? '64', 10)
			});
			await created.initialize();
			// Even the first engine may follow a catalogue or text cache loaded
			// before publication by another page. Adopt one coherent version.
			await refreshCatalogForIndexVersion(created.manifest!.indexVersion);
			clearPrivateTextCache();
			clearSearchResultCache();
			engine = created;
			engineVersionCheckedAt = Date.now();
			cachedTexoroStats = null;
			return created;
		})().finally(() => {
			enginePromise = null;
		});
	}

	return enginePromise;
};

const withServerTexoroEngine = async <T>(
	run: (searchEngine: TexoroSearchEngine) => T | Promise<T>
): Promise<T> => {
	try {
		return await run(await getServerTexoroEngineOnce());
	} catch (cause) {
		if (!(cause instanceof TexoroIndexReleaseMissingError)) throw cause;
		const latest = await getServerTexoroEngineOnce(cause);
		if (latest.manifest?.indexVersion === cause.indexVersion) throw cause;
		return run(latest);
	}
};

export const getServerTexoroEngine = (): Promise<TexoroSearchEngine> =>
	withServerTexoroEngine((searchEngine) => searchEngine);

const workMetaByCatalog = new WeakMap<CatalogWork[], Map<string, TexoroWorkMeta>>();

type VersionedSearchExecution = SearchExecution & { indexVersion: string; preserveEnie: boolean };

interface SearchResultCache {
	engine: TexoroSearchEngine;
	works: CatalogWork[];
	indexVersion: string;
	entries: Map<string, { value: VersionedSearchExecution; bytes: number }>;
	bytes: number;
	expiresAt: number;
	timer?: ReturnType<typeof setTimeout>;
}

const SEARCH_RESULT_CACHE_MS = 20_000;
const SEARCH_RESULT_CACHE_BYTES = 4 * 1024 * 1024;
const SEARCH_RESULT_ENTRY_BYTES = 128 * 1024;
const SEARCH_RESULT_ENTRY_ROWS = 96;
let searchResultCache: SearchResultCache | undefined;

const clearSearchResultCache = (): void => {
	if (searchResultCache?.timer) clearTimeout(searchResultCache.timer);
	searchResultCache = undefined;
};

const getSearchResultCache = (
	searchEngine: TexoroSearchEngine,
	works: CatalogWork[],
	indexVersion: string
): SearchResultCache => {
	if (searchResultCache && (
		searchResultCache.engine !== searchEngine || searchResultCache.works !== works ||
		searchResultCache.indexVersion !== indexVersion ||
		(searchResultCache.expiresAt !== 0 && searchResultCache.expiresAt <= Date.now())
	)) clearSearchResultCache();
	return searchResultCache ??= {
		engine: searchEngine, works, indexVersion, entries: new Map(), bytes: 0, expiresAt: 0
	};
};

const storeSearchResult = (cache: SearchResultCache, key: string, value: VersionedSearchExecution): void => {
	// Bypass broad results before serializing them. Concordance text is never cached here.
	if (cache !== searchResultCache || cache.entries.has(key) ||
		value.allResults.length > SEARCH_RESULT_ENTRY_ROWS || value.allResults.some((result) => result.snippet)) return;
	const bytes = Buffer.byteLength(key) + Buffer.byteLength(JSON.stringify(value));
	if (bytes > SEARCH_RESULT_ENTRY_BYTES) return;
	while (cache.bytes + bytes > SEARCH_RESULT_CACHE_BYTES) {
		const oldest = cache.entries.keys().next().value!;
		cache.bytes -= cache.entries.get(oldest)!.bytes;
		cache.entries.delete(oldest);
	}
	cache.entries.set(key, { value, bytes });
	cache.bytes += bytes;
	if (!cache.timer) {
		cache.expiresAt = Date.now() + SEARCH_RESULT_CACHE_MS;
		cache.timer = setTimeout(() => {
			if (cache === searchResultCache) clearSearchResultCache();
		}, SEARCH_RESULT_CACHE_MS).unref();
	}
};

const searchWithTexoroEngine = async (
	searchEngine: TexoroSearchEngine,
	query: string,
	options: SearchOptions
) => {
	const works = await getAllWorks();
	const manifest = searchEngine.manifest!;
	const key = options.includeSnippets === true || query.length > 2048 ? '' : JSON.stringify([query, options]);
	const cache = searchEngine === engine && key && key.length <= 8192
		? getSearchResultCache(searchEngine, works, manifest.indexVersion)
		: undefined;
	const hit = cache?.entries.get(key);
	if (cache && hit) {
		cache.entries.delete(key);
		cache.entries.set(key, hit);
		return { ...hit.value, elapsedMs: 0, positionsShardLoads: 0, textLoads: 0 };
	}

	let workMeta = workMetaByCatalog.get(works);
	if (!workMeta) {
		workMeta = buildWorkMetaMap(works.map(toTexoroWorkMeta));
		workMetaByCatalog.set(works, workMeta);
	}
	const execution = await searchEngine.search(query, workMeta, options);
	const value = {
		...execution,
		indexVersion: manifest.indexVersion,
		preserveEnie: manifest.normalization.preserveEnie
	};
	if (cache) storeSearchResult(cache, key, value);
	return value;
};

export const searchTexoroWithEngine = (query: string, options: SearchOptions = {}) =>
	withServerTexoroEngine(async (searchEngine) => ({
		engine: searchEngine,
		execution: await searchWithTexoroEngine(searchEngine, query, options)
	}));

export const searchTexoro = async (query: string, options: SearchOptions = {}) =>
	(await searchTexoroWithEngine(query, options)).execution;
