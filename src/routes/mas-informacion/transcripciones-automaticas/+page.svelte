<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
</script>

<div class="page-stack">
	<Breadcrumbs
		items={[
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Más información', href: '/mas-informacion' },
			{ label: 'Transcripciones automáticas' }
		]}
	/>

	<section class="info-page">
		<h1 class="info-page__title">Transcripciones automáticas</h1>
		<p class="info-page__copy">
			Sección preparada para incluir la información sobre procesos y criterios de transcripción
			automática.
		</p>
	</section>
</div>

<style>
	.info-page {
		display: grid;
		gap: var(--space-3);
	}

	.info-page__title {
		font-size: clamp(1.6rem, 2.7vw, 2.1rem);
	}

	.info-page__copy {
		margin: 0;
		max-width: 72ch;
		line-height: 1.62;
		color: var(--color-text-main);
	}
</style>
