<script lang="ts">
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { normalizePlainText } from '$lib/search/normalize';
	import {
		buildWorkTitleSearchText,
		formatDisplayWorkTitle
	} from '$lib/utils/format-display-work-title';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const TEXORO_AUTORES_SEO_DESCRIPTION =
		'Listado de autores presentes en TEXORO, con sus obras asociadas por atribución tradicional.';

	let query = $state('');

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const formatGenre = (genre: string): string => genre.trim() || 'Sin género';

	const filteredAuthors = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);
		if (!normalizedQuery) return data.authors;

		return data.authors.filter((author) => {
			const workText = author.works
				.map((work) => buildWorkTitleSearchText(work.title, work.titleVariants))
				.join(' ');
			const haystack = normalizeFilterText([author.name, ...author.nameVariants, workText].join(' '));
			return haystack.includes(normalizedQuery);
		});
	});
</script>

<SeoHead title="Autores de TEXORO" description={TEXORO_AUTORES_SEO_DESCRIPTION} path="/texoro/autores" />

<div class="grid gap-6">
	<Breadcrumbs
		items={[
			{ label: 'Inicio', href: '/' },
			{ label: 'TEXORO', href: '/texoro' },
			{ label: 'Autores' }
		]}
	/>

	<section class="grid gap-3">
		<h1 class="m-0 font-ui text-[clamp(1.8rem,3vw,2.35rem)] font-bold leading-[1.12] text-brand-blue-dark">Autores</h1>
		<p class="m-0 leading-[1.65] text-text-main">
			Listado alfabético de los autores presentes en TEXORO según la atribución tradicional. Usa el buscador para localizar un nombre o una obra.
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{filteredAuthors.length} de {data.authors.length} autores visibles
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="texoro-autores-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar autor</span>
			<input
				id="texoro-autores-query"
				type="search"
				placeholder="Ej: Lope de Vega, Moreto, Ruiz de Alarcón..."
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={query}
			/>
		</label>

		{#if filteredAuthors.length === 0}
			<p class="m-0 italic text-text-soft">No hay autores que coincidan con la búsqueda.</p>
		{:else}
			<div class="overflow-hidden bg-[rgba(255,255,255,0.52)]">
				<div class="divide-y divide-[rgba(0,51,167,0.08)]">
					{#each filteredAuthors as author}
						<div class="grid gap-2 px-4 py-3 md:px-5">
							<p class="m-0 font-ui text-[0.99rem] font-semibold leading-[1.35] text-brand-blue-dark">{author.name}</p>
							{#if author.nameVariants.length > 0}
								<p class="m-0 text-[0.92rem] leading-[1.5] text-text-soft">{author.nameVariants.join(' | ')}</p>
							{/if}
								<div class="grid gap-1 pl-4">
									{#each author.works as work}
										<p class="m-0 text-[0.92rem] leading-[1.5] text-text-main">
											<span class="mr-1.5 text-text-soft" aria-hidden="true">·</span>
											<a
												href={`/obras/${work.slug}`}
												class="text-text-main no-underline hover:text-brand-blue-dark hover:underline focus:underline focus-visible:underline"
											>
												{formatDisplayWorkTitle(work.title)}
											</a>
											<span class="mx-1.5 text-text-soft/70">·</span>
											<span class="text-text-soft">{formatGenre(work.genre)}</span>
										</p>
									{/each}
								</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</section>
</div>
