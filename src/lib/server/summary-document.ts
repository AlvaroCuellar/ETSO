export interface SummaryDocument {
	resumenBreve: string[];
	resumenLargo: string[];
	personajes: Array<{ nombre: string; descripcion: string }>;
	espacios: Array<{ nombre: string; descripcion: string }>;
	tematicas: Array<{ tema: string; descripcion: string }>;
}

export interface SummaryDocumentResult {
	document: SummaryDocument | null;
	unavailable: boolean;
}

const paragraphs = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
		: [];

const namedItems = <K extends 'nombre' | 'tema'>(value: unknown, key: K): Array<Record<K, string> & { descripcion: string }> =>
	(Array.isArray(value) ? value : []).flatMap((item) => {
		if (!item || typeof item !== 'object') return [];
		const record = item as Record<string, unknown>;
		const name = typeof record[key] === 'string' ? record[key].trim() : '';
		const descripcion = typeof record.descripcion === 'string' ? record.descripcion.trim() : '';
		return name || descripcion ? [{ [key]: name, descripcion } as Record<K, string> & { descripcion: string }] : [];
	});

export const normalizeSummaryDocument = (value: unknown): SummaryDocument => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid summary document');
	const record = value as Record<string, unknown>;
	return {
		resumenBreve: paragraphs(record.resumen_breve),
		resumenLargo: paragraphs(record.resumen_largo),
		personajes: namedItems(record.personajes_principales, 'nombre'),
		espacios: namedItems(record.espacios_principales, 'nombre'),
		tematicas: namedItems(record.tematicas_principales, 'tema')
	};
};

// Public R2 documents only: this cache does not read from the catalogue database.
export const createSummaryDocumentLoader = ({
	maxEntries = 128,
	ttlMs = 10 * 60_000,
	timeoutMs = 8_000,
	now = Date.now
}: { maxEntries?: number; ttlMs?: number; timeoutMs?: number; now?: () => number } = {}) => {
	const cache = new Map<string, { document: SummaryDocument | null; expiresAt: number }>();
	const pending = new Map<string, Promise<SummaryDocumentResult>>();
	return async (url: string, fetcher: typeof fetch): Promise<SummaryDocumentResult> => {
		const cached = cache.get(url);
		if (cached && cached.expiresAt > now()) {
			cache.delete(url);
			cache.set(url, cached);
			return { document: cached.document, unavailable: false };
		}
		const existing = pending.get(url);
		if (existing) return existing;
		const request = Promise.resolve().then(async (): Promise<SummaryDocumentResult> => {
			const controller = new AbortController();
			let timer: ReturnType<typeof setTimeout>;
			const timeout = new Promise<never>((_resolve, reject) => {
				timer = setTimeout(() => {
					controller.abort();
					reject(new Error('Summary asset timed out'));
				}, timeoutMs);
			});
			try {
				const readDocument = async () => {
					const response = await fetcher(url, { signal: controller.signal });
					if (response.status !== 404 && !response.ok) throw new Error(`Summary asset returned ${response.status}`);
					return response.status === 404 ? null : normalizeSummaryDocument(await response.json());
				};
				// Also bound adapters/internal fetches that do not act on AbortSignal.
				const document = await Promise.race([readDocument(), timeout]);
				cache.delete(url);
				cache.set(url, { document, expiresAt: now() + ttlMs });
				while (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
				return { document, unavailable: false };
			} catch {
				// A temporary asset failure must not hide a previously loaded summary.
				return cached
					? { document: cached.document, unavailable: false }
					: { document: null, unavailable: true };
			} finally {
				clearTimeout(timer!);
				pending.delete(url);
			}
		});
		pending.set(url, request);
		return request;
	};
};

export const loadSummaryDocument = createSummaryDocumentLoader();
