<script lang="ts">
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	import '../app.css';

	import favicon from '$lib/assets/favicon.svg';
	import LocalizationRuntime from '$lib/components/i18n/LocalizationRuntime.svelte';
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';
	import SiteHeader from '$lib/components/layout/SiteHeader.svelte';
	import CopyCitationReminder from '$lib/components/ui/CopyCitationReminder.svelte';
	import FloatingFeedback from '$lib/components/ui/FloatingFeedback.svelte';
	import { DEFAULT_LOCALE, getLocaleTextDirection, getUiTranslations, literalTranslations, type Locale } from '$lib/i18n';
	import {
		createOrganizationJsonLd,
		createWebSiteJsonLd,
		jsonLdScript
	} from '$lib/seo';

	let { children, data } = $props();
	const locale = $derived((data.locale ?? DEFAULT_LOCALE) as Locale);
	const textDirection = $derived(getLocaleTextDirection(locale));
	const ui = $derived(getUiTranslations(locale));
	const runtimeTranslations = $derived(locale === DEFAULT_LOCALE ? {} : literalTranslations[locale]);
	const runtimeAttrs = ['aria-label', 'placeholder', 'title', 'alt', 'content'];
	const siteIdentityJsonLd = $derived(
		jsonLdScript([createWebSiteJsonLd(ui.seo.siteName, locale), createOrganizationJsonLd(ui.seo.siteName)])
	);

	injectAnalytics({ mode: dev ? 'development' : 'production' });
</script>

<svelte:head>
	{#if locale !== DEFAULT_LOCALE}
		<script>
			document.documentElement.setAttribute('data-i18n-hydrating', 'true');
		</script>
		<style>
			html[data-i18n-hydrating='true'] body {
				visibility: hidden;
			}
		</style>
	{/if}
	<link rel="icon" href={favicon} />
	<meta name="application-name" content={ui.seo.siteName} />
	<meta property="og:site_name" content={ui.seo.siteName} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Roboto:wght@300;400;500;700&display=swap"
		rel="stylesheet"
	/>
	{@html siteIdentityJsonLd}
</svelte:head>

<div
	class="flex min-h-screen min-w-0 flex-col bg-white font-reading text-text-main"
	dir={textDirection}
>
	{#key locale}
		<LocalizationRuntime {locale} translations={runtimeTranslations} attrs={runtimeAttrs} />
		<SiteHeader {locale} />
		<main class="min-w-0 flex-1 py-8 lg:py-12">
			<div class="mx-auto w-full min-w-0 max-w-7xl px-3 sm:px-5 lg:px-6">
				{@render children()}
			</div>
		</main>
		<SiteFooter {locale} />
		<CopyCitationReminder {locale} />
		<FloatingFeedback {locale} />
	{/key}
</div>
