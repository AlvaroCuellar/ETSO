import { isAccessGateEnabled } from '$lib/server/access-gate';

type SetHeaders = (headers: Record<string, string>) => void;

export const PUBLIC_CATALOG_CACHE_CONTROL =
	'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
export const PRIVATE_ACCESS_GATE_CACHE_CONTROL = 'private, no-store';

export const setPublicCatalogCacheHeaders = (setHeaders: SetHeaders): void => {
	setHeaders({
		'cache-control': isAccessGateEnabled()
			? PRIVATE_ACCESS_GATE_CACHE_CONTROL
			: PUBLIC_CATALOG_CACHE_CONTROL
	});
};
