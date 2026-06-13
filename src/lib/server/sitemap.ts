import { getLocalizedAlternates, localizeUrl, SUPPORTED_LOCALES, type Locale } from '$lib/i18n';
import { SITE_URL } from '$lib/seo';
import {
	getAllAuthors,
	getAllWorks,
	getBitesoWorks,
	getWorksForSummaryIndex
} from '$lib/server/catalog-runtime';

const STATIC_PATHS = [
	'/',
	'/examen-autorias',
	'/examen-autorias/obras',
	'/examen-autorias/dramaturgos',
	'/texoro',
	'/texoro/obras',
	'/texoro/autores',
	'/biteso',
	'/resumenes',
	'/red-obras',
	'/como-citarnos',
	'/transcripciones-automaticas',
	'/equipo',
	'/contacto',
	'/mas-informacion',
	'/licencias',
	'/privacidad',
	'/repercusion'
];

export const SITEMAP_CACHE_SECONDS = 3600;
export const SITEMAP_MAX_URLS = 45000;

interface CachedPaths {
	createdAt: number;
	paths: string[];
}

let cachedPaths: CachedPaths | null = null;

export const SITEMAP_LOCALES: Locale[] = [...SUPPORTED_LOCALES];

export const escapeXml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

export const getSitemapPaths = async (): Promise<string[]> => {
	const now = Date.now();
	if (cachedPaths && now - cachedPaths.createdAt < SITEMAP_CACHE_SECONDS * 1000) {
		return cachedPaths.paths;
	}

	const [works, authors, bitesoWorks, summaryWorks] = await Promise.all([
		getAllWorks(),
		getAllAuthors(),
		getBitesoWorks(),
		getWorksForSummaryIndex()
	]);

	const paths = new Set<string>(STATIC_PATHS);

	for (const work of works) {
		paths.add(`/obras/${work.slug}`);
		if (work.reportSlug) paths.add(`/informes/${work.reportSlug}`);
	}

	for (const work of summaryWorks) {
		paths.add(`/obras/${work.slug}/resumen`);
	}

	for (const author of authors) {
		paths.add(`/autores/${author.id}`);
	}

	for (const work of bitesoWorks) {
		for (const link of work.textLinks) {
			if (link.kind === 'biteso' && link.href.startsWith('/biteso/')) {
				paths.add(link.href);
			}
		}
	}

	const sortedPaths = Array.from(paths).sort((a, b) => a.localeCompare(b, 'es'));
	cachedPaths = { createdAt: now, paths: sortedPaths };
	return sortedPaths;
};

export const getSitemapChunkCount = (paths: string[]): number =>
	Math.max(1, Math.ceil(paths.length / SITEMAP_MAX_URLS));

export const getSitemapChunkPaths = (paths: string[], chunk: number): string[] =>
	paths.slice(chunk * SITEMAP_MAX_URLS, (chunk + 1) * SITEMAP_MAX_URLS);

export const getSitemapSlug = (locale: Locale, chunk: number): string => `${locale}-${chunk}`;

export const parseSitemapSlug = (slug: string): { locale: Locale; chunk: number } | null => {
	const match = slug.match(/^([a-z]{2})-(\d+)$/);
	if (!match) return null;
	const [, locale, chunkText] = match;
	if (!SITEMAP_LOCALES.includes(locale as Locale)) return null;
	return { locale: locale as Locale, chunk: Number(chunkText) };
};

export const sitemapFileUrl = (locale: Locale, chunk: number): string =>
	`${SITE_URL}/sitemaps/${getSitemapSlug(locale, chunk)}.xml`;

export const sitemapUrlEntry = (path: string, locale: Locale): string => {
	const loc = localizeUrl(path, locale);
	const alternates = getLocalizedAlternates(path)
		.map(
			(alternate) =>
				`    <xhtml:link rel="alternate" hreflang="${alternate.locale}" href="${escapeXml(alternate.href)}" />`
		)
		.join('\n');

	return ['  <url>', `    <loc>${escapeXml(loc)}</loc>`, alternates, '  </url>'].join('\n');
};
