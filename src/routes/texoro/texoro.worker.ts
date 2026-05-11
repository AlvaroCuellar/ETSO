import { TexoroSearchEngine, buildWorkMetaMap } from '$lib/search';

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
			cacheInIndexedDb: true
		});
		workMetaById = buildWorkMetaMap(request.worksMeta);
		await engine.initialize();
		postResponse({
			id: request.id,
			ok: true,
			result: {
				manifest: engine.manifest
			}
		});
		return;
	}

	const searchEngine = ensureEngine();

	if (request.action === 'warmup') {
		if (request.wildcard) {
			await searchEngine.warmupWildcardSupport();
		} else {
			await searchEngine.warmupForFirstSearch();
		}
		postResponse({ id: request.id, ok: true });
		return;
	}

	if (request.action === 'prime') {
		await Promise.all([
			searchEngine.primeQuery(request.query, {
				structuredQuery: request.structuredQuery,
				structuredClauses: request.structuredClauses
			}),
			request.wildcard ? searchEngine.warmupWildcardSupport() : Promise.resolve()
		]);
		postResponse({ id: request.id, ok: true });
		return;
	}

	const options: SearchOptions = {
		...(request.options ?? {}),
		structuredQuery: request.structuredQuery ?? request.options?.structuredQuery,
		structuredClauses: request.structuredClauses ?? request.options?.structuredClauses
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
