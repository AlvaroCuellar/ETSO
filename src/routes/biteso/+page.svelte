<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import { normalizePlainText } from '$lib/search/normalize';
	import {
		buildWorkTitleSearchText,
		formatDisplayWorkTitle
	} from '$lib/utils/format-display-work-title';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Feather from 'lucide-svelte/icons/feather';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const filteredWorks = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);
		if (!normalizedQuery) return data.works;

		return data.works.filter((work) => {
			const haystack = normalizeFilterText(buildWorkTitleSearchText(work.title, work.titleVariants));
			return haystack.includes(normalizedQuery);
		});
	});
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'BITESO' }]} />

	<FeatureHeroSection
		eyebrow=""
		title="BITESO"
		subtitle="Biblioteca Textual Siglo de Oro"
		backgroundImage={fondoLogo}
		statsAriaLabel="Indicadores de BITESO"
	>
		<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			BITESO ofrece acceso en abierto a textos digitales del Siglo de Oro conseguidos, en su mayoría, a partir de transcripciones automáticas de impresos y manuscritos antiguos. La colección reúne obras producidas para los análisis estilométricos de autoría y materiales incorporados gracias a la colaboración de especialistas, colegas y estudiantes.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			Los textos deben entenderse como versiones de trabajo: no sustituyen a las ediciones críticas, pueden contener errores de transcripción y presentan una calidad desigual según la fuente y el estado de revisión. En su estado actual, se ofrecen sin nombres de personajes ni acotaciones escénicas. La colección permanece abierta a correcciones, ampliaciones y mejoras.
		</p>
		
		{#snippet stats()}
			<HeroStatCard
				Icon={BookOpen}
				value={data.stats.bitesoTexts}
				label="Textos digitales en acceso abierto"
				desktopOffset="up"
			/>
			<HeroStatCard Icon={Feather} value={data.stats.authors} label="Autores" desktopOffset="down" />
		{/snippet}
	</FeatureHeroSection>

	<section class="grid gap-3">
		<h2 class="m-0 font-ui text-[clamp(1.6rem,2.6vw,2.1rem)] font-bold leading-[1.12] text-brand-blue-dark">
			Textos digitales en acceso abierto
		</h2>
		<p class="m-0 leading-[1.65] text-text-main">
			Listado alfabético de las obras con texto digital BITESO. Usa el buscador para localizar una obra y entrar directamente en su texto.
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{filteredWorks.length} de {data.works.length} textos visibles
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="biteso-textos-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar obra</span>
			<input
				id="biteso-textos-query"
				type="search"
				placeholder="Ej: La monja alférez, El castigo sin venganza..."
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={query}
			/>
		</label>

		{#if filteredWorks.length === 0}
			<p class="m-0 italic text-text-soft">No hay textos que coincidan con la búsqueda.</p>
		{:else}
			<div class="overflow-hidden bg-[rgba(255,255,255,0.52)]">
				<div class="divide-y divide-[rgba(0,51,167,0.08)]">
					{#each filteredWorks as work}
						<a
							href={`/biteso/${work.slug}`}
							class="grid gap-1 px-4 py-3 text-inherit no-underline transition hover:bg-[rgba(237,242,255,0.7)] hover:no-underline md:px-5"
						>
							<p class="m-0 font-ui text-[0.99rem] font-semibold leading-[1.35] text-brand-blue-dark">
								{formatDisplayWorkTitle(work.title)}
							</p>
							{#if work.titleVariants.length > 0}
								<p class="m-0 text-[0.92rem] leading-[1.5] text-text-soft">
									{#each work.titleVariants as variante, index}
										<span class="italic">{formatDisplayWorkTitle(variante)}</span>
										{#if index < work.titleVariants.length - 1}
											<span class="mx-1 not-italic text-text-soft/65">|</span>
										{/if}
									{/each}
								</p>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</section>
</div>
