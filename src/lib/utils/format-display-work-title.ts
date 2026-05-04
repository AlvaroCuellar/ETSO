const TRAILING_ARTICLE_PATTERN =
	/^(?<body>.+?),\s*(?<article>El|La|Los|Las)(?<suffix>\s+\([^()]+\))?$/u;

const escapeHtml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

const normalizeArticle = (value: string): string => {
	const lower = value.toLocaleLowerCase('es-ES');
	return lower.charAt(0).toLocaleUpperCase('es-ES') + lower.slice(1);
};

const lowercaseLeadingCharacter = (value: string): string =>
	value.replace(/^\p{Lu}/u, (match) => match.toLocaleLowerCase('es-ES'));

export const formatDisplayWorkTitle = (value: string): string => {
	const trimmed = value.trim();
	if (!trimmed) return trimmed;

	const match = trimmed.match(TRAILING_ARTICLE_PATTERN);
	if (!match?.groups) return trimmed;

	const body = lowercaseLeadingCharacter(match.groups.body.trim());
	const article = normalizeArticle(match.groups.article);
	const suffix = match.groups.suffix ?? '';

	return `${article} ${body}${suffix}`;
};

export const formatDisplayWorkTitleList = (values: string[]): string[] =>
	values.map((value) => formatDisplayWorkTitle(value));

export const formatPrefixedDisplayWorkTitleHtml = (prefix: string, title: string): string =>
	`${escapeHtml(prefix)} <i>${escapeHtml(formatDisplayWorkTitle(title))}</i>`;
