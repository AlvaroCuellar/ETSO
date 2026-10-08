import type { TexoroIndexManifest, TexoroWorkMeta } from './types';
import type { TexoroWorkerRequestPayload, TexoroWorkerResponse } from './worker-protocol';

const IDLE_TERMINATE_MS = 45_000;

let worker: Worker | null = null;
let requestId = 0;
let initPromise: Promise<TexoroIndexManifest> | null = null;
let initializedKey = '';
let initializingKey = '';
let initializedManifest: TexoroIndexManifest | null = null;
type WorkerInitConfig = {
	indexBaseUrl: string;
	worksMeta: TexoroWorkMeta[];
	indexVersion?: string;
	refreshWorksMeta?: (indexVersion: string) => Promise<TexoroWorkMeta[]>;
};
let initializedConfig: WorkerInitConfig | null = null;
let refreshPromise: Promise<TexoroIndexManifest> | null = null;
const isIndexVersionMismatch = (cause: unknown): boolean =>
	cause instanceof Error && cause.message.includes('Index version mismatch for ');
const initializationKey = (indexBaseUrl: string, worksMeta: TexoroWorkMeta[], indexVersion: string): string =>
	`${indexBaseUrl}::${indexVersion}::${JSON.stringify(worksMeta)}`;
let idleTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
let releaseRequested = false;

const pending = new Map<
	number,
	{
		resolve: (value: unknown) => void;
		reject: (cause: Error) => void;
	}
>();

const clearIdleTimer = (): void => {
	if (!idleTimer) return;
	globalThis.clearTimeout(idleTimer);
	idleTimer = null;
};

const rejectPending = (message: string): void => {
	for (const item of pending.values()) {
		item.reject(new Error(message));
	}
	pending.clear();
};

export const terminateTexoroClientWorker = (message = 'Worker TEXORO cerrado'): void => {
	clearIdleTimer();
	initPromise = null;
	initializedKey = '';
	initializingKey = '';
	initializedManifest = null;
	initializedConfig = null;
	refreshPromise = null;
	if (worker) {
		worker.terminate();
		worker = null;
	}
	rejectPending(message);
};

const createWorker = (): Worker => {
	clearIdleTimer();
	releaseRequested = false;
	if (worker) return worker;

	const nextWorker = new Worker(new URL('../../routes/texoro/texoro.worker.ts', import.meta.url), {
		type: 'module'
	});
	nextWorker.onmessage = (event: MessageEvent<TexoroWorkerResponse>) => {
		const response = event.data;
		const item = pending.get(response.id);
		if (!item) return;
		pending.delete(response.id);
		if (response.ok) {
			item.resolve(response.result);
		} else {
			item.reject(new Error(response.error));
		}
	};
	nextWorker.onerror = (event) => {
		const message = event.message || 'Error en el worker de TEXORO';
		console.warn('[texoro] browser worker failed', message);
		terminateTexoroClientWorker(message);
	};
	worker = nextWorker;
	return nextWorker;
};

export const isTexoroClientWorkerReady = (): boolean => Boolean(worker && initializedKey);
export const getTexoroClientWorkerManifest = (): TexoroIndexManifest | null => initializedManifest;

export const releaseTexoroClientWorker = (): void => {
	clearIdleTimer();
	releaseRequested = true;
	if (!worker || pending.size > 0) return;
	idleTimer = globalThis.setTimeout(() => {
		terminateTexoroClientWorker('Worker TEXORO cerrado por inactividad');
	}, IDLE_TERMINATE_MS);
};

const sendTexoroClientWorkerRequest = async <T>(
	request: TexoroWorkerRequestPayload
): Promise<T> => {
	const activeWorker = createWorker();
	const id = ++requestId;
	return new Promise<T>((resolve, reject) => {
		pending.set(id, {
			resolve: (value) => resolve(value as T),
			reject
		});
		activeWorker.postMessage({ id, ...request });
	}).finally(() => {
		if (releaseRequested && pending.size === 0) {
			releaseTexoroClientWorker();
		}
	});
};

export const requestTexoroClientWorker = async <T>(request: TexoroWorkerRequestPayload): Promise<T> => {
	const requestIndexVersion = initializedManifest?.indexVersion;
	try {
		return await sendTexoroClientWorkerRequest<T>(request);
	} catch (cause) {
		if (request.action === 'init' || !isIndexVersionMismatch(cause) || !initializedConfig) throw cause;
		// A concurrent request may already have refreshed this version.
		if (initializedManifest?.indexVersion === requestIndexVersion) {
			if (!refreshPromise) {
				initializedKey = '';
				const nextRefreshPromise = initializeTexoroClientWorker(initializedConfig).finally(() => {
					if (refreshPromise === nextRefreshPromise) refreshPromise = null;
				});
				refreshPromise = nextRefreshPromise;
			}
			await refreshPromise;
		}
		// Retry exactly once; persistent publication errors remain visible.
		return sendTexoroClientWorkerRequest<T>(request);
	}
};

export const initializeTexoroClientWorker = async ({
	indexBaseUrl,
	worksMeta,
	indexVersion,
	refreshWorksMeta
}: WorkerInitConfig): Promise<TexoroIndexManifest> => {
	while (initPromise) {
		const pendingKey = initializingKey;
		const manifest = await initPromise;
		const requestedKey = initializationKey(indexBaseUrl, worksMeta, indexVersion || manifest.indexVersion);
		if (pendingKey === requestedKey || initializedKey === requestedKey) return manifest;
	}
	const initKey = initializationKey(indexBaseUrl, worksMeta, indexVersion || initializedManifest?.indexVersion || '');
	if (worker && initializedKey === initKey && initializedManifest) return initializedManifest;

	initializingKey = initKey;
	const sendInitRequest = () => sendTexoroClientWorkerRequest<{ manifest?: TexoroIndexManifest | null; missingWorkIds?: string[] }>({
		action: 'init',
		indexBaseUrl,
		worksMeta
	});
	const nextInitPromise = sendInitRequest()
		.catch((cause) => {
			if (!isIndexVersionMismatch(cause)) throw cause;
			return sendInitRequest();
		})
		.then(async (response) => {
			if (response.missingWorkIds?.length) {
				if (!refreshWorksMeta || !response.manifest) {
					throw new Error('TEXORO metadata mismatch for current index');
				}
				worksMeta = await refreshWorksMeta(response.manifest.indexVersion);
				response = await sendInitRequest();
				if (response.missingWorkIds?.length) {
					throw new Error('TEXORO metadata mismatch after one refresh');
				}
			}
			if (!response.manifest) {
				throw new Error('El worker TEXORO no devolvio manifest');
			}
			initializedKey = initializationKey(indexBaseUrl, worksMeta, response.manifest.indexVersion);
			initializedManifest = response.manifest;
			initializedConfig = { indexBaseUrl, worksMeta, refreshWorksMeta };
			return response.manifest;
		})
		.catch((cause) => {
			if (initPromise === nextInitPromise) {
				initializedKey = '';
				initializedManifest = null;
			}
			throw cause;
		})
		.finally(() => {
			if (initPromise === nextInitPromise) {
				initPromise = null;
				initializingKey = '';
			}
		});
	initPromise = nextInitPromise;

	return nextInitPromise;
};
