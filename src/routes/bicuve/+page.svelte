<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
</script>

<div class="page-stack">
	<Breadcrumbs items={[{ label: 'Examen de autorías', href: '/examen-autorias' }, { label: 'BICUVE' }]} />

	<section class="info-page">
		<h1 class="info-page__title">BICUVE</h1>
		<p class="info-page__copy">
			Página índice de BICUVE preparada. Cuando me pases los contenidos, dejamos esta sección cerrada con
			el diseño final.
		</p>
	</section>
</div>

<style>
	.info-page {
		display: grid;
		gap: var(--space-3);
	}

	.info-page__title {
		font-size: clamp(1.7rem, 2.9vw, 2.25rem);
	}

	.info-page__copy {
		margin: 0;
		max-width: 72ch;
		line-height: 1.62;
		color: var(--color-text-main);
	}
</style>
