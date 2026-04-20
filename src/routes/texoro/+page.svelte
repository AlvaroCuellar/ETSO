<script lang="ts">
	import { onMount } from 'svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Feather from 'lucide-svelte/icons/feather';
	import Search from 'lucide-svelte/icons/search';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';

	import { TexoroSearchEngine, buildWorkMetaMap, normalizePattern, normalizePlainText } from '$lib/search';

	import type {
		SearchExecution,
		SearchMatchOccurrences,
		SearchResult,
		SearchResultMatch
	} from '$lib/search';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const worksMetaMap = $derived.by(() => buildWorkMetaMap(data.worksMeta));
	const numberFormatter = new Intl.NumberFormat('es-ES');
	const highlightPalette = [
		{
			chip: 'background-color:#fff6df;border-color:#f2c46d;color:#7a4f00;',
			mark: 'background-color:#ffe49a;color:#4d3200;'
		},
		{
			chip: 'background-color:#eaf8eb;border-color:#79c58a;color:#1f6331;',
			mark: 'background-color:#bfeec8;color:#144321;'
		},
		{
			chip: 'background-color:#e9f2ff;border-color:#8ab6ef;color:#1e4e8e;',
			mark: 'background-color:#c8defd;color:#153b6d;'
		},
		{
			chip: 'background-color:#f7ebff;border-color:#be95eb;color:#5d2f8f;',
			mark: 'background-color:#dfc8f8;color:#46206d;'
		},
		{
			chip: 'background-color:#ffeef2;border-color:#ef9ab3;color:#8a2342;',
			mark: 'background-color:#fecfdd;color:#63142d;'
		},
		{
			chip: 'background-color:#e7f9fb;border-color:#88cfdb;color:#1d6170;',
			mark: 'background-color:#bcecf2;color:#144752;'
		}
	] as const;

	interface MatchAssignment {
		key: string;
		match: SearchResultMatch;
		patterns: string[];
		regexes: RegExp[];
		chipStyle: string;
		markStyle: string;
	}

	interface OccurrenceModalState {
		result: SearchResult;
		assignment: MatchAssignment;
		details: SearchMatchOccurrences | null;
	}

	let engine = $state<TexoroSearchEngine | null>(null);
	let isEngineReady = $state(false);
	let query = $state('');
	let isSearching = $state(false);
	let searchError = $state('');
	let searchExecution = $state<SearchExecution | null>(null);
	let indexStats = $state<{ works: number; tokens: number; vocabSize: number } | null>(null);
	let preserveEnieForHighlight = $state(true);
	let occurrenceModal = $state<OccurrenceModalState | null>(null);
	let occurrenceLoading = $state(false);
	let occurrenceError = $state('');

	const wildcardPatternToRegex = (pattern: string): RegExp => {
		let expression = '^';
		for (const char of pattern) {
			if (char === '*') {
				expression += '.*';
				continue;
			}
			if (char === '?') {
				expression += '.';
				continue;
			}
			expression += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}
		expression += '$';
		return new RegExp(expression, 'u');
	};

	const escapeHtml = (value: string): string =>
		value
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');

	const extractMatchPatterns = (match: SearchResultMatch): string[] => {
		const source = match.source.trim();
		const phraseBody =
			match.kind === 'phrase' && source.startsWith('"') && source.endsWith('"')
				? source.slice(1, -1)
				: source;
		const chunks =
			match.kind === 'phrase'
				? phraseBody.split(/\s+/).filter((chunk) => chunk.length > 0)
				: [phraseBody];
		const normalized = chunks
			.map((chunk) => normalizePattern(chunk, preserveEnieForHighlight))
			.filter((chunk) => chunk.length > 0);
		return Array.from(new Set(normalized));
	};

	const buildMatchAssignments = (matches: SearchResultMatch[]): MatchAssignment[] => {
		const unique = new Map<string, SearchResultMatch>();
		for (const match of matches) {
			const key = `${match.kind}:${match.source}`;
			if (!unique.has(key)) unique.set(key, match);
		}

		return Array.from(unique.entries()).map(([key, match], index) => {
			const palette = highlightPalette[index % highlightPalette.length];
			const patterns = extractMatchPatterns(match);
			return {
				key,
				match,
				patterns,
				regexes: patterns.map((pattern) => wildcardPatternToRegex(pattern)),
				chipStyle: palette.chip,
				markStyle: palette.mark
			};
		});
	};

	const highlightSnippet = (snippet: string, assignments: MatchAssignment[]): string => {
		if (!snippet.trim()) return '';
		const eligible = assignments.filter((assignment) => assignment.regexes.length > 0);
		if (eligible.length === 0) return escapeHtml(snippet);

		const wordRegex = /[\p{L}\p{N}]+/gu;
		let output = '';
		let cursor = 0;

		for (const tokenMatch of snippet.matchAll(wordRegex)) {
			const token = tokenMatch[0];
			const start = tokenMatch.index ?? 0;
			const end = start + token.length;
			output += escapeHtml(snippet.slice(cursor, start));

			const normalizedToken = normalizePlainText(token, preserveEnieForHighlight);
			const assignment = eligible.find((entry) =>
				entry.regexes.some((regex) => regex.test(normalizedToken))
			);

			if (assignment) {
				output += `<mark class="rounded-[4px] px-[2px]" style="${assignment.markStyle}">${escapeHtml(token)}</mark>`;
			} else {
				output += escapeHtml(token);
			}

			cursor = end;
		}

		output += escapeHtml(snippet.slice(cursor));
		return output;
	};

	const closeOccurrenceModal = (): void => {
		occurrenceModal = null;
		occurrenceLoading = false;
		occurrenceError = '';
	};

	const openOccurrenceModal = async (
		result: SearchResult,
		assignment: MatchAssignment
	): Promise<void> => {
		if (!engine || assignment.match.occurrences <= 1) return;
		occurrenceError = '';
		occurrenceLoading = true;
		occurrenceModal = {
			result,
			assignment,
			details: null
		};
		try {
			const details = await engine.getOccurrencesForMatch(
				{ docId: result.docId, workId: result.workId },
				assignment.match,
				{
					maxItems: 500,
					snippetRadius: 115
				}
			);
			if (!occurrenceModal) return;
			if (
				occurrenceModal.result.docId !== result.docId ||
				occurrenceModal.assignment.key !== assignment.key
			) {
				return;
			}
			occurrenceModal = {
				result,
				assignment,
				details
			};
		} catch (cause) {
			occurrenceError =
				cause instanceof Error ? cause.message : 'No se pudieron cargar las concurrencias';
		} finally {
			occurrenceLoading = false;
		}
	};

	onMount(async () => {
		try {
			const created = new TexoroSearchEngine();
			await created.initialize();
			engine = created;
			isEngineReady = true;
			if (created.manifest) {
				indexStats = {
					works: created.manifest.stats.works,
					tokens: created.manifest.stats.tokens,
					vocabSize: created.manifest.stats.vocabSize
				};
				preserveEnieForHighlight = created.manifest.normalization.preserveEnie;
			}
		} catch (cause) {
			searchError = cause instanceof Error ? cause.message : 'No se pudo inicializar TEXORO';
		}
	});

	const submitSearch = async (event: SubmitEvent): Promise<void> => {
		event.preventDefault();
		searchError = '';
		searchExecution = null;
		if (!engine) {
			searchError = 'Motor de búsqueda no disponible todavía';
			return;
		}
		if (!query.trim()) {
			searchError = 'Introduce una consulta';
			return;
		}

		isSearching = true;
		try {
			searchExecution = await engine.search(query, worksMetaMap, {
				limit: 35,
				maxPhraseVerificationDocs: 220,
				snippetRadius: 115
			});
		} catch (cause) {
			searchError = cause instanceof Error ? cause.message : 'Error ejecutando la búsqueda';
		} finally {
			isSearching = false;
		}
	};
</script>

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'TEXORO' }]} />

	<section
		class="grid items-start gap-[2.1rem] rounded-[14px] bg-[#ececf0] p-[clamp(1.2rem,2.4vw,2rem)] [background-repeat:no-repeat,no-repeat] [background-size:auto,min(130vw,720px)_auto] [background-position:center,right_-120px_bottom_-35px] md:[background-size:auto,min(90vw,680px)_auto] md:[background-position:center,right_-80px_bottom_-58px] min-[1201px]:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)] min-[1201px]:[background-size:auto,min(60vw,860px)_auto] min-[1201px]:[background-position:center,right_-56px_bottom_-66px]"
		style={`background-image: linear-gradient(100deg, rgba(239,240,244,0.95) 0%, rgba(236,237,242,0.88) 46%, rgba(236,237,242,0.52) 70%, rgba(236,237,242,0.22) 100%), url('${fondoLogo}')`}
	>
		<div class="flex flex-col">
			<h1 class="mb-0 mt-0 font-ui text-[clamp(2rem,4.3vw,2.85rem)] leading-[1.05] font-bold text-[#0033a7]">TEXORO</h1>
			<p class="mt-[1.05rem] mb-0 max-w-none font-ui text-[clamp(1.28rem,2.2vw,1.78rem)] leading-[1.22] font-semibold text-[#003aa5] min-[1201px]:max-w-[25ch]">
				Búsquedas textuales en 3000 obras del Siglo de Oro
			</p>
			<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-[#17293f]">
				TEXORO es una plataforma de búsqueda textual que permite consultar de forma unificada una amplia colección de textos del Siglo de Oro. El sistema ofrece acceso directo a obras teatrales y otros textos literarios procedentes de distintas tradiciones editoriales y documentales, con el objetivo de facilitar la exploración, localización y análisis del patrimonio textual aurisecular.
			</p>
			<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-[#17293f]">
				La búsqueda funciona en dos fases: primero recupera obras candidatas con índices ligeros; después verifica frase exacta y patrones complejos sobre los TXT candidatos.
			</p>
		</div>

		<div
			class="grid w-full max-w-[420px] grid-cols-1 content-center items-end gap-[1.05rem] self-center justify-self-center md:max-w-[520px] md:grid-cols-2 md:justify-self-start min-[1201px]:max-w-[420px] min-[1201px]:justify-self-center"
			aria-label="Indicadores de TEXORO"
		>
			<article
				class="flex min-h-[170px] flex-col items-start gap-[0.65rem] rounded-[10px] border border-[rgba(6,33,93,0.08)] bg-[rgba(249,249,251,0.88)] px-[1.1rem] pb-[1.1rem] pt-[1.35rem] shadow-[0_8px_20px_rgba(25,37,77,0.08)] lg:-translate-y-[14px]"
			>
				<div class="inline-flex h-[2.2rem] w-[2.2rem] items-center justify-center text-[#70006b]" aria-hidden="true">
					<BookOpen class="h-[1.9rem] w-[1.9rem] stroke-[2.2]" />
				</div>
				<div>
					<div class="text-[clamp(2rem,3vw,2.35rem)] leading-none font-bold text-[#0033a7]">
						{numberFormatter.format(indexStats?.works ?? data.stats.works)}
					</div>
					<div class="font-['Roboto'] text-[1.04rem] font-medium text-[#1f2f45]">Obras indexadas</div>
				</div>
			</article>

			<article
				class="flex min-h-[170px] flex-col items-start gap-[0.65rem] rounded-[10px] border border-[rgba(6,33,93,0.08)] bg-[rgba(249,249,251,0.88)] px-[1.1rem] pb-[1.1rem] pt-[1.35rem] shadow-[0_8px_20px_rgba(25,37,77,0.08)] lg:translate-y-[14px]"
			>
				<div class="inline-flex h-[2.2rem] w-[2.2rem] items-center justify-center text-[#70006b]" aria-hidden="true">
					<Feather class="h-[1.9rem] w-[1.9rem] stroke-[2.2]" />
				</div>
				<div>
					<div class="text-[clamp(2rem,3vw,2.35rem)] leading-none font-bold text-[#0033a7]">
						{indexStats ? numberFormatter.format(indexStats.tokens) : '--'}
					</div>
					<div class="font-['Roboto'] text-[1.04rem] font-medium text-[#1f2f45]">Tokens indexados</div>
				</div>
			</article>
		</div>
	</section>

	<section class="rounded-[14px] border border-[#d8dee7] bg-white p-5 shadow-[0_6px_20px_rgba(16,42,84,0.08)]">
		<h2 class="m-0 font-['Roboto',sans-serif] text-[1.45rem] font-bold text-[#1f3f7a]">Buscar en TEXORO</h2>
		<p class="mt-2 mb-0 text-[0.98rem] text-[#38516f]">
			Consulta palabras, frases con comillas, comodines (`*`, `?`) y combinaciones con AND/OR.
		</p>

		<form class="mt-4 flex flex-col gap-3 md:flex-row" onsubmit={submitSearch}>
			<div class="relative flex-1">
				<input
					type="search"
					bind:value={query}
					placeholder='Ejemplos: amor | "amor constante" | am* OR "amor const*"'
					class="h-[46px] w-full rounded-[10px] border border-[#b9c6d8] bg-white px-11 py-2 text-[15px] text-[#1a3356] outline-none transition focus:border-[#0033a7] focus:ring-2 focus:ring-[#0033a7]/15"
				/>
				<span class="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-[#4a5f7e]">
					<Search class="h-4.5 w-4.5" />
				</span>
			</div>
			<button
				type="submit"
				disabled={!isEngineReady || isSearching}
				class="inline-flex h-[46px] min-w-[180px] items-center justify-center gap-2 rounded-[10px] border border-[#0033a7] bg-[#0033a7] px-5 font-['Roboto',sans-serif] text-[0.93rem] font-semibold tracking-[0.02em] text-white transition disabled:cursor-not-allowed disabled:opacity-70"
			>
				{#if isSearching}
					<LoaderCircle class="h-4.5 w-4.5 animate-spin" />
					Buscando...
				{:else}
					Buscar
				{/if}
			</button>
		</form>

		{#if searchError}
			<p class="mt-3 mb-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.92rem] text-[#8f1e36]">{searchError}</p>
		{/if}

		{#if searchExecution}
			<div class="mt-4 grid gap-4">
				<div class="flex flex-wrap items-center gap-2 font-['Roboto',sans-serif] text-[0.9rem] text-[#335275]">
					<span class="rounded-full bg-[#eef3fb] px-3 py-1">
						{numberFormatter.format(searchExecution.textsWithOccurrences)} textos con concurrencias
					</span>
					<span class="rounded-full bg-[#eef3fb] px-3 py-1">
						{numberFormatter.format(searchExecution.totalOccurrences)} concurrencias totales
					</span>
					<span class="rounded-full bg-[#eef3fb] px-3 py-1">
						Mostrando {numberFormatter.format(searchExecution.results.length)}
					</span>
					<span class="rounded-full bg-[#eef3fb] px-3 py-1">{searchExecution.elapsedMs} ms</span>
				</div>

				{#if searchExecution.parsed.warnings.length > 0}
					<p class="m-0 rounded-[9px] border border-[#d4d9e2] bg-[#f8f9fb] px-3 py-2 text-[0.88rem] text-[#4c607d]">
						{searchExecution.parsed.warnings.join(' · ')}
					</p>
				{/if}

				{#if searchExecution.results.length === 0}
					<p class="m-0 text-[0.96rem] text-[#526887]">No se encontraron coincidencias.</p>
				{:else}
					<ul class="m-0 grid list-none gap-3 p-0">
						{#each searchExecution.results as result}
							{@const assignments = buildMatchAssignments(result.matches)}
							<li class="rounded-[11px] border border-[#d8e0ec] bg-[#fbfcfe] px-4 py-3">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0">
										<h3 class="m-0 font-['Roboto',sans-serif] text-[1.03rem] font-semibold leading-[1.25] text-[#143660]">
											{#if result.meta}
												<a href={`/obras/${result.meta.slug}`} class="text-[#0d3f91] hover:underline">{result.meta.title}</a>
											{:else}
												{result.workId}
											{/if}
										</h3>
										<p class="mt-1 mb-0 text-[0.9rem] text-[#4f6686]">{result.workId}</p>
									</div>
									<span class="shrink-0 rounded-full bg-[#eaf0fb] px-2.5 py-1 text-[0.8rem] font-semibold text-[#264a7b]">
										score {result.score.toFixed(1)}
									</span>
								</div>

								{#if result.snippet}
									<p class="mt-2 mb-0 text-[0.95rem] leading-[1.5] text-[#243a59]">
										{@html highlightSnippet(result.snippet, assignments)}
									</p>
								{/if}

								<div class="mt-2 flex flex-wrap gap-1.5">
									{#each assignments as assignment}
										{#if assignment.match.occurrences > 1}
											<button
												type="button"
												class="rounded-full border px-2 py-[2px] font-['Roboto',sans-serif] text-[0.76rem] font-medium hover:brightness-95"
												style={`${assignment.chipStyle} cursor:pointer;`}
												onclick={() => openOccurrenceModal(result, assignment)}
												title="Ver todas las concurrencias"
											>
												{assignment.match.kind === 'phrase' ? 'Frase' : 'Término'}: {assignment.match.source}
												({numberFormatter.format(assignment.match.occurrences)})
											</button>
										{:else}
											<span
												class="rounded-full border px-2 py-[2px] font-['Roboto',sans-serif] text-[0.76rem] font-medium"
												style={assignment.chipStyle}
											>
												{assignment.match.kind === 'phrase' ? 'Frase' : 'Término'}: {assignment.match.source}
												({numberFormatter.format(assignment.match.occurrences)})
											</span>
										{/if}
									{/each}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</section>
</div>

{#if occurrenceModal}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-[#112742]/55 px-3 py-4">
		<div class="max-h-[88vh] w-full max-w-[880px] overflow-hidden rounded-[12px] bg-white shadow-[0_16px_40px_rgba(4,24,56,0.33)]">
			<div class="flex items-start justify-between gap-3 border-b border-[#d8e0ec] px-4 py-3">
				<div>
					<h3 class="m-0 font-['Roboto',sans-serif] text-[1.02rem] font-semibold text-[#163860]">
						{occurrenceModal.assignment.match.kind === 'phrase' ? 'Concurrencias de frase' : 'Concurrencias de término'}
					</h3>
					<p class="mt-1 mb-0 text-[0.9rem] text-[#476385]">
						{occurrenceModal.assignment.match.source}
						{#if occurrenceModal.details}
							({numberFormatter.format(occurrenceModal.details.count)})
						{/if}
					</p>
				</div>
				<button
					type="button"
					class="rounded-[8px] border border-[#c8d5ea] px-2.5 py-1 font-['Roboto',sans-serif] text-[0.8rem] font-medium text-[#35557d] hover:bg-[#f3f7fd]"
					onclick={closeOccurrenceModal}
				>
					Cerrar
				</button>
			</div>

			<div class="max-h-[72vh] overflow-auto px-4 py-3">
				{#if occurrenceLoading}
					<p class="m-0 text-[0.93rem] text-[#4d6485]">Cargando concurrencias...</p>
				{:else if occurrenceError}
					<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.9rem] text-[#8f1e36]">
						{occurrenceError}
					</p>
				{:else if occurrenceModal.details && occurrenceModal.details.items.length > 0}
					<ul class="m-0 grid list-none gap-2 p-0">
						{#each occurrenceModal.details.items as item, index}
							<li class="rounded-[9px] border border-[#dde6f2] bg-[#f9fbfe] px-3 py-2">
								<p class="m-0 text-[0.79rem] font-semibold text-[#5a7395]">#{index + 1}</p>
								<p class="mt-1 mb-0 text-[0.93rem] leading-[1.5] text-[#243a59]">
									{@html highlightSnippet(item.snippet, [occurrenceModal.assignment])}
								</p>
							</li>
						{/each}
					</ul>
					{#if occurrenceModal.details.truncated}
						<p class="mt-3 mb-0 text-[0.84rem] text-[#5a7395]">
							Se muestran las primeras {numberFormatter.format(occurrenceModal.details.items.length)} concurrencias de
							{numberFormatter.format(occurrenceModal.details.count)}.
						</p>
					{/if}
				{:else}
					<p class="m-0 text-[0.93rem] text-[#4d6485]">No hay concurrencias para mostrar.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
