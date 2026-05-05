import { TexoroSearchEngine, buildWorkMetaMap } from '$lib/search';
import { getAllWorks } from '$lib/server/catalog-runtime';
import { readPrivateTextByTextKey } from '$lib/server/r2-private';
import { getTexoroIndexBaseUrl } from '$lib/server/r2-public';

import type { SearchOptions, TexoroWorkMeta } from '$lib/search';

let engine: TexoroSearchEngine | null = null;
let enginePromise: Promise<TexoroSearchEngine> | null = null;

const toWorkMeta = (work: Awaited<ReturnType<typeof getAllWorks>>[number]): TexoroWorkMeta => ({
	id: work.id,
	title: work.title,
	titleVariants: work.titleVariants,
	slug: work.slug,
	genre: work.genre,
	textState: work.textState,
	shortSummary: work.shortSummary,
	traditionalAttribution: work.traditionalAttribution,
	stylometryAttribution: work.stylometryAttribution
});

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
	const workMeta = buildWorkMetaMap(works.map(toWorkMeta));
	return searchEngine.search(query, workMeta, options);
};
