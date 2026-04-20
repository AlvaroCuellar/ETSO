<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
</script>

<div class="page-stack">
	<Breadcrumbs
		items={[{ label: 'Examen de autorías', href: '/examen-autorias' }, { label: 'Más información' }]}
	/>

	<section class="info-page">
		<h1 class="info-page__title">Más información</h1>
		<p class="info-page__copy">Selecciona una sección:</p>
		<ul class="info-page__links">
			<li>
				<a href="/mas-informacion/transcripciones-automaticas">Transcripciones automáticas</a>
			</li>
			<li><a href="/mas-informacion/colaboradores">Colaboradores</a></li>
			<li><a href="/mas-informacion/repercusion">Repercusión</a></li>
		</ul>
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

	.info-page__links {
		list-style: none;
		display: grid;
		gap: var(--space-2);
	}

	.info-page__links a {
		font-family: var(--font-ui);
		font-weight: 500;
	}
</style>
