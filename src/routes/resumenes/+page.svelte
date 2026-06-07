<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { normalizePlainText } from '$lib/search/normalize';
	import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';

	interface SummarySearchResult {
		slug: string;
		title: string;
		genre: string;
		traditional: string;
		snippet?: SummarySearchSnippet;
		snippets?: SummarySearchSnippet[];
	}

	interface SummarySearchSnippet {
			before: string;
			match: string;
			after: string;
	}

	interface SummarySearchPayload {
		query: string;
		total: number;
		offset: number;
		limit: number;
		hasMore: boolean;
		results: SummarySearchResult[];
	}

	interface SummaryListWork {
		slug: string;
		title: string;
		titleVariants: string[];
		titleSearchText: string;
		traditional: string;
		genre: string;
	}

	interface SummaryWorksPayload {
		works: SummaryListWork[];
	}

	const RESUMENES_SEO_DESCRIPTION =
		'Resúmenes automáticos de las obras incluidas en la base de datos de ETSO.';
	const SUMMARY_SEARCH_MIN_LENGTH = 2;
	const SUMMARY_SEARCH_PAGE_SIZE = 20;
	const SUMMARY_LIST_PAGE_SIZE = 80;

	let query = $state('');
	let works = $state<SummaryListWork[]>([]);
	let worksLoading = $state(true);
	let worksError = $state('');
	let visibleWorkCount = $state(SUMMARY_LIST_PAGE_SIZE);
	let summaryTermInput = $state('');
	let summarySearchTerms = $state<string[]>([]);
	let summarySearchResults = $state<SummarySearchResult[]>([]);
	let summarySearchTotal = $state(0);
	let summarySearchHasMore = $state(false);
	let summarySearchLoading = $state(false);
	let summarySearchLoadingMore = $state(false);
	let summarySearchError = $state('');
	let summarySearchRequestId = 0;

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const summarySearchQuery = $derived(summarySearchTerms.join(' '));

	const getResultSnippets = (result: SummarySearchResult): SummarySearchSnippet[] =>
		Array.isArray(result.snippets) && result.snippets.length > 0
			? result.snippets
			: result.snippet
				? [result.snippet]
				: [];

	const formatGenre = (genre: string): string => genre.trim() || 'Sin género';

	const filteredWorks = $derived.by(() => {
		const normalizedQuery = normalizeFilterText(query);
		if (!normalizedQuery) return works;

		return works.filter((work) => {
			return work.titleSearchText.includes(normalizedQuery);
		});
	});
	const visibleWorks = $derived(filteredWorks.slice(0, visibleWorkCount));
	const hiddenWorkCount = $derived(Math.max(0, filteredWorks.length - visibleWorks.length));

	const loadSummarySearchResults = async ({
		cleanQuery,
		offset,
		append,
		requestId
	}: {
		cleanQuery: string;
		offset: number;
		append: boolean;
		requestId: number;
	}): Promise<void> => {
		if (append) {
			summarySearchLoadingMore = true;
		} else {
			summarySearchLoading = true;
		}
		summarySearchError = '';

		try {
			const params = new URLSearchParams({
				q: cleanQuery,
				offset: String(offset),
				limit: String(SUMMARY_SEARCH_PAGE_SIZE),
				shape: 'snippets-v2'
			});
			const response = await fetch(`/api/resumenes/search?${params.toString()}`);
			if (!response.ok) throw new Error(`No se pudo buscar en los resúmenes (${response.status}).`);
			const payload = (await response.json()) as SummarySearchPayload;
			if (requestId !== summarySearchRequestId) return;
			summarySearchResults = append ? [...summarySearchResults, ...payload.results] : payload.results;
			summarySearchTotal = payload.total;
			summarySearchHasMore = payload.hasMore;
		} catch (cause) {
			if (requestId !== summarySearchRequestId) return;
			if (!append) {
				summarySearchResults = [];
				summarySearchTotal = 0;
			}
			summarySearchHasMore = false;
			summarySearchError = cause instanceof Error ? cause.message : 'No se pudo buscar en los resúmenes.';
		} finally {
			if (requestId === summarySearchRequestId) {
				summarySearchLoading = false;
				summarySearchLoadingMore = false;
			}
		}
	};

	const loadMoreSummaryResults = (): void => {
		const cleanQuery = summarySearchQuery.trim();
		if (!cleanQuery || summarySearchLoading || summarySearchLoadingMore || !summarySearchHasMore) return;
		void loadSummarySearchResults({
			cleanQuery,
			offset: summarySearchResults.length,
			append: true,
			requestId: summarySearchRequestId
		});
	};

	const addSummarySearchTerm = (): void => {
		const cleanTerm = summaryTermInput.replace(/\s+/g, ' ').trim();
		if (cleanTerm.length < SUMMARY_SEARCH_MIN_LENGTH) return;

		const normalizedTerm = normalizeFilterText(cleanTerm);
		if (!normalizedTerm) return;
		if (summarySearchTerms.some((term) => normalizeFilterText(term) === normalizedTerm)) {
			summaryTermInput = '';
			return;
		}

		summarySearchTerms = [...summarySearchTerms, cleanTerm];
		summaryTermInput = '';
	};

	const removeSummarySearchTerm = (termToRemove: string): void => {
		summarySearchTerms = summarySearchTerms.filter((term) => term !== termToRemove);
	};

	const handleSummaryTermKeydown = (event: KeyboardEvent): void => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		addSummarySearchTerm();
	};

	const warmupSummarySearchIndex = (): void => {
		void fetch('/api/resumenes/search?warmup=1', {
			cache: 'no-store',
			keepalive: true
		}).catch(() => {
			// El precalentamiento no debe bloquear ni mostrar error: la búsqueda normal lo reintentará.
		});
	};

	const loadSummaryWorks = async (): Promise<void> => {
		worksLoading = true;
		worksError = '';

		try {
			const response = await fetch('/api/resumenes/works');
			if (!response.ok) throw new Error(`No se pudo cargar el listado de resúmenes (${response.status}).`);
			const payload = (await response.json()) as SummaryWorksPayload;
			works = payload.works;
		} catch (cause) {
			works = [];
			worksError = cause instanceof Error ? cause.message : 'No se pudo cargar el listado de resúmenes.';
		} finally {
			worksLoading = false;
		}
	};

	onMount(() => {
		void loadSummaryWorks();

		if ('requestIdleCallback' in window) {
			const idleCallback = window.requestIdleCallback(warmupSummarySearchIndex, { timeout: 1800 });
			return () => window.cancelIdleCallback(idleCallback);
		}

		const timeout = globalThis.setTimeout(warmupSummarySearchIndex, 450);
		return () => globalThis.clearTimeout(timeout);
	});

	$effect(() => {
		if (!browser) return;
		const cleanQuery = summarySearchQuery.trim();
		const requestId = ++summarySearchRequestId;

		if (cleanQuery.length < SUMMARY_SEARCH_MIN_LENGTH) {
			summarySearchResults = [];
			summarySearchTotal = 0;
			summarySearchHasMore = false;
			summarySearchLoading = false;
			summarySearchLoadingMore = false;
			summarySearchError = '';
			return;
		}

		void loadSummarySearchResults({ cleanQuery, offset: 0, append: false, requestId });
	});

	$effect(() => {
		query;
		visibleWorkCount = SUMMARY_LIST_PAGE_SIZE;
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
				{#if summarySearchQuery.trim()}
					{#if summarySearchLoading}
						{summarySearchTerms.length} {summarySearchTerms.length === 1 ? 'término activo' : 'términos activos'}
					{:else}
						{summarySearchResults.length} de {summarySearchTotal} resúmenes encontrados
					{/if}
				{:else}
				{#if worksLoading}
					Cargando listado de resúmenes...
				{:else if worksError}
					Listado no disponible
				{:else}
					{visibleWorks.length} de {filteredWorks.length} obras visibles
				{/if}
			{/if}
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="resumenes-summary-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar en los resúmenes</span>
			<input
				id="resumenes-summary-query"
				type="search"
				placeholder="Escribe una palabra y pulsa Enter..."
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={summaryTermInput}
				onkeydown={handleSummaryTermKeydown}
			/>
		</label>

		{#if summarySearchTerms.length > 0}
			<div class="flex flex-wrap gap-2" aria-label="Palabras de búsqueda activas">
				{#each summarySearchTerms as term}
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-full border border-border-accent-blue bg-surface-accent-blue px-3 py-1.5 font-ui text-[0.9rem] font-semibold text-brand-blue-dark transition hover:bg-white"
						onclick={() => removeSummarySearchTerm(term)}
						aria-label={`Quitar ${term} de la búsqueda`}
					>
						<span>{term}</span>
						<span aria-hidden="true" class="text-[1.05rem] leading-none text-text-accent-purple">×</span>
					</button>
				{/each}
			</div>
		{:else if summaryTermInput.trim().length > 0 && summaryTermInput.trim().length < SUMMARY_SEARCH_MIN_LENGTH}
			<p class="m-0 italic text-text-soft">Escribe al menos dos caracteres y pulsa Enter.</p>
		{/if}

		{#if summarySearchQuery.trim()}
			{#if summarySearchLoading}
				<p class="m-0 inline-flex items-center gap-2 italic text-text-soft">
					<span
						class="h-4 w-4 animate-spin rounded-full border-2 border-border-accent-blue border-t-brand-blue-dark"
						aria-hidden="true"
					></span>
					<span>Buscando resúmenes... La primera búsqueda puede tardar un poco.</span>
				</p>
			{:else if summarySearchError}
				<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[#8f1e36]">{summarySearchError}</p>
			{:else if summarySearchResults.length === 0}
				<p class="m-0 italic text-text-soft">No hay resúmenes que contengan esas palabras.</p>
			{:else}
				<div class="grid gap-3">
					{#each summarySearchResults as result}
						<a
							href={`/obras/${result.slug}/resumen`}
							class="grid gap-2 rounded-[10px] border border-border bg-white px-4 py-3 text-inherit no-underline shadow-[0_8px_24px_rgba(25,46,80,0.05)] transition hover:border-border-accent-blue hover:bg-[rgba(237,242,255,0.55)] hover:no-underline md:px-5"
						>
							<p class="m-0 font-ui text-[1rem] leading-[1.4] text-brand-blue-dark">
								<span class="font-semibold">{result.title}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-main">{result.traditional}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-soft">{result.genre}</span>
							</p>
							<div class="grid gap-1.5">
								{#each getResultSnippets(result) as snippet}
									<p class="m-0 text-[0.95rem] leading-[1.65] text-text-main">
										{snippet.before}<mark class="rounded-[4px] bg-[#ffe49a] px-0.5 text-[#4d3200]">{snippet.match}</mark>{snippet.after}
									</p>
								{/each}
							</div>
						</a>
					{/each}
					{#if summarySearchHasMore}
						<div class="flex justify-center pt-1">
							<button
								type="button"
								class="inline-flex items-center justify-center rounded-[9px] border border-border-accent-blue bg-white px-5 py-2.5 font-ui text-[0.94rem] font-semibold text-brand-blue-dark shadow-[0_8px_24px_rgba(25,46,80,0.05)] transition hover:bg-surface-accent-blue disabled:cursor-wait disabled:opacity-65"
								disabled={summarySearchLoadingMore}
								onclick={loadMoreSummaryResults}
							>
								{summarySearchLoadingMore ? 'Cargando...' : `Ver más (${Math.min(SUMMARY_SEARCH_PAGE_SIZE, summarySearchTotal - summarySearchResults.length)} más)`}
							</button>
						</div>
					{/if}
				</div>
			{/if}
		{/if}

		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="resumenes-obras-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">Buscar obra por título</span>
			<input
				id="resumenes-obras-query"
				type="search"
				placeholder="Ej: La dama boba, Don Gil de las calzas verdes..."
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={query}
			/>
		</label>

		{#if worksLoading}
			<p class="m-0 inline-flex items-center gap-2 italic text-text-soft">
				<span
					class="h-4 w-4 animate-spin rounded-full border-2 border-border-accent-blue border-t-brand-blue-dark"
					aria-hidden="true"
				></span>
				<span>Cargando listado de obras con resumen...</span>
			</p>
		{:else if worksError}
			<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[#8f1e36]">{worksError}</p>
		{:else if filteredWorks.length === 0}
			<p class="m-0 italic text-text-soft">No hay obras que coincidan con la búsqueda.</p>
		{:else}
			<div class="overflow-hidden bg-[rgba(255,255,255,0.52)]">
				<div class="divide-y divide-[rgba(0,51,167,0.08)]">
					{#each visibleWorks as work}
						<a
							href={`/obras/${work.slug}/resumen`}
							class="grid gap-1 px-4 py-3 text-inherit no-underline transition hover:bg-[rgba(237,242,255,0.7)] hover:no-underline md:px-5"
						>
							<p class="m-0 font-ui text-[0.99rem] leading-[1.45] text-brand-blue-dark">
								<span class="font-semibold">{formatDisplayWorkTitle(work.title)}</span>
								<span class="mx-1.5 text-text-soft/70">·</span>
								<span class="font-normal text-text-main">{work.traditional}</span>
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
			{#if hiddenWorkCount > 0}
				<div class="flex justify-center pt-1">
					<button
						type="button"
						class="inline-flex items-center justify-center rounded-[9px] border border-border-accent-blue bg-white px-5 py-2.5 font-ui text-[0.94rem] font-semibold text-brand-blue-dark shadow-[0_8px_24px_rgba(25,46,80,0.05)] transition hover:bg-surface-accent-blue"
						onclick={() => {
							visibleWorkCount += SUMMARY_LIST_PAGE_SIZE;
						}}
					>
						Ver más ({Math.min(SUMMARY_LIST_PAGE_SIZE, hiddenWorkCount)} más)
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>
