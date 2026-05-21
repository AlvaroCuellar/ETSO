import type { TexoroIndexManifest, TexoroWorkMeta } from './types';
import type { TexoroWorkerRequestPayload, TexoroWorkerResponse } from './worker-protocol';

const IDLE_TERMINATE_MS = 45_000;

let worker: Worker | null = null;
let requestId = 0;
let initPromise: Promise<TexoroIndexManifest> | null = null;
let initializedKey = '';
let initializedManifest: TexoroIndexManifest | null = null;
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
	initializedManifest = null;
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

export const releaseTexoroClientWorker = (): void => {
	clearIdleTimer();
	releaseRequested = true;
	if (!worker || pending.size > 0) return;
	idleTimer = globalThis.setTimeout(() => {
		terminateTexoroClientWorker('Worker TEXORO cerrado por inactividad');
	}, IDLE_TERMINATE_MS);
};

export const requestTexoroClientWorker = async <T>(
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

export const initializeTexoroClientWorker = async ({
	indexBaseUrl,
	worksMeta
}: {
	indexBaseUrl: string;
	worksMeta: TexoroWorkMeta[];
}): Promise<TexoroIndexManifest> => {
	const initKey = `${indexBaseUrl}::${worksMeta.map((work) => work.id).join('|')}`;
	if (worker && initializedKey === initKey && initPromise) return initPromise;
	if (worker && initializedKey === initKey && initializedManifest) return initializedManifest;
	if (initPromise) return initPromise;

	initPromise = requestTexoroClientWorker<{ manifest?: TexoroIndexManifest | null }>({
		action: 'init',
		indexBaseUrl,
		worksMeta
	})
		.then((response) => {
			if (!response.manifest) {
				throw new Error('El worker TEXORO no devolvio manifest');
			}
			initializedKey = initKey;
			initializedManifest = response.manifest;
			return response.manifest;
		})
		.catch((cause) => {
			initPromise = null;
			initializedKey = '';
			initializedManifest = null;
			throw cause;
		});

	return initPromise;
};
