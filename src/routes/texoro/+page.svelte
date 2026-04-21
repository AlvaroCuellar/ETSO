<script lang="ts">
	import { onMount } from 'svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import AttributionView from '$lib/components/ui/AttributionView.svelte';
	import AppButton from '$lib/components/ui/AppButton.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import ChartModeToggle from '$lib/components/search/ChartModeToggle.svelte';
	import ComparisonMetricToggle from '$lib/components/search/ComparisonMetricToggle.svelte';
	import TexoroLiveChart from '$lib/components/search/TexoroLiveChart.svelte';
	import TexoroComparisonChart from '$lib/components/search/TexoroComparisonChart.svelte';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Feather from 'lucide-svelte/icons/feather';
	import Search from 'lucide-svelte/icons/search';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';

	import { TexoroSearchEngine, buildWorkMetaMap, normalizePattern, normalizePlainText } from '$lib/search';

	import type {
		ParsedQueryClause,
		SearchExecution,
		SearchMatchOccurrences,
		SearchResult,
		SearchResultMatch
	} from '$lib/search';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const worksMetaMap = $derived.by(() => buildWorkMetaMap(data.worksMeta));
	const numberFormatter = new Intl.NumberFormat('es-ES');
	const decimalFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
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

	interface ChartRow {
		label: string;
		value: number;
		percentage: number;
		color: string;
	}

	interface ChartBlock {
		rows: ChartRow[];
		total: number;
	}

	interface ComparisonTerm {
		key: string;
		label: string;
		color: string;
	}

	interface ComparisonAccumulator {
		label: string;
		occurrencesByTerm: Map<string, number>;
		frequency10kByTerm: Map<string, number>;
		totalOccurrences: number;
	}

	interface ComparisonChartRow {
		label: string;
		occurrences: number[];
		frequency10k: number[];
		totalOccurrences: number;
	}

	interface ComparisonChartBlock {
		rows: ComparisonChartRow[];
		series: ComparisonTerm[];
	}

	type ChartKey = 'author' | 'genre';
	type ChartMode = 'bars' | 'pie';
	type ComparisonMetric = 'frequency10k' | 'occurrences' | 'share';

	const chartPalette = ['#1f5fbf', '#2f8fca', '#3aa6a0', '#59a55c', '#d38f38', '#9a69c6', '#c45e92'];
	const exportSurface = '#edf2ff';
	const exportTitle = '#002681';
	const exportText = '#4f5562';
	const exportTextStrong = '#243b63';

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
	let chartMode = $state<ChartMode>('bars');
	let comparisonMetric = $state<ComparisonMetric>('frequency10k');
	let chartCopyPending = $state<Record<ChartKey, boolean>>({ author: false, genre: false });
	let authorChartRef = $state<TexoroLiveChart | null>(null);
	let genreChartRef = $state<TexoroLiveChart | null>(null);
	let infoModalOpen = $state(false);

	const sumResultOccurrences = (result: SearchResult): number =>
		result.matches.reduce((sum, match) => sum + (match.occurrences ?? 0), 0);

	const collectStylometryAuthors = (result: SearchResult): string[] => {
		const set = result.meta?.stylometryAttribution;
		if (!set || set.unresolved) return [];
		const authorById = new Map<string, string>();
		for (const group of set.groups) {
			for (const member of group.members) {
				const id = member.authorId?.trim();
				const name = member.authorName?.trim();
				if (!id || !name) continue;
				if (!authorById.has(id)) authorById.set(id, name);
			}
		}
		return Array.from(authorById.values());
	};

	const toChartBlock = (source: Map<string, number>, limit: number): ChartBlock => {
		const sorted = Array.from(source.entries())
			.filter((entry) => entry[1] > 0)
			.sort((a, b) => b[1] - a[1]);

		const top = sorted.slice(0, limit).map(([label, value]) => ({ label, value }));
		if (sorted.length > limit) {
			const others = sorted.slice(limit).reduce((sum, entry) => sum + entry[1], 0);
			if (others > 0) {
				top.push({ label: 'Otros', value: others });
			}
		}

		const total = top.reduce((sum, row) => sum + row.value, 0);

		return {
			total,
			rows: top.map((row, index) => ({
				label: row.label,
				value: row.value,
				percentage: total > 0 ? (row.value / total) * 100 : 0,
				color: chartPalette[index % chartPalette.length]
			}))
		};
	};

	const liveCharts = $derived.by(() => {
		if (!searchExecution || searchExecution.results.length === 0) {
			return null;
		}

		const byAuthor = new Map<string, number>();
		const byGenre = new Map<string, number>();

		for (const result of searchExecution.results) {
			const occurrences = sumResultOccurrences(result);
			if (occurrences <= 0) continue;

			const genre = result.meta?.genre?.trim() || 'Sin género';
			byGenre.set(genre, (byGenre.get(genre) ?? 0) + occurrences);

			const authors = collectStylometryAuthors(result);
			if (authors.length === 0) {
				byAuthor.set(
					'Sin atribución estilométrica',
					(byAuthor.get('Sin atribución estilométrica') ?? 0) + occurrences
				);
				continue;
			}

			const proportionalShare = occurrences / authors.length;
			for (const author of authors) {
				byAuthor.set(author, (byAuthor.get(author) ?? 0) + proportionalShare);
			}
		}

		return {
			author: toChartBlock(byAuthor, 10),
			genre: toChartBlock(byGenre, 8)
		};
	});

	const chartTitles: Record<ChartKey, string> = {
		author: 'Concurrencias por autor',
		genre: 'Concurrencias por género'
	};

	const chartEmptyMessages: Record<ChartKey, string> = {
		author: 'No hay datos de autoría estilométrica para graficar.',
		genre: 'No hay datos de género para graficar.'
	};

	const queryClauseSource = (clause: ParsedQueryClause): string =>
		clause.kind === 'phrase' ? `"${clause.literal.trim()}"` : clause.pattern.trim();

	const queryClauseKey = (clause: ParsedQueryClause): string => `${clause.kind}:${queryClauseSource(clause)}`;

	const queryClauseLabel = (clause: ParsedQueryClause): string => {
		return queryClauseSource(clause);
	};

	const queryClauseCount = $derived.by(() => {
		if (!searchExecution) return 0;
		let count = 0;
		for (const group of searchExecution.parsed.groups) {
			count += group.length;
		}
		return count;
	});

	const queryLabelNoun = $derived.by(() => (queryClauseCount === 1 ? 'Término' : 'Términos'));

	const queryTermsLabel = $derived.by(() => {
		if (!searchExecution) return '';
		const groups = searchExecution.parsed.groups
			.map((group) => group.map((clause) => queryClauseLabel(clause)).filter((label) => label.length > 0))
			.filter((group) => group.length > 0);
		if (groups.length === 0) return searchExecution.query.trim();

		const expression = groups.map((group) => group.join(' AND ')).join(' OR ');
		return expression.length > 240 ? `${expression.slice(0, 237)}...` : expression;
	});

	const comparisonTerms = $derived.by(() => {
		if (!searchExecution) return [] as ComparisonTerm[];
		const output: ComparisonTerm[] = [];
		const seen = new Set<string>();
		for (const group of searchExecution.parsed.groups) {
			for (const clause of group) {
				const key = queryClauseKey(clause);
				if (seen.has(key)) continue;
				seen.add(key);
				output.push({
					key,
					label: queryClauseLabel(clause),
					color: chartPalette[output.length % chartPalette.length]
				});
			}
		}
		return output.slice(0, 6);
	});

	const comparisonTermsOverflow = $derived.by(() => {
		if (!searchExecution) return false;
		const seen = new Set<string>();
		for (const group of searchExecution.parsed.groups) {
			for (const clause of group) seen.add(queryClauseKey(clause));
		}
		return seen.size > comparisonTerms.length;
	});

	const ensureComparisonAccumulator = (
		target: Map<string, ComparisonAccumulator>,
		label: string
	): ComparisonAccumulator => {
		const existing = target.get(label);
		if (existing) return existing;
		const created: ComparisonAccumulator = {
			label,
			occurrencesByTerm: new Map<string, number>(),
			frequency10kByTerm: new Map<string, number>(),
			totalOccurrences: 0
		};
		target.set(label, created);
		return created;
	};

	const addComparisonValue = (
		acc: ComparisonAccumulator,
		term: ComparisonTerm,
		occurrences: number,
		frequency10k: number
	): void => {
		if (occurrences <= 0) return;
		acc.occurrencesByTerm.set(term.key, (acc.occurrencesByTerm.get(term.key) ?? 0) + occurrences);
		acc.frequency10kByTerm.set(term.key, (acc.frequency10kByTerm.get(term.key) ?? 0) + frequency10k);
		acc.totalOccurrences += occurrences;
	};

	const toComparisonChartBlock = (
		source: Map<string, ComparisonAccumulator>,
		terms: ComparisonTerm[],
		limit: number
	): ComparisonChartBlock => {
		const sorted = Array.from(source.values())
			.filter((entry) => entry.totalOccurrences > 0)
			.sort((a, b) => b.totalOccurrences - a.totalOccurrences || a.label.localeCompare(b.label, 'es'));

		const top = sorted.slice(0, limit);
		if (sorted.length > limit) {
			const others: ComparisonAccumulator = {
				label: 'Otros',
				occurrencesByTerm: new Map<string, number>(),
				frequency10kByTerm: new Map<string, number>(),
				totalOccurrences: 0
			};
			for (const row of sorted.slice(limit)) {
				others.totalOccurrences += row.totalOccurrences;
				for (const term of terms) {
					others.occurrencesByTerm.set(
						term.key,
						(others.occurrencesByTerm.get(term.key) ?? 0) + (row.occurrencesByTerm.get(term.key) ?? 0)
					);
					others.frequency10kByTerm.set(
						term.key,
						(others.frequency10kByTerm.get(term.key) ?? 0) + (row.frequency10kByTerm.get(term.key) ?? 0)
					);
				}
			}
			if (others.totalOccurrences > 0) top.push(others);
		}

		return {
			series: terms,
			rows: top.map((row) => ({
				label: row.label,
				occurrences: terms.map((term) => row.occurrencesByTerm.get(term.key) ?? 0),
				frequency10k: terms.map((term) => row.frequency10kByTerm.get(term.key) ?? 0),
				totalOccurrences: row.totalOccurrences
			}))
		};
	};

	const multiTermComparison = $derived.by(() => {
		if (!searchExecution || searchExecution.results.length === 0) return null;
		if (comparisonTerms.length < 2) return null;

		const byAuthor = new Map<string, ComparisonAccumulator>();
		const byGenre = new Map<string, ComparisonAccumulator>();

		for (const result of searchExecution.results) {
			const matchesByKey = new Map<string, number>(
				result.matches.map((match) => [`${match.kind}:${match.source}`, match.occurrences])
			);

			const tokenCount = Math.max(1, result.docTokenCount || 0);
			const genre = result.meta?.genre?.trim() || 'Sin género';
			const genreAcc = ensureComparisonAccumulator(byGenre, genre);

			const authors = collectStylometryAuthors(result);
			const authorLabels = authors.length > 0 ? authors : ['Sin atribución estilométrica'];
			const authorShare = 1 / authorLabels.length;
			const authorAccs = authorLabels.map((label) => ensureComparisonAccumulator(byAuthor, label));

			for (const term of comparisonTerms) {
				const occurrences = matchesByKey.get(term.key) ?? 0;
				if (occurrences <= 0) continue;
				const frequency10k = (occurrences * 10_000) / tokenCount;

				addComparisonValue(genreAcc, term, occurrences, frequency10k);

				const authorOccurrences = occurrences * authorShare;
				const authorFrequency10k = frequency10k * authorShare;
				for (const authorAcc of authorAccs) {
					addComparisonValue(authorAcc, term, authorOccurrences, authorFrequency10k);
				}
			}
		}

		return {
			author: toComparisonChartBlock(byAuthor, comparisonTerms, 10),
			genre: toComparisonChartBlock(byGenre, comparisonTerms, 8)
		};
	});

	const comparisonMetricLabel = $derived.by(() => {
		if (comparisonMetric === 'occurrences') return 'Concurrencias';
		if (comparisonMetric === 'share') return 'Reparto porcentual';
		return 'Frecuencia por 10.000 palabras';
	});

	const chartTitleWithQuery = (chartKey: ChartKey): string => {
		const suffix = queryTermsLabel.trim();
		return suffix ? `${chartTitles[chartKey]} · ${queryLabelNoun}: ${suffix}` : chartTitles[chartKey];
	};

	const resultAuthorLabel = (result: SearchResult): string => {
		const authors = collectStylometryAuthors(result);
		if (authors.length === 0) return 'autoría no resuelta';
		if (authors.length <= 2) return authors.join(' / ');
		return `${authors[0]} / ${authors[1]} +${authors.length - 2}`;
	};

	const drawWrappedText = (
		ctx: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		maxWidth: number,
		lineHeight: number
	): number => {
		const words = text.split(/\s+/);
		const lines: string[] = [];
		let current = '';
		for (const word of words) {
			const candidate = current ? `${current} ${word}` : word;
			if (ctx.measureText(candidate).width <= maxWidth || !current) {
				current = candidate;
			} else {
				lines.push(current);
				current = word;
			}
		}
		if (current) lines.push(current);
		for (let i = 0; i < lines.length; i += 1) {
			ctx.fillText(lines[i], x, y + i * lineHeight);
		}
		return y + lines.length * lineHeight;
	};

	const toCanvasBlob = async (canvas: HTMLCanvasElement): Promise<Blob> =>
		new Promise((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
					return;
				}
				reject(new Error('No se pudo generar el PNG'));
			}, 'image/png');
		});

	const loadImageFromDataUrl = async (dataUrl: string): Promise<HTMLImageElement> =>
		new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error('No se pudo renderizar la imagen del gráfico'));
			image.src = dataUrl;
		});

	const getChartRefByKey = (chartKey: ChartKey): TexoroLiveChart | null =>
		chartKey === 'author' ? authorChartRef : genreChartRef;

	const downloadChartPng = async (chartKey: ChartKey, chart: ChartBlock): Promise<void> => {
		if (!searchExecution || chart.rows.length === 0) return;
		chartCopyPending[chartKey] = true;

		try {
			const chartRef = getChartRefByKey(chartKey);
			if (!chartRef) throw new Error('El gráfico aún no está listo');
			const chartDataUrl = chartRef.getPngDataUrl(5);
			if (!chartDataUrl) throw new Error('No se pudo generar el gráfico para exportación');
			const chartImage = await loadImageFromDataUrl(chartDataUrl);

			const canvas = document.createElement('canvas');
			canvas.width = 1680;
			canvas.height = 1220;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Canvas no disponible');

			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.fillStyle = exportSurface;
			ctx.fillRect(56, 176, 1568, 760);

			const exportTitle = chartTitleWithQuery(chartKey);
			ctx.fillStyle = exportTitle;
			ctx.font = '700 44px Roboto, sans-serif';
			const subtitleTop = drawWrappedText(ctx, exportTitle, 64, 84, 1554, 50) + 4;

			const summaryTop = subtitleTop + 6;

			ctx.fillStyle = exportTextStrong;
			ctx.font = '600 22px Roboto, sans-serif';
			ctx.fillText(
				`Total de concurrencias en gráfico: ${decimalFormatter.format(chart.total)} · Modo: ${
					chartMode === 'bars' ? 'Barras' : 'Circular %'
				}`,
				64,
				summaryTop
			);

			const drawFrame = {
				x: 78,
				y: 192,
				width: 1524,
				height: 728
			};
			const scale = Math.min(drawFrame.width / chartImage.width, drawFrame.height / chartImage.height);
			const drawWidth = chartImage.width * scale;
			const drawHeight = chartImage.height * scale;
			const drawX = drawFrame.x + (drawFrame.width - drawWidth) / 2;
			const drawY = drawFrame.y + (drawFrame.height - drawHeight) / 2;
			ctx.drawImage(chartImage, drawX, drawY, drawWidth, drawHeight);

			const now = new Date();
			const dateText = now.toLocaleString('es-ES');
			const sourceUrl = typeof window !== 'undefined' ? `${window.location.origin}/texoro` : '/texoro';
			const indexVersion = engine?.manifest?.indexVersion ?? 'n/d';
			const citation =
				`Cita sugerida: ETSO, TEXORO. "${exportTitle}". ` +
				`Consulta: "${searchExecution.query}". ` +
				`Generado el ${dateText}. ` +
				`Resultados: ${searchExecution.textsWithOccurrences} textos, ${decimalFormatter.format(searchExecution.totalOccurrences)} concurrencias. ` +
				`Índice: ${indexVersion}. Fuente: ${sourceUrl}.`;

			ctx.fillStyle = exportText;
			ctx.font = '500 18px Roboto, sans-serif';
			drawWrappedText(ctx, citation, 64, 986, 1554, 28);

			const blob = await toCanvasBlob(canvas);
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `texoro-${chartKey}-${chartMode}.png`;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			// Evita ruido en UI si la descarga falla.
		} finally {
			chartCopyPending[chartKey] = false;
		}
	};

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
		if (!engine) return;
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

	const closeInfoModal = (): void => {
		infoModalOpen = false;
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
		chartCopyPending = { author: false, genre: false };
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

	<FeatureHeroSection
		eyebrow=""
		title="TEXORO"
		subtitle="Búsquedas textuales en 3000 obras del Siglo de Oro"
		backgroundImage={fondoLogo}
		statsAriaLabel="Indicadores de TEXORO"
	>
		<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-text-main">
			TEXORO es una plataforma de búsqueda textual que permite consultar de forma unificada una amplia colección de textos del Siglo de Oro. El sistema ofrece acceso directo a obras teatrales y otros textos literarios procedentes de distintas tradiciones editoriales y documentales, con el objetivo de facilitar la exploración, localización y análisis del patrimonio textual aurisecular.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-text-main">
			La búsqueda funciona en dos fases: primero recupera obras candidatas con índices ligeros; después verifica frase exacta y patrones complejos sobre los TXT candidatos.
		</p>
		<div class="mt-[1.25rem]">
			<AppButton
				type="button"
				variant="secondary"
				className="!h-[38px] !rounded-[10px] !px-4 !py-1.5 font-['Roboto',sans-serif] text-[0.83rem] font-semibold"
				onclick={() => (infoModalOpen = true)}
			>
				Más info
			</AppButton>
		</div>

		{#snippet stats()}
			<HeroStatCard Icon={BookOpen} value={numberFormatter.format(indexStats?.works ?? data.stats.works)} label="Obras indexadas" desktopOffset="up" />

			<HeroStatCard Icon={Feather} value={indexStats ? numberFormatter.format(indexStats.tokens) : '--'} label="Palabras indexadas" desktopOffset="down" />
		{/snippet}
	</FeatureHeroSection>

	<section class="rounded-[14px] p-5">
		<h2 class="m-0 font-['Roboto',sans-serif] text-[1.45rem] font-bold text-brand-blue-dark">Buscar en TEXORO</h2>
		<p class="mt-2 mb-0 text-[0.98rem] text-text-soft">
			Consulta palabras, frases con comillas, comodines (`*`, `?`) y combinaciones con AND/OR.
		</p>

		<form class="mt-4 flex flex-col gap-3 md:flex-row" onsubmit={submitSearch}>
			<div class="relative flex-1">
				<input
					type="search"
					bind:value={query}
					placeholder='Ejemplos: amor | "amor constante" | am* OR "amor const*"'
					class="h-[46px] w-full appearance-none rounded-[10px] border border-border bg-white px-11 py-2 text-[15px] text-text-main outline-none shadow-none transition focus:border-brand-blue/35 focus:shadow-none focus:outline-none focus-visible:border-brand-blue/35 focus-visible:outline-none"
				/>
				<span class="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-text-accent-purple">
					<Search class="h-4.5 w-4.5" />
				</span>
			</div>
			<AppButton
				type="submit"
				variant="primary"
				disabled={!isEngineReady || isSearching}
				className="!h-[46px] !min-w-[180px] gap-2 !rounded-[10px] !px-5 !py-2 font-['Roboto',sans-serif] text-[0.93rem] font-semibold tracking-[0.02em]"
			>
				{#if isSearching}
					<LoaderCircle class="h-4.5 w-4.5 animate-spin" />
					Buscando...
				{:else}
					Buscar
				{/if}
			</AppButton>
		</form>

		{#if searchError}
			<p class="mt-3 mb-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.92rem] text-[#8f1e36]">{searchError}</p>
		{/if}

		{#if searchExecution}
			<div class="mt-4 grid gap-4">
				<div class="flex flex-wrap items-center gap-2 font-['Roboto',sans-serif] text-[0.9rem] text-brand-blue-dark">
					<span class="rounded-full bg-surface-accent-blue px-3 py-1">
						{numberFormatter.format(searchExecution.textsWithOccurrences)} textos con concurrencias
					</span>
					<span class="rounded-full bg-surface-accent-blue px-3 py-1">
						{numberFormatter.format(searchExecution.totalOccurrences)} concurrencias totales
					</span>
					<span class="rounded-full bg-surface-accent-blue px-3 py-1">
						Mostrando {numberFormatter.format(searchExecution.results.length)}
					</span>
					<span class="rounded-full bg-surface-accent-purple px-3 py-1 text-text-accent-purple">{searchExecution.elapsedMs} ms</span>
				</div>

				{#if searchExecution.parsed.warnings.length > 0}
					<p class="m-0 rounded-[9px] border border-border bg-surface px-3 py-2 text-[0.88rem] text-text-soft">
						{searchExecution.parsed.warnings.join(' · ')}
					</p>
				{/if}

				{#if liveCharts}
					<div class="grid gap-3 rounded-[12px] border border-border-accent-blue bg-white p-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 class="m-0 font-['Roboto',sans-serif] text-[1rem] font-semibold text-brand-blue-dark">
									Distribución general de concurrencias
								</h3>
								<p class="mt-1 mb-0 text-[0.78rem] text-text-soft">
									{queryLabelNoun}:
									<span class="font-['Roboto',sans-serif] font-semibold text-brand-blue">{queryTermsLabel}</span>
								</p>
							</div>
							<ChartModeToggle value={chartMode} onchange={(value) => (chartMode = value)} />
						</div>

						<div class="grid gap-3 md:grid-cols-2">
							<article class="rounded-[11px] border border-border-accent-blue bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.07)]">
								<div>
									<h3 class="m-0 font-['Roboto',sans-serif] text-[1rem] font-semibold text-brand-blue-dark">
										{chartTitles.author}
									</h3>
								</div>

								{#if liveCharts.author.rows.length === 0}
									<p class="mt-2 mb-0 text-[0.88rem] text-text-soft">{chartEmptyMessages.author}</p>
								{:else}
									<TexoroLiveChart
										bind:this={authorChartRef}
										className="mt-3"
										mode={chartMode}
										rows={liveCharts.author.rows}
										total={liveCharts.author.total}
										height={chartMode === 'bars' ? 334 : 354}
									/>
								{/if}

								<div class="mt-2 flex justify-end">
									<AppButton
										type="button"
										variant="ghost"
										className="!h-[29px] !min-w-[108px] !rounded-[7px] !px-2 !py-0 font-['Roboto',sans-serif] text-[0.71rem] font-semibold"
										disabled={chartCopyPending.author || liveCharts.author.rows.length === 0}
										onclick={() => downloadChartPng('author', liveCharts.author)}
									>
										{chartCopyPending.author ? 'Generando...' : 'Descargar PNG'}
									</AppButton>
								</div>
							</article>

							<article class="rounded-[11px] border border-border-accent-blue bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.07)]">
								<div>
									<h3 class="m-0 font-['Roboto',sans-serif] text-[1rem] font-semibold text-brand-blue-dark">
										{chartTitles.genre}
									</h3>
								</div>

								{#if liveCharts.genre.rows.length === 0}
									<p class="mt-2 mb-0 text-[0.88rem] text-text-soft">{chartEmptyMessages.genre}</p>
								{:else}
									<TexoroLiveChart
										bind:this={genreChartRef}
										className="mt-3"
										mode={chartMode}
										rows={liveCharts.genre.rows}
										total={liveCharts.genre.total}
										height={chartMode === 'bars' ? 334 : 354}
									/>
								{/if}

								<div class="mt-2 flex justify-end">
									<AppButton
										type="button"
										variant="ghost"
										className="!h-[29px] !min-w-[108px] !rounded-[7px] !px-2 !py-0 font-['Roboto',sans-serif] text-[0.71rem] font-semibold"
										disabled={chartCopyPending.genre || liveCharts.genre.rows.length === 0}
										onclick={() => downloadChartPng('genre', liveCharts.genre)}
									>
										{chartCopyPending.genre ? 'Generando...' : 'Descargar PNG'}
									</AppButton>
								</div>
							</article>
						</div>
					</div>
				{/if}

				{#if multiTermComparison}
					<div class="grid gap-3 rounded-[12px] border border-border-accent-blue bg-surface p-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 class="m-0 font-['Roboto',sans-serif] text-[1rem] font-semibold text-brand-blue-dark">
									Comparativa por términos
								</h3>
								<p class="mt-1 mb-0 text-[0.78rem] text-text-soft">
									{queryLabelNoun}:
									<span class="font-['Roboto',sans-serif] font-semibold text-brand-blue">{queryTermsLabel}</span>
								</p>
								<p class="mt-1 mb-0 text-[0.78rem] text-text-accent-purple">Métrica activa: {comparisonMetricLabel}</p>
								{#if comparisonTermsOverflow}
									<p class="mt-1 mb-0 text-[0.74rem] text-text-soft">Se muestran los primeros 6 términos de la consulta.</p>
								{/if}
							</div>
							<ComparisonMetricToggle
								value={comparisonMetric}
								onchange={(value) => (comparisonMetric = value)}
							/>
						</div>

						<div class="grid gap-3 md:grid-cols-2">
							<article class="rounded-[11px] border border-border-accent-blue bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.07)]">
								<h4 class="m-0 font-['Roboto',sans-serif] text-[0.92rem] font-semibold text-brand-blue-dark">
									Uso de términos por autor
								</h4>
								{#if multiTermComparison.author.rows.length === 0}
									<p class="mt-2 mb-0 text-[0.88rem] text-text-soft">
										No hay datos suficientes de autoría para comparar términos.
									</p>
								{:else}
									<TexoroComparisonChart
										className="mt-2"
										metric={comparisonMetric}
										series={multiTermComparison.author.series}
										rows={multiTermComparison.author.rows}
										height={362}
									/>
								{/if}
							</article>

							<article class="rounded-[11px] border border-border-accent-blue bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.07)]">
								<h4 class="m-0 font-['Roboto',sans-serif] text-[0.92rem] font-semibold text-brand-blue-dark">
									Uso de términos por género
								</h4>
								{#if multiTermComparison.genre.rows.length === 0}
									<p class="mt-2 mb-0 text-[0.88rem] text-text-soft">
										No hay datos suficientes de género para comparar términos.
									</p>
								{:else}
									<TexoroComparisonChart
										className="mt-2"
										metric={comparisonMetric}
										series={multiTermComparison.genre.series}
										rows={multiTermComparison.genre.rows}
										height={362}
									/>
								{/if}
							</article>
						</div>
					</div>
				{/if}

				{#if searchExecution.results.length === 0}
					<p class="m-0 text-[0.96rem] text-text-soft">No se encontraron coincidencias.</p>
				{:else}
					<ul class="m-0 grid list-none gap-3 p-0">
						{#each searchExecution.results as result}
							{@const assignments = buildMatchAssignments(result.matches)}
							<li class="rounded-[11px] border border-border-accent-blue bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.07)]">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0">
										<h3 class="m-0 font-['Roboto',sans-serif] text-[1.03rem] font-semibold leading-[1.25] text-brand-blue-dark">
											{#if result.meta}
												<a href={`/obras/${result.meta.slug}`} class="text-brand-blue no-underline hover:text-brand-blue-dark">{result.meta.title}</a>
												<span class="ml-1 text-[0.86rem] font-medium text-text-soft">
													· {resultAuthorLabel(result)}
												</span>
											{:else}
												Obra sin metadatos
											{/if}
										</h3>
									</div>
									<span class="shrink-0 rounded-full bg-surface-accent-purple px-2.5 py-1 text-[0.8rem] font-semibold text-text-accent-purple">
										score {result.score.toFixed(1)}
									</span>
								</div>

								{#if result.snippet}
									<p class="mt-2 mb-0 text-[0.95rem] leading-[1.5] text-text-main">
										{@html highlightSnippet(result.snippet, assignments)}
									</p>
								{/if}

								<div class="mt-2 flex flex-wrap gap-1.5">
									{#each assignments as assignment}
										<button
											type="button"
											class="rounded-full border px-2 py-[2px] font-['Roboto',sans-serif] text-[0.76rem] font-medium hover:brightness-95"
											style={`${assignment.chipStyle} cursor:pointer;`}
											onclick={() => openOccurrenceModal(result, assignment)}
											title="Ver concurrencias"
										>
											{assignment.match.kind === 'phrase' ? 'Frase' : 'Término'}: {assignment.match.source}
											({numberFormatter.format(assignment.match.occurrences)})
										</button>
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
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-3 py-4">
		<div class="max-h-[88vh] w-full max-w-[880px] overflow-hidden rounded-[12px] border border-border-accent-blue bg-white shadow-[0_16px_40px_rgba(4,24,56,0.33)]">
			<div class="flex items-start justify-between gap-3 border-b border-border-accent-blue px-4 py-3">
				<div>
					<h3 class="m-0 font-['Roboto',sans-serif] text-[1.02rem] font-semibold text-brand-blue-dark">
						{occurrenceModal.assignment.match.kind === 'phrase' ? 'Concurrencias de frase' : 'Concurrencias de término'}
					</h3>
					<p class="mt-1 mb-0 text-[0.9rem] text-text-soft">
						{occurrenceModal.assignment.match.source}
						{#if occurrenceModal.details}
							({numberFormatter.format(occurrenceModal.details.count)})
						{/if}
					</p>
				</div>
				<AppButton
					type="button"
					variant="ghost"
					className="!rounded-[8px] !px-2.5 !py-1 font-['Roboto',sans-serif] text-[0.8rem] font-medium"
					onclick={closeOccurrenceModal}
				>
					Cerrar
				</AppButton>
			</div>

			<div class="max-h-[72vh] overflow-auto px-4 py-3">
				{#if occurrenceLoading}
					<p class="m-0 text-[0.93rem] text-text-soft">Cargando concurrencias...</p>
				{:else if occurrenceError}
					<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.9rem] text-[#8f1e36]">
						{occurrenceError}
					</p>
				{:else if occurrenceModal.details && occurrenceModal.details.items.length > 0}
					<ul class="m-0 grid list-none gap-2 p-0">
						{#each occurrenceModal.details.items as item, index}
							<li class="rounded-[9px] border border-border-accent-blue bg-surface px-3 py-2">
								<p class="m-0 text-[0.79rem] font-semibold text-text-accent-purple">#{index + 1}</p>
								<p class="mt-1 mb-0 text-[0.93rem] leading-[1.5] text-text-main">
									{@html highlightSnippet(item.snippet, [occurrenceModal.assignment])}
								</p>
							</li>
						{/each}
					</ul>
					{#if occurrenceModal.details.truncated}
						<p class="mt-3 mb-0 text-[0.84rem] text-text-soft">
							Se muestran las primeras {numberFormatter.format(occurrenceModal.details.items.length)} concurrencias de
							{numberFormatter.format(occurrenceModal.details.count)}.
						</p>
					{/if}
				{:else}
					<p class="m-0 text-[0.93rem] text-text-soft">No hay concurrencias para mostrar.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

{#if infoModalOpen}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-3 py-4">
		<div class="max-h-[88vh] w-full max-w-[900px] overflow-hidden rounded-[12px] border border-border-accent-blue bg-white shadow-[0_16px_40px_rgba(4,24,56,0.33)]">
			<div class="flex items-start justify-between gap-3 border-b border-border-accent-blue px-4 py-3">
				<div>
					<h3 class="m-0 font-['Roboto',sans-serif] text-[1.02rem] font-semibold text-brand-blue-dark">
						Cómo funciona TEXORO
					</h3>
					<p class="mt-1 mb-0 text-[0.9rem] text-text-soft">
						Búsqueda textual por capas sobre corpus del Siglo de Oro.
					</p>
				</div>
				<AppButton
					type="button"
					variant="ghost"
					className="!rounded-[8px] !px-2.5 !py-1 font-['Roboto',sans-serif] text-[0.8rem] font-medium"
					onclick={closeInfoModal}
				>
					Cerrar
				</AppButton>
			</div>

			<div class="max-h-[72vh] overflow-auto px-4 py-3">
				<p class="m-0 text-[0.94rem] leading-[1.55] text-text-main">
					El buscador recupera primero obras candidatas con un índice ligero y, después, verifica coincidencias exactas sobre los TXT candidatos para confirmar frase y mostrar contexto.
				</p>
				<h4 class="mb-0 mt-4 font-['Roboto',sans-serif] text-[0.94rem] font-semibold text-text-accent-purple">Consultas disponibles</h4>
				<ul class="mb-0 mt-2 pl-5 text-[0.92rem] leading-[1.52] text-text-main">
					<li>Palabra exacta: <code>amor</code>.</li>
					<li>Frase exacta: <code>"amor constante"</code>.</li>
					<li>Comodines: <code>am*</code>, <code>a*or</code>, <code>am?r</code>, <code>???</code>.</li>
					<li>Operadores booleanos: <code>AND</code> y <code>OR</code>.</li>
				</ul>
				<h4 class="mb-0 mt-4 font-['Roboto',sans-serif] text-[0.94rem] font-semibold text-text-accent-purple">Lectura de gráficos</h4>
				<ul class="mb-0 mt-2 pl-5 text-[0.92rem] leading-[1.52] text-text-main">
					<li>Los gráficos se calculan en vivo con las concurrencias de los resultados mostrados.</li>
					<li>En autoría, la concurrencia de cada obra se reparte proporcionalmente entre autores asignados.</li>
					<li>En género, se suma el total de concurrencias por género textual.</li>
					<li>En consultas con varios términos se activa una comparativa por autor y género con métrica seleccionable.</li>
					<li>La métrica <code>Frecuencia/10k</code> se calcula directamente por obra y se agrega en el gráfico.</li>
					<li>Los botones permiten alternar entre barras y circular porcentual, y descargar en PNG con cita.</li>
				</ul>
			</div>
		</div>
	</div>
{/if}
