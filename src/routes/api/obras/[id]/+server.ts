import { error, json } from '@sveltejs/kit';
import { PUBLIC_CATALOG_CACHE_CONTROL } from '$lib/server/cache-control';
import { getWorkById, getWorkByPublicId, getWorkBySlug } from '$lib/server/catalog-runtime';
import {
	parsePublicApiFields,
	projectPublicApiFields,
	PUBLIC_WORK_METADATA_FIELDS
} from '$lib/server/public-api-fields';
import { WORK_METADATA_CONTENT_POLICY, toPublicWorkMetadata } from '$lib/server/public-work-metadata';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const fields = parsePublicApiFields(url.searchParams.get('fields'), PUBLIC_WORK_METADATA_FIELDS);
	const workKey = params.id.trim();
	if (!workKey) throw error(400, 'Identificador de obra invalido');

	const publicId = /^\d+$/.test(workKey) ? Number.parseInt(workKey, 10) : null;
	const work =
		(publicId === null ? undefined : await getWorkByPublicId(publicId)) ??
		(await getWorkById(workKey)) ??
		(await getWorkBySlug(workKey));
	if (!work) throw error(404, 'Obra no encontrada');

	return json(
		{
			meta: {
				contentPolicy: WORK_METADATA_CONTENT_POLICY
			},
			work: projectPublicApiFields(toPublicWorkMetadata(work), fields)
		},
		{
			headers: {
				'cache-control': PUBLIC_CATALOG_CACHE_CONTROL
			}
		}
	);
};
