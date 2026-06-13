<script lang="ts">
	import { onMount, tick } from 'svelte';
	import {
		DEFAULT_LOCALE,
		getLocaleTextDirection,
		isAssetLikePath,
		literalTranslations,
		localizePath,
		stripLocaleFromPath,
		type Locale
	} from '$lib/i18n';

	interface Props {
		locale: Locale;
		translations: Record<string, string>;
		attrs: string[];
	}

	let { locale, translations, attrs }: Props = $props();
	const textSources = new WeakMap<Text, string>();
	const attrSources = new WeakMap<Element, Map<string, string>>();
	let reverseTranslations: Map<string, string> | null = null;
	let normalizedTranslationsByLocale: Partial<Record<Locale, Map<string, string>>> = {};
	let literalReplacementsByLocale: Partial<
		Record<Locale, Array<{ pattern: RegExp; translated: string }>>
	> = {};
	let mounted = $state(false);
	let translationRun = 0;

	const normalizeTranslationKey = (value: string): string => value.replace(/\s+/g, ' ').trim();
	const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const literalPattern = (value: string): RegExp =>
		new RegExp(value.trim().split(/\s+/).map(escapeRegExp).join('\\s+'), 'g');

	const getNormalizedTranslations = (
		activeLocale: Locale,
		activeTranslations: Record<string, string>
	): Map<string, string> => {
		const existing = normalizedTranslationsByLocale[activeLocale];
		if (existing) return existing;
		const next = new Map<string, string>();
		for (const [source, translated] of Object.entries(activeTranslations)) {
			next.set(normalizeTranslationKey(source), translated);
		}
		normalizedTranslationsByLocale = { ...normalizedTranslationsByLocale, [activeLocale]: next };
		return next;
	};

	const getLiteralReplacements = (
		activeLocale: Locale,
		activeTranslations: Record<string, string>
	): Array<{ pattern: RegExp; translated: string }> => {
		const existing = literalReplacementsByLocale[activeLocale];
		if (existing) return existing;
		const next = Object.entries(activeTranslations)
			.sort(([a], [b]) => b.length - a.length)
			.map(([source, translated]) => ({ pattern: literalPattern(source), translated }));
		literalReplacementsByLocale = { ...literalReplacementsByLocale, [activeLocale]: next };
		return next;
	};

	const translateLiteralString = (
		activeLocale: Locale,
		activeTranslations: Record<string, string>,
		source: string
	): string => {
		let translated = source;
		for (const replacement of getLiteralReplacements(activeLocale, activeTranslations)) {
			translated = translated.replace(replacement.pattern, replacement.translated);
		}
		return translated;
	};

	const getReverseTranslations = (): Map<string, string> => {
		if (reverseTranslations) return reverseTranslations;
		const next = new Map<string, string>();
		for (const dictionary of Object.values(literalTranslations)) {
			for (const [source, translated] of Object.entries(dictionary)) {
				if (!next.has(translated)) next.set(translated, source);
			}
		}
		reverseTranslations = next;
		return next;
	};

	const getTextParts = (value: string): { leading: string; core: string; trailing: string } => {
		const leading = value.match(/^\s*/)?.[0] ?? '';
		const trailing = value.match(/\s*$/)?.[0] ?? '';
		return {
			leading,
			core: value.slice(leading.length, value.length - trailing.length),
			trailing
		};
	};

	const getSourceText = (
		value: string,
		activeTranslations: Record<string, string>
	): string => {
		if (Object.hasOwn(activeTranslations, value)) return value;
		return getReverseTranslations().get(value) ?? value;
	};

	const getTranslatedText = (
		activeLocale: Locale,
		activeTranslations: Record<string, string>,
		source: string
	): string => {
		if (activeLocale === DEFAULT_LOCALE) return source;
		return activeTranslations[source] ??
			getNormalizedTranslations(activeLocale, activeTranslations).get(normalizeTranslationKey(source)) ??
			translateLiteralString(activeLocale, activeTranslations, source);
	};

	const resolveSourceText = (
		cachedSource: string | undefined,
		currentValue: string,
		activeLocale: Locale,
		activeTranslations: Record<string, string>
	): string => {
		if (!cachedSource) return getSourceText(currentValue, activeTranslations);
		const expectedValue = getTranslatedText(activeLocale, activeTranslations, cachedSource);
		if (currentValue === expectedValue) return cachedSource;
		const currentSource = getSourceText(currentValue, activeTranslations);
		return currentSource === cachedSource ? cachedSource : currentSource;
	};

	const translateTextNode = (
		node: Text,
		activeLocale: Locale = locale,
		activeTranslations: Record<string, string> = translations
	): void => {
		const value = node.nodeValue ?? '';
		const { leading, core, trailing } = getTextParts(value);
		if (!core) return;
		const source = resolveSourceText(textSources.get(node), core, activeLocale, activeTranslations);
		textSources.set(node, source);
		const translated = getTranslatedText(activeLocale, activeTranslations, source);
		const next = `${leading}${translated}${trailing}`;
		if (next !== value) node.nodeValue = next;
	};

	const translateElementAttributes = (
		element: Element,
		activeLocale: Locale = locale,
		activeTranslations: Record<string, string> = translations
	): void => {
		for (const attr of attrs) {
			const value = element.getAttribute(attr);
			if (!value) continue;
			let sourceByAttr = attrSources.get(element);
			if (!sourceByAttr) {
				sourceByAttr = new Map<string, string>();
				attrSources.set(element, sourceByAttr);
			}
			const source = resolveSourceText(sourceByAttr.get(attr), value, activeLocale, activeTranslations);
			sourceByAttr.set(attr, source);
			const translated = getTranslatedText(activeLocale, activeTranslations, source);
			if (translated !== value) element.setAttribute(attr, translated);
		}
	};

	const shouldSkipNode = (node: Node): boolean => {
		const parent = node.parentElement;
		if (!parent) return false;
		return Boolean(parent.closest('script, style, textarea, pre, code, [data-i18n-skip]'));
	};

	const localizeUrlAttributes = (element: Element): void => {
		if (element instanceof HTMLAnchorElement) {
			localizeLink(element, 'href');
		}
		if (element instanceof HTMLFormElement) {
			localizeLink(element, 'action');
		}
	};

	const localizeLink = (element: HTMLAnchorElement | HTMLFormElement, attr: 'href' | 'action'): void => {
		if (element.hasAttribute('data-i18n-preserve-locale')) return;
		const value = element.getAttribute(attr);
		if (!value || value.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')) return;
		if (!value.startsWith('/')) return;
		const stripped = stripLocaleFromPath(value.split(/[?#]/)[0] || '/');
		if (isAssetLikePath(stripped)) return;
		const localized = localizePath(value, locale);
		if (localized !== value) element.setAttribute(attr, localized);
	};

	const translateNode = (
		node: Node,
		activeLocale: Locale = locale,
		activeTranslations: Record<string, string> = translations
	): void => {
		if (shouldSkipNode(node)) return;
		if (node.nodeType === Node.TEXT_NODE) {
			translateTextNode(node as Text, activeLocale, activeTranslations);
			return;
		}
		if (!(node instanceof Element)) return;
		translateElementAttributes(node, activeLocale, activeTranslations);
		localizeUrlAttributes(node);
		for (const child of node.childNodes) translateNode(child, activeLocale, activeTranslations);
	};

	const translateCurrentDocument = async (
		activeLocale: Locale,
		activeTranslations: Record<string, string>
	): Promise<void> => {
		const run = ++translationRun;
		await tick();
		if (run !== translationRun) return;

		document.documentElement.lang = activeLocale;
		document.documentElement.dir = getLocaleTextDirection(activeLocale);

		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
			{
				acceptNode(node) {
					return shouldSkipNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
				}
			}
		);

		let count = 0;
		let node: Node | null = walker.currentNode;
		while (node) {
			if (node.nodeType === Node.TEXT_NODE) {
				translateTextNode(node as Text, activeLocale, activeTranslations);
			} else if (node instanceof Element) {
				translateElementAttributes(node, activeLocale, activeTranslations);
				localizeUrlAttributes(node);
			}

			count += 1;
			if (count % 700 === 0) {
				await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
				if (run !== translationRun) return;
			}

			node = walker.nextNode();
		}

		document.documentElement.removeAttribute('data-i18n-hydrating');
	};

	onMount(() => {
		mounted = true;

		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === 'characterData') {
					translateNode(mutation.target);
					continue;
				}
				for (const node of mutation.addedNodes) translateNode(node);
				if (mutation.type === 'attributes' && mutation.target instanceof Element) {
					translateElementAttributes(mutation.target);
					localizeUrlAttributes(mutation.target);
				}
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
			attributeFilter: [...attrs, 'href', 'action']
		});

		return () => {
			mounted = false;
			observer.disconnect();
		};
	});

	$effect(() => {
		const activeLocale = locale;
		const activeTranslations = translations;
		if (!mounted) return;
		void translateCurrentDocument(activeLocale, activeTranslations);
	});
</script>
