// @ts-check

const TRAILING_ARTICLE_PATTERN =
	/^(.*?),\s*(El|La|Los|Las|Un|Una|Unos|Unas|Lo)(\s*\([^)]*\))?$/i;
const LEADING_A_PATTERN = /^A\s+/i;
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g;
const NBSP_PATTERN = /\u00a0/g;

export const REPORT_SLUG_PREFIX = 'analisis-estilometrico-';
export const REPORT_SLUG_MAX_LENGTH = 90;

/**
 * Mirrors the public title formatter for the subset needed by report URLs.
 *
 * @param {string} title
 */
export const formatReportDisplayWorkTitle = (title) => {
	const normalized = title.replace(NBSP_PATTERN, ' ').replace(/\s+/g, ' ').trim();
	const match = normalized.match(TRAILING_ARTICLE_PATTERN);
	if (!match) return normalized;

	const [, mainTitle, article, suffix = ''] = match;
	return `${article} ${mainTitle.trim()}${suffix}`.replace(/\s+/g, ' ').trim();
};

/**
 * @param {string} value
 */
export const slugifyReportTitle = (value) => {
	return value
		.replace(NBSP_PATTERN, ' ')
		.normalize('NFD')
		.replace(COMBINING_MARKS_PATTERN, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-');
};

/**
 * @param {string} slug
 * @param {number} maxLength
 */
export const truncateReportSlug = (slug, maxLength = REPORT_SLUG_MAX_LENGTH) => {
	if (slug.length <= maxLength) return slug;

	const truncated = slug.slice(0, maxLength).replace(/-+$/g, '');
	const lastHyphen = truncated.lastIndexOf('-');
	if (lastHyphen > REPORT_SLUG_PREFIX.length) {
		return truncated.slice(0, lastHyphen);
	}
	return truncated;
};

/**
 * @param {string} title
 */
export const buildReportSlugBase = (title) => {
	const displayTitle = formatReportDisplayWorkTitle(title).replace(LEADING_A_PATTERN, '');
	const bodySlug = slugifyReportTitle(displayTitle) || 'informe';
	return truncateReportSlug(`${REPORT_SLUG_PREFIX}${bodySlug}`);
};

/**
 * @param {string} baseSlug
 * @param {Map<string, number>} counts
 */
export const buildUniqueReportSlug = (baseSlug, counts) => {
	const currentCount = counts.get(baseSlug) ?? 0;
	counts.set(baseSlug, currentCount + 1);
	if (currentCount === 0) return baseSlug;

	const suffix = `-${currentCount - 1}`;
	const truncatedBase = truncateReportSlug(baseSlug, REPORT_SLUG_MAX_LENGTH - suffix.length);
	return `${truncatedBase}${suffix}`;
};

/**
 * @param {unknown} value
 * @returns {Record<string, string>}
 */
export const normalizeReportSlugOverrides = (value) => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

	/** @type {Record<string, string>} */
	const overrides = {};
	for (const [workId, slug] of Object.entries(value)) {
		if (typeof slug !== 'string') continue;
		const normalizedSlug = slug.trim().replace(/^\/?informes\//, '');
		if (workId.trim() && normalizedSlug) overrides[workId] = normalizedSlug;
	}
	return overrides;
};
