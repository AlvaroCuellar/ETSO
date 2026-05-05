import { env as publicEnv } from '$env/dynamic/public';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, '');

const joinUrl = (base: string, path: string): string =>
	`${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;

const encodePath = (value: string): string => value.split('/').map(encodeURIComponent).join('/');

export const getPublicR2BaseUrl = (): string => {
	const baseUrl = stripTrailingSlash(
		publicEnv.PUBLIC_R2_PUBLIC_ASSETS_BASE_URL || publicEnv.PUBLIC_R2_BASE_URL || ''
	);
	if (!baseUrl) {
		throw new Error('Falta PUBLIC_R2_PUBLIC_ASSETS_BASE_URL para leer assets publicos desde R2.');
	}
	return baseUrl;
};

export const getTexoroIndexBaseUrl = (): string =>
	stripTrailingSlash(publicEnv.PUBLIC_TEXORO_INDEX_BASE_URL || joinUrl(getPublicR2BaseUrl(), 'search'));

export const getSummariesBaseUrl = (): string =>
	stripTrailingSlash(publicEnv.PUBLIC_SUMMARIES_BASE_URL || joinUrl(getPublicR2BaseUrl(), 'resumenes'));

export const fetchPublicR2Json = async <T>(baseUrl: string, relativePath: string): Promise<T | null> => {
	const cleanPath = trimSlashes(relativePath);
	if (!cleanPath || cleanPath.includes('..')) {
		throw new Error('Ruta publica R2 invalida.');
	}

	const response = await fetch(joinUrl(baseUrl, encodePath(cleanPath)));
	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(`No se pudo leer JSON publico desde R2: ${response.status}`);
	}

	return (await response.json()) as T;
};
