<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import { normalizePlainText } from '$lib/search/normalize';

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
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Obras' }
		]}
	/>

	<section class="grid gap-3">
		<h1 class="m-0 font-ui text-[clamp(1.8rem,3vw,2.35rem)] font-bold leading-[1.12] text-brand-blue-dark">Obras</h1>
		<p class="m-0 leading-[1.65] text-text-main">
			Listado alfabético de las obras disponibles en Examen de autorías. Usa el buscador para localizar una obra y entrar directamente en su ficha.
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{filteredWorks.length} de {data.works.length} obras visibles
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="examen-obras-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar obra</span>
			<input
				id="examen-obras-query"
				type="search"
				placeholder="Ej: La monja alférez, El castigo sin venganza..."
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={query}
			/>
		</label>

		{#if filteredWorks.length === 0}
			<p class="m-0 italic text-text-soft">No hay obras que coincidan con la búsqueda.</p>
		{:else}
			<div class="overflow-hidden bg-[rgba(255,255,255,0.52)]">
				<div class="divide-y divide-[rgba(0,51,167,0.08)]">
					{#each filteredWorks as work}
						<a
							href={`/obras/${work.slug}`}
							class="grid gap-1 px-4 py-3 text-inherit no-underline transition hover:bg-[rgba(237,242,255,0.7)] hover:no-underline md:px-5"
						>
							<p class="m-0 font-ui text-[0.99rem] font-semibold leading-[1.35] text-brand-blue-dark">{work.title}</p>
							{#if work.titleVariants.length > 0}
								<p class="m-0 text-[0.92rem] leading-[1.5] text-text-soft">{work.titleVariants.join(' | ')}</p>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</section>
</div>
