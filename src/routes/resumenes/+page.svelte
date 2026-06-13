<script lang="ts">
	import { browser } from '$app/environment';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { translateText } from '$lib/i18n';
	import { normalizePlainText } from '$lib/search/normalize';
	import {
		buildWorkTitleSearchText,
		formatDisplayWorkTitle
	} from '$lib/utils/format-display-work-title';

	import type { PageData } from './$types';

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

	interface SummarySearchIndexEntry {
		id: string;
		slug: string;
		title: string;
		displayTitle: string;
		genre: string;
		traditional: string;
		summaryText: string;
		normalizedSummaryText: string;
	}

	interface SummarySearchIndexPayload {
		schemaVersion: string;
		generatedAt: string;
		entries: SummarySearchIndexEntry[];
	}

	let { data }: { data: PageData } = $props();
	const t = (value: string): string => translateText(data.locale, value);
	const summaryCountLabelsByLocale = {
		es: {
			activeTerm: 'término activo',
			activeTerms: 'términos activos',
			of: 'de',
			more: 'más',
			summariesFound: 'resúmenes encontrados',
			visibleWorks: 'obras visibles'
		},
		en: {
			activeTerm: 'active term',
			activeTerms: 'active terms',
			of: 'of',
			more: 'more',
			summariesFound: 'summaries found',
			visibleWorks: 'visible works'
		},
		fr: {
			activeTerm: 'terme actif',
			activeTerms: 'termes actifs',
			of: 'sur',
			more: 'de plus',
			summariesFound: 'résumés trouvés',
			visibleWorks: 'œuvres visibles'
		},
		pt: {
			activeTerm: 'termo ativo',
			activeTerms: 'termos ativos',
			of: 'de',
			more: 'mais',
			summariesFound: 'resumos encontrados',
			visibleWorks: 'obras visíveis'
		},
		it: {
			activeTerm: 'termine attivo',
			activeTerms: 'termini attivi',
			of: 'di',
			more: 'altri',
			summariesFound: 'riassunti trovati',
			visibleWorks: 'opere visibili'
		},
		de: {
			activeTerm: 'aktiver Begriff',
			activeTerms: 'aktive Begriffe',
			of: 'von',
			more: 'mehr',
			summariesFound: 'Zusammenfassungen gefunden',
			visibleWorks: 'sichtbare Werke'
		},
		zh: {
			activeTerm: '个活跃词',
			activeTerms: '个活跃词',
			of: '/',
			more: '更多',
			summariesFound: '个摘要',
			visibleWorks: '部可见作品'
		},
		ja: {
			activeTerm: '有効な語',
			activeTerms: '有効な語',
			of: '/',
			more: 'さらに',
			summariesFound: '件の要約',
			visibleWorks: '件の表示中の作品'
		},
		ko: {
			activeTerm: '활성 검색어',
			activeTerms: '활성 검색어',
			of: '/',
			more: '더',
			summariesFound: '개 요약',
			visibleWorks: '개의 표시된 작품'
		},
		ru: {
			activeTerm: 'активный термин',
			activeTerms: 'активных терминов',
			of: 'из',
			more: 'еще',
			summariesFound: 'найденных аннотаций',
			visibleWorks: 'видимых произведений'
		},
		ar: {
			activeTerm: 'مصطلح نشط',
			activeTerms: 'مصطلحات نشطة',
			of: 'من',
			more: 'إضافية',
			summariesFound: 'ملخصات مطابقة',
			visibleWorks: 'أعمال معروضة'
		}
	} as const;
	const summaryCountLabels = $derived(summaryCountLabelsByLocale[data.locale] ?? summaryCountLabelsByLocale.es);
	const RESUMENES_SEO_DESCRIPTION =
		'Resúmenes automáticos de las obras incluidas en la base de datos de ETSO.';
	const SUMMARY_SEARCH_MIN_LENGTH = 2;
	const SUMMARY_SEARCH_PAGE_SIZE = 20;
	const WORKS_PAGE_SIZE = 80;

	let query = $state('');
	let visibleWorkCount = $state(WORKS_PAGE_SIZE);
	let summaryTermInput = $state('');
	let summarySearchTerms = $state<string[]>([]);
	let summarySearchResults = $state<SummarySearchResult[]>([]);
	let summarySearchTotal = $state(0);
	let summarySearchHasMore = $state(false);
	let summarySearchLoading = $state(false);
	let summarySearchLoadingMore = $state(false);
	let summarySearchError = $state('');
	let summarySearchRequestId = 0;
	let summarySearchIndex = $state<SummarySearchIndexEntry[] | null>(null);
	let summarySearchIndexPromise: Promise<SummarySearchIndexEntry[]> | null = null;

	const normalizeFilterText = (value: string): string =>
		normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

	const summarySearchQuery = $derived(summarySearchTerms.join(' '));

	const getResultSnippets = (result: SummarySearchResult): SummarySearchSnippet[] =>
		Array.isArray(result.snippets) && result.snippets.length > 0
			? result.snippets
			: result.snippet
				? [result.snippet]
				: [];

	const splitSearchTerms = (value: string): string[] =>
		[...new Set(normalizeFilterText(value)
			.split(/\s+/)
			.map((term) => term.trim())
			.filter((term) => term.length > 0))];

	const buildNormalizedIndex = (value: string): { normalized: string; originalIndexes: number[] } => {
		let normalized = '';
		const originalIndexes: number[] = [];

		for (let index = 0; index < value.length; index += 1) {
			const normalizedChar = normalizePlainText(value[index] ?? '', false);
			if (!normalizedChar) continue;
			for (const char of normalizedChar) {
				normalized += char;
				originalIndexes.push(index);
			}
		}

		return { normalized, originalIndexes };
	};

	const makeSnippet = (
		rawText: string,
		indexedText: { normalized: string; originalIndexes: number[] },
		term: string
	): SummarySearchSnippet | null => {
		const normalizedMatchIndex = indexedText.normalized.indexOf(term);
		if (normalizedMatchIndex < 0) return null;

		const matchStart = indexedText.originalIndexes[normalizedMatchIndex] ?? 0;
		const matchEnd = (indexedText.originalIndexes[normalizedMatchIndex + term.length - 1] ?? matchStart) + 1;
		const snippetStart = Math.max(0, matchStart - 145);
		const snippetEnd = Math.min(rawText.length, matchEnd + 145);

		return {
			before: `${snippetStart > 0 ? '...' : ''}${rawText.slice(snippetStart, matchStart)}`,
			match: rawText.slice(matchStart, matchEnd),
			after: `${rawText.slice(matchEnd, snippetEnd)}${snippetEnd < rawText.length ? '...' : ''}`
		};
	};

	const makeSnippets = (rawText: string, terms: string[]): SummarySearchSnippet[] => {
		const indexedText = buildNormalizedIndex(rawText);
		const snippets: SummarySearchSnippet[] = [];

		for (const term of terms) {
			const snippet = makeSnippet(rawText, indexedText, term);
			if (!snippet) return [];
			snippets.push(snippet);
		}

		return snippets;
	};

	const loadSummarySearchIndex = async (): Promise<SummarySearchIndexEntry[]> => {
		if (summarySearchIndex) return summarySearchIndex;
		if (summarySearchIndexPromise) return summarySearchIndexPromise;

		summarySearchIndexPromise = fetch(data.summarySearchIndexUrl)
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(`No se pudo cargar el índice de resúmenes (${response.status}).`);
				}
				const payload = (await response.json()) as SummarySearchIndexPayload;
				if (!Array.isArray(payload.entries)) {
					throw new Error('El índice de resúmenes no tiene el formato esperado.');
				}
				summarySearchIndex = payload.entries;
				return payload.entries;
			})
			.finally(() => {
				summarySearchIndexPromise = null;
			});

		return summarySearchIndexPromise;
	};

	const searchSummaryIndex = (
		index: SummarySearchIndexEntry[],
		terms: string[],
		offset: number,
		limit: number
	): { total: number; hasMore: boolean; results: SummarySearchResult[] } => {
		const results: SummarySearchResult[] = [];
		let matchedCount = 0;

		for (const entry of index) {
			if (!terms.every((term) => entry.normalizedSummaryText.includes(term))) continue;

			const snippets = makeSnippets(entry.summaryText, terms);
			if (snippets.length !== terms.length) continue;

			if (matchedCount >= offset && results.length < limit) {
				results.push({
					slug: entry.slug,
					title: entry.displayTitle,
					genre: entry.genre,
					traditional: entry.traditional,
					snippets
				});
			}

			matchedCount += 1;
		}

		return {
			total: matchedCount,
			hasMore: offset + results.length < matchedCount,
			results
		};
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
	const visibleWorks = $derived(filteredWorks.slice(0, visibleWorkCount));
	const hiddenWorksCount = $derived(Math.max(0, filteredWorks.length - visibleWorks.length));

	const showMoreWorks = (): void => {
		visibleWorkCount = Math.min(filteredWorks.length, visibleWorkCount + WORKS_PAGE_SIZE);
	};

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
			const index = await loadSummarySearchIndex();
			const terms = splitSearchTerms(cleanQuery);
			const payload = searchSummaryIndex(index, terms, offset, SUMMARY_SEARCH_PAGE_SIZE);
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
		visibleWorkCount = WORKS_PAGE_SIZE;
	});
</script>

<SeoHead title="Resúmenes" description={RESUMENES_SEO_DESCRIPTION} path="/resumenes" />

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Resúmenes' }]} />

	<section class="grid gap-3">
		<h1 class="m-0 font-ui text-[clamp(1.8rem,3vw,2.35rem)] font-bold leading-[1.12] text-brand-blue-dark">Resúmenes</h1>
		<p class="m-0 leading-[1.65] text-text-main">
			{t('Hemos generado resúmenes automáticos de las obras incluidas en la base de datos de ETSO. Estos textos ofrecen una primera orientación sobre el argumento y el contenido de cada obra, aunque deben entenderse como una ayuda inicial y no como sustituto de la lectura ni del análisis filológico.')}
		</p>
		<p class="m-0 leading-[1.65] text-text-main">
			{t('Puedes acceder al resumen de cada obra desde este listado o desde la ficha individual de la obra, clicando en el acceso al resumen automático.')}
		</p>
		<p class="m-0 text-[0.92rem] font-medium text-text-soft">
			{#if summarySearchQuery.trim()}
				{#if summarySearchLoading}
					{summarySearchTerms.length} {summarySearchTerms.length === 1 ? summaryCountLabels.activeTerm : summaryCountLabels.activeTerms}
				{:else}
					{summarySearchResults.length} {summaryCountLabels.of} {summarySearchTotal} {summaryCountLabels.summariesFound}
				{/if}
			{:else}
				{visibleWorks.length} {summaryCountLabels.of} {filteredWorks.length} {summaryCountLabels.visibleWorks}
			{/if}
		</p>
	</section>

	<section class="grid gap-4">
		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="resumenes-summary-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">{t('Buscar en los resúmenes')}</span>
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
			<p class="m-0 italic text-text-soft">{t('Escribe al menos dos caracteres y pulsa Enter.')}</p>
		{/if}

		{#if summarySearchQuery.trim()}
			{#if summarySearchLoading}
				<p class="m-0 inline-flex items-center gap-2 italic text-text-soft">
					<span
						class="h-4 w-4 animate-spin rounded-full border-2 border-border-accent-blue border-t-brand-blue-dark"
						aria-hidden="true"
					></span>
					<span>{t('Buscando resúmenes... La primera búsqueda puede tardar un poco.')}</span>
				</p>
			{:else if summarySearchError}
				<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[#8f1e36]">{summarySearchError}</p>
			{:else if summarySearchResults.length === 0}
				<p class="m-0 italic text-text-soft">{t('No hay resúmenes que contengan esas palabras.')}</p>
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
								{summarySearchLoadingMore ? t('Cargando...') : `${t('Ver más')} (${Math.min(SUMMARY_SEARCH_PAGE_SIZE, summarySearchTotal - summarySearchResults.length)} ${summaryCountLabels.more})`}
							</button>
						</div>
					{/if}
				</div>
			{/if}
		{/if}

		<label class="grid gap-1 text-[0.86rem] text-text-soft" for="resumenes-obras-query">
			<span class="font-ui font-semibold uppercase tracking-[0.04em]">{t('Buscar obra por título')}</span>
			<input
				id="resumenes-obras-query"
				type="search"
				placeholder="Ej: La dama boba, Don Gil de las calzas verdes..."
				class="w-full rounded-md border border-border bg-white px-3 py-2 text-[0.95rem] text-text-main"
				bind:value={query}
			/>
		</label>

		{#if filteredWorks.length === 0}
			<p class="m-0 italic text-text-soft">{t('No hay obras que coincidan con la búsqueda.')}</p>
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
			{#if hiddenWorksCount > 0}
				<div class="flex justify-center pt-1">
					<button
						type="button"
						class="inline-flex items-center justify-center rounded-[9px] border border-border-accent-blue bg-white px-5 py-2.5 font-ui text-[0.94rem] font-semibold text-brand-blue-dark shadow-[0_8px_24px_rgba(25,46,80,0.05)] transition hover:bg-surface-accent-blue"
						onclick={showMoreWorks}
					>
						{t('Ver más')} ({Math.min(WORKS_PAGE_SIZE, hiddenWorksCount)} {summaryCountLabels.more})
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>
