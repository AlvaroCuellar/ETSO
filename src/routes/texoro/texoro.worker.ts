import { TexoroSearchEngine, buildWorkMetaMap } from '$lib/search';
import { canSearchWithFrequencies } from '$lib/search/frequency-query';

import type { SearchOptions, TexoroWorkMeta } from '$lib/search';
import type { TexoroWorkerRequest, TexoroWorkerResponse } from '$lib/search/worker-protocol';

let engine: TexoroSearchEngine | null = null;
let workMetaById = new Map<string, TexoroWorkMeta>();

const postResponse = (response: TexoroWorkerResponse): void => {
	postMessage(response);
};

const ensureEngine = (): TexoroSearchEngine => {
	if (!engine) {
		throw new Error('Motor TEXORO de cliente no inicializado');
	}
	return engine;
};

const handleRequest = async (request: TexoroWorkerRequest): Promise<void> => {
	if (request.action === 'init') {
		engine = new TexoroSearchEngine({
			indexBaseUrl: request.indexBaseUrl,
			frequencyOnly: true,
			cacheInIndexedDb: true
		});
		workMetaById = buildWorkMetaMap(request.worksMeta);
		await engine.initialize();
		postResponse({
			id: request.id,
			ok: true,
			result: {
				manifest: engine.manifest,
				missingWorkIds: engine.indexedWorkIds.filter((workId) => !workMetaById.has(workId))
			}
		});
		return;
	}

	const searchEngine = ensureEngine();

	if (request.action === 'warmup') {
		await searchEngine.warmupForFirstSearch();
		postResponse({ id: request.id, ok: true });
		return;
	}

	if (request.action === 'warmupWildcard') {
		await searchEngine.warmupWildcardSupport();
		postResponse({ id: request.id, ok: true });
		return;
	}

	const structuredQuery = request.structuredQuery ?? request.options?.structuredQuery;
	if (!structuredQuery || !canSearchWithFrequencies(
		structuredQuery,
		request.options?.traditionalAuthorIds ?? [],
		searchEngine.manifest?.normalization.preserveEnie
	)) {
		throw new Error('La consulta no se puede resolver con el índice público de frecuencias.');
	}
	if (request.action === 'prime') {
		await Promise.all([
			searchEngine.primeQuery(request.query, {
				...(request.options ?? {}),
				structuredQuery,
				prefetchTexts: false
			}),
			request.wildcard ? searchEngine.warmupWildcardSupport() : Promise.resolve()
		]);
		postResponse({ id: request.id, ok: true });
		return;
	}

	const options: SearchOptions = {
		...(request.options ?? {}),
		structuredQuery,
		includeSnippets: false
	};
	const execution = await searchEngine.search(request.query, workMetaById, options);
	postResponse({
		id: request.id,
		ok: true,
		result: {
			execution
		}
	});
};

addEventListener('message', (event: MessageEvent<TexoroWorkerRequest>) => {
	void handleRequest(event.data).catch((cause) => {
		postResponse({
			id: event.data.id,
			ok: false,
			error: cause instanceof Error ? cause.message : 'Error en el worker de TEXORO'
		});
	});
});
