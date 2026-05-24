import { browser } from '$app/environment';

const values = new Map<string, unknown>();
const loads = new Map<string, Promise<unknown>>();

export const getClientMemoryCache = <T>(key: string): T | null => {
	if (!browser || !values.has(key)) return null;
	return values.get(key) as T;
};

export const setClientMemoryCache = <T>(key: string, value: T): T => {
	if (browser) values.set(key, value);
	return value;
};

export const loadClientMemoryCache = async <T>(
	key: string,
	loader: () => Promise<T>
): Promise<T> => {
	if (!browser) return loader();
	if (values.has(key)) return values.get(key) as T;

	const pending = loads.get(key);
	if (pending) return pending as Promise<T>;

	const next = loader()
		.then((value) => setClientMemoryCache(key, value))
		.finally(() => {
			loads.delete(key);
		});
	loads.set(key, next);
	return next;
};
