import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { normalizeResultSort, normalizeResultSortDirection } from '$lib/search/result-sort';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const resultSort = normalizeResultSort(url.searchParams.get('orden'));
	const override = publicEnv.PUBLIC_TEXORO_FREQUENCY_INDEX_BASE_URL?.trim();
	const publicAssets = (publicEnv.PUBLIC_R2_PUBLIC_ASSETS_BASE_URL || publicEnv.PUBLIC_R2_BASE_URL)
		?.trim().replace(/\/+$/, '');
	const frequencyReleasesUrl = !dev && publicAssets ? `${publicAssets}/search-frequencies/releases` : '';
	return {
		frequencyIndexBaseUrl: env.TEXORO_DISABLE_FREQUENCY_WORKER === 'true' ? '' : override || frequencyReleasesUrl,
		frequencyIndexVersioned: !override && Boolean(frequencyReleasesUrl),
		resultSort,
		resultSortDirection: normalizeResultSortDirection(
			url.searchParams.get('direccion'),
			resultSort
		)
	};
};
