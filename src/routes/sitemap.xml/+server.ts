import {
	escapeXml,
	getSitemapChunkCount,
	getSitemapPaths,
	SITEMAP_CACHE_SECONDS,
	SITEMAP_LOCALES,
	sitemapFileUrl
} from '$lib/server/sitemap';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const paths = await getSitemapPaths();
	const chunkCount = getSitemapChunkCount(paths);
	const sitemaps = SITEMAP_LOCALES.flatMap((locale) =>
		Array.from({ length: chunkCount }, (_value, chunk) =>
			[
				'  <sitemap>',
				`    <loc>${escapeXml(sitemapFileUrl(locale, chunk))}</loc>`,
				'  </sitemap>'
			].join('\n')
		)
	).join('\n');

	return new Response(
		[
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
			sitemaps,
			'</sitemapindex>'
		].join('\n'),
		{
			headers: {
				'content-type': 'application/xml; charset=utf-8',
				'cache-control': `public, max-age=3600, s-maxage=${SITEMAP_CACHE_SECONDS}, stale-while-revalidate=604800`
			}
		}
	);
};
