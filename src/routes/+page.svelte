<script lang="ts">
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="page-stack">
	<PageHero
		eyebrow="Proyecto ETSO"
		title="Estilometria aplicada al teatro del Siglo de Oro"
		subtitle="Replica visual en SvelteKit de la web historica de ETSO, preparada para conectar catalogo Turso y recursos en R2."
	/>

	<section class="card">
		<h2 class="card__title">Estado de la nueva plataforma</h2>
		<div class="metrics-grid">
			<article class="metric">
				<div class="metric__value">{data.stats.works}</div>
				<div class="metric__label">Obras en maqueta</div>
			</article>
			<article class="metric">
				<div class="metric__value">{data.stats.authors}</div>
				<div class="metric__label">Autores en maqueta</div>
			</article>
			<article class="metric">
				<div class="metric__value">{data.stats.informes}</div>
				<div class="metric__label">Informes de muestra</div>
			</article>
			<article class="metric">
				<div class="metric__value">{data.stats.bicuveTexts}</div>
				<div class="metric__label">Textos BICUVE simulados</div>
			</article>
		</div>
	</section>

	<section class="card home-grid">
		<div>
			<h2 class="card__title">Ruta recomendada para continuar</h2>
			<p class="intro-copy">
				La estructura visual ya respeta paleta, jerarquias tipograficas, tablas de resultados y patrones de
				detalle de la web anterior. El siguiente paso sera conectar esta misma UI al SQLite real en Turso.
			</p>
			<div class="filters-actions">
				<a class="button button--primary" href="/examen-autorias">Ir al buscador</a>
				{#if data.primaryWorkSlug}
					<a class="button button--secondary" href={`/obras/${data.primaryWorkSlug}`}>Ver ficha de obra</a>
				{/if}
			</div>
		</div>

		<div>
			<h3 class="card__title">Obras destacadas</h3>
			<ul class="resource-list">
				{#each data.featuredWorks as work}
					<li><a href={`/obras/${work.slug}`}>{work.title}</a></li>
				{/each}
			</ul>
		</div>
	</section>
</div>
