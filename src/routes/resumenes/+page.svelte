<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { normalizePlainText } from '$lib/search/normalize';
	import {
		buildWorkTitleSearchText,
		formatDisplayWorkTitle
	} from '$lib/utils/format-display-work-title';

	import type { AttributionSet } from '$lib/domain/catalog';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const RESUMENES_SEO_DESCRIPTION =
		'Resúmenes automáticos de las obras incluidas en la base de datos de ETSO.';

	let query = $state('');

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const formatNameList = (names: string[]): string => {
		if (names.length === 0) return '';
		if (names.length === 1) return names[0];
		if (names.length === 2) return `${names[0]} y ${names[1]}`;
		return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
	};

	const formatTraditionalAttribution = (set: AttributionSet): string => {
		if (set.unresolved || set.groups.length === 0) return 'Desconocido';

		const names: string[] = [];
		const seen = new Set<string>();
		for (const group of set.groups) {
			for (const member of group.members) {
				const authorName = member.authorName.trim();
				if (!authorName || seen.has(authorName)) continue;
				seen.add(authorName);
				names.push(authorName);
			}
		}

		return names.length > 0 ? formatNameList(names) : 'Desconocido';
	};

	const formatGenre = (genre: string): string => genre.trim() || 'Sin género';

	const filteredWorks = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);
		if (!normalizedQuery) return data.works;

		return data.works.filter((work) => {
			const haystack = normalizeFilterText(buildWorkTitleSearchText(work.title, work.titleVariants));
			return haystack.includes(normalizedQuery);
		});
	});
</script>

<SeoHead title="Resúmenes" description={RESUMENES_SEO_DESCRIPTION} path="/resumenes" />

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Resúmenes' }]} />

	<section class="grid gap-3">
		<h1 class="m-0 font-ui text-[clamp(1.8rem,3vw,2.35rem)] font-bold leading-[1.12] text-brand-blue-dark">Resúmenes</h1>
		<p class="m-0 leading-[1.65] text-text-main">
			Hemos generado resúmenes automáticos de las obras incluidas en la base de datos de ETSO. Estos textos ofrecen una primera orientación sobre el argumento y el contenido de cada obra, aunque deben entenderse como una ayuda inicial y no como sustituto de la lectura ni del análisis filológico.
		</p>
		<p class="m-0 leading-[1.65] text-text-main">
			Puedes acceder al resumen de cada obra desde este listado o desde la ficha individual de la obra, clicando en el acceso al resumen automático.
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{filteredWorks.length} de {data.works.length} obras visibles
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="resumenes-obras-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar obra</span>
			<input
				id="resumenes-obras-query"
				type="search"
				placeholder="Ej: La dama boba, Don Gil de las calzas verdes..."
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
							href={`/obras/${work.slug}/resumen`}
							class="grid gap-1 px-4 py-3 text-inherit no-underline transition hover:bg-[rgba(237,242,255,0.7)] hover:no-underline md:px-5"
						>
							<p class="m-0 font-ui text-[0.99rem] leading-[1.45] text-brand-blue-dark">
								<span class="font-semibold">{formatDisplayWorkTitle(work.title)}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-main">{formatTraditionalAttribution(work.traditionalAttribution)}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-soft">{formatGenre(work.genre)}</span>
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
