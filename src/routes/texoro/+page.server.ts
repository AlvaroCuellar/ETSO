import { env as publicEnv } from '$env/dynamic/public';

import type { PageServerLoad } from './$types';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const joinUrl = (base: string, path: string): string =>
	`${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;

const resolveTexoroIndexBaseUrl = (): string => {
	const publicAssetsBaseUrl = stripTrailingSlash(
		publicEnv.PUBLIC_R2_PUBLIC_ASSETS_BASE_URL || publicEnv.PUBLIC_R2_BASE_URL || ''
	);
	return stripTrailingSlash(
		publicEnv.PUBLIC_TEXORO_INDEX_BASE_URL ||
			(publicAssetsBaseUrl ? joinUrl(publicAssetsBaseUrl, 'search') : '')
	);
};

export const load: PageServerLoad = async () => ({
	texoroIndexBaseUrl: resolveTexoroIndexBaseUrl()
});
