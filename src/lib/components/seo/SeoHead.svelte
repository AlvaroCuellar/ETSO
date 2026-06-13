<script lang="ts">
	import { page } from '$app/state';
	import defaultSeoImage from '$lib/assets/logos/logo-etso.png';
	import {
		DEFAULT_LOCALE,
		getLocalizedAlternates,
		getUiTranslations,
		localizeUrl,
		translateJsonLd,
		translateText,
		type Locale
	} from '$lib/i18n';
	import {
		buildSeoDescription,
		buildSeoTitle,
		jsonLdScript
	} from '$lib/seo';

	interface Props {
		title: string;
		description: string;
		path?: string;
		canonicalUrl?: string;
		type?: 'website' | 'article';
		image?: string;
		jsonLd?: unknown | unknown[];
		noindex?: boolean;
	}

	let {
		title,
		description,
		path = '/',
		canonicalUrl,
		type = 'website',
		image = defaultSeoImage,
		jsonLd,
		noindex = false
	}: Props = $props();

	const locale = $derived((page.data.locale ?? DEFAULT_LOCALE) as Locale);
	const ui = $derived(getUiTranslations(locale));
	const translatedTitle = $derived(translateText(locale, title));
	const translatedDescription = $derived(translateText(locale, description));
	const seoTitle = $derived(buildSeoTitle(translatedTitle, ui.seo.siteName));
	const seoDescription = $derived(buildSeoDescription(translatedDescription, ui.seo.defaultDescription));
	const seoCanonicalUrl = $derived(canonicalUrl ? localizeUrl(canonicalUrl, locale) : localizeUrl(path, locale));
	const seoImageUrl = $derived(localizeUrl(image, 'es'));
	const alternateLinks = $derived(getLocalizedAlternates(canonicalUrl ?? path));
	const jsonLdItems = $derived(
		jsonLd
			? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((item) => translateJsonLd(locale, item))
			: []
	);
	const jsonLdMarkup = $derived(jsonLdItems.map((item) => jsonLdScript(item)).join(''));
</script>

<svelte:head>
	<title>{seoTitle}</title>
	<meta name="description" content={seoDescription} />
	{#if noindex}
		<meta name="robots" content="noindex,nofollow" />
	{/if}
	<link rel="canonical" href={seoCanonicalUrl} />
	{#each alternateLinks as alternate}
		<link rel="alternate" hreflang={alternate.locale} href={alternate.href} />
	{/each}
	<meta property="og:title" content={seoTitle} />
	<meta property="og:description" content={seoDescription} />
	<meta property="og:url" content={seoCanonicalUrl} />
	<meta property="og:type" content={type} />
	<meta property="og:image" content={seoImageUrl} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seoTitle} />
	<meta name="twitter:description" content={seoDescription} />
	<meta name="twitter:image" content={seoImageUrl} />
	{@html jsonLdMarkup}
</svelte:head>
