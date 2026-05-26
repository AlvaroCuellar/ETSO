<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import MatchToggle from '$lib/components/search/MatchToggle.svelte';
	import TokenMultiSelect from '$lib/components/search/TokenMultiSelect.svelte';
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import AppButton from '$lib/components/ui/AppButton.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import { getClientMemoryCache, loadClientMemoryCache } from '$lib/utils/client-memory-cache';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Feather from 'lucide-svelte/icons/feather';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import type { CatalogStats, CatalogWork, ObraTableRow } from '$lib/domain/catalog';

	import type { PageData } from './$types';

	interface TokenOption {
		id: string;
		label: string;
	}

	interface ExamenOptionsPayload {
		authors: Array<{ id: string; name: string }>;
		genres: string[];
		states: string[];
	}

	interface ExamenWorksPayload {
		works: CatalogWork[];
		page: number;
		pageSize: number;
		totalPages: number;
		totalResults: number;
	}

	type ExamenPageFilters = PageData['filters'];
	const EXAMEN_STATS_CACHE_KEY = 'examen-autorias:stats';
	const EXAMEN_OPTIONS_CACHE_KEY = 'examen-autorias:options';

	let { data }: { data: PageData } = $props();
	const getInitialFilters = () => data.filters;
	const getInitialPage = () => data.page;
	const getInitialPageSize = () => data.pageSize;
	const getInitialAuthorOptions = (): TokenOption[] =>
		data.authorOptions.map((author) => ({ id: author.id, label: author.name }));
	const getInitialGenreOptions = (): TokenOption[] =>
		data.genreOptions.map((genre) => ({ id: genre, label: genre }));
	const getInitialStateOptions = (): TokenOption[] =>
		data.stateOptions.map((value) => ({ id: value, label: value }));
	const initialFilters = getInitialFilters();
	const initialCatalogStats = getClientMemoryCache<CatalogStats>(EXAMEN_STATS_CACHE_KEY);

	let title = $state(initialFilters.titulo);
	let selectedGenres = $state<string[]>([...initialFilters.genero]);
	let selectedMainAuthors = $state<string[]>([...initialFilters.autor]);

	let advancedOpen = $state(
		initialFilters.tipo_autoria.length > 0 ||
			initialFilters.autor_trad.length > 0 ||
			initialFilters.autor_esto.length > 0 ||
			initialFilters.confianza.length > 0 ||
			initialFilters.estado.length > 0 ||
			Boolean(initialFilters.desde) ||
			Boolean(initialFilters.hasta)
	);
	let selectedAuthorshipTypes = $state<string[]>([...initialFilters.tipo_autoria]);
	let selectedTradAuthors = $state<string[]>([...initialFilters.autor_trad]);
	let tradMatch = $state<'or' | 'and'>(initialFilters.autor_trad_match);
	let selectedEstoAuthors = $state<string[]>([...initialFilters.autor_esto]);
	let estoMatch = $state<'or' | 'and'>(initialFilters.autor_esto_match);
	let selectedConfidence = $state<string[]>([...initialFilters.confianza]);
	let selectedStates = $state<string[]>([...initialFilters.estado]);
	let dateFrom = $state(initialFilters.desde);
	let dateTo = $state(initialFilters.hasta);
	let appliedFilterSignature = $state(JSON.stringify(initialFilters));
	let isSearching = $state(false);
	let isResultsLoading = $state(true);
	let resultsError = $state('');
	let resultsRegion = $state<HTMLElement | null>(null);
	let paginationRegion = $state<HTMLElement | null>(null);
	let authorOptionItems = $state<TokenOption[]>(getInitialAuthorOptions());
	let genreOptionItems = $state<TokenOption[]>(getInitialGenreOptions());
	let stateOptionItems = $state<TokenOption[]>(getInitialStateOptions());
	let catalogStats = $state<CatalogStats | null>(initialCatalogStats);
	let isStatsLoading = $state(!initialCatalogStats);
	let works = $state<CatalogWork[]>([]);
	let resultsPage = $state(getInitialPage());
	let pageSize = $state(getInitialPageSize());
	let totalPages = $state(1);
	let totalResults = $state(0);
	let resultsRequestId = 0;
	let statsRequest: Promise<void> | null = null;
	let filterOptionsRequest: Promise<void> | null = null;
	const worksPayloadCache = new Map<string, ExamenWorksPayload>();
	const worksPayloadRequests = new Map<string, Promise<ExamenWorksPayload>>();

	const mergeOptions = (base: TokenOption[], next: TokenOption[]): TokenOption[] => {
		const byId = new Map<string, TokenOption>();
		for (const option of base) byId.set(option.id, option);
		for (const option of next) byId.set(option.id, option);
		return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
	};

	const loadStats = async (): Promise<void> => {
		const cached = getClientMemoryCache<CatalogStats>(EXAMEN_STATS_CACHE_KEY);
		if (cached) {
			catalogStats = cached;
			isStatsLoading = false;
			return;
		}
		if (statsRequest) return statsRequest;
		statsRequest = (async () => {
			try {
				catalogStats = await loadClientMemoryCache<CatalogStats>(EXAMEN_STATS_CACHE_KEY, async () => {
					const response = await fetch('/api/examen-autorias/stats');
					if (!response.ok) throw new Error('No se pudieron cargar los indicadores.');
					return (await response.json()) as CatalogStats;
				});
			} catch {
				catalogStats = null;
			} finally {
				isStatsLoading = false;
			}
		})();
		return statsRequest;
	};

	const ensureFilterOptionsLoaded = async (): Promise<void> => {
		const cached = getClientMemoryCache<ExamenOptionsPayload>(EXAMEN_OPTIONS_CACHE_KEY);
		if (cached) {
			authorOptionItems = mergeOptions(
				authorOptionItems,
				cached.authors.map((author) => ({ id: author.id, label: author.name }))
			);
			genreOptionItems = mergeOptions(
				genreOptionItems,
				cached.genres.map((genre) => ({ id: genre, label: genre }))
			);
			stateOptionItems = mergeOptions(
				stateOptionItems,
				cached.states.map((value) => ({ id: value, label: value }))
			);
			return;
		}
		if (filterOptionsRequest) return filterOptionsRequest;
		filterOptionsRequest = (async () => {
			try {
				const payload = await loadClientMemoryCache<ExamenOptionsPayload>(EXAMEN_OPTIONS_CACHE_KEY, async () => {
					const response = await fetch('/api/examen-autorias/options');
					if (!response.ok) throw new Error(`No se pudieron cargar los filtros (${response.status}).`);
					return (await response.json()) as ExamenOptionsPayload;
				});
				authorOptionItems = mergeOptions(
					authorOptionItems,
					payload.authors.map((author) => ({ id: author.id, label: author.name }))
				);
				genreOptionItems = mergeOptions(
					genreOptionItems,
					payload.genres.map((genre) => ({ id: genre, label: genre }))
				);
				stateOptionItems = mergeOptions(
					stateOptionItems,
					payload.states.map((value) => ({ id: value, label: value }))
				);
			} catch {
				// Las opciones completas no bloquean la tabla; los filtros seleccionados ya llegan en SSR.
				filterOptionsRequest = null;
			}
		})();
		return filterOptionsRequest;
	};

	onMount(() => {
		void loadStats();
		void loadResultsForParams(new URLSearchParams(window.location.search));
	});

	const hasAdvancedFilterValues = (filters: ExamenPageFilters): boolean =>
		filters.tipo_autoria.length > 0 ||
		filters.autor_trad.length > 0 ||
		filters.autor_esto.length > 0 ||
		filters.confianza.length > 0 ||
		filters.estado.length > 0 ||
		Boolean(filters.desde) ||
		Boolean(filters.hasta);

	const applyFiltersToState = (filters: ExamenPageFilters): void => {
		title = filters.titulo;
		selectedGenres = [...filters.genero];
		selectedMainAuthors = [...filters.autor];
		selectedAuthorshipTypes = [...filters.tipo_autoria];
		selectedTradAuthors = [...filters.autor_trad];
		tradMatch = filters.autor_trad_match;
		selectedEstoAuthors = [...filters.autor_esto];
		estoMatch = filters.autor_esto_match;
		selectedConfidence = [...filters.confianza];
		selectedStates = [...filters.estado];
		dateFrom = filters.desde;
		dateTo = filters.hasta;
		advancedOpen = hasAdvancedFilterValues(filters);
	};

	$effect(() => {
		const nextSignature = JSON.stringify(data.filters);
		if (nextSignature === appliedFilterSignature) return;
		appliedFilterSignature = nextSignature;
		applyFiltersToState(data.filters);
		authorOptionItems = mergeOptions(
			authorOptionItems,
			data.authorOptions.map((author) => ({ id: author.id, label: author.name }))
		);
		genreOptionItems = mergeOptions(
			genreOptionItems,
			data.genreOptions.map((genre) => ({ id: genre, label: genre }))
		);
		stateOptionItems = mergeOptions(
			stateOptionItems,
			data.stateOptions.map((value) => ({ id: value, label: value }))
		);
	});

	const authorOptions = $derived(authorOptionItems);
	const genreOptions = $derived(genreOptionItems);
	const stateOptions = $derived(stateOptionItems);
	const confidenceOptions: TokenOption[] = [
		{ id: 'segura', label: 'Segura' },
		{ id: 'probable', label: 'Probable' }
	];
	const authorshipTypeOptions: TokenOption[] = [
		{ id: 'unica', label: 'Única' },
		{ id: 'colaboracion', label: 'Colaboración' }
	];

	const hasAdvancedFilters = $derived.by(
		() =>
			selectedAuthorshipTypes.length > 0 ||
			selectedTradAuthors.length > 0 ||
			selectedEstoAuthors.length > 0 ||
			selectedConfidence.length > 0 ||
			selectedStates.length > 0 ||
			Boolean(dateFrom) ||
			Boolean(dateTo)
	);
	const mainAuthorDisabled = $derived.by(
		() => selectedTradAuthors.length > 0 || selectedEstoAuthors.length > 0
	);

	$effect(() => {
		if (!hasAdvancedFilters) return;
		advancedOpen = true;
	});

	const dateRangeError = $derived.by(() => {
		if (!dateFrom || !dateTo) return '';
		if (dateFrom <= dateTo) return '';
		return 'La fecha "hasta" debe ser mayor o igual que la fecha "desde".';
	});

	const tableRows = $derived.by<ObraTableRow[]>(() =>
		works.map((work) => ({
			rowId: work.id,
			work
		}))
	);

	const totalWorks = $derived.by(() => catalogStats?.works ?? 0);
	const totalDramaturgos = $derived.by(() => catalogStats?.authors ?? 0);

	const appendValues = (params: URLSearchParams, key: string, values: string[]): void => {
		for (const value of values) {
			const trimmed = value.trim();
			if (trimmed) params.append(key, trimmed);
		}
	};

	const buildSearchParams = (page = 1): URLSearchParams => {
		const params = new URLSearchParams();
		if (title.trim()) params.set('titulo', title.trim());
		appendValues(params, 'genero', selectedGenres);
		appendValues(params, 'autor', mainAuthorDisabled ? [] : selectedMainAuthors);
		appendValues(params, 'tipo_autoria', selectedAuthorshipTypes);
		appendValues(params, 'autor_trad', selectedTradAuthors);
		if (selectedTradAuthors.length > 0 && tradMatch === 'and') params.set('autor_trad_match', tradMatch);
		appendValues(params, 'autor_esto', selectedEstoAuthors);
		if (selectedEstoAuthors.length > 0 && estoMatch === 'and') params.set('autor_esto_match', estoMatch);
		appendValues(params, 'confianza', selectedConfidence);
		appendValues(params, 'estado', selectedStates);
		if (dateFrom) params.set('desde', dateFrom);
		if (dateTo) params.set('hasta', dateTo);
		if (page > 1) params.set('page', String(page));
		return params;
	};

	const buildSearchUrl = (page = 1): string => {
		const params = buildSearchParams(page);
		const query = params.toString();
		return query ? `/examen-autorias?${query}` : '/examen-autorias';
	};

	const buildWorksApiUrl = (params: URLSearchParams): string => {
		const query = params.toString();
		return query ? `/api/examen-autorias/works?${query}` : '/api/examen-autorias/works';
	};

	const fetchWorksPayload = (params: URLSearchParams): Promise<ExamenWorksPayload> => {
		const url = buildWorksApiUrl(params);
		const cached = worksPayloadCache.get(url);
		if (cached) return Promise.resolve(cached);
		const existing = worksPayloadRequests.get(url);
		if (existing) return existing;

		const request = (async () => {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`No se pudieron cargar los resultados (${response.status}).`);
			const payload = (await response.json()) as ExamenWorksPayload;
			worksPayloadCache.set(url, payload);
			return payload;
		})();

		worksPayloadRequests.set(url, request);
		void request.then(
			() => {
				worksPayloadRequests.delete(url);
			},
			() => {
				worksPayloadRequests.delete(url);
			}
		);
		return request;
	};

	const applyResultsPayload = (payload: ExamenWorksPayload): void => {
		works = Array.isArray(payload.works) ? payload.works : [];
		resultsPage = payload.page;
		pageSize = payload.pageSize;
		totalPages = payload.totalPages;
		totalResults = payload.totalResults;
	};

	const buildPaginationUrl = (page: number): string => {
		const params = new URLSearchParams();
		if (data.filters.titulo.trim()) params.set('titulo', data.filters.titulo.trim());
		appendValues(params, 'genero', data.filters.genero);
		appendValues(params, 'autor', data.filters.autor);
		appendValues(params, 'tipo_autoria', data.filters.tipo_autoria);
		appendValues(params, 'autor_trad', data.filters.autor_trad);
		if (data.filters.autor_trad.length > 0 && data.filters.autor_trad_match === 'and') {
			params.set('autor_trad_match', data.filters.autor_trad_match);
		}
		appendValues(params, 'autor_esto', data.filters.autor_esto);
		if (data.filters.autor_esto.length > 0 && data.filters.autor_esto_match === 'and') {
			params.set('autor_esto_match', data.filters.autor_esto_match);
		}
		appendValues(params, 'confianza', data.filters.confianza);
		appendValues(params, 'estado', data.filters.estado);
		if (data.filters.desde) params.set('desde', data.filters.desde);
		if (data.filters.hasta) params.set('hasta', data.filters.hasta);
		if (page > 1) params.set('page', String(page));
		const query = params.toString();
		return query ? `/examen-autorias?${query}` : '/examen-autorias';
	};

	const loadResultsForParams = async (
		params: URLSearchParams,
		options: { clearBeforeLoad?: boolean } = {}
	): Promise<void> => {
		const { clearBeforeLoad = true } = options;
		const requestId = ++resultsRequestId;
		isResultsLoading = true;
		resultsError = '';
		if (clearBeforeLoad) works = [];
		try {
			const payload = await fetchWorksPayload(params);
			if (requestId !== resultsRequestId) return;
			applyResultsPayload(payload);
		} catch (cause) {
			if (requestId !== resultsRequestId) return;
			resultsError = cause instanceof Error ? cause.message : 'No se pudieron cargar los resultados.';
			if (clearBeforeLoad) works = [];
			resultsPage = 1;
			pageSize = data.pageSize;
			totalPages = 1;
			totalResults = 0;
		} finally {
			if (requestId === resultsRequestId) isResultsLoading = false;
		}
	};

	const scrollToResults = async (): Promise<void> => {
		await tick();
		(paginationRegion ?? resultsRegion)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	};

	const navigateToUrl = async (
		url: string,
		options: { scrollToTable?: boolean; searching?: boolean; clearBeforeLoad?: boolean } = {}
	): Promise<void> => {
		const { scrollToTable = true, searching = true, clearBeforeLoad = true } = options;
		if (searching) isSearching = true;
		try {
			await goto(url, { noScroll: true, keepFocus: true });
			const nextUrl = new URL(url, window.location.origin);
			await loadResultsForParams(nextUrl.searchParams, { clearBeforeLoad });
			if (scrollToTable) {
				await scrollToResults();
			}
		} finally {
			if (searching) isSearching = false;
		}
	};

	const applySearch = async (event: SubmitEvent): Promise<void> => {
		event.preventDefault();
		if (dateRangeError) return;
		await navigateToUrl(buildSearchUrl(1));
	};

	const navigateToPage = async (page: number): Promise<void> => {
		if (page < 1 || page > totalPages || page === resultsPage) return;
		await navigateToUrl(buildPaginationUrl(page), {
			scrollToTable: false,
			searching: false,
			clearBeforeLoad: false
		});
	};

	const prefetchPage = (page: number): void => {
		if (page < 1 || page > totalPages || page === resultsPage || isResultsLoading) return;
		const url = buildPaginationUrl(page);
		const nextUrl = new URL(url, window.location.origin);
		void fetchWorksPayload(nextUrl.searchParams).catch(() => {
			// El clic real mostrará el error si sigue ocurriendo.
		});
	};

	const clearFilters = async (event: MouseEvent): Promise<void> => {
		event.preventDefault();
		await navigateToUrl('/examen-autorias', { scrollToTable: false });
	};
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Examen de autorías' }]} />

	<FeatureHeroSection
		eyebrow=""
		title="Examen de autorías"
		titleTag="h2"
		subtitle="Análisis estilométrico de obras teatrales del Siglo de Oro"
		backgroundImage={fondoLogo}
		statsAriaLabel="Indicadores del catálogo"
	>
		<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-text-main">
			Examen de autorías es un espacio dedicado a la <b>atribución computacional</b> de autoría en el teatro
			del Siglo de Oro a gran escala. La plataforma, desarrollada por Álvaro Cuéllar y Germán Vega
			García-Luengos, ofrece resultados estilométricos sobre un corpus en expansión de unas 3.000 obras
			pertenecientes a más de 350 dramaturgos, con el propósito de facilitar la investigación y el
			contraste de hipótesis autorales.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-text-main">
			Los textos han sido modernizados y regularizados para hacer posible su comparación, y se han depurado
			en lo posible para reducir interferencias (por ejemplo, acotaciones y marcas de intervención). A
			partir de esta base, el sitio permite confrontar atribuciones transmitidas por la tradición con
			propuestas derivadas del análisis cuantitativo del estilo. El objetivo no es sustituir la lectura
			filológica, sino aportar evidencia adicional, reproducible y acumulativa que ayude a orientar futuras
			comprobaciones documentales y críticas.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-text-main">
			El corpus se nutre de fuentes abiertas y de aportaciones de investigadores y grupos, e integra
			también textos procedentes de transcripciones automáticas de impresos y manuscritos antiguos. Se
			aceptan consultas, colaboraciones y propuestas de ampliación: si dispones de una obra o conoces cómo
			acceder a ella, escríbenos y nos comprometemos a reconocer la procedencia en la tabla
			correspondiente y a compartir los resultados del análisis.
		</p>

		{#snippet stats()}
			<HeroStatCard
				Icon={BookOpen}
				href="/examen-autorias/obras"
				ariaLabel="Ver listado de obras"
				value={totalWorks}
				label="Obras"
				desktopOffset="up"
				loading={isStatsLoading || !catalogStats}
			/>

			<HeroStatCard
				Icon={Feather}
				href="/examen-autorias/dramaturgos"
				ariaLabel="Ver listado de dramaturgos"
				value={totalDramaturgos}
				label="Dramaturgos"
				desktopOffset="down"
				loading={isStatsLoading || !catalogStats}
			/>
		{/snippet}
	</FeatureHeroSection>

	<section class="rounded-[14px] p-5 font-['Roboto',sans-serif] leading-[1.6] text-text-main">
		<div class="min-w-0">
			<h2 class="m-0 font-['Roboto',sans-serif] text-[1.45rem] font-bold text-brand-blue-dark">Buscar en Examen de autorías</h2>
			<p class="mt-2 mb-0 text-[0.98rem] text-text-soft">
				Filtra las obras del corpus por título, género, atribuciones, estado textual y fecha de incorporación.
			</p>

			<form class="mt-5 grid gap-6" method="GET" action="/examen-autorias" onsubmit={applySearch}>
				<div class="grid gap-5">
					<div class="grid gap-5">
						<div class="grid grid-cols-1 gap-5 min-[1201px]:grid-cols-[3fr_1fr]">
							<div class="relative flex flex-col">
								<label class="mb-[6px] inline-flex items-center gap-1 font-['Roboto',sans-serif] text-[14px] font-semibold text-text-soft" for="filtro-titulo">
									Título
									<span class="group relative inline-flex items-center">
										<span
											class="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-border-accent-blue bg-surface-accent-blue text-[12px] leading-none font-bold text-brand-blue-dark"
											role="button"
											tabindex="0"
										>
											?
										</span>
										<span
											class="invisible absolute top-[calc(100%+8px)] left-0 z-20 w-[min(320px,78vw)] rounded-[6px] border border-border bg-white px-[10px] py-2 text-[12px] leading-[1.35] font-normal text-text-soft opacity-0 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
										>
											Busca por palabras del título.
										</span>
									</span>
								</label>
								<input
									id="filtro-titulo"
									name="titulo"
									type="text"
									class="box-border h-[46px] w-full rounded-[10px] border border-border bg-white px-3 text-[15px] text-text-main transition focus:border-brand-blue/35 focus:shadow-[0_0_0_3px_rgba(13,63,145,0.1)] focus:outline-none"
									placeholder="Ej: cada paso peligro, verdades amor..."
									bind:value={title}
								/>
							</div>

							<TokenMultiSelect
								name="genero"
								label="Género"
								placeholder="Escribe y selecciona géneros"
								options={genreOptions}
								selectedIds={selectedGenres}
								helpText="Selecciona uno o varios géneros. Puedes escribir para filtrar opciones."
								inputClass="js-static-multiselect"
								onIntent={() => {
									void ensureFilterOptionsLoaded();
								}}
								onChange={(nextIds) => {
									selectedGenres = nextIds;
								}}
							/>
						</div>

						<div class="grid grid-cols-1 gap-5">
							<TokenMultiSelect
								name="autor_ids"
								label="Atribución"
								placeholder="Escribe y selecciona autores"
								options={authorOptions}
								selectedIds={selectedMainAuthors}
								disabled={mainAuthorDisabled}
								helpText="Permite multiselección de autores. Este campo se desactiva si usas Atribución tradicional o estilometría en Más filtros."
								inputClass="js-author-multiselect"
								onIntent={() => {
									void ensureFilterOptionsLoaded();
								}}
								onChange={(nextIds) => {
									selectedMainAuthors = nextIds;
								}}
							/>
						</div>
					</div>

					<div class={`rounded-[10px] border border-border/70 bg-[var(--color-surface-subtle)] transition-[background-color,box-shadow] duration-200 ${advancedOpen ? 'overflow-visible shadow-[0_8px_24px_rgba(25,46,80,0.06)]' : 'overflow-hidden'}`}>
						<button
							type="button"
							class="flex w-full items-center justify-between gap-3 cursor-pointer border-0 bg-transparent px-4 py-[0.9rem] text-left font-['Roboto',sans-serif] text-[0.92rem] font-semibold text-brand-blue-dark transition hover:rounded-[10px] hover:bg-surface-accent-blue"
							data-target="advanced-content"
							aria-expanded={advancedOpen ? 'true' : 'false'}
							onclick={() => {
								const nextOpen = !advancedOpen;
								advancedOpen = nextOpen;
								if (nextOpen) void ensureFilterOptionsLoaded();
							}}
						>
							<span>Más filtros</span>
							<span class={`inline-flex items-center justify-center transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} aria-hidden="true">
								<ChevronDown class="h-[15px] w-[15px] stroke-[2.2]" />
							</span>
						</button>

						<div
							id="advanced-content"
							class={`border-t px-4 transition-[max-height,padding,opacity] duration-300 ease-out ${
								advancedOpen
									? 'max-h-[1200px] overflow-visible border-border-accent-blue py-[0.9rem] opacity-100'
									: 'max-h-0 border-transparent py-0 opacity-0'
							}`}
						>
							<div class="grid gap-6 bg-transparent py-3">
								<section class="grid gap-4">
									<h3 class="m-0 font-['Roboto',sans-serif] text-[0.98rem] font-semibold text-brand-blue-dark">
										Filtros de autoría
									</h3>

									<div class="grid grid-cols-1 gap-5 min-[1201px]:grid-cols-2">
										<div class="flex flex-col gap-4 rounded-[8px] border border-border bg-[var(--color-surface-subtle)] p-4">
											<TokenMultiSelect
												name="autor_trad_ids"
												label="Atribución tradicional"
												placeholder="Escribe y selecciona autores"
												options={authorOptions}
												selectedIds={selectedTradAuthors}
												helpText="Autores propuestos desde la tradición filológica. Puedes seleccionar varios."
												inputClass="js-author-multiselect"
												onIntent={() => {
													void ensureFilterOptionsLoaded();
												}}
												onChange={(nextIds) => {
													selectedTradAuthors = nextIds;
												}}
											/>

											<MatchToggle
												name="autor_match_trad"
												value={tradMatch}
												helpText="OR muestra obras con cualquiera de los autores seleccionados. AND exige que estén todos."
												onChange={(next) => {
													tradMatch = next;
												}}
											/>
										</div>

										<div class="flex flex-col gap-4 rounded-[8px] border border-border bg-[var(--color-surface-subtle)] p-4">
											<TokenMultiSelect
												name="autor_esto_ids"
												label="Atribución estilometría"
												placeholder="Escribe y selecciona autores"
												options={authorOptions}
												selectedIds={selectedEstoAuthors}
												helpText="Autores propuestos a partir del análisis estilométrico. Puedes seleccionar varios."
												inputClass="js-author-multiselect"
												onIntent={() => {
													void ensureFilterOptionsLoaded();
												}}
												onChange={(nextIds) => {
													selectedEstoAuthors = nextIds;
												}}
											/>

											<div class="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
												<MatchToggle
													name="autor_match_esto"
													value={estoMatch}
													helpText="OR muestra obras con cualquiera de los autores seleccionados. AND exige que estén todos."
													onChange={(next) => {
														estoMatch = next;
													}}
												/>

												<TokenMultiSelect
													name="nivel_confianza"
													label="Nivel de confianza"
													placeholder="Selecciona uno o varios niveles"
													options={confidenceOptions}
													selectedIds={selectedConfidence}
													helpText="Filtra por el grado de certeza de la atribución resultante del análisis estilométrico."
													inputClass="js-static-multiselect"
													onIntent={() => {
														void ensureFilterOptionsLoaded();
													}}
													onChange={(nextIds) => {
														selectedConfidence = nextIds;
													}}
												/>
											</div>
										</div>
									</div>

									<div class="grid grid-cols-1 gap-5">
										<TokenMultiSelect
											name="tipo_autoria"
											label="Tipo de autoría"
											placeholder="Cualquiera"
											options={authorshipTypeOptions}
											selectedIds={selectedAuthorshipTypes}
											helpText="Deja este campo en Cualquiera para mostrar obras de cualquier tipo de autoría. Puedes filtrar por obras de un solo autor (Única) o de varios autores (Colaboración)."
											inputClass="js-static-multiselect"
											onIntent={() => {
												void ensureFilterOptionsLoaded();
											}}
											onChange={(nextIds) => {
												selectedAuthorshipTypes = nextIds;
											}}
										/>
									</div>
								</section>

								<section class="grid gap-4 border-t border-border-accent-blue pt-5">
									<h3 class="m-0 font-['Roboto',sans-serif] text-[0.98rem] font-semibold text-brand-blue-dark">
										Filtros técnicos
									</h3>

									<div class="grid grid-cols-1 gap-5">
										<TokenMultiSelect
											name="estado"
											label="Estado del texto"
											placeholder="Escribe y selecciona estados"
											options={stateOptions}
											selectedIds={selectedStates}
											helpText="Selecciona uno o varios estados del texto utilizado para el análisis estilométrico."
											inputClass="js-static-multiselect"
											onIntent={() => {
												void ensureFilterOptionsLoaded();
											}}
											onChange={(nextIds) => {
												selectedStates = nextIds;
											}}
										/>
									</div>

									<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
										<div class="relative flex flex-col">
										<label class="mb-[6px] inline-flex items-center gap-1 font-['Roboto',sans-serif] text-[14px] font-semibold text-text-soft" for="filtro-fecha-desde">
											Fecha de adición o modificación (desde)
											<span class="group relative inline-flex items-center">
												<span
													class="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-border-accent-blue bg-surface-accent-blue text-[12px] leading-none font-bold text-brand-blue-dark"
													role="button"
													tabindex="0"
												>
													?
												</span>
												<span
													class="invisible absolute top-[calc(100%+8px)] left-0 z-20 w-[min(320px,calc(100vw_-_2rem))] max-w-[calc(100vw_-_2rem)] rounded-[6px] border border-border bg-white px-[10px] py-2 text-[12px] leading-[1.35] font-normal text-text-soft opacity-0 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
												>
													Incluye obras añadidas o modificadas desde esta fecha.
												</span>
											</span>
										</label>
										<input
											id="filtro-fecha-desde"
											name="desde"
											type="date"
											class="h-[42px] rounded-[10px] border border-border bg-white px-3 text-[15px] text-text-main transition focus:border-brand-blue/35 focus:shadow-[0_0_0_3px_rgba(13,63,145,0.1)] focus:outline-none"
											bind:value={dateFrom}
										/>
										</div>

										<div class="relative flex flex-col">
										<label class="mb-[6px] inline-flex items-center gap-1 font-['Roboto',sans-serif] text-[14px] font-semibold text-text-soft" for="filtro-fecha-hasta">
											Fecha de adición o modificación (hasta)
											<span class="group relative inline-flex items-center">
												<span
													class="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-border-accent-blue bg-surface-accent-blue text-[12px] leading-none font-bold text-brand-blue-dark"
													role="button"
													tabindex="0"
												>
													?
												</span>
												<span
													class="invisible absolute top-[calc(100%+8px)] left-0 z-20 w-[min(320px,calc(100vw_-_2rem))] max-w-[calc(100vw_-_2rem)] rounded-[6px] border border-border bg-white px-[10px] py-2 text-[12px] leading-[1.35] font-normal text-text-soft opacity-0 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
												>
													Incluye obras añadidas o modificadas hasta esta fecha.
												</span>
											</span>
										</label>
										<input
											id="filtro-fecha-hasta"
											name="hasta"
											type="date"
											class="h-[42px] rounded-[10px] border border-border bg-white px-3 text-[15px] text-text-main transition focus:border-brand-blue/35 focus:shadow-[0_0_0_3px_rgba(13,63,145,0.1)] focus:outline-none"
											bind:value={dateTo}
										/>
										</div>
									</div>

								{#if dateRangeError}
									<div class="mt-1 text-[12px] text-text-soft italic" role="alert">{dateRangeError}</div>
								{/if}
								</section>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
						<AppButton
							href="/examen-autorias"
							variant="secondary"
							className="!h-[40px] !min-w-0 !w-full !rounded-[10px] !border-transparent !px-3 !py-2 font-['Roboto',sans-serif] text-[0.86rem] font-semibold tracking-[0.02em] shadow-none sm:!min-w-[136px] sm:!w-auto sm:!px-5 sm:text-[0.9rem]"
							onclick={(event) => {
								void clearFilters(event);
							}}
						>
							Limpiar campos
						</AppButton>
						<AppButton
							type="submit"
							variant="primary"
							disabled={isSearching}
							className="!h-[40px] !min-w-0 !w-full gap-2 !rounded-[10px] !px-3 !py-2 font-['Roboto',sans-serif] text-[0.86rem] font-semibold tracking-[0.02em] sm:!min-w-[136px] sm:!w-auto sm:!px-5 sm:text-[0.9rem]"
						>
							{#if isSearching}
								<LoaderCircle class="h-4.5 w-4.5 animate-spin" />
								Buscando...
							{:else}
								Buscar
							{/if}
						</AppButton>
					</div>
				</div>
			</form>

			<div
				id="examen-resultados"
				bind:this={resultsRegion}
				class="mt-14 relative scroll-mt-6 outline-none"
				aria-live="polite"
				aria-busy={isSearching || isResultsLoading ? 'true' : 'false'}
				role="region"
				aria-label="Resultados de búsqueda"
				tabindex="-1"
			>
				{#if tableRows.length > 0}
					<div
						bind:this={paginationRegion}
						class="mb-5 flex scroll-mt-24 flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-[15px] max-md:flex-col max-md:justify-center max-md:gap-2 max-md:text-center"
					>
						<p class="m-0 text-[0.88rem] font-normal text-text-main max-md:w-full">
							<span class="font-semibold text-brand-blue">{totalResults}</span> resultados ·
							Mostrando
							<span class="font-semibold text-brand-blue">
								{(resultsPage - 1) * pageSize + 1}-{(resultsPage - 1) * pageSize + works.length}
							</span>
						</p>
						{#if totalPages > 1}
							<div class="flex items-center justify-center gap-2 max-md:w-full">
								<AppButton
									type="button"
									variant="secondary"
									disabled={resultsPage <= 1 || isSearching || isResultsLoading}
									className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
									title="Página anterior"
									onfocus={() => prefetchPage(resultsPage - 1)}
									onpointerenter={() => prefetchPage(resultsPage - 1)}
									ontouchstart={() => prefetchPage(resultsPage - 1)}
									onclick={() => {
										void navigateToPage(resultsPage - 1);
									}}
								>
									<ChevronLeft class="h-5 w-5" aria-hidden="true" />
									<span class="sr-only">Anterior</span>
								</AppButton>
								<span class="font-['Roboto',sans-serif] text-[0.86rem] font-normal text-text-main">
									Página <span class="font-semibold text-brand-blue">{resultsPage}</span> de
									<span class="font-semibold text-brand-blue">{totalPages}</span>
								</span>
								<AppButton
									type="button"
									variant="secondary"
									disabled={resultsPage >= totalPages || isSearching || isResultsLoading}
									className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
									title="Página siguiente"
									onfocus={() => prefetchPage(resultsPage + 1)}
									onpointerenter={() => prefetchPage(resultsPage + 1)}
									ontouchstart={() => prefetchPage(resultsPage + 1)}
									onclick={() => {
										void navigateToPage(resultsPage + 1);
									}}
								>
									<ChevronRight class="h-5 w-5" aria-hidden="true" />
									<span class="sr-only">Siguiente</span>
								</AppButton>
							</div>
						{/if}
					</div>
				{/if}
				{#if isResultsLoading && works.length === 0}
					<div class="flex items-center gap-3 rounded-[12px] border border-border-accent-blue bg-white px-4 py-5 text-brand-blue-dark shadow-[0_6px_16px_rgba(25,46,80,0.07)]">
						<LoaderCircle class="h-5 w-5 animate-spin" aria-hidden="true" />
						<p class="m-0 font-['Roboto',sans-serif] text-[0.95rem] font-semibold">Cargando resultados...</p>
					</div>
				{:else if resultsError}
					<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.92rem] text-[#8f1e36]">{resultsError}</p>
				{:else}
					<WorksTable
						rows={tableRows}
						mode="standard"
						emptyMessage="No se encontraron obras que coincidan con los criterios de búsqueda."
					/>
				{/if}
				{#if !isResultsLoading && !resultsError && totalPages > 1}
					<nav class="mt-4 flex flex-wrap items-center justify-end gap-2 max-md:justify-center" aria-label="Paginación de obras">
						<AppButton
							type="button"
							variant="secondary"
							disabled={resultsPage <= 1 || isSearching || isResultsLoading}
							className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
							title="Página anterior"
							onfocus={() => prefetchPage(resultsPage - 1)}
							onpointerenter={() => prefetchPage(resultsPage - 1)}
							ontouchstart={() => prefetchPage(resultsPage - 1)}
							onclick={() => {
								void navigateToPage(resultsPage - 1);
							}}
						>
							<ChevronLeft class="h-5 w-5" aria-hidden="true" />
							<span class="sr-only">Anterior</span>
						</AppButton>
						<span class="font-['Roboto',sans-serif] text-[0.86rem] font-normal text-text-main">
							Página <span class="font-semibold text-brand-blue">{resultsPage}</span> de
							<span class="font-semibold text-brand-blue">{totalPages}</span>
						</span>
						<AppButton
							type="button"
							variant="secondary"
							disabled={resultsPage >= totalPages || isSearching || isResultsLoading}
							className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
							title="Página siguiente"
							onfocus={() => prefetchPage(resultsPage + 1)}
							onpointerenter={() => prefetchPage(resultsPage + 1)}
							ontouchstart={() => prefetchPage(resultsPage + 1)}
							onclick={() => {
								void navigateToPage(resultsPage + 1);
							}}
						>
							<ChevronRight class="h-5 w-5" aria-hidden="true" />
							<span class="sr-only">Siguiente</span>
						</AppButton>
					</nav>
				{/if}
			</div>
		</div>
	</section>
</div>
