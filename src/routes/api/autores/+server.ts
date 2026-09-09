import { json } from '@sveltejs/kit';
import { PUBLIC_CATALOG_CACHE_CONTROL } from '$lib/server/cache-control';
import { getAllAuthors, getStylometryWorkPublicIdsByAuthor } from '$lib/server/catalog-runtime';
import { PUBLIC_AUTHOR_METADATA_FIELDS, toPublicAuthorMetadata } from '$lib/server/public-author-metadata';
import { parsePublicApiFields, projectPublicApiFields } from '$lib/server/public-api-fields';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const fields = parsePublicApiFields(url.searchParams.get('fields'), PUBLIC_AUTHOR_METADATA_FIELDS);
	const [catalogAuthors, idsByAuthor] = await Promise.all([
		getAllAuthors(),
		fields === null || fields.includes('stylometryWorkPublicIds')
			? getStylometryWorkPublicIdsByAuthor()
			: undefined
	]);
	const authors = catalogAuthors.map((author) =>
		projectPublicApiFields(toPublicAuthorMetadata(author, idsByAuthor?.get(author.id)), fields)
	);

	return json(
		{
			meta: {
				total: authors.length
			},
			authors
		},
		{
			headers: {
				'cache-control': PUBLIC_CATALOG_CACHE_CONTROL
			}
		}
	);
};
