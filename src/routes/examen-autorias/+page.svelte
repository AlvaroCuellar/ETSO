<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import MatchToggle from '$lib/components/search/MatchToggle.svelte';
	import TokenMultiSelect from '$lib/components/search/TokenMultiSelect.svelte';
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import AppButton from '$lib/components/ui/AppButton.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Feather from 'lucide-svelte/icons/feather';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import type { ObraTableRow } from '$lib/domain/catalog';

	import type { PageData } from './$types';

	interface TokenOption {
		id: string;
		label: string;
	}

	type ExamenPageFilters = PageData['filters'];

	let { data }: { data: PageData } = $props();
	const getInitialFilters = () => data.filters;
	const initialFilters = getInitialFilters();

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
	let resultsRegion = $state<HTMLElement | null>(null);
	let paginationRegion = $state<HTMLElement | null>(null);

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
	});

	const authorOptions = $derived.by<TokenOption[]>(() =>
		data.authorOptions.map((author) => ({ id: author.id, label: author.name }))
	);
	const genreOptions = $derived.by<TokenOption[]>(() =>
		data.genreOptions.map((genre) => ({ id: genre, label: genre }))
	);
	const stateOptions = $derived.by<TokenOption[]>(() =>
		data.stateOptions.map((value) => ({ id: value, label: value }))
	);
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
		data.works.map((work) => ({
			rowId: work.id,
			work
		}))
	);

	const totalWorks = $derived.by(() => data.stats.works);
	const totalDramaturgos = $derived.by(() => data.authorOptions.length);

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

	const scrollToResults = async (): Promise<void> => {
		await tick();
		(paginationRegion ?? resultsRegion)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	};

	const navigateToUrl = async (url: string, scrollToTable = true): Promise<void> => {
		isSearching = true;
		try {
			await goto(url, { noScroll: true, keepFocus: true });
			if (scrollToTable) {
				await scrollToResults();
			}
		} finally {
			isSearching = false;
		}
	};

	const applySearch = async (event: SubmitEvent): Promise<void> => {
		event.preventDefault();
		if (dateRangeError) return;
		await navigateToUrl(buildSearchUrl(1));
	};

	const navigateToPage = async (page: number): Promise<void> => {
		if (page < 1 || page > data.totalPages || page === data.page) return;
		await navigateToUrl(buildPaginationUrl(page));
	};

	const clearFilters = async (event: MouseEvent): Promise<void> => {
		event.preventDefault();
		await navigateToUrl('/examen-autorias', false);
	};
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Examen de autorías' }]} />

	<FeatureHeroSection
		eyebrow=""
		title="Examen de Autorías"
		titleTag="h2"
		subtitle="Análisis estilométrico de obras teatrales del Siglo de Oro"
		backgroundImage={fondoLogo}
		statsAriaLabel="Indicadores del catálogo"
	>
		<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-text-main">
			Examen de Autorías es un espacio dedicado a la <b>atribución computacional</b> de autoría en el teatro
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
			/>

			<HeroStatCard
				Icon={Feather}
				href="/examen-autorias/dramaturgos"
				ariaLabel="Ver listado de dramaturgos"
				value={totalDramaturgos}
				label="Dramaturgos"
				desktopOffset="down"
			/>
		{/snippet}
	</FeatureHeroSection>

	<div class="font-['Roboto',sans-serif] leading-[1.6] text-text-main">
		<div class="min-w-0">
			<form method="GET" action="/examen-autorias" onsubmit={applySearch}>
				<div class="mb-[1.6rem]">
					<div class="mb-[0.9rem]">
						<div class="mb-[15px] border-b-2 border-border pb-2 text-[14px] font-bold tracking-[0.5px] text-text-soft uppercase">
							Búsqueda
						</div>

						<div class="mb-[15px] grid grid-cols-1 gap-5 min-[1201px]:grid-cols-[3fr_1fr]">
							<div class="relative flex flex-col">
								<label class="mb-[6px] inline-flex items-center gap-1 text-[14px] font-semibold text-text-soft" for="filtro-titulo">
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
									class="rounded-[4px] border border-border px-3 py-[10px] text-[14px] transition focus:border-brand-blue/35 focus:shadow-[0_0_0_3px_rgba(13,63,145,0.1)] focus:outline-none"
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
								onChange={(nextIds) => {
									selectedGenres = nextIds;
								}}
							/>
						</div>

						<div class="mb-0 grid grid-cols-1 gap-5">
							<TokenMultiSelect
								name="autor_ids"
								label="Atribución"
								placeholder="Escribe y selecciona autores"
								options={authorOptions}
								selectedIds={selectedMainAuthors}
								disabled={mainAuthorDisabled}
								helpText="Permite multiselección de autores. Este campo se desactiva si usas Atribución tradicional o estilometría en Más filtros."
								inputClass="js-author-multiselect"
								onChange={(nextIds) => {
									selectedMainAuthors = nextIds;
								}}
							/>
						</div>

					</div>

					<div class={`mt-[0.9rem] rounded-[8px] border border-border-accent-blue bg-white ${advancedOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
						<button
							type="button"
							class="w-full cursor-pointer border-0 bg-transparent px-4 py-[0.9rem] text-left text-[14px] font-semibold text-brand-blue-dark transition hover:bg-surface-accent-blue"
							data-target="advanced-content"
							aria-expanded={advancedOpen ? 'true' : 'false'}
							onclick={() => {
								advancedOpen = !advancedOpen;
							}}
						>
							<span class="flex items-center justify-between">
								Más filtros
								<span class={`inline-flex items-center justify-center transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} aria-hidden="true">
									<ChevronDown class="h-[14px] w-[14px] stroke-[2.2]" />
								</span>
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
							<div class="mb-[0.8rem] bg-transparent py-[0.8rem]">
								<div class="mb-[15px] border-b-2 border-border pb-2 text-[14px] font-bold tracking-[0.5px] text-text-soft uppercase">
									Filtros de autoría
								</div>

								<div class="grid grid-cols-1 gap-4 min-[1201px]:grid-cols-2">
									<div class="flex flex-col gap-3 rounded-[8px] border border-border bg-surface p-[14px]">
										<TokenMultiSelect
											name="autor_trad_ids"
											label="Atribución tradicional"
											placeholder="Escribe y selecciona autores"
											options={authorOptions}
											selectedIds={selectedTradAuthors}
											helpText="Autores propuestos desde la tradición filológica. Puedes seleccionar varios."
											inputClass="js-author-multiselect"
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

									<div class="flex flex-col gap-3 rounded-[8px] border border-border bg-surface p-[14px]">
										<TokenMultiSelect
											name="autor_esto_ids"
											label="Atribución estilometría"
											placeholder="Escribe y selecciona autores"
											options={authorOptions}
											selectedIds={selectedEstoAuthors}
											helpText="Autores propuestos a partir del análisis estilométrico. Puedes seleccionar varios."
											inputClass="js-author-multiselect"
											onChange={(nextIds) => {
												selectedEstoAuthors = nextIds;
											}}
										/>

										<div class="mb-0 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
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
												onChange={(nextIds) => {
													selectedConfidence = nextIds;
												}}
											/>
										</div>
									</div>
								</div>

								<div class="mt-[18px] grid grid-cols-1 gap-5 rounded-[8px] border border-dashed border-border-accent-blue bg-surface-accent-blue p-3 md:grid-cols-2">
									<TokenMultiSelect
										name="tipo_autoria"
										label="Tipo de autoría"
										placeholder="Cualquiera"
										options={authorshipTypeOptions}
										selectedIds={selectedAuthorshipTypes}
										helpText="Deja este campo en Cualquiera para mostrar obras de cualquier tipo de autoría. Puedes filtrar por obras de un solo autor (Única) o de varios autores (Colaboración)."
										inputClass="js-static-multiselect"
										onChange={(nextIds) => {
											selectedAuthorshipTypes = nextIds;
										}}
									/>
								</div>
							</div>

							<div class="mb-[0.8rem] bg-transparent py-[0.8rem]">
								<div class="mb-[15px] border-b-2 border-border pb-2 text-[14px] font-bold tracking-[0.5px] text-text-soft uppercase">
									Filtros técnicos
								</div>

								<div class="mb-[15px] grid grid-cols-1 gap-5 md:grid-cols-2">
									<TokenMultiSelect
										name="estado"
										label="Estado del texto"
										placeholder="Escribe y selecciona estados"
										options={stateOptions}
										selectedIds={selectedStates}
										helpText="Selecciona uno o varios estados del texto utilizado para el análisis estilométrico."
										inputClass="js-static-multiselect"
										onChange={(nextIds) => {
											selectedStates = nextIds;
										}}
									/>
								</div>

								<div class="mb-[15px] grid grid-cols-1 gap-5 md:grid-cols-2">
									<div class="relative flex flex-col">
										<label class="mb-[6px] inline-flex items-center gap-1 text-[14px] font-semibold text-text-soft" for="filtro-fecha-desde">
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
													class="invisible absolute top-[calc(100%+8px)] left-0 z-20 w-[min(320px,78vw)] rounded-[6px] border border-border bg-white px-[10px] py-2 text-[12px] leading-[1.35] font-normal text-text-soft opacity-0 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
												>
													Incluye obras añadidas o modificadas desde esta fecha.
												</span>
											</span>
										</label>
										<input
											id="filtro-fecha-desde"
											name="desde"
											type="date"
											class="rounded-[4px] border border-border px-3 py-[10px] text-[14px] transition focus:border-brand-blue/35 focus:shadow-[0_0_0_3px_rgba(13,63,145,0.1)] focus:outline-none"
											bind:value={dateFrom}
										/>
									</div>

									<div class="relative flex flex-col">
										<label class="mb-[6px] inline-flex items-center gap-1 text-[14px] font-semibold text-text-soft" for="filtro-fecha-hasta">
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
													class="invisible absolute top-[calc(100%+8px)] left-0 z-20 w-[min(320px,78vw)] rounded-[6px] border border-border bg-white px-[10px] py-2 text-[12px] leading-[1.35] font-normal text-text-soft opacity-0 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
												>
													Incluye obras añadidas o modificadas hasta esta fecha.
												</span>
											</span>
										</label>
										<input
											id="filtro-fecha-hasta"
											name="hasta"
											type="date"
											class="rounded-[4px] border border-border px-3 py-[10px] text-[14px] transition focus:border-brand-blue/35 focus:shadow-[0_0_0_3px_rgba(13,63,145,0.1)] focus:outline-none"
											bind:value={dateTo}
										/>
									</div>
								</div>

								{#if dateRangeError}
									<div class="mt-1 text-[12px] text-text-soft italic" role="alert">{dateRangeError}</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="mt-5 flex flex-col gap-[10px] md:flex-row md:justify-end">
						<AppButton
							href="/examen-autorias"
							variant="secondary"
							onclick={(event) => {
								void clearFilters(event);
							}}
						>
							Limpiar campos
						</AppButton>
						<AppButton type="submit" variant="primary" disabled={isSearching} className="gap-2">
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
				class="relative scroll-mt-6 outline-none"
				aria-live="polite"
				aria-busy={isSearching ? 'true' : 'false'}
				role="region"
				aria-label="Resultados de búsqueda"
				tabindex="-1"
			>
				{#if tableRows.length > 0}
					<div
						bind:this={paginationRegion}
						class="mb-5 flex scroll-mt-24 flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-[15px]"
					>
						<p class="m-0 text-[0.88rem] font-normal text-text-main">
							<span class="font-semibold text-brand-blue">{data.totalResults}</span> resultados ·
							Mostrando
							<span class="font-semibold text-brand-blue">
								{(data.page - 1) * data.pageSize + 1}-{(data.page - 1) * data.pageSize + data.works.length}
							</span>
						</p>
						{#if data.totalPages > 1}
							<div class="flex items-center gap-2">
								<AppButton
									type="button"
									variant="secondary"
									disabled={data.page <= 1 || isSearching}
									className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
									title="Página anterior"
									onclick={() => {
										void navigateToPage(data.page - 1);
									}}
								>
									<ChevronLeft class="h-5 w-5" aria-hidden="true" />
									<span class="sr-only">Anterior</span>
								</AppButton>
								<span class="font-['Roboto',sans-serif] text-[0.86rem] font-normal text-text-main">
									Página <span class="font-semibold text-brand-blue">{data.page}</span> de
									<span class="font-semibold text-brand-blue">{data.totalPages}</span>
								</span>
								<AppButton
									type="button"
									variant="secondary"
									disabled={data.page >= data.totalPages || isSearching}
									className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
									title="Página siguiente"
									onclick={() => {
										void navigateToPage(data.page + 1);
									}}
								>
									<ChevronRight class="h-5 w-5" aria-hidden="true" />
									<span class="sr-only">Siguiente</span>
								</AppButton>
							</div>
						{/if}
					</div>
				{/if}
				<WorksTable
					rows={tableRows}
					mode="standard"
					emptyMessage="No se encontraron obras que coincidan con los criterios de búsqueda."
				/>
				{#if data.totalPages > 1}
					<nav class="mt-4 flex flex-wrap items-center justify-end gap-2" aria-label="Paginación de obras">
						<AppButton
							type="button"
							variant="secondary"
							disabled={data.page <= 1 || isSearching}
							className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
							title="Página anterior"
							onclick={() => {
								void navigateToPage(data.page - 1);
							}}
						>
							<ChevronLeft class="h-5 w-5" aria-hidden="true" />
							<span class="sr-only">Anterior</span>
						</AppButton>
						<span class="font-['Roboto',sans-serif] text-[0.86rem] font-normal text-text-main">
							Página <span class="font-semibold text-brand-blue">{data.page}</span> de
							<span class="font-semibold text-brand-blue">{data.totalPages}</span>
						</span>
						<AppButton
							type="button"
							variant="secondary"
							disabled={data.page >= data.totalPages || isSearching}
							className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
							title="Página siguiente"
							onclick={() => {
								void navigateToPage(data.page + 1);
							}}
						>
							<ChevronRight class="h-5 w-5" aria-hidden="true" />
							<span class="sr-only">Siguiente</span>
						</AppButton>
					</nav>
				{/if}
			</div>
		</div>
	</div>
</div>
