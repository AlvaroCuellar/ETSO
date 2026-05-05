<script lang="ts">
	import { onMount } from 'svelte';
	import MatchToggle from '$lib/components/search/MatchToggle.svelte';
	import TokenMultiSelect from '$lib/components/search/TokenMultiSelect.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import AttributionView from '$lib/components/ui/AttributionView.svelte';
	import AppButton from '$lib/components/ui/AppButton.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import ChartModeToggle from '$lib/components/search/ChartModeToggle.svelte';
	import ComparisonMetricToggle from '$lib/components/search/ComparisonMetricToggle.svelte';
	import TexoroLiveChart from '$lib/components/search/TexoroLiveChart.svelte';
	import TexoroComparisonChart from '$lib/components/search/TexoroComparisonChart.svelte';
	import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Feather from 'lucide-svelte/icons/feather';
	import Search from 'lucide-svelte/icons/search';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';

	import { TexoroSearchEngine, buildWorkMetaMap, normalizePattern, normalizePlainText } from '$lib/search';

	import type { AttributionSet } from '$lib/domain/catalog';
	import type {
		SearchExecution,
		SearchMatchOccurrence,
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

	interface SnippetToken {
		raw: string;
		start: number;
		end: number;
		norm: string;
	}

	interface HighlightRange {
		start: number;
		end: number;
		assignment: MatchAssignment;
	}

	interface OccurrenceModalState {
		result: SearchResult;
		assignment: MatchAssignment;
		details: SearchMatchOccurrences | null;
	}

	interface ResultOccurrencePreviewItem extends SearchMatchOccurrence {
		assignmentKey: string;
		centeredSnippet: string;
	}

	interface ResultOccurrencePreview {
		loading: boolean;
		items: ResultOccurrencePreviewItem[];
		error: string;
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

	interface AdvancedQueryTerm {
		id: number;
		operator: 'and' | 'or';
		value: string;
	}

	interface TokenOption {
		id: string;
		label: string;
	}

	interface SubmittedQueryTerm {
		key: string;
		label: string;
		operator: 'and' | 'or' | null;
	}

	type ChartKey = 'author' | 'genre';
	type ChartMode = 'bars' | 'pie';
	type ComparisonMetric = 'frequency10k' | 'occurrences' | 'share';

	const chartPalette = ['#1f5fbf', '#2f8fca', '#3aa6a0', '#59a55c', '#d38f38', '#9a69c6', '#c45e92'];
	const exportSurface = '#edf2ff';
	const exportTitle = '#002681';
	const exportText = '#4f5562';
	const exportTextStrong = '#243b63';
	const MAX_QUERY_TERMS = 10;
	const RESULTS_PAGE_SIZE = 35;
	const QUERY_ALLOWED_PATTERN = /^[\p{L}\p{N}*?\s]+$/u;
	const SHOW_AUTOMATIC_CHARTS = false;
	const RESULT_PREVIEW_OCCURRENCE_LIMIT = 10;
	const RESULT_PREVIEW_SNIPPET_RADIUS = 115;
	const RESULT_PREVIEW_VISIBLE_RADIUS = 70;

	let engine = $state<TexoroSearchEngine | null>(null);
	let isEngineReady = $state(false);
	let mainQuery = $state('');
	let advancedSearchOpen = $state(false);
	let filtersOpen = $state(false);
	let advancedTerms = $state<AdvancedQueryTerm[]>([]);
	let nextAdvancedTermId = 1;
	let titleFilter = $state('');
	let selectedGenres = $state<string[]>([]);
	let selectedTradAuthors = $state<string[]>([]);
	let tradMatch = $state<'or' | 'and'>('or');
	let selectedEstoAuthors = $state<string[]>([]);
	let estoMatch = $state<'or' | 'and'>('or');
	let selectedStates = $state<string[]>([]);
	let submittedTerms = $state<SubmittedQueryTerm[]>([]);
	let isSearching = $state(false);
	let searchError = $state('');
	let searchExecution = $state<SearchExecution | null>(null);
	let indexStats = $state<{ works: number; tokens: number; vocabSize: number } | null>(null);
	let preserveEnieForHighlight = $state(true);
	let occurrenceModal = $state<OccurrenceModalState | null>(null);
	let occurrencePreviews = $state<Map<number, ResultOccurrencePreview>>(new Map());
	let occurrenceLoading = $state(false);
	let occurrenceError = $state('');
	let chartMode = $state<ChartMode>('bars');
	let comparisonMetric = $state<ComparisonMetric>('frequency10k');
	let chartCopyPending = $state<Record<ChartKey, boolean>>({ author: false, genre: false });
	let authorChartRef = $state<TexoroLiveChart | null>(null);
	let genreChartRef = $state<TexoroLiveChart | null>(null);
	let infoModalOpen = $state(false);
	let initialWarmupQueued = false;
	let wildcardWarmupQueued = false;
	let initialWarmupTimer: number | null = null;
	let wildcardWarmupTimer: number | null = null;
	let queryWarmupTimer: number | null = null;

	interface NavigatorConnectionLike {
		saveData?: boolean;
		effectiveType?: string;
	}

	const shouldSkipBackgroundWarmup = (): boolean => {
		if (typeof navigator === 'undefined') return true;
		const connection = (navigator as Navigator & { connection?: NavigatorConnectionLike }).connection;
		if (!connection) return false;
		if (connection.saveData) return true;
		return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
	};

	const queueInitialWarmup = (searchEngine: TexoroSearchEngine): void => {
		if (typeof window === 'undefined' || initialWarmupQueued || shouldSkipBackgroundWarmup()) return;
		initialWarmupQueued = true;
		initialWarmupTimer = window.setTimeout(() => {
			initialWarmupTimer = null;
			const textWarmupLimit = data.stats.works <= 30 ? data.stats.works : 12;
			void Promise.all([
				searchEngine.warmupWildcardSupport(),
				searchEngine.warmupAllTexts({
					limit: textWarmupLimit,
					concurrency: 3
				})
			]).catch(() => {});
		}, 220);
	};

	const queueQueryWarmup = (): void => {
		if (typeof window === 'undefined' || shouldSkipBackgroundWarmup()) return;
		if (!engine) return;

		const trimmedQuery = mainQuery.trim();
		if (trimmedQuery.length < 2) return;

		if (queryWarmupTimer !== null) {
			window.clearTimeout(queryWarmupTimer);
		}

		queryWarmupTimer = window.setTimeout(() => {
			queryWarmupTimer = null;
			const textWarmupLimit =
				data.stats.works <= 30
					? Math.min(data.stats.works, 12)
					: /\s/.test(trimmedQuery)
						? 8
						: 6;

			void engine
				?.primeQuery(trimmedQuery, {
					prefetchTexts: true,
					textLimit: textWarmupLimit,
					textConcurrency: 3
				})
				.catch(() => {});

			if (!wildcardWarmupQueued && /[*?]/.test(trimmedQuery)) {
				wildcardWarmupQueued = true;
				wildcardWarmupTimer = window.setTimeout(() => {
					wildcardWarmupTimer = null;
					void engine?.warmupWildcardSupport().catch(() => {});
				}, 80);
			}
		}, 140);
	};

	const sumResultOccurrences = (result: SearchResult): number =>
		result.matches.reduce((sum, match) => sum + (match.occurrences ?? 0), 0);

	const normalizeText = (value: string): string =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim();

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

	const matchesByMode = (
		haystack: Set<string>,
		selectedIds: string[],
		matchMode: 'or' | 'and'
	): boolean => {
		if (selectedIds.length === 0) return true;
		if (matchMode === 'and') {
			return selectedIds.every((candidate) => haystack.has(candidate));
		}
		return selectedIds.some((candidate) => haystack.has(candidate));
	};

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

	const formatMatchSource = (match: Pick<SearchResultMatch, 'kind' | 'source'>): string => {
		const source = match.source.trim();
		if (match.kind === 'phrase' && source.startsWith('"') && source.endsWith('"')) {
			return source.slice(1, -1);
		}
		return source;
	};

	const formatMatchDisplayLabel = (match: Pick<SearchResultMatch, 'kind' | 'source'>): string =>
		submittedTermLabelByKey.get(`${match.kind}:${match.source}`) ?? formatMatchSource(match);

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

	const authorOptions = $derived.by<TokenOption[]>(() => {
		const byId = new Map<string, string>();
		for (const work of data.worksMeta) {
			for (const set of [work.traditionalAttribution, work.stylometryAttribution]) {
				if (set.unresolved) continue;
				for (const group of set.groups) {
					for (const member of group.members) {
						const id = member.authorId?.trim();
						const name = member.authorName?.trim();
						if (!id || !name || byId.has(id)) continue;
						byId.set(id, name);
					}
				}
			}
		}
		return Array.from(byId.entries())
			.map(([id, label]) => ({ id, label }))
			.sort((a, b) => a.label.localeCompare(b.label, 'es'));
	});

	const genreOptions = $derived.by<TokenOption[]>(() => {
		const values = Array.from(new Set(data.worksMeta.map((work) => work.genre.trim()).filter(Boolean)));
		values.sort((a, b) => a.localeCompare(b, 'es'));
		return values.map((value) => ({ id: value, label: value }));
	});

	const stateOptions = $derived.by<TokenOption[]>(() => {
		const values = Array.from(new Set(data.worksMeta.map((work) => work.textState.trim()).filter(Boolean)));
		values.sort((a, b) => a.localeCompare(b, 'es'));
		return values.map((value) => ({ id: value, label: value }));
	});

	const activeSearchTermCount = $derived.by(() => {
		let count = mainQuery.trim() ? 1 : 0;
		for (const term of advancedTerms) {
			if (term.value.trim()) count += 1;
		}
		return count;
	});

	const hasActiveFilters = $derived.by(
		() =>
			Boolean(titleFilter.trim()) ||
			selectedGenres.length > 0 ||
			selectedTradAuthors.length > 0 ||
			selectedEstoAuthors.length > 0 ||
			selectedStates.length > 0
	);

	$effect(() => {
		if (advancedTerms.length > 0) {
			advancedSearchOpen = true;
		}
	});

	$effect(() => {
		if (hasActiveFilters) {
			filtersOpen = true;
		}
	});

	const filteredResults = $derived.by(() => {
		if (!searchExecution) return [] as SearchResult[];
		const normalizedTitle = normalizeText(titleFilter);

		return searchExecution.allResults
			.filter((result) => {
				const meta = result.meta;
				if (!meta) return false;

				if (normalizedTitle) {
					const haystack = normalizeText([meta.title, ...meta.titleVariants].join(' '));
					if (!haystack.includes(normalizedTitle)) return false;
				}

				if (selectedGenres.length > 0 && !selectedGenres.includes(meta.genre)) return false;
				if (
					!matchesByMode(collectAuthorIds(meta.traditionalAttribution), selectedTradAuthors, tradMatch)
				) {
					return false;
				}
				if (
					!matchesByMode(collectAuthorIds(meta.stylometryAttribution), selectedEstoAuthors, estoMatch)
				) {
					return false;
				}
				if (selectedStates.length > 0 && !selectedStates.includes(meta.textState)) return false;

				return true;
			})
			.sort(
				(a, b) =>
					sumResultOccurrences(b) - sumResultOccurrences(a) ||
					b.score - a.score ||
					a.docId - b.docId
			);
	});

	const visibleResults = $derived.by(() => filteredResults.slice(0, RESULTS_PAGE_SIZE));
	const filteredTextsWithOccurrences = $derived.by(() => filteredResults.length);
	const filteredTotalOccurrences = $derived.by(() =>
		filteredResults.reduce((sum, result) => sum + sumResultOccurrences(result), 0)
	);

	const liveCharts = $derived.by(() => {
		if (filteredResults.length === 0) {
			return null;
		}

		const byAuthor = new Map<string, number>();
		const byGenre = new Map<string, number>();

		for (const result of filteredResults) {
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

	const queryClauseCount = $derived.by(() => submittedTerms.length);

	const queryLabelNoun = $derived.by(() => (queryClauseCount === 1 ? 'Término' : 'Términos'));

	const queryTermsLabel = $derived.by(() => {
		if (submittedTerms.length === 0) return '';
		const expression = submittedTerms
			.map((term, index) => (index === 0 ? term.label : `${term.operator?.toUpperCase()} ${term.label}`))
			.join(' ');
		return expression.length > 240 ? `${expression.slice(0, 237)}...` : expression;
	});

	const comparisonTerms = $derived.by(() => {
		if (submittedTerms.length === 0) return [] as ComparisonTerm[];
		const output: ComparisonTerm[] = [];
		const seen = new Set<string>();
		for (const term of submittedTerms) {
			if (seen.has(term.key)) continue;
			seen.add(term.key);
			output.push({
				key: term.key,
				label: term.label,
				color: chartPalette[output.length % chartPalette.length]
			});
		}
		return output.slice(0, 6);
	});

	const comparisonTermsOverflow = $derived.by(() => {
		if (submittedTerms.length === 0) return false;
		const seen = new Set<string>();
		for (const term of submittedTerms) seen.add(term.key);
		return seen.size > comparisonTerms.length;
	});

	const submittedTermLabelByKey = $derived.by(() => {
		const labels = new Map<string, string>();
		for (const term of submittedTerms) {
			if (!labels.has(term.key)) labels.set(term.key, term.label);
		}
		return labels;
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
		if (filteredResults.length === 0) return null;
		if (comparisonTerms.length < 2) return null;

		const byAuthor = new Map<string, ComparisonAccumulator>();
		const byGenre = new Map<string, ComparisonAccumulator>();

		for (const result of filteredResults) {
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

	const createAdvancedTerm = (): AdvancedQueryTerm => ({
		id: nextAdvancedTermId++,
		operator: 'and',
		value: ''
	});

	const addAdvancedTerm = (): void => {
		if (advancedTerms.length >= MAX_QUERY_TERMS - 1) return;
		advancedTerms = [...advancedTerms, createAdvancedTerm()];
		advancedSearchOpen = true;
	};

	const removeAdvancedTerm = (termId: number): void => {
		advancedTerms = advancedTerms.filter((term) => term.id !== termId);
	};

	const updateAdvancedTermOperator = (termId: number, operator: 'and' | 'or'): void => {
		advancedTerms = advancedTerms.map((term) => (term.id === termId ? { ...term, operator } : term));
	};

	const updateAdvancedTermValue = (termId: number, value: string): void => {
		advancedTerms = advancedTerms.map((term) => (term.id === termId ? { ...term, value } : term));
	};

	const buildTermDescriptor = (
		value: string,
		label: string,
		operator: 'and' | 'or' | null
	): SubmittedQueryTerm => {
		const trimmed = value.trim().replace(/\s+/g, ' ');
		if (/\s/.test(trimmed)) {
			return {
				key: `phrase:"${trimmed}"`,
				label,
				operator
			};
		}

		return {
			key: `term:${normalizePattern(trimmed, preserveEnieForHighlight)}`,
			label,
			operator
		};
	};

	const buildEffectiveQuery = (): { query: string; terms: SubmittedQueryTerm[] } => {
		const clauses: string[] = [];
		const terms: SubmittedQueryTerm[] = [];
		const normalizedMain = mainQuery.trim().replace(/\s+/g, ' ');
		const mainClause = /\s/.test(normalizedMain) ? `"${normalizedMain}"` : normalizedMain;
		clauses.push(mainClause);
		terms.push(buildTermDescriptor(normalizedMain, normalizedMain, null));

		for (const term of advancedTerms) {
			const normalizedValue = term.value.trim().replace(/\s+/g, ' ');
			if (!normalizedValue) continue;
			const clause = /\s/.test(normalizedValue) ? `"${normalizedValue}"` : normalizedValue;
			clauses.push(`${term.operator.toUpperCase()} ${clause}`);
			terms.push(buildTermDescriptor(normalizedValue, normalizedValue, term.operator));
		}

		return {
			query: clauses.join(' '),
			terms
		};
	};

	const validateSearchTerm = (value: string, label: string): string => {
		const trimmed = value.trim();
		if (!trimmed) return `${label}: introduce un término.`;
		if (!QUERY_ALLOWED_PATTERN.test(trimmed)) {
			return `${label}: solo se permiten palabras, espacios y los comodines * y ?.`;
		}
		if (/\b(?:and|or)\b/i.test(trimmed)) {
			return `${label}: no escribas AND u OR dentro del término; usa Búsqueda avanzada.`;
		}
		return '';
	};

	const resetSearchControls = (): void => {
		mainQuery = '';
		advancedSearchOpen = false;
		filtersOpen = false;
		advancedTerms = [];
		titleFilter = '';
		selectedGenres = [];
		selectedTradAuthors = [];
		tradMatch = 'or';
		selectedEstoAuthors = [];
		estoMatch = 'or';
		selectedStates = [];
		submittedTerms = [];
		searchExecution = null;
		searchError = '';
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
				`Consulta: "${queryTermsLabel}". ` +
				`Generado el ${dateText}. ` +
				`Resultados: ${filteredTextsWithOccurrences} textos, ${decimalFormatter.format(filteredTotalOccurrences)} concurrencias. ` +
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

	const buildCenteredOccurrenceSnippet = (snippet: string, assignments: MatchAssignment[], radius: number): string => {
		const ranges = collectHighlightRanges(snippet, assignments);
		if (ranges.length === 0) return snippet;

		const center = snippet.length / 2;
		const selected = ranges.sort(
			(a, b) =>
				Math.abs((a.start + a.end) / 2 - center) -
					Math.abs((b.start + b.end) / 2 - center) ||
				a.start - b.start
		)[0];
		const selectedCenter = Math.round((selected.start + selected.end) / 2);
		const left = Math.max(0, selectedCenter - radius);
		const right = Math.min(snippet.length, selectedCenter + radius);
		const prefix = left > 0 || snippet.trimStart().startsWith('...') ? '... ' : '';
		const suffix = right < snippet.length || snippet.trimEnd().endsWith('...') ? ' ...' : '';
		const body = snippet
			.slice(left, right)
			.replace(/^\.\.\.\s*/, '')
			.replace(/\s*\.\.\.$/, '')
			.replace(/\s+/g, ' ')
			.trim();

		return `${prefix}${body}${suffix}`;
	};

	const setOccurrencePreview = (docId: number, preview: ResultOccurrencePreview): void => {
		const next = new Map(occurrencePreviews);
		next.set(docId, preview);
		occurrencePreviews = next;
	};

	const loadResultOccurrencePreview = async (result: SearchResult): Promise<void> => {
		if (!engine || !searchExecution) return;
		const searchEngine = engine;
		const queryAtStart = searchExecution.query;
		const assignments = buildMatchAssignments(result.matches);
		if (assignments.length === 0) {
			setOccurrencePreview(result.docId, { loading: false, items: [], error: '' });
			return;
		}

		setOccurrencePreview(result.docId, { loading: true, items: [], error: '' });

		try {
			const detailsByAssignment = await Promise.all(
				assignments.map(async (assignment) => ({
					assignment,
					details: await searchEngine.getOccurrencesForMatch(
						{ docId: result.docId, workId: result.workId },
						assignment.match,
						{
							maxItems: RESULT_PREVIEW_OCCURRENCE_LIMIT,
							snippetRadius: RESULT_PREVIEW_SNIPPET_RADIUS
						}
					)
				}))
			);
			const items = detailsByAssignment
				.flatMap(({ assignment, details }) =>
					details.items.map((item) => ({
						...item,
						assignmentKey: assignment.key,
						centeredSnippet: buildCenteredOccurrenceSnippet(item.snippet, [assignment], RESULT_PREVIEW_VISIBLE_RADIUS)
					}))
				)
				.sort((a, b) => a.start - b.start || a.end - b.end)
				.slice(0, RESULT_PREVIEW_OCCURRENCE_LIMIT);

			if (searchExecution?.query !== queryAtStart) return;
			setOccurrencePreview(result.docId, { loading: false, items, error: '' });
		} catch (cause) {
			if (searchExecution?.query !== queryAtStart) return;
			setOccurrencePreview(result.docId, {
				loading: false,
				items: [],
				error: cause instanceof Error ? cause.message : 'No se pudieron cargar las concurrencias'
			});
		}
	};

	const collectHighlightRanges = (snippet: string, assignments: MatchAssignment[]): HighlightRange[] => {
		const eligible = assignments.filter((assignment) => assignment.regexes.length > 0);
		if (eligible.length === 0) return [];

		const wordRegex = /[\p{L}\p{N}]+/gu;
		const tokens: SnippetToken[] = [];
		for (const tokenMatch of snippet.matchAll(wordRegex)) {
			const raw = tokenMatch[0];
			const start = tokenMatch.index ?? 0;
			tokens.push({
				raw,
				start,
				end: start + raw.length,
				norm: normalizePlainText(raw, preserveEnieForHighlight)
			});
		}

		if (tokens.length === 0) return [];

		const ranges: HighlightRange[] = [];
		const overlapsExistingRange = (start: number, end: number): boolean =>
			ranges.some((range) => start < range.end && end > range.start);

		for (const assignment of eligible.filter((entry) => entry.match.kind === 'phrase')) {
			const phraseLength = assignment.regexes.length;
			if (phraseLength === 0 || tokens.length < phraseLength) continue;

			for (let startIndex = 0; startIndex <= tokens.length - phraseLength; startIndex += 1) {
				let matches = true;
				for (let offset = 0; offset < phraseLength; offset += 1) {
					if (!assignment.regexes[offset].test(tokens[startIndex + offset].norm)) {
						matches = false;
						break;
					}
				}
				if (!matches) continue;

				const start = tokens[startIndex].start;
				const end = tokens[startIndex + phraseLength - 1].end;
				if (overlapsExistingRange(start, end)) continue;
				ranges.push({ start, end, assignment });
			}
		}

		for (const token of tokens) {
			if (overlapsExistingRange(token.start, token.end)) continue;
			const assignment = eligible.find(
				(entry) => entry.match.kind === 'term' && entry.regexes.some((regex) => regex.test(token.norm))
			);
			if (!assignment) continue;
			ranges.push({ start: token.start, end: token.end, assignment });
		}

		ranges.sort((a, b) => a.start - b.start || a.end - b.end);
		return ranges;
	};

	const renderHighlightedRanges = (snippet: string, ranges: HighlightRange[]): string => {
		if (ranges.length === 0) return escapeHtml(snippet);
		let output = '';
		let cursor = 0;
		for (const range of ranges) {
			output += escapeHtml(snippet.slice(cursor, range.start));
			output += `<mark class="rounded-[4px] px-[2px]" style="${range.assignment.markStyle}">${escapeHtml(
				snippet.slice(range.start, range.end)
			)}</mark>`;
			cursor = range.end;
		}

		if (cursor < snippet.length) {
			output += escapeHtml(snippet.slice(cursor));
		}

		return output;
	};

	const highlightSnippet = (snippet: string, assignments: MatchAssignment[]): string => {
		if (!snippet.trim()) return '';
		return renderHighlightedRanges(snippet, collectHighlightRanges(snippet, assignments));
	};

	const highlightSingleOccurrenceSnippet = (
		snippet: string,
		assignment: MatchAssignment | undefined
	): string => {
		if (!snippet.trim()) return '';
		if (!assignment) return escapeHtml(snippet);

		const ranges = collectHighlightRanges(snippet, [assignment]);
		if (ranges.length === 0) return escapeHtml(snippet);

		const center = snippet.length / 2;
		const selected = ranges.sort(
			(a, b) =>
				Math.abs((a.start + a.end) / 2 - center) -
					Math.abs((b.start + b.end) / 2 - center) ||
				a.start - b.start
		)[0];

		return renderHighlightedRanges(snippet, [selected]);
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

	$effect(() => {
		queueQueryWarmup();
	});

	$effect(() => {
		if (!engine || !searchExecution || visibleResults.length === 0) return;
		for (const result of visibleResults) {
			const preview = occurrencePreviews.get(result.docId);
			if (preview?.loading || preview?.items.length || preview?.error) continue;
			void loadResultOccurrencePreview(result);
		}
	});

	onMount(() => {
		void (async () => {
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
				queueInitialWarmup(created);
			} catch (cause) {
				searchError = cause instanceof Error ? cause.message : 'No se pudo inicializar TEXORO';
			}
		})();

		return () => {
			if (initialWarmupTimer !== null) {
				window.clearTimeout(initialWarmupTimer);
			}
			if (wildcardWarmupTimer !== null) {
				window.clearTimeout(wildcardWarmupTimer);
			}
			if (queryWarmupTimer !== null) {
				window.clearTimeout(queryWarmupTimer);
			}
		};
	});

	const submitSearch = async (event: SubmitEvent): Promise<void> => {
		event.preventDefault();
		searchError = '';
		searchExecution = null;
		submittedTerms = [];
		occurrencePreviews = new Map();
		chartCopyPending = { author: false, genre: false };
		if (!engine) {
			searchError = 'Motor de búsqueda no disponible todavía';
			return;
		}

		const mainValidationError = validateSearchTerm(mainQuery, 'Búsqueda principal');
		if (mainValidationError) {
			searchError = mainValidationError;
			return;
		}

		let nonEmptyAdvancedTerms = 0;
		for (let index = 0; index < advancedTerms.length; index += 1) {
			const term = advancedTerms[index];
			if (!term.value.trim()) continue;
			nonEmptyAdvancedTerms += 1;
			const validationError = validateSearchTerm(term.value, `Búsqueda avanzada ${index + 1}`);
			if (validationError) {
				searchError = validationError;
				return;
			}
		}

		if (1 + nonEmptyAdvancedTerms > MAX_QUERY_TERMS) {
			searchError = `La consulta admite un máximo de ${MAX_QUERY_TERMS} términos en total.`;
			return;
		}

		const { query, terms } = buildEffectiveQuery();
		isSearching = true;
		try {
			submittedTerms = terms;
			searchExecution = await engine.search(query, worksMetaMap, {
				limit: RESULTS_PAGE_SIZE,
				maxPhraseVerificationDocs: 220,
				snippetRadius: 115
			});
		} catch (cause) {
			submittedTerms = [];
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
			La búsqueda principal se interpreta como exacta por defecto. Solo se admiten palabras, espacios y
			los comodines <code>*</code> y <code>?</code>.
		</p>

		<form class="mt-4 grid gap-3" onsubmit={submitSearch}>
			<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
				<div class="relative">
					<input
						type="search"
						bind:value={mainQuery}
						placeholder="Ejemplos: amor | amor constante | honor*"
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
			</div>

			<p class="m-0 text-[0.84rem] text-text-soft">
				Una entrada con varias palabras se busca como frase exacta. Para combinar varios términos usa
				<em class="not-italic font-semibold text-brand-blue">Búsqueda avanzada</em>.
			</p>

			<div class="overflow-hidden rounded-[10px] border border-border-accent-blue bg-white">
				<button
					type="button"
					class="flex w-full items-center justify-between gap-3 border-0 bg-transparent px-4 py-3 text-left font-['Roboto',sans-serif] text-[0.92rem] font-semibold text-brand-blue-dark transition hover:bg-surface-accent-blue"
					aria-expanded={advancedSearchOpen}
					onclick={() => {
						advancedSearchOpen = !advancedSearchOpen;
					}}
				>
					<span>Búsqueda avanzada</span>
					<span class={`inline-flex items-center justify-center transition-transform duration-200 ${advancedSearchOpen ? 'rotate-180' : ''}`} aria-hidden="true">
						<ChevronDown class="h-[15px] w-[15px] stroke-[2.2]" />
					</span>
				</button>

				<div
					class={`overflow-hidden border-t px-4 transition-[max-height,padding,opacity] duration-300 ease-out ${
						advancedSearchOpen
							? 'max-h-[1200px] border-border-accent-blue py-4 opacity-100'
							: 'max-h-0 border-transparent py-0 opacity-0'
					}`}
				>
					<p class="m-0 text-[0.86rem] leading-[1.5] text-text-soft">
						Añade hasta {MAX_QUERY_TERMS - 1} términos complementarios. Cada fila se suma a la búsqueda
						principal mediante <code>AND</code> o <code>OR</code>.
					</p>

					<div class="mt-3 grid gap-3">
						{#if advancedTerms.length === 0}
							<p class="m-0 rounded-[9px] border border-dashed border-border-accent-blue bg-surface px-3 py-2 text-[0.86rem] text-text-soft">
								No hay términos avanzados añadidos.
							</p>
						{:else}
							{#each advancedTerms as term}
								<div class="grid gap-2 rounded-[9px] border border-border bg-surface p-3 md:grid-cols-[120px_minmax(0,1fr)_auto]">
									<label class="sr-only" for={`advanced-operator-${term.id}`}>Operador</label>
									<select
										id={`advanced-operator-${term.id}`}
										class="h-[42px] rounded-[8px] border border-border bg-white px-3 text-[0.92rem] text-text-main outline-none transition focus:border-brand-blue/35"
										value={term.operator}
										onchange={(event) =>
											updateAdvancedTermOperator(
												term.id,
												(event.currentTarget as HTMLSelectElement).value as 'and' | 'or'
											)}
									>
										<option value="and">AND</option>
										<option value="or">OR</option>
									</select>

									<label class="sr-only" for={`advanced-query-${term.id}`}>Término avanzado</label>
									<input
										id={`advanced-query-${term.id}`}
										type="search"
										value={term.value}
										placeholder="Ej: honra | honra constante | desdich?"
										class="h-[42px] rounded-[8px] border border-border bg-white px-3 text-[0.92rem] text-text-main outline-none transition focus:border-brand-blue/35"
										oninput={(event) =>
											updateAdvancedTermValue(
												term.id,
												(event.currentTarget as HTMLInputElement).value
											)}
									/>

									<button
										type="button"
										class="h-[42px] rounded-[8px] border border-border bg-white px-3 text-[0.84rem] font-semibold text-text-soft transition hover:border-[#d7b5bf] hover:bg-[#fff5f7] hover:text-[#8f1e36]"
										onclick={() => removeAdvancedTerm(term.id)}
									>
										Eliminar
									</button>
								</div>
							{/each}
						{/if}
					</div>

					<div class="mt-3 flex flex-wrap items-center justify-between gap-3">
						<p class="m-0 text-[0.82rem] text-text-soft">
							Términos activos: {activeSearchTermCount}/{MAX_QUERY_TERMS}
						</p>
						<button
							type="button"
							class="rounded-[8px] border border-border-accent-blue bg-surface-accent-blue px-3 py-2 text-[0.84rem] font-semibold text-brand-blue-dark transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55"
							disabled={advancedTerms.length >= MAX_QUERY_TERMS - 1}
							onclick={addAdvancedTerm}
						>
							Añadir término
						</button>
					</div>
				</div>
			</div>

			<div class="overflow-hidden rounded-[10px] border border-border-accent-blue bg-white">
				<button
					type="button"
					class="flex w-full items-center justify-between gap-3 border-0 bg-transparent px-4 py-3 text-left font-['Roboto',sans-serif] text-[0.92rem] font-semibold text-brand-blue-dark transition hover:bg-surface-accent-blue"
					aria-expanded={filtersOpen}
					onclick={() => {
						filtersOpen = !filtersOpen;
					}}
				>
					<span>Filtros</span>
					<span class={`inline-flex items-center justify-center transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} aria-hidden="true">
						<ChevronDown class="h-[15px] w-[15px] stroke-[2.2]" />
					</span>
				</button>

				<div
					class={`overflow-hidden border-t px-4 transition-[max-height,padding,opacity] duration-300 ease-out ${
						filtersOpen
							? 'max-h-[1600px] border-border-accent-blue py-4 opacity-100'
							: 'max-h-0 border-transparent py-0 opacity-0'
					}`}
				>
					<div class="grid gap-5">
						<div class="grid gap-5 md:grid-cols-2">
							<div class="flex flex-col">
								<label class="mb-[6px] text-[14px] font-semibold text-text-soft" for="texoro-title-filter">
									Título
								</label>
								<input
									id="texoro-title-filter"
									type="text"
									bind:value={titleFilter}
									placeholder="Ej: desdén, fuerza del interés..."
									class="rounded-[8px] border border-border px-3 py-[10px] text-[14px] transition focus:border-brand-blue/35 focus:shadow-[0_0_0_3px_rgba(13,63,145,0.1)] focus:outline-none"
								/>
							</div>

							<TokenMultiSelect
								name="texoro-genero"
								label="Género"
								placeholder="Escribe y selecciona géneros"
								options={genreOptions}
								selectedIds={selectedGenres}
								helpText="Selecciona uno o varios géneros para limitar los resultados."
								inputClass="js-static-multiselect"
								onChange={(nextIds) => {
									selectedGenres = nextIds;
								}}
							/>
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<div class="flex flex-col gap-3 rounded-[8px] border border-border bg-surface p-[14px]">
								<TokenMultiSelect
									name="texoro-traditional-attribution"
									label="Atribución tradicional"
									placeholder="Escribe y selecciona autores"
									options={authorOptions}
									selectedIds={selectedTradAuthors}
									helpText="Autores propuestos por la tradición filológica."
									inputClass="js-author-multiselect"
									onChange={(nextIds) => {
										selectedTradAuthors = nextIds;
									}}
								/>

								<MatchToggle
									name="texoro-trad-match"
									value={tradMatch}
									helpText="OR muestra obras con cualquiera de los autores seleccionados. AND exige que estén todos."
									onChange={(next) => {
										tradMatch = next;
									}}
								/>
							</div>

							<div class="flex flex-col gap-3 rounded-[8px] border border-border bg-surface p-[14px]">
								<TokenMultiSelect
									name="texoro-stylometry-attribution"
									label="Atribución estilometría"
									placeholder="Escribe y selecciona autores"
									options={authorOptions}
									selectedIds={selectedEstoAuthors}
									helpText="Autores sugeridos por el análisis estilométrico."
									inputClass="js-author-multiselect"
									onChange={(nextIds) => {
										selectedEstoAuthors = nextIds;
									}}
								/>

								<MatchToggle
									name="texoro-esto-match"
									value={estoMatch}
									helpText="OR muestra obras con cualquiera de los autores seleccionados. AND exige que estén todos."
									onChange={(next) => {
										estoMatch = next;
									}}
								/>
							</div>
						</div>

						<TokenMultiSelect
							name="texoro-text-state"
							label="Estado del texto"
							placeholder="Escribe y selecciona estados"
							options={stateOptions}
							selectedIds={selectedStates}
							helpText="Limita los resultados al estado del texto utilizado en TEXORO."
							inputClass="js-static-multiselect"
							onChange={(nextIds) => {
								selectedStates = nextIds;
							}}
						/>
					</div>
				</div>
			</div>

			<div class="flex justify-end">
				<AppButton
					href="/texoro"
					variant="secondary"
					onclick={(event) => {
						event.preventDefault();
						resetSearchControls();
					}}
				>
					Limpiar campos
				</AppButton>
			</div>
		</form>

		{#if searchError}
			<p class="mt-3 mb-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.92rem] text-[#8f1e36]">{searchError}</p>
		{/if}

		{#if searchExecution}
			<div class="mt-4 grid gap-4">
				<div class="grid gap-3 rounded-[12px] border border-border-accent-blue bg-white px-4 py-5 text-center shadow-[0_6px_16px_rgba(25,46,80,0.07)] md:grid-cols-2">
					<div>
						<p class="m-0 font-['Roboto',sans-serif] text-[2.4rem] leading-none font-bold text-brand-blue-dark">
							{numberFormatter.format(filteredTotalOccurrences)}
						</p>
						<p class="mt-2 mb-0 text-[0.9rem] font-semibold tracking-[0.03em] text-text-soft uppercase">
							Concurrencias
						</p>
					</div>
					<div>
						<p class="m-0 font-['Roboto',sans-serif] text-[2.4rem] leading-none font-bold text-brand-blue-dark">
							{numberFormatter.format(filteredTextsWithOccurrences)}
						</p>
						<p class="mt-2 mb-0 text-[0.9rem] font-semibold tracking-[0.03em] text-text-soft uppercase">
							Textos con concurrencias
						</p>
					</div>
				</div>

				{#if hasActiveFilters}
					<p class="m-0 rounded-[9px] border border-border-accent-blue bg-surface px-3 py-2 text-[0.84rem] text-text-soft">
						Los resultados están recalculados sobre el subconjunto filtrado.
					</p>
				{/if}

				{#if searchExecution.parsed.warnings.length > 0}
					<p class="m-0 rounded-[9px] border border-border bg-surface px-3 py-2 text-[0.88rem] text-text-soft">
						{searchExecution.parsed.warnings.join(' · ')}
					</p>
				{/if}

				{#if SHOW_AUTOMATIC_CHARTS && liveCharts}
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

				{#if SHOW_AUTOMATIC_CHARTS && multiTermComparison}
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

				{#if filteredResults.length === 0}
					<p class="m-0 text-[0.96rem] text-text-soft">
						{hasActiveFilters
							? 'No se encontraron coincidencias con los filtros aplicados.'
							: 'No se encontraron coincidencias.'}
					</p>
				{:else}
					<ul class="m-0 grid list-none gap-3 p-0">
						{#each visibleResults as result}
							{@const assignments = buildMatchAssignments(result.matches)}
							{@const resultOccurrences = sumResultOccurrences(result)}
							{@const preview = occurrencePreviews.get(result.docId)}
							<li class="rounded-[11px] border border-border-accent-blue bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.07)]">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="min-w-0">
										<h3 class="m-0 font-['Roboto',sans-serif] text-[1.03rem] font-semibold leading-[1.25] text-brand-blue-dark">
											{#if result.meta}
												<a href={`/obras/${result.meta.slug}`} class="text-brand-blue no-underline hover:text-brand-blue-dark">{formatDisplayWorkTitle(result.meta.title)}</a>
												<span class="ml-1 text-[0.86rem] font-medium text-text-soft">
													· {resultAuthorLabel(result)}
												</span>
											{:else}
												Obra sin metadatos
											{/if}
										</h3>
									</div>
									<span class="shrink-0 rounded-full bg-surface-accent-blue px-2.5 py-1 text-[0.8rem] font-semibold text-brand-blue-dark">
										{numberFormatter.format(resultOccurrences)} {resultOccurrences === 1 ? 'concurrencia' : 'concurrencias'}
									</span>
								</div>

								{#if preview?.loading}
									<p class="mt-3 mb-0 text-[0.9rem] text-text-soft">Cargando concurrencias...</p>
								{:else if preview?.error}
									<p class="mt-3 mb-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.88rem] text-[#8f1e36]">
										{preview.error}
									</p>
								{:else if preview?.items.length}
									<ol class="mt-3 m-0 list-none p-0 text-[0.95rem] leading-[1.55] text-text-main">
										{#each preview.items as item, index}
											{@const itemAssignment = assignments.find((assignment) => assignment.key === item.assignmentKey)}
											<li class="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-brand-blue/15 py-3 first:border-t-0 first:pt-0 last:pb-0">
												<span class="font-['Roboto',sans-serif] text-[0.82rem] font-bold text-text-accent-purple">
													{index + 1}#
												</span>
												<span class="texoro-occurrence-snippet block min-w-0">
													{@html highlightSingleOccurrenceSnippet(item.centeredSnippet, itemAssignment)}
												</span>
											</li>
										{/each}
									</ol>
								{:else}
									<p class="mt-3 mb-0 text-[0.9rem] text-text-soft">No hay concurrencias para mostrar.</p>
								{/if}

								<div class="mt-2 flex flex-wrap gap-1.5">
									{#each assignments as assignment}
										<button
											type="button"
											class="rounded-full border px-2 py-[2px] font-['Roboto',sans-serif] text-[0.76rem] font-medium hover:brightness-95"
											style={`${assignment.chipStyle} cursor:pointer;`}
											onclick={() => openOccurrenceModal(result, assignment)}
											title={`Ver más concurrencias de ${formatMatchDisplayLabel(assignment.match)}`}
										>
											Ver más de {formatMatchDisplayLabel(assignment.match)}
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
						{formatMatchDisplayLabel(occurrenceModal.assignment.match)}
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
									{@html highlightSingleOccurrenceSnippet(item.snippet, occurrenceModal.assignment)}
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

<style>
	.texoro-occurrence-snippet {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		line-clamp: 3;
		-webkit-line-clamp: 3;
	}

	@media (min-width: 768px) {
		.texoro-occurrence-snippet {
			line-clamp: 1;
			-webkit-line-clamp: 1;
		}
	}
</style>

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
					<li>Varias palabras en la búsqueda principal: <code>amor constante</code> se interpreta como frase exacta.</li>
					<li>Comodines: <code>am*</code>, <code>a*or</code>, <code>am?r</code>, <code>???</code>.</li>
					<li>Los operadores <code>AND</code> y <code>OR</code> se aplican desde el bloque de Búsqueda avanzada.</li>
					<li>Solo se admiten letras, números, espacios y los comodines <code>*</code> y <code>?</code>.</li>
				</ul>
				<h4 class="mb-0 mt-4 font-['Roboto',sans-serif] text-[0.94rem] font-semibold text-text-accent-purple">Lectura de gráficos</h4>
				<ul class="mb-0 mt-2 pl-5 text-[0.92rem] leading-[1.52] text-text-main">
					<li>Los gráficos se calculan en vivo con las concurrencias del subconjunto activo de resultados.</li>
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
