const TRAILING_ARTICLE_PATTERN =
	/^(?<body>.+?),\s*(?<article>El|La|Los|Las)(?<suffix>\s+\([^()]+\))?$/u;
const LEADING_ARTICLE_PATTERN =
	/^(?<article>El|La|Los|Las)\s+(?<body>.+?)(?<suffix>\s+\([^()]+\))?$/iu;

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

const addUnique = (values: string[], seen: Set<string>, value: string): void => {
	const normalized = value.replace(/\s+/g, ' ').trim();
	if (!normalized) return;
	const key = normalized.toLocaleLowerCase('es-ES');
	if (seen.has(key)) return;
	seen.add(key);
	values.push(normalized);
};

const buildTitleSearchVariants = (value: string): string[] => {
	const variants: string[] = [];
	const seen = new Set<string>();
	const trimmed = value.trim();
	if (!trimmed) return variants;

	addUnique(variants, seen, trimmed);
	addUnique(variants, seen, formatDisplayWorkTitle(trimmed));

	const trailingMatch = trimmed.match(TRAILING_ARTICLE_PATTERN);
	if (trailingMatch?.groups) {
		const body = trailingMatch.groups.body.trim();
		const article = normalizeArticle(trailingMatch.groups.article);
		const suffix = trailingMatch.groups.suffix ?? '';
		addUnique(variants, seen, body);
		addUnique(variants, seen, `${article} ${lowercaseLeadingCharacter(body)}${suffix}`);
		addUnique(variants, seen, `${body}, ${article}${suffix}`);
		addUnique(variants, seen, `${body} ${article}${suffix}`);
	}

	const leadingMatch = trimmed.match(LEADING_ARTICLE_PATTERN);
	if (leadingMatch?.groups) {
		const body = leadingMatch.groups.body.trim();
		const article = normalizeArticle(leadingMatch.groups.article);
		const suffix = leadingMatch.groups.suffix ?? '';
		addUnique(variants, seen, body);
		addUnique(variants, seen, `${body}, ${article}${suffix}`);
		addUnique(variants, seen, `${body} ${article}${suffix}`);
	}

	return variants;
};

export const buildWorkTitleSearchText = (title: string, titleVariants: string[] = []): string =>
	[title, ...titleVariants].flatMap(buildTitleSearchVariants).join(' ');

export const formatPrefixedDisplayWorkTitleHtml = (prefix: string, title: string): string =>
	`${escapeHtml(prefix)} <i>${escapeHtml(formatDisplayWorkTitle(title))}</i>`;
