<script lang="ts">
	import defaultSeoImage from '$lib/assets/logos/logo-etso.png';
	import {
		buildCanonicalUrl,
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

	const seoTitle = $derived(buildSeoTitle(title));
	const seoDescription = $derived(buildSeoDescription(description));
	const seoCanonicalUrl = $derived(canonicalUrl ?? buildCanonicalUrl(path));
	const seoImageUrl = $derived(buildCanonicalUrl(image));
	const jsonLdItems = $derived(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []);
	const jsonLdMarkup = $derived(jsonLdItems.map((item) => jsonLdScript(item)).join(''));
</script>

<svelte:head>
	<title>{seoTitle}</title>
	<meta name="description" content={seoDescription} />
	{#if noindex}
		<meta name="robots" content="noindex,nofollow" />
	{/if}
	<link rel="canonical" href={seoCanonicalUrl} />
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
