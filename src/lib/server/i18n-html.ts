import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import {
	DEFAULT_LOCALE,
	getLocaleTextDirection,
	literalTranslations,
	localizePath,
	type Locale
} from '$lib/i18n';
import { createTextTranslator, I18N_SKIP_TAGS, TRANSLATABLE_ATTRIBUTES } from '$lib/i18n-runtime';

interface HtmlEdit {
	start: number;
	end: number;
	value: string;
}

const escapeText = (value: string): string =>
	value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeAttribute = (value: string): string => escapeText(value).replaceAll('"', '&quot;');
const applyEdits = (html: string, edits: HtmlEdit[]): string => {
	const parts: string[] = [];
	let cursor = 0;
	for (const edit of edits.sort((a, b) => a.start - b.start)) {
		parts.push(html.slice(cursor, edit.start), edit.value);
		cursor = edit.end;
	}
	parts.push(html.slice(cursor));
	return parts.join('');
};

export const localizeHtml = (html: string, locale: Locale): string => {
	if (locale === DEFAULT_LOCALE) return html;
	const translate = createTextTranslator(literalTranslations[locale]);
	const document = parse(html, { sourceCodeLocationInfo: true });
	const edits: HtmlEdit[] = [];

	const visit = (node: DefaultTreeAdapterTypes.Node, skipText: boolean): void => {
		if ('value' in node && node.nodeName === '#text') {
			if (skipText || !node.sourceCodeLocation) return;
			const translated = translate(node.value);
			if (translated !== node.value) {
				edits.push({
					start: node.sourceCodeLocation.startOffset,
					end: node.sourceCodeLocation.endOffset,
					value: escapeText(translated)
				});
			}
			return;
		}
		if ('tagName' in node) {
			const attrs = new Map(node.attrs.map((attr) => [attr.name, attr.value]));
			skipText ||= I18N_SKIP_TAGS.includes(node.tagName) || attrs.has('data-i18n-skip') ||
				attrs.get('translate')?.toLowerCase() === 'no';
			for (const attr of node.attrs) {
				const location = node.sourceCodeLocation?.attrs?.[attr.name];
				if (!location) continue;
				let value = attr.value;
				const link = (node.tagName === 'a' && attr.name === 'href') ||
					(node.tagName === 'form' && attr.name === 'action');
				if (link && !attrs.has('data-i18n-preserve-locale')) {
					if (value.startsWith('/') && !value.startsWith('//')) value = localizePath(value, locale);
				} else if (!skipText && TRANSLATABLE_ATTRIBUTES.some((name) => name === attr.name)) {
					value = translate(value);
				}
				if (value !== attr.value) {
					edits.push({ start: location.startOffset, end: location.endOffset,
						value: `${attr.name}="${escapeAttribute(value)}"` });
				}
			}
		}
		if ('childNodes' in node) for (const child of node.childNodes) visit(child, skipText);
	};
	visit(document, false);
	// Edit source ranges only: serializing a parsed tree can change Svelte's hydration markup.
	return applyEdits(html, edits);
};

export const localizeHtmlShell = (html: string, locale: Locale): string => {
	const document = parse(html, { sourceCodeLocationInfo: true });
	const element = document.childNodes.find((node) => 'tagName' in node && node.tagName === 'html');
	if (!element || !('tagName' in element) || !element.sourceCodeLocation?.startTag) return html;
	const edits: HtmlEdit[] = [];
	const additions: string[] = [];
	for (const [name, value] of [['lang', locale], ['dir', getLocaleTextDirection(locale)]]) {
		const location = element.sourceCodeLocation.attrs?.[name];
		if (location) edits.push({ start: location.startOffset, end: location.endOffset, value: `${name}="${value}"` });
		else additions.push(` ${name}="${value}"`);
	}
	if (additions.length) {
		const start = element.sourceCodeLocation.startTag.endOffset - 1;
		edits.push({ start, end: start, value: additions.join('') });
	}
	return applyEdits(html, edits);
};

export const createLocalizedHtmlTransformer = (locale: Locale): ((html: string, done: boolean) => string) => {
	let pendingHtml = '';
	return (html: string, done: boolean): string => {
		pendingHtml += html;
		if (!done) return '';
		const localized = localizeHtmlShell(localizeHtml(pendingHtml, locale), locale);
		pendingHtml = '';
		return localized;
	};
};

export const getClientTranslationPayload = (locale: Locale): string => {
	if (locale === DEFAULT_LOCALE) return '{}';
	return JSON.stringify({ locale, translations: literalTranslations[locale], attrs: TRANSLATABLE_ATTRIBUTES })
		.replaceAll('<', '\\u003c');
};
