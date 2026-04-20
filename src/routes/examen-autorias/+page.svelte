<script lang="ts">
	import MatchToggle from '$lib/components/search/MatchToggle.svelte';
	import TokenMultiSelect from '$lib/components/search/TokenMultiSelect.svelte';
	import WorksTable from '$lib/components/search/WorksTable.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
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
	let selectedOrigins = $state<string[]>([]);
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
	const originOptions = $derived.by<TokenOption[]>(() => {
		const values = Array.from(new Set(data.works.map((work) => work.origin))).filter(Boolean);
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
			selectedOrigins.length > 0 ||
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
			if (selectedOrigins.length > 0 && !selectedOrigins.includes(work.origin)) return false;

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
		selectedOrigins = [];
		dateFrom = '';
		dateTo = '';
		advancedOpen = false;
	};

	const applySearch = (event: SubmitEvent): void => {
		event.preventDefault();
	};
</script>

<div class="page-stack">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Examen de autorías' }]} />

	<section class="buscador-overview" style={`--overview-bg: url('${fondoLogo}')`}>
		<div class="buscador-overview__content">
			<h2 class="buscador-overview__title">Examen de Autorías</h2>
			<p class="buscador-overview__lead">
				Análisis estilométrico de obras teatrales del Siglo de Oro
			</p>
			<p class="buscador-overview__copy">
				Examen de Autorías es un espacio dedicado a la <b>atribución computacional</b> de autoría en el teatro
				del Siglo de Oro a gran escala. La plataforma, desarrollada por Álvaro Cuéllar y Germán Vega
				García-Luengos, ofrece resultados estilométricos sobre un corpus en expansión de unas 3.000 obras
				pertenecientes a más de 350 dramaturgos, con el propósito de facilitar la investigación y el
				contraste de hipótesis autorales.
			</p>
			<p class="buscador-overview__copy">
				Los textos han sido modernizados y regularizados para hacer posible su comparación, y se han
				depurado en lo posible para reducir interferencias (por ejemplo, acotaciones y marcas de
				intervención). A partir de esta base, el sitio permite confrontar atribuciones transmitidas por la
				tradición con propuestas derivadas del análisis cuantitativo del estilo. El objetivo no es sustituir
				la lectura filológica, sino aportar evidencia adicional, reproducible y acumulativa que ayude a
				orientar futuras comprobaciones documentales y críticas.
			</p>
			<p class="buscador-overview__copy">
				El corpus se nutre de fuentes abiertas y de aportaciones de investigadores y grupos, e integra
				también textos procedentes de transcripciones automáticas de impresos y manuscritos antiguos. Se
				aceptan consultas, colaboraciones y propuestas de ampliación: si dispones de una obra o conoces cómo
				acceder a ella, escríbenos y nos comprometemos a reconocer la procedencia en la tabla
				correspondiente y a compartir los resultados del análisis.
			</p>
		</div>
		<div class="buscador-overview__stats" aria-label="Indicadores del catálogo">
			<article class="overview-stat-card">
				<div class="overview-stat-icon" aria-hidden="true">
					<BookOpen />
				</div>
				<div>
					<div class="overview-stat-value">{totalWorks}</div>
					<div class="overview-stat-label">Obras</div>
				</div>
			</article>

			<article class="overview-stat-card">
				<div class="overview-stat-icon" aria-hidden="true">
					<Feather />
				</div>
				<div>
					<div class="overview-stat-value">{totalDramaturgos}</div>
					<div class="overview-stat-label">Dramaturgos</div>
				</div>
			</article>
		</div>
	</section>

	<div class="etso-buscador">
		<div class="etso-buscador__shell">
			<form class="buscador-form" onsubmit={applySearch}>
				<div class="filters-section">
					<div class="search-primary">
						<div class="filter-section-title">Búsqueda</div>

						<div class="filter-row two-cols row-title-genero">
							<div class="filter-group field-with-help">
								<label class="field-label-with-help" for="filtro-titulo">
									Título
									<span class="field-help-anchor">
										<span class="field-help-trigger" role="button" tabindex="0">?</span>
										<span class="field-help-popover">Busca por palabras del título.</span>
									</span>
								</label>
								<input
									id="filtro-titulo"
									type="text"
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

						<div class="filter-row full row-autor-principal">
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

					<div class="advanced-filters">
						<button
							type="button"
							class="advanced-toggle"
							data-target="advanced-content"
							aria-expanded={advancedOpen ? 'true' : 'false'}
							onclick={() => {
								advancedOpen = !advancedOpen;
							}}
						>
							Más filtros
							<span class="advanced-toggle__icon" aria-hidden="true"><ChevronDown /></span>
						</button>

						<div id="advanced-content" class="advanced-content" class:hidden={!advancedOpen}>
							<div class="filter-section">
								<div class="filter-section-title">Filtros de autoría</div>

								<div class="filter-row full autoria-general-row">
									<TokenMultiSelect
										name="tipo_autoria"
										label="Tipo de autoría"
										placeholder="Selecciona uno o varios tipos"
										options={authorshipTypeOptions}
										selectedIds={selectedAuthorshipTypes}
										helpText="Obras de un solo autor (Única) o de varios autores (Colaboración)."
										inputClass="js-static-multiselect"
										onChange={(nextIds) => {
											selectedAuthorshipTypes = nextIds;
										}}
									/>
								</div>

								<div class="autoria-columns">
									<div class="autoria-card autoria-card--tradicional">
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

									<div class="autoria-card autoria-card--estilometria">
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

										<div class="filter-row two-cols row-esto-controls">
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
							</div>

							<div class="filter-section">
								<div class="filter-section-title">Filtros técnicos</div>

								<div class="filter-row two-cols">
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

									<TokenMultiSelect
										name="procedencia"
										label="Procedencia"
										placeholder="Escribe y selecciona procedencias"
										options={originOptions}
										selectedIds={selectedOrigins}
										helpText="Filtra por la procedencia del texto de la obra utilizado para el análisis estilométrico."
										inputClass="js-static-multiselect"
										onChange={(nextIds) => {
											selectedOrigins = nextIds;
										}}
									/>
								</div>

								<div class="filter-row two-cols">
									<div class="filter-group field-with-help">
										<label class="field-label-with-help" for="filtro-fecha-desde">
											Fecha de adición o modificación (desde)
											<span class="field-help-anchor">
												<span class="field-help-trigger" role="button" tabindex="0">?</span>
												<span class="field-help-popover">
													Incluye obras añadidas o modificadas desde esta fecha.
												</span>
											</span>
										</label>
										<input id="filtro-fecha-desde" type="date" bind:value={dateFrom} />
									</div>

									<div class="filter-group field-with-help">
										<label class="field-label-with-help" for="filtro-fecha-hasta">
											Fecha de adición o modificación (hasta)
											<span class="field-help-anchor">
												<span class="field-help-trigger" role="button" tabindex="0">?</span>
												<span class="field-help-popover">
													Incluye obras añadidas o modificadas hasta esta fecha.
												</span>
											</span>
										</label>
										<input id="filtro-fecha-hasta" type="date" bind:value={dateTo} />
									</div>
								</div>

								{#if dateRangeError}
									<div class="description" role="alert">{dateRangeError}</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="button-group">
						<a
							href="/examen-autorias"
							class="btn-secondary button"
							onclick={(event) => {
								event.preventDefault();
								resetFilters();
							}}
						>
							Limpiar campos
						</a>
						<button type="submit" class="btn-primary">Buscar</button>
					</div>
				</div>
			</form>

			<div
				class="etso-buscador__results"
				aria-live="polite"
				aria-busy="false"
				role="region"
				aria-label="Resultados de búsqueda"
				tabindex="-1"
			>
				{#if tableRows.length > 0}
					<div class="results-header">
						<div class="results-count"><strong>{works.length}</strong> resultados</div>
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

<style>
	.buscador-overview {
		display: grid;
		grid-template-columns: minmax(0, 1.9fr) minmax(320px, 1fr);
		gap: 2.1rem;
		align-items: start;
		padding: clamp(1.2rem, 2.4vw, 2rem);
		border-radius: 14px;
		background-color: #ececf0;
		background-image:
			linear-gradient(
				100deg,
				rgba(239, 240, 244, 0.95) 0%,
				rgba(236, 237, 242, 0.88) 46%,
				rgba(236, 237, 242, 0.52) 70%,
				rgba(236, 237, 242, 0.22) 100%
			),
			var(--overview-bg);
		background-size: auto, min(60vw, 860px) auto;
		background-position: center, right -56px bottom -66px;
		background-repeat: no-repeat, no-repeat;
	}

	.buscador-overview__title {
		margin: 0 0 0.85rem;
		font-size: clamp(2rem, 4.3vw, 2.85rem);
		line-height: 1.05;
		font-weight: 700;
		color: #0033a7;
	}

	.buscador-overview__lead {
		margin: 0 0 1.15rem;
		font-size: clamp(1.28rem, 2.2vw, 1.78rem);
		line-height: 1.22;
		font-weight: 600;
		color: #003aa5;
		max-width: 25ch;
	}

	.buscador-overview__copy {
		margin: 0 0 1rem;
		max-width: 64ch;
		font-family: 'Lora', serif;
		font-size: 1.01rem;
		line-height: 1.45;
		color: #17293f;
	}

	.buscador-overview__copy:last-child {
		margin-bottom: 0;
	}

	.buscador-overview__stats {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.05rem;
		align-content: center;
		align-items: end;
		padding-top: 0;
		align-self: center;
		justify-self: center;
		width: min(420px, 100%);
	}

	.overview-stat-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.65rem;
		min-height: 170px;
		padding: 1.35rem 1.1rem 1.1rem;
		border-radius: 10px;
		border: 1px solid rgba(6, 33, 93, 0.08);
		background: rgba(249, 249, 251, 0.88);
		box-shadow: 0 8px 20px rgba(25, 37, 77, 0.08);
		transform: translateY(0);
	}

	.overview-stat-card:first-child {
		transform: translateY(-10px);
	}

	.overview-stat-card:nth-child(2) {
		margin-top: 0;
		margin-left: 0;
		transform: translateY(10px);
	}

	.overview-stat-icon {
		width: 2.2rem;
		height: 2.2rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #70006b;
	}

	.overview-stat-icon :global(svg) {
		width: 1.9rem;
		height: 1.9rem;
		stroke-width: 2.2;
	}

	.overview-stat-value {
		font-size: clamp(2rem, 3vw, 2.35rem);
		font-weight: 700;
		line-height: 1;
		color: #0033a7;
	}

	.overview-stat-label {
		font-family: 'Lora', serif;
		font-size: 1.04rem;
		font-weight: 500;
		color: #1f2f45;
	}

	.etso-buscador {
		font-family: 'Roboto', sans-serif;
		color: #333;
		line-height: 1.6;
	}

	.etso-buscador__shell {
		min-width: 0;
	}

	.filters-section {
		background: transparent;
		padding: 0;
		border-radius: 0;
		margin-bottom: 1.6rem;
		box-shadow: none;
	}

	.search-primary {
		background: transparent;
		padding: 0;
		border-radius: 0;
		margin-bottom: 0.9rem;
		border: 0;
	}

	.filter-section {
		margin-bottom: 0.8rem;
		padding: 0.8rem 0;
		background: transparent;
		border-radius: 0;
	}

	.filter-section-title {
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
		color: #34495e;
		margin-bottom: 15px;
		letter-spacing: 0.5px;
		border-bottom: 2px solid #ecf0f1;
		padding-bottom: 8px;
	}

	.filter-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 20px;
		margin-bottom: 15px;
	}

	.filter-row.two-cols {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.filter-row.full {
		grid-template-columns: 1fr;
	}

	.search-primary .filter-row.row-title-genero {
		grid-template-columns: 3fr 1fr;
	}

	.search-primary .filter-row.row-autor-principal {
		grid-template-columns: 1fr;
		margin-bottom: 0;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
	}

	.filter-group label {
		font-weight: 600;
		margin-bottom: 6px;
		font-size: 14px;
		color: #555;
	}

	.filter-group input[type='text'],
	.filter-group input[type='date'] {
		padding: 10px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
		transition: border-color 0.2s;
	}

	.filter-group input[type='text']:focus,
	.filter-group input[type='date']:focus {
		outline: none;
		border-color: #5a9fd4;
		box-shadow: 0 0 0 3px rgba(90, 159, 212, 0.1);
	}

	.field-with-help {
		position: relative;
	}

	.field-label-with-help {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.field-help-anchor {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.field-help-trigger {
		width: 20px;
		height: 20px;
		border: 1px solid #c6d1e4;
		border-radius: 999px;
		background: #f2f6ff;
		color: #0033a7;
		font-size: 12px;
		font-weight: 700;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: help;
	}

	.field-help-popover {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		width: min(320px, 78vw);
		padding: 8px 10px;
		border: 1px solid #d8e0ea;
		border-radius: 6px;
		background: #fff;
		color: #3d4c63;
		font-size: 12px;
		line-height: 1.35;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
		display: none;
		z-index: 20;
	}

	.field-help-anchor:hover .field-help-popover,
	.field-help-anchor:focus-within .field-help-popover {
		display: block;
	}

	.autoria-general-row {
		margin-bottom: 18px;
		padding: 12px;
		border: 1px dashed #d6dde8;
		border-radius: 8px;
		background: #fafcff;
	}

	.autoria-columns {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.autoria-card {
		border: 1px solid #e4e9ef;
		border-radius: 8px;
		background: #fbfcfe;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.autoria-card--estilometria .row-esto-controls {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		align-items: start;
		margin-bottom: 0;
	}

	.advanced-filters {
		margin-top: 0.9rem;
		border: 1px solid #d8e0ea;
		border-radius: 8px;
		background: #fff;
		overflow: hidden;
	}

	.advanced-toggle {
		width: 100%;
		background: transparent;
		border: 0;
		border-radius: 0;
		color: #0033a7;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		padding: 0.9rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		transition: all 0.2s;
		margin-bottom: 0;
	}

	.advanced-toggle:hover {
		background: #eef3ff;
	}

	.advanced-toggle__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s ease;
	}

	.advanced-toggle__icon :global(svg) {
		width: 14px;
		height: 14px;
		stroke-width: 2.2;
	}

	.advanced-toggle[aria-expanded='true'] .advanced-toggle__icon {
		transform: rotate(180deg);
	}

	.advanced-content {
		background: transparent;
		border-top: 1px solid #d8e0ea;
		padding: 0.9rem 1rem;
		max-height: 1200px;
		overflow: hidden;
		transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.2s ease;
		opacity: 1;
	}

	.advanced-content.hidden {
		max-height: 0;
		padding-top: 0;
		padding-bottom: 0;
		border-top-color: transparent;
		opacity: 0;
	}

	.button-group {
		display: flex;
		gap: 10px;
		margin-top: 20px;
		justify-content: flex-end;
	}

	.button-group button,
	.button-group .button {
		padding: 12px 24px;
		border: none;
		border-radius: 4px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-block;
	}

	.btn-primary {
		background: #0033a7;
		color: #fff;
	}

	.btn-primary:hover {
		background: #002266;
	}

	.btn-secondary {
		background: #fff;
		color: #34495e;
		border: 1px solid #d2d8de;
	}

	.btn-secondary:hover {
		background: #eef2f6;
		border-color: #bac4cf;
	}

	.description {
		font-size: 12px;
		color: #7f8c8d;
		font-style: italic;
		margin-top: 4px;
	}

	.etso-buscador__results {
		position: relative;
		outline: none;
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		padding-bottom: 15px;
		border-bottom: 2px solid #ecf0f1;
	}

	.results-count {
		font-size: 16px;
		color: #555;
	}

	.results-count strong {
		color: #2c3e50;
		font-size: 20px;
	}

	@media (max-width: 1200px) {
		.buscador-overview {
			grid-template-columns: 1fr;
			background-size: auto, min(90vw, 680px) auto;
			background-position: center, right -80px bottom -58px;
		}

		.buscador-overview__stats {
			grid-template-columns: repeat(2, minmax(180px, 1fr));
			max-width: 520px;
			transform: none;
			justify-self: start;
		}

		.overview-stat-card:nth-child(2) {
			margin-top: 1.1rem;
			transform: translateY(0);
		}

		.overview-stat-card:first-child {
			transform: translateY(0);
		}

		.filter-row {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.search-primary .filter-row {
			grid-template-columns: 1fr;
		}

		.autoria-columns {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.buscador-overview {
			background-size: auto, min(130vw, 720px) auto;
			background-position: center, right -120px bottom -35px;
		}

		.buscador-overview__lead {
			max-width: none;
		}

		.buscador-overview__stats {
			grid-template-columns: 1fr;
		}

		.overview-stat-card:nth-child(2) {
			margin-top: 0;
			transform: translateY(0);
		}

		.overview-stat-card:first-child {
			transform: translateY(0);
		}

		.filters-section {
			padding: 20px;
		}

		.filter-row,
		.filter-row.two-cols {
			grid-template-columns: 1fr;
		}

		.autoria-card--estilometria .row-esto-controls {
			grid-template-columns: 1fr;
		}

		.button-group {
			justify-content: stretch;
			flex-direction: column;
		}
	}
</style>
