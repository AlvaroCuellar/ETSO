export const SITE_NAME = 'ETSO: Estilometría aplicada al Teatro del Siglo de Oro';
export const SITE_SHORT_NAME = 'ETSO';
export const SITE_URL = 'https://etso.es';

export const DEFAULT_SEO_DESCRIPTION =
	'Estilometría aplicada al teatro del Siglo de Oro: examen de autorías, búsquedas textuales, textos digitales y recursos para la investigación filológica.';

const DESCRIPTION_MAX_LENGTH = 165;

export interface WebPageJsonLdInput {
	title: string;
	description: string;
	path?: string;
	canonicalUrl?: string;
	type?: string;
}

export const buildCanonicalUrl = (path = '/'): string => {
	if (/^https?:\/\//i.test(path)) return path;
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${SITE_URL}${normalizedPath}`;
};

export const buildSeoTitle = (title: string): string => {
	const normalized = title.trim();
	if (!normalized || normalized === SITE_NAME) return SITE_NAME;
	if (normalized.includes('|')) return normalized;
	return `${normalized} | ${SITE_SHORT_NAME}`;
};

export const normalizeSeoText = (value: string): string =>
	value
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

export const buildSeoDescription = (value: string, fallback = DEFAULT_SEO_DESCRIPTION): string => {
	const normalized = normalizeSeoText(value) || fallback;
	if (normalized.length <= DESCRIPTION_MAX_LENGTH) return normalized;

	const truncated = normalized.slice(0, DESCRIPTION_MAX_LENGTH + 1);
	const lastSpace = truncated.lastIndexOf(' ');
	const result = lastSpace > 90 ? truncated.slice(0, lastSpace) : normalized.slice(0, DESCRIPTION_MAX_LENGTH);
	return `${result.replace(/[.,;:!?]$/, '')}…`;
};

export const createWebSiteJsonLd = () => ({
	'@context': 'https://schema.org',
	'@type': 'WebSite',
	name: SITE_NAME,
	alternateName: SITE_SHORT_NAME,
	url: SITE_URL,
	inLanguage: 'es'
});

export const createOrganizationJsonLd = () => ({
	'@context': 'https://schema.org',
	'@type': ['Organization', 'ResearchProject'],
	name: SITE_NAME,
	alternateName: SITE_SHORT_NAME,
	url: SITE_URL
});

export const createWebPageJsonLd = ({
	title,
	description,
	path = '/',
	canonicalUrl,
	type = 'WebPage'
}: WebPageJsonLdInput) => ({
	'@context': 'https://schema.org',
	'@type': type,
	name: buildSeoTitle(title),
	description: buildSeoDescription(description),
	url: canonicalUrl ?? buildCanonicalUrl(path),
	isPartOf: {
		'@type': 'WebSite',
		name: SITE_NAME,
		url: SITE_URL
	},
	inLanguage: 'es'
});

export const jsonLdScript = (jsonLd: unknown): string =>
	`<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>`;
