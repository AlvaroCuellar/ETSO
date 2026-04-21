<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import { normalizePlainText } from '$lib/search/normalize';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const filteredDramaturgos = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);
		if (!normalizedQuery) return data.dramaturgos;

		return data.dramaturgos.filter((dramaturgo) => {
			const haystack = normalizeFilterText([dramaturgo.name, ...dramaturgo.nameVariants].join(' '));
			return haystack.includes(normalizedQuery);
		});
	});
</script>

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'Examen de autorías', href: '/examen-autorias' },
			{ label: 'Dramaturgos' }
		]}
	/>

	<section class="grid gap-3">
		<h1 class="m-0 font-ui text-[clamp(1.8rem,3vw,2.35rem)] font-bold leading-[1.12] text-brand-blue-dark">Dramaturgos</h1>
		<p class="m-0 leading-[1.65] text-text-main">
			Listado alfabético de los dramaturgos presentes en Examen de autorías. Usa el buscador para localizar un nombre y acceder a su ficha.
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{filteredDramaturgos.length} de {data.dramaturgos.length} dramaturgos visibles
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="examen-dramaturgos-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar dramaturgo</span>
			<input
				id="examen-dramaturgos-query"
				type="search"
				placeholder="Ej: Lope de Vega, Moreto, Ruiz de Alarcón..."
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={query}
			/>
		</label>

		{#if filteredDramaturgos.length === 0}
			<p class="m-0 italic text-text-soft">No hay dramaturgos que coincidan con la búsqueda.</p>
		{:else}
			<div class="overflow-hidden bg-[rgba(255,255,255,0.52)]">
				<div class="divide-y divide-[rgba(0,51,167,0.08)]">
					{#each filteredDramaturgos as dramaturgo}
						<a
							href={`/autores/${dramaturgo.id}`}
							class="grid gap-1 px-4 py-3 text-inherit no-underline transition hover:bg-[rgba(237,242,255,0.7)] hover:no-underline md:px-5"
						>
							<p class="m-0 font-ui text-[0.99rem] font-semibold leading-[1.35] text-brand-blue-dark">{dramaturgo.name}</p>
							{#if dramaturgo.nameVariants.length > 0}
								<p class="m-0 text-[0.92rem] leading-[1.5] text-text-soft">{dramaturgo.nameVariants.join(' | ')}</p>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</section>
</div>
