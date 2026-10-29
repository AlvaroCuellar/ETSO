export interface PublishedSummarySearchEntry {
	id: string;
	summaryText: string;
	normalizedSummaryText: string;
}

const normalizePublishedIndex = (value: unknown): PublishedSummarySearchEntry[] => {
	if (!value || typeof value !== 'object') throw new Error('Invalid summary search index');
	const record = value as Record<string, unknown>;
	if (record.schemaVersion !== 'etso-summary-search-index-v1' || !Array.isArray(record.entries)) {
		throw new Error('Invalid summary search index');
	}
	const ids = new Set<string>();
	return record.entries.map((entry: unknown) => {
		if (!entry || typeof entry !== 'object') throw new Error('Invalid summary search entry');
		const item = entry as Record<string, unknown>;
		if (typeof item.id !== 'string' || !item.id || typeof item.summaryText !== 'string' || typeof item.normalizedSummaryText !== 'string' || ids.has(item.id)) {
			throw new Error('Invalid summary search entry');
		}
		ids.add(item.id);
		return { id: item.id, summaryText: item.summaryText, normalizedSummaryText: item.normalizedSummaryText };
	});
};

/** One public index request, shared between concurrent searches; failures can retry. */
export const createSummarySearchIndexLoader = ({
	ttlMs = 10 * 60_000,
	timeoutMs = 15_000,
	now = Date.now
}: { ttlMs?: number; timeoutMs?: number; now?: () => number } = {}) => {
	let cache: { url: string; expiresAt: number; entries: PublishedSummarySearchEntry[] } | null = null;
	let pending: { url: string; promise: Promise<PublishedSummarySearchEntry[]> } | null = null;
	return (url: string, fetcher: typeof fetch): Promise<PublishedSummarySearchEntry[]> => {
		if (cache?.url === url && cache.expiresAt > now()) return Promise.resolve(cache.entries);
		if (pending?.url === url) return pending.promise;
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout>;
		const timeout = new Promise<never>((_resolve, reject) => {
			timer = setTimeout(() => {
				controller.abort();
				reject(new Error('Summary search index timed out'));
			}, timeoutMs);
		});
		const request = Promise.resolve().then(async () => {
			const response = await fetcher(url, { signal: controller.signal });
			if (!response.ok) throw new Error(`Summary search index returned ${response.status}`);
			return normalizePublishedIndex(await response.json());
		});
		const promise = Promise.race([request, timeout]).then((entries) => {
			cache = { url, expiresAt: now() + ttlMs, entries };
			return entries;
		}).finally(() => {
			clearTimeout(timer);
			if (pending?.promise === promise) pending = null;
		});
		pending = { url, promise };
		return promise;
	};
};
