import { error, json } from '@sveltejs/kit';
import { PUBLIC_CATALOG_CACHE_CONTROL } from '$lib/server/cache-control';
import { getAuthorById, getAuthorByPublicId } from '$lib/server/catalog-runtime';
import { SITE_URL } from '$lib/seo';

import type { RequestHandler } from './$types';

const authorResource = (authorKey: string): string => `/autores/${authorKey}`;

export const GET: RequestHandler = async ({ params }) => {
	const authorKey = params.id.trim();
	if (!authorKey) throw error(400, 'Identificador de autor invalido');

	const publicId = /^\d+$/.test(authorKey) ? Number.parseInt(authorKey, 10) : null;
	const author =
		(publicId === null ? undefined : await getAuthorByPublicId(publicId)) ??
		(await getAuthorById(authorKey));
	if (!author) throw error(404, 'Autor no encontrado');

	return json(
		{
			author: {
				id: author.publicId,
				key: author.id,
				name: author.name,
				nameVariants: author.nameVariants,
				resources: {
					author: authorResource(author.id),
					url: `${SITE_URL}${authorResource(author.id)}`
				}
			}
		},
		{
			headers: {
				'cache-control': PUBLIC_CATALOG_CACHE_CONTROL
			}
		}
	);
};
