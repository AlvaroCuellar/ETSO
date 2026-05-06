<script lang="ts">
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
	import Feather from 'lucide-svelte/icons/feather';
	import {
		inferWorkAuthorshipType,
		type AttributionSet,
		type CatalogWork,
		type Confidence,
		type ObraTableRow,
		type WorkAuthorshipType
	} from '$lib/domain/catalog';

	import type { PageData } from './$types';

	interface TokenOption {
		id: string;
		label: string;
	}

	let { data }: { data: PageData } = $props();

	let title = $state('');
	let selectedGenres = $state<string[]>([]);
	let selectedMainAuthors = $state<string[]>([]);

	let advancedOpen = $state(false);
	let selectedAuthorshipTypes = $state<string[]>([]);
	let selectedTradAuthors = $state<string[]>([]);
	let tradMatch = $state<'or' | 'and'>('or');
	let selectedEstoAuthors = $state<string[]>([]);
	let estoMatch = $state<'or' | 'and'>('or');
	let selectedConfidence = $state<string[]>([]);
	let selectedStates = $state<string[]>([]);
	let dateFrom = $state('');
	let dateTo = $state('');

	const normalizeText = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

	const parseYearMonth = (value: string): number | null => {
		const match = value.match(/(\d{4})[/-](\d{1,2})/);
		if (!match) return null;
		const year = Number(match[1]);
		const month = Number(match[2]);
		if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
		if (month < 1 || month > 12) return null;
		return year * 100 + month;
	};

	const asWorkAuthorshipType = (value: string): WorkAuthorshipType | null => {
		if (value === 'unica' || value === 'colaboracion' || value === 'desconocida') return value;
		return null;
	};

	const collectAuthorIds = (set: AttributionSet): Set<string> => {
		const authorIds = new Set<string>();
		if (set.unresolved) return authorIds;

		for (const group of set.groups) {
			for (const member of group.members) {
				if (!member.authorId) continue;
				authorIds.add(member.authorId);
			}
		}
		return authorIds;
	};

	const matchesByMode = (haystack: Set<string>, selectedIds: string[], matchMode: 'or' | 'and'): boolean => {
		if (selectedIds.length === 0) return true;
		if (matchMode === 'and') {
			return selectedIds.every((candidate) => haystack.has(candidate));
		}
		return selectedIds.some((candidate) => haystack.has(candidate));
	};

	const matchesMainAuthors = (work: CatalogWork, selectedIds: string[]): boolean => {
		if (selectedIds.length === 0) return true;
		const all = new Set<string>();
		for (const authorId of collectAuthorIds(work.traditionalAttribution)) all.add(authorId);
		for (const authorId of collectAuthorIds(work.stylometryAttribution)) all.add(authorId);
		return selectedIds.some((candidate) => all.has(candidate));
	};

	const matchesConfidence = (work: CatalogWork, selectedValues: string[]): boolean => {
		if (selectedValues.length === 0) return true;
		if (work.stylometryAttribution.unresolved) return false;

		const values = new Set<Confidence>();
		for (const group of work.stylometryAttribution.groups) {
			for (const member of group.members) {
				if (member.confidence) values.add(member.confidence);
			}
		}
		return selectedValues.some((selectedValue) => values.has(selectedValue as Confidence));
	};

	const matchesDateRange = (work: CatalogWork): boolean => {
		const workYearMonth = parseYearMonth(work.addedOn);
		if (!workYearMonth) return true;

		const fromYearMonth = parseYearMonth(dateFrom);
		const toYearMonth = parseYearMonth(dateTo);

		if (fromYearMonth && workYearMonth < fromYearMonth) return false;
		if (toYearMonth && workYearMonth > toYearMonth) return false;
		return true;
	};

	const authorOptions = $derived.by<TokenOption[]>(() =>
		data.authorOptions.map((author) => ({ id: author.id, label: author.name }))
	);
	const genreOptions = $derived.by<TokenOption[]>(() =>
		data.genreOptions.map((genre) => ({ id: genre, label: genre }))
	);
	const stateOptions = $derived.by<TokenOption[]>(() => {
		const values = Array.from(new Set(data.works.map((work) => work.textState))).filter(Boolean);
		values.sort((a, b) => a.localeCompare(b));
		return values.map((value) => ({ id: value, label: value }));
	});
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

	const works = $derived.by(() => {
		const normalizedTitle = normalizeText(title);
		const effectiveMainAuthors = mainAuthorDisabled ? [] : selectedMainAuthors;
		const selectedAuthorshipValues = selectedAuthorshipTypes
			.map((value) => asWorkAuthorshipType(value))
			.filter((value): value is WorkAuthorshipType => value !== null);

		return data.works.filter((work) => {
			if (normalizedTitle) {
				const haystack = normalizeText([work.title, ...work.titleVariants].join(' '));
				if (!haystack.includes(normalizedTitle)) return false;
			}

			if (selectedGenres.length > 0 && !selectedGenres.includes(work.genre)) return false;
			if (!matchesMainAuthors(work, effectiveMainAuthors)) return false;

			if (!matchesByMode(collectAuthorIds(work.traditionalAttribution), selectedTradAuthors, tradMatch)) {
				return false;
			}
			if (!matchesByMode(collectAuthorIds(work.stylometryAttribution), selectedEstoAuthors, estoMatch)) {
				return false;
			}

			if (!matchesConfidence(work, selectedConfidence)) return false;

			if (selectedAuthorshipValues.length > 0) {
				const inferred = inferWorkAuthorshipType(work);
				if (!selectedAuthorshipValues.includes(inferred)) return false;
			}

			if (selectedStates.length > 0 && !selectedStates.includes(work.textState)) return false;

			if (!dateRangeError && !matchesDateRange(work)) return false;

			return true;
		});
	});

	const tableRows = $derived.by<ObraTableRow[]>(() =>
		works.map((work) => ({
			rowId: work.id,
			work
		}))
	);

	const totalWorks = $derived.by(() => data.works.length);
	const totalDramaturgos = $derived.by(() => data.authorOptions.length);

	const resetFilters = (): void => {
		title = '';
		selectedGenres = [];
		selectedMainAuthors = [];
		selectedAuthorshipTypes = [];
		selectedTradAuthors = [];
		tradMatch = 'or';
		selectedEstoAuthors = [];
		estoMatch = 'or';
		selectedConfidence = [];
		selectedStates = [];
		dateFrom = '';
		dateTo = '';
		advancedOpen = false;
	};

	const applySearch = (event: SubmitEvent): void => {
		event.preventDefault();
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
			<form onsubmit={applySearch}>
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

					<div class="mt-[0.9rem] overflow-hidden rounded-[8px] border border-border-accent-blue bg-white">
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
							class={`overflow-hidden border-t px-4 transition-[max-height,padding,opacity] duration-300 ease-out ${
								advancedOpen
									? 'max-h-[1200px] border-border-accent-blue py-[0.9rem] opacity-100'
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
								event.preventDefault();
								resetFilters();
							}}
						>
							Limpiar campos
						</AppButton>
						<AppButton type="submit" variant="primary">Buscar</AppButton>
					</div>
				</div>
			</form>

			<div
				class="relative outline-none"
				aria-live="polite"
				aria-busy="false"
				role="region"
				aria-label="Resultados de búsqueda"
				tabindex="-1"
			>
				{#if tableRows.length > 0}
					<div class="mb-5 flex items-center justify-between border-b-2 border-border pb-[15px]">
						<div class="text-[16px] text-text-soft"><strong class="text-[20px] text-text-main">{works.length}</strong> resultados</div>
					</div>
				{/if}
				<WorksTable
					rows={tableRows}
					mode="standard"
					emptyMessage="No se encontraron obras que coincidan con los criterios de búsqueda."
				/>
			</div>
		</div>
	</div>
</div>
