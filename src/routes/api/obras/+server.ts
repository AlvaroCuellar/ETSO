import { json } from '@sveltejs/kit';
import { PUBLIC_CATALOG_CACHE_CONTROL } from '$lib/server/cache-control';
import { getAllWorks } from '$lib/server/catalog-runtime';
import { WORK_METADATA_CONTENT_POLICY, toPublicWorkMetadata } from '$lib/server/public-work-metadata';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const works = (await getAllWorks()).map(toPublicWorkMetadata);

	return json(
		{
			meta: {
				total: works.length,
				contentPolicy: WORK_METADATA_CONTENT_POLICY
			},
			works
		},
		{
			headers: {
				'cache-control': PUBLIC_CATALOG_CACHE_CONTROL
			}
		}
	);
};
