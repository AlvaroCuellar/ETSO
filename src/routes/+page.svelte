<script lang="ts">
	import PageHero from '$lib/components/ui/PageHero.svelte';
	import AppButton from '$lib/components/ui/AppButton.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="grid gap-6">
	<PageHero
		eyebrow="Proyecto ETSO"
		title="Estilometría aplicada al teatro del Siglo de Oro"
		subtitle="Réplica visual en SvelteKit de la web histórica de ETSO, preparada para conectar catálogo Turso y recursos en R2."
	/>

	<section class="rounded-card border border-border bg-surface p-6 shadow-soft">
		<h2 class="mb-4 text-[1.1rem] font-semibold text-brand-blue-dark">Estado de la nueva plataforma</h2>
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<article class="rounded-card border border-border bg-surface-soft p-4">
				<div class="text-[1.6rem] leading-none font-bold text-brand-blue">{data.stats.works}</div>
				<div class="text-[0.84rem] text-text-soft">Obras en maqueta</div>
			</article>
			<article class="rounded-card border border-border bg-surface-soft p-4">
				<div class="text-[1.6rem] leading-none font-bold text-brand-blue">{data.stats.authors}</div>
				<div class="text-[0.84rem] text-text-soft">Autores en maqueta</div>
			</article>
			<article class="rounded-card border border-border bg-surface-soft p-4">
				<div class="text-[1.6rem] leading-none font-bold text-brand-blue">{data.stats.informes}</div>
				<div class="text-[0.84rem] text-text-soft">Informes de muestra</div>
			</article>
			<article class="rounded-card border border-border bg-surface-soft p-4">
				<div class="text-[1.6rem] leading-none font-bold text-brand-blue">{data.stats.bicuveTexts}</div>
				<div class="text-[0.84rem] text-text-soft">Textos BICUVE simulados</div>
			</article>
		</div>
	</section>

	<section class="grid gap-6 rounded-card border border-border bg-surface p-6 shadow-soft lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)]">
		<div>
			<h2 class="mb-4 text-[1.1rem] font-semibold text-brand-blue-dark">Ruta recomendada para continuar</h2>
			<p class="text-text-soft">
				La estructura visual ya respeta paleta, jerarquías tipográficas, tablas de resultados y patrones de detalle de
				la web anterior. El siguiente paso será conectar esta misma UI al SQLite real en Turso.
			</p>
			<div class="mt-4 flex flex-wrap gap-2">
				<AppButton href="/examen-autorias" variant="primary">Ir al buscador</AppButton>
				{#if data.primaryWorkSlug}
					<AppButton href={`/obras/${data.primaryWorkSlug}`} variant="secondary">Ver ficha de obra</AppButton>
				{/if}
			</div>
		</div>

		<div>
			<h3 class="mb-4 text-[1.1rem] font-semibold text-brand-blue-dark">Obras destacadas</h3>
			<ul class="grid gap-2">
				{#each data.featuredWorks as work}
					<li><a class="hover:underline" href={`/obras/${work.slug}`}>{work.title}</a></li>
				{/each}
			</ul>
		</div>
	</section>
</div>
