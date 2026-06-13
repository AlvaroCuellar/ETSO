import { error } from '@sveltejs/kit';

import {
	getSitemapChunkCount,
	getSitemapChunkPaths,
	getSitemapPaths,
	parseSitemapSlug,
	SITEMAP_CACHE_SECONDS,
	sitemapUrlEntry
} from '$lib/server/sitemap';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const parsed = parseSitemapSlug(params.slug);
	if (!parsed) throw error(404, 'Sitemap not found');

	const paths = await getSitemapPaths();
	const chunkCount = getSitemapChunkCount(paths);
	if (parsed.chunk < 0 || parsed.chunk >= chunkCount) throw error(404, 'Sitemap not found');

	const urls = getSitemapChunkPaths(paths, parsed.chunk)
		.map((path) => sitemapUrlEntry(path, parsed.locale))
		.join('\n');

	return new Response(
		[
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
			urls,
			'</urlset>'
		].join('\n'),
		{
			headers: {
				'content-type': 'application/xml; charset=utf-8',
				'cache-control': `public, max-age=${SITEMAP_CACHE_SECONDS}`
			}
		}
	);
};
