import { error, json } from '@sveltejs/kit';
import { PUBLIC_CATALOG_CACHE_CONTROL } from '$lib/server/cache-control';
import { getAuthorById, getAuthorByPublicId, getStylometryWorkPublicIdsByAuthor } from '$lib/server/catalog-runtime';
import { PUBLIC_AUTHOR_METADATA_FIELDS, toPublicAuthorMetadata } from '$lib/server/public-author-metadata';
import { parsePublicApiFields, projectPublicApiFields } from '$lib/server/public-api-fields';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const fields = parsePublicApiFields(url.searchParams.get('fields'), PUBLIC_AUTHOR_METADATA_FIELDS);
	const authorKey = params.id.trim();
	if (!authorKey) throw error(400, 'Identificador de autor invalido');

	const publicId = /^\d+$/.test(authorKey) ? Number.parseInt(authorKey, 10) : null;
	const author =
		(publicId === null ? undefined : await getAuthorByPublicId(publicId)) ??
		(await getAuthorById(authorKey));
	if (!author) throw error(404, 'Autor no encontrado');
	const idsByAuthor = fields === null || fields.includes('stylometryWorkPublicIds')
		? await getStylometryWorkPublicIdsByAuthor()
		: undefined;

	return json(
		{
			author: projectPublicApiFields(toPublicAuthorMetadata(author, idsByAuthor?.get(author.id)), fields)
		},
		{
			headers: {
				'cache-control': PUBLIC_CATALOG_CACHE_CONTROL
			}
		}
	);
};
