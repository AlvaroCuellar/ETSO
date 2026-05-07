<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import { normalizePlainText } from '$lib/search/normalize';
	import { formatDisplayWorkTitle, formatDisplayWorkTitleList } from '$lib/utils/format-display-work-title';
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
			const haystack = normalizeFilterText([work.title, ...work.titleVariants].join(' '));
			return haystack.includes(normalizedQuery);
		});
	});
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'BICUVE' }]} />

	<FeatureHeroSection
		eyebrow=""
		title="BICUVE"
		subtitle="Sección provisional"
		backgroundImage={fondoLogo}
		statsAriaLabel="Indicadores provisionales de BICUVE"
	>
		<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis
			dapibus posuere velit aliquet. Curabitur blandit tempus porttitor, sed posuere consectetur est at
			lobortis. Donec id elit non mi porta gravida at eget metus.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			Cras mattis consectetur purus sit amet fermentum. Praesent commodo cursus magna, vel scelerisque nisl
			consectetur et. Aenean lacinia bibendum nulla sed consectetur. Vestibulum id ligula porta felis
			euismod semper.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-reading text-[1.01rem] leading-[1.62] text-text-main">
			Nullam quis risus eget urna mollis ornare vel eu leo. Maecenas faucibus mollis interdum. Sed posuere
			consectetur est at lobortis. Nulla vitae elit libero, a pharetra augue. Integer posuere erat a ante
			venenatis dapibus posuere velit aliquet.
		</p>

		{#snippet stats()}
			<HeroStatCard
				Icon={BookOpen}
				value={data.stats.bicuveTexts}
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
			Listado alfabético de las obras con texto digital BICUVE. Usa el buscador para localizar una obra y entrar directamente en su texto.
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{filteredWorks.length} de {data.works.length} textos visibles
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="bicuve-textos-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar obra</span>
			<input
				id="bicuve-textos-query"
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
							href={`/bicuve/${work.slug}`}
							class="grid gap-1 px-4 py-3 text-inherit no-underline transition hover:bg-[rgba(237,242,255,0.7)] hover:no-underline md:px-5"
						>
							<p class="m-0 font-ui text-[0.99rem] font-semibold leading-[1.35] text-brand-blue-dark">
								{formatDisplayWorkTitle(work.title)}
							</p>
							{#if work.titleVariants.length > 0}
								<p class="m-0 text-[0.92rem] leading-[1.5] text-text-soft">
									{formatDisplayWorkTitleList(work.titleVariants).join(' | ')}
								</p>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</section>
</div>
