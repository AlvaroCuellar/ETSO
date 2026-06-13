export const SITE_NAME = 'ETSO: Estilometría aplicada al Teatro del Siglo de Oro';
export const SITE_SHORT_NAME = 'ETSO';
export const SITE_URL = 'https://etso.es';

export const DEFAULT_SEO_DESCRIPTION =
	'ETSO es una infraestructura de investigación dedicada al teatro del Siglo de Oro. Permite consultar informes de análisis estilométrico sobre la autoría de las cerca de 3000 obras conservadas, explorar textos teatrales áureos mediante un buscador léxico y acceder a resúmenes automáticos de todas las obras.';

const DESCRIPTION_MAX_LENGTH = 165;

export interface WebPageJsonLdInput {
	title: string;
	description: string;
	path?: string;
	canonicalUrl?: string;
	type?: string;
	locale?: string;
	siteName?: string;
}

export const buildCanonicalUrl = (path = '/'): string => {
	if (/^https?:\/\//i.test(path)) return path;
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${SITE_URL}${normalizedPath}`;
};

export const buildSeoTitle = (title: string, siteName = SITE_NAME): string => {
	const normalized = title.trim();
	if (!normalized || normalized === SITE_NAME || normalized === siteName) return siteName;
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

export const createWebSiteJsonLd = (name = SITE_NAME, locale = 'es') => ({
	'@context': 'https://schema.org',
	'@type': 'WebSite',
	name,
	alternateName: SITE_SHORT_NAME,
	url: SITE_URL,
	inLanguage: locale
});

export const createOrganizationJsonLd = (name = SITE_NAME) => ({
	'@context': 'https://schema.org',
	'@type': ['Organization', 'ResearchProject'],
	name,
	alternateName: SITE_SHORT_NAME,
	url: SITE_URL
});

export const createWebPageJsonLd = ({
	title,
	description,
	path = '/',
	canonicalUrl,
	type = 'WebPage',
	locale = 'es',
	siteName = SITE_NAME
}: WebPageJsonLdInput) => ({
	'@context': 'https://schema.org',
	'@type': type,
	name: buildSeoTitle(title, siteName),
	description: buildSeoDescription(description),
	url: canonicalUrl ?? buildCanonicalUrl(path),
	isPartOf: {
		'@type': 'WebSite',
		name: siteName,
		url: SITE_URL
	},
	inLanguage: locale
});

export const jsonLdScript = (jsonLd: unknown): string =>
	`<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>`;
