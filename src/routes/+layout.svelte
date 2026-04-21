<script lang="ts">
	import '../app.css';

	import favicon from '$lib/assets/favicon.svg';
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';
	import SiteHeader from '$lib/components/layout/SiteHeader.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta
		name="description"
		content="ETSO - Estilometria aplicada al teatro del Siglo de Oro. Nueva plataforma con SvelteKit."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Roboto:wght@300;400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="flex min-h-screen flex-col bg-white font-reading text-text-main">
	<SiteHeader />
	<main class="flex-1 py-8 lg:py-12">
		<div class="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-6">
			{@render children()}
		</div>
	</main>
	<SiteFooter />
</div>
