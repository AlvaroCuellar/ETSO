import { json } from '@sveltejs/kit';
import { PUBLIC_CATALOG_CACHE_CONTROL } from '$lib/server/cache-control';
import { getAllAuthors } from '$lib/server/catalog-runtime';
import { SITE_URL } from '$lib/seo';

import type { RequestHandler } from './$types';

const authorResource = (authorKey: string): string => `/autores/${authorKey}`;

export const GET: RequestHandler = async () => {
	const authors = (await getAllAuthors()).map((author) => ({
		id: author.publicId,
		key: author.id,
		name: author.name,
		nameVariants: author.nameVariants,
		resources: {
			author: authorResource(author.id),
			url: `${SITE_URL}${authorResource(author.id)}`
		}
	}));

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
