import {
	DEFAULT_LOCALE,
	getLocaleTextDirection,
	isAssetLikePath,
	literalTranslations,
	localizePath,
	stripLocaleFromPath,
	type Locale
} from '$lib/i18n';

const TRANSLATABLE_ATTRS = ['aria-label', 'placeholder', 'title', 'alt', 'content'] as const;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const literalPattern = (value: string): RegExp => {
	const pattern = value.trim().split(/\s+/).map(escapeRegExp).join('\\s+');
	return new RegExp(pattern, 'g');
};

const splitScriptBlocks = (html: string): string[] => html.split(/(<script\b[\s\S]*?<\/script>)/gi);

const protectUrlAttributes = (html: string): { html: string; values: string[] } => {
	const values: string[] = [];
	const protectedHtml = html.replace(/\b(href|action|src|content)="([^"]*)"/g, (match, attr: string, value: string) => {
		const isUrlAttr = attr !== 'content';
		const isUrlContent = attr === 'content' && (/^https?:\/\//i.test(value) || value.startsWith('/'));
		if (!isUrlAttr && !isUrlContent) return match;
		const index = values.push(value) - 1;
		return `${attr}="__ETSO_URL_ATTR_${index}__"`;
	});
	return { html: protectedHtml, values };
};

const restoreUrlAttributes = (html: string, values: string[]): string =>
	html.replace(/__ETSO_URL_ATTR_(\d+)__/g, (_match, index: string) => values[Number(index)] ?? '');

const protectSkippedBlocks = (html: string): { html: string; values: string[] } => {
	const values: string[] = [];
	const protectedHtml = html.replace(
		/<([a-z][\w:-]*)(?=[^>]*\sdata-i18n-skip\b)[^>]*>[\s\S]*?<\/\1>/gi,
		(match) => {
			const index = values.push(match) - 1;
			return `__ETSO_I18N_SKIP_${index}__`;
		}
	);
	return { html: protectedHtml, values };
};

const restoreSkippedBlocks = (html: string, values: string[]): string =>
	html.replace(/__ETSO_I18N_SKIP_(\d+)__/g, (_match, index: string) => values[Number(index)] ?? '');

const translateLiteralHtml = (html: string, locale: Locale): string => {
	if (locale === DEFAULT_LOCALE) return html;
	const dictionary = literalTranslations[locale];
	const keys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
	const protectedAttrs = protectUrlAttributes(html);
	let result = protectedAttrs.html;

	for (const key of keys) {
		result = result.replace(literalPattern(key), dictionary[key]);
	}

	return restoreUrlAttributes(result, protectedAttrs.values);
};

export const createLocalizedHtmlTransformer = (locale: Locale): ((html: string, done: boolean) => string) => {
	let pendingHtml = '';

	return (html: string, done: boolean): string => {
		pendingHtml += html;
		if (!done) return '';

		const localized = localizeHtml(pendingHtml, locale);
		pendingHtml = '';
		return localizeHtmlShell(localized, locale);
	};
};

const localizeLinks = (html: string, locale: Locale): string => {
	if (locale === DEFAULT_LOCALE) return html;

	return html.replace(
		/\b(href|action)="\/([^"#]*)?([^"]*)"/g,
		(match, attr: string, pathPart = '', suffix = '', offset: number, fullHtml: string) => {
			const tagStart = fullHtml.lastIndexOf('<', offset);
			const tagEnd = fullHtml.indexOf('>', offset);
			const currentTag = tagStart === -1 || tagEnd === -1 ? '' : fullHtml.slice(tagStart, tagEnd + 1);
			if (currentTag.includes('data-i18n-preserve-locale')) return match;

			const rawPath = `/${pathPart}`;
			const strippedPath = stripLocaleFromPath(rawPath);
			if (isAssetLikePath(strippedPath)) return match;
			return `${attr}="${localizePath(`${strippedPath}${suffix}`, locale)}"`;
		}
	);
};

export const localizeHtml = (html: string, locale: Locale): string => {
	const chunks = splitScriptBlocks(html);
	return chunks
		.map((chunk) => {
			if (/^<script\b/i.test(chunk)) return chunk;
			const skipped = protectSkippedBlocks(chunk);
			const localized = localizeLinks(translateLiteralHtml(skipped.html, locale), locale);
			return restoreSkippedBlocks(localized, skipped.values);
		})
		.join('');
};

export const localizeHtmlShell = (html: string, locale: Locale): string =>
	html.replace('<html lang="es">', `<html lang="${locale}" dir="${getLocaleTextDirection(locale)}">`);

export const getClientTranslationPayload = (locale: Locale): string => {
	if (locale === DEFAULT_LOCALE) return '{}';
	return JSON.stringify({
		locale,
		translations: literalTranslations[locale],
		attrs: TRANSLATABLE_ATTRS
	}).replaceAll('<', '\\u003c');
};
