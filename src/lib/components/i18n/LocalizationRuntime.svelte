<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { getLocaleTextDirection, localizePath, type Locale } from '$lib/i18n';
	import { createTextTranslator, I18N_SKIP_SELECTOR } from '$lib/i18n-runtime';

	interface Props {
		locale: Locale;
		translations: Record<string, string>;
		attrs: string[];
	}

	let { locale, translations, attrs }: Props = $props();
	const translate = $derived(createTextTranslator(translations));
	let mounted = $state(false);
	let translationRun = 0;

	const shouldSkip = (node: Node): boolean => {
		const element = node instanceof Element ? node : node.parentElement;
		return Boolean(element?.closest(I18N_SKIP_SELECTOR));
	};

	const localizeLink = (element: Element): void => {
		const attr = element instanceof HTMLAnchorElement ? 'href' :
			element instanceof HTMLFormElement ? 'action' : null;
		if (!attr || element.hasAttribute('data-i18n-preserve-locale')) return;
		const value = element.getAttribute(attr);
		if (!value?.startsWith('/') || value.startsWith('//')) return;
		const localized = localizePath(value, locale);
		if (localized !== value) element.setAttribute(attr, localized);
	};

	const translateNode = (node: Node): void => {
		const skipped = shouldSkip(node);
		if (node.nodeType === Node.TEXT_NODE && !skipped) {
			const value = node.nodeValue ?? '';
			const translated = translate(value);
			if (translated !== value) node.nodeValue = translated;
		} else if (node instanceof Element) {
			localizeLink(node);
			if (skipped) return;
			for (const attr of attrs) {
				const value = node.getAttribute(attr);
				if (!value) continue;
				const translated = translate(value);
				if (translated !== value) node.setAttribute(attr, translated);
			}
		}
	};

	const translateTree = (root: Node): void => {
		translateNode(root);
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
		let node: Node | null;
		while ((node = walker.nextNode())) translateNode(node);
	};

	const translateCurrentDocument = async (): Promise<void> => {
		const run = ++translationRun;
		try {
			await tick();
			if (!mounted || run !== translationRun) return;
			document.documentElement.lang = locale;
			document.documentElement.dir = getLocaleTextDirection(locale);
			translateTree(document.body);
		} finally {
			document.documentElement.removeAttribute('data-i18n-hydrating');
		}
	};

	onMount(() => {
		mounted = true;
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === 'childList') {
					for (const node of mutation.addedNodes) translateTree(node);
				} else {
					translateNode(mutation.target);
				}
			}
		});
		observer.observe(document.body, {
			childList: true, subtree: true, characterData: true, attributes: true,
			attributeFilter: [...attrs, 'href', 'action', 'data-i18n-skip', 'translate']
		});
		return () => {
			mounted = false;
			translationRun += 1;
			observer.disconnect();
		};
	});

	$effect(() => {
		locale;
		translate;
		if (mounted) void translateCurrentDocument();
	});
</script>
