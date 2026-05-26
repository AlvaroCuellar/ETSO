<script lang="ts">
	import { onMount, tick } from 'svelte';
	import MatchToggle from '$lib/components/search/MatchToggle.svelte';
	import TokenMultiSelect from '$lib/components/search/TokenMultiSelect.svelte';
	import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
	import AppButton from '$lib/components/ui/AppButton.svelte';
	import FeatureHeroSection from '$lib/components/ui/FeatureHeroSection.svelte';
	import HeroStatCard from '$lib/components/ui/HeroStatCard.svelte';
	import ChartModeToggle from '$lib/components/search/ChartModeToggle.svelte';
	import ComparisonMetricToggle from '$lib/components/search/ComparisonMetricToggle.svelte';
	import TexoroLiveChart from '$lib/components/search/TexoroLiveChart.svelte';
	import TexoroComparisonChart from '$lib/components/search/TexoroComparisonChart.svelte';
	import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';
	import { getClientMemoryCache, loadClientMemoryCache } from '$lib/utils/client-memory-cache';
	import {
		type AttributionSet
	} from '$lib/domain/catalog';
	import fondoLogo from '$lib/assets/fondos/fondo-logo.png';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import CornerDownLeft from 'lucide-svelte/icons/corner-down-left';
	import Download from 'lucide-svelte/icons/download';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import Feather from 'lucide-svelte/icons/feather';
	import FolderOpen from 'lucide-svelte/icons/folder-open';
	import Search from 'lucide-svelte/icons/search';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import X from 'lucide-svelte/icons/x';

	import { normalizePattern, normalizePlainText } from '$lib/search';
	import {
		initializeTexoroClientWorker,
		isTexoroClientWorkerReady,
		releaseTexoroClientWorker,
		requestTexoroClientWorker,
		terminateTexoroClientWorker
	} from '$lib/search/texoro-client-worker';

	import type {
		AdditionalSearchMode,
		SearchExecution,
		SearchMatchOccurrence,
		SearchMatchOccurrences,
		SearchOptions,
		SearchResult,
		SearchResultMatch,
		SearchBooleanMode,
		SearchProximityOrder,
		StructuredSearchQuery,
		TexoroIndexManifest,
		TexoroWorkMeta
	} from '$lib/search';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	type MatchDisplayPartKind = 'text' | 'connector' | 'meta';

	interface MatchDisplayPart {
		kind: MatchDisplayPartKind;
		value: string;
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

	interface AdditionalQueryTerm {
		id: number;
		value: string;
	}

	interface ProximityQueryTerm {
		id: number;
		value: string;
		distance: number;
		order: SearchProximityOrder;
	}

	interface TokenOption {
		id: string;
		label: string;
		searchText?: string;
	}

	interface TexoroStatsPayload {
		works: number;
		authors: number;
		tokens: number;
		vocabSize: number;
		indexVersion: string;
		preserveEnie: boolean;
	}

	interface TexoroOptionsPayload {
		titles: TokenOption[];
		authors: TokenOption[];
		genres: TokenOption[];
		states: TokenOption[];
	}

	interface SubmittedQueryTerm {
		key: string;
		label: string;
		operator: string | null;
	}

	interface TexoroSearchFilters {
		titleIds: string[];
		titleLabels: string[];
		genres: string[];
		traditionalAuthorIds: string[];
		traditionalMatch: 'or' | 'and';
		stylometryAuthorIds: string[];
		stylometryMatch: 'or' | 'and';
		states: string[];
	}

	interface SubmittedSearch {
		query: string;
		structuredQuery: StructuredSearchQuery;
		terms: SubmittedQueryTerm[];
		filters: TexoroSearchFilters;
	}

	type InterpretedQueryPartKind = 'text' | 'term' | 'operator';

	interface InterpretedQueryPart {
		kind: InterpretedQueryPartKind;
		value: string;
	}

	interface InterpretedQueryView {
		summaryParts: InterpretedQueryPart[];
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
	const RESULTS_PAGE_SIZE = 20;
	const QUERY_ALLOWED_PATTERN = /^[\p{L}\p{N}*?\s]+$/u;
	const SHOW_AUTOMATIC_CHARTS = false;
	const RESULT_PREVIEW_OCCURRENCE_LIMIT = 10;
	const INITIAL_PREVIEW_RESULT_COUNT = 3;
	const RESULT_PREVIEW_SCROLL_ROOT_MARGIN = '700px 0px';
	const RESULT_PREVIEW_SNIPPET_RADIUS = 115;
	const RESULT_PREVIEW_VISIBLE_RADIUS = 70;
	const OCCURRENCE_DETAILS_CACHE_LIMIT = 24;
	const OCCURRENCE_MODAL_MAX_ITEMS = 100;
	const TEXORO_PRIME_DEBOUNCE_MS = 500;
	const TEXORO_STATS_CACHE_KEY = 'texoro:stats';
	const TEXORO_OPTIONS_CACHE_KEY = 'texoro:options';

	const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
	const joinUrl = (base: string, path: string): string =>
		`${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;
	const withCacheBuster = (url: string): string => {
		const separator = url.includes('?') ? '&' : '?';
		return `${url}${separator}t=${Date.now()}`;
	};
	const texoroIndexBaseUrl = $derived(stripTrailingSlash(data.texoroIndexBaseUrl ?? ''));
	const initialStatsPayload = getClientMemoryCache<TexoroStatsPayload>(TEXORO_STATS_CACHE_KEY);

	let isEngineReady = $state(false);
	let mainQuery = $state('');
	let advancedSearchOpen = $state(false);
	let filtersOpen = $state(false);
	let additionalTerms = $state<AdditionalQueryTerm[]>([]);
	let additionalMode = $state<AdditionalSearchMode>('all');
	let additionalModeAllButton = $state<HTMLButtonElement | null>(null);
	let additionalModeAnyButton = $state<HTMLButtonElement | null>(null);
	let additionalModeGlobalAnyButton = $state<HTMLButtonElement | null>(null);
	let additionalModePillStyle = $state('opacity: 0;');
	let proximityTerms = $state<ProximityQueryTerm[]>([]);
	let proximityMode = $state<SearchBooleanMode>('all');
	let proximityModeAllButton = $state<HTMLButtonElement | null>(null);
	let proximityModeAnyButton = $state<HTMLButtonElement | null>(null);
	let proximityModePillStyle = $state('opacity: 0;');
	let nextAdditionalTermId = 1;
	let nextProximityTermId = 1;
	let selectedTitleIds = $state<string[]>([]);
	let selectedGenres = $state<string[]>([]);
	let selectedTradAuthors = $state<string[]>([]);
	let tradMatch = $state<'or' | 'and'>('or');
	let selectedEstoAuthors = $state<string[]>([]);
	let estoMatch = $state<'or' | 'and'>('or');
	let selectedStates = $state<string[]>([]);
	let submittedTerms = $state<SubmittedQueryTerm[]>([]);
	let lastSubmittedSearch = $state<SubmittedSearch | null>(null);
	let isSearching = $state(false);
	let isPreparingResults = $state(false);
	let isExporting = $state(false);
	let searchError = $state('');
	let exportError = $state('');
	let searchExecution = $state<SearchExecution | null>(null);
	let resultsPage = $state(1);
	let resultsRegion = $state<HTMLElement | null>(null);
	let resultsPaginationRegion = $state<HTMLElement | null>(null);
	let indexStats = $state<{ works: number; tokens: number; vocabSize: number } | null>(null);
	let statsPayload = $state<TexoroStatsPayload | null>(initialStatsPayload);
	let isStatsLoading = $state(!initialStatsPayload);
	const displayIndexStats = $derived(
		indexStats ??
			(statsPayload
				? { works: statsPayload.works, tokens: statsPayload.tokens, vocabSize: statsPayload.vocabSize }
				: null)
	);
	let loadedPreserveEnieForHighlight = $state<boolean | null>(null);
	const preserveEnieForHighlight = $derived(loadedPreserveEnieForHighlight ?? statsPayload?.preserveEnie ?? true);
	let occurrenceModal = $state<OccurrenceModalState | null>(null);
	let openTextDropdownDocId = $state<number | null>(null);
	let occurrencePreviews = $state<Map<number, ResultOccurrencePreview>>(new Map());
	let previewLoadsByDocId = $state<Map<number, Promise<void>>>(new Map());
	let queuedPreviewDocIds = $state<Set<number>>(new Set());
	let occurrenceLoading = $state(false);
	let occurrenceError = $state('');
	let occurrenceDetailsCache = $state<Map<string, SearchMatchOccurrences>>(new Map());
	let occurrenceDetailsLoads = $state<Map<string, Promise<SearchMatchOccurrences>>>(new Map());
	let openingOccurrenceKey = $state<string | null>(null);
	let chartMode = $state<ChartMode>('bars');
	let comparisonMetric = $state<ComparisonMetric>('frequency10k');
	let chartCopyPending = $state<Record<ChartKey, boolean>>({ author: false, genre: false });
	let authorChartRef = $state<TexoroLiveChart | null>(null);
	let genreChartRef = $state<TexoroLiveChart | null>(null);
	let infoModalOpen = $state(false);
	let loadedIndexVersion = $state<string | null>(null);
	const indexVersion = $derived(loadedIndexVersion ?? statsPayload?.indexVersion ?? 'n/d');
	let worksMeta = $state<TexoroWorkMeta[] | null>(null);
	let worksMetaLoadPromise: Promise<TexoroWorkMeta[]> | null = null;
	let texoroWorkerInitPromise: Promise<void> | null = null;
	let statsLoadPromise: Promise<void> | null = null;
	let optionsLoadPromise: Promise<void> | null = null;
	let titleOptionItems = $state<TokenOption[]>([]);
	let authorOptionItems = $state<TokenOption[]>([]);
	let genreOptionItems = $state<TokenOption[]>([]);
	let stateOptionItems = $state<TokenOption[]>([]);
	let searchRequestId = 0;
	let visiblePreviewRequestId = 0;
	let previewRequestVersion = 0;

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

	const parseProximityMatchSource = (
		source: string
	): { left: string; right: string; distance: number; order: SearchProximityOrder } | null => {
		const match = source.match(/^(.*?)\s+~(any|after|before)<=(\d+)\s+(.*?)$/);
		const legacyMatch = match ? null : source.match(/^(.*?)\s+~(\d+)\s+(.*?)$/);
		if (match) {
			return {
				left: match[1].replace(/^"|"$/g, ''),
				right: match[4].replace(/^"|"$/g, ''),
				distance: Number.parseInt(match[3], 10),
				order: match[2] as SearchProximityOrder
			};
		}
		if (legacyMatch) {
			return {
				left: legacyMatch[1].replace(/^"|"$/g, ''),
				right: legacyMatch[3].replace(/^"|"$/g, ''),
				distance: Number.parseInt(legacyMatch[2], 10),
				order: 'after'
			};
		}
		return null;
	};

	const formatMatchSource = (match: Pick<SearchResultMatch, 'kind' | 'source'>): string => {
		const source = match.source.trim();
		if (match.kind === 'proximity') {
			const proximity = parseProximityMatchSource(source);
			if (proximity) {
				return `${proximity.right} cerca de ${proximity.left} (máx. ${proximity.distance}, ${proximityOrderLabel(proximity.order)})`;
			}
		}
		if (match.kind === 'phrase' && source.startsWith('"') && source.endsWith('"')) {
			return source.slice(1, -1);
		}
		return source;
	};

	const formatMatchDisplayLabel = (match: Pick<SearchResultMatch, 'kind' | 'source'>): string =>
		submittedTermLabelByKey.get(`${match.kind}:${match.source}`) ?? formatMatchSource(match);

	const matchDisplayParts = (
		match: Pick<SearchResultMatch, 'kind' | 'source'>,
		options: { includeProximityMeta?: boolean } = {}
	): MatchDisplayPart[] => {
		if (match.kind !== 'proximity') {
			return [{ kind: 'text', value: formatMatchDisplayLabel(match) }];
		}

		const proximity = parseProximityMatchSource(match.source.trim());
		if (!proximity) {
			return [{ kind: 'text', value: formatMatchDisplayLabel(match) }];
		}

		const parts: MatchDisplayPart[] = [
			{ kind: 'text', value: proximity.right },
			{ kind: 'connector', value: 'cerca de' },
			{ kind: 'text', value: proximity.left }
		];
		if (options.includeProximityMeta !== false) {
			parts.push(
				{ kind: 'meta', value: `máx. ${proximity.distance}` },
				{ kind: 'meta', value: proximityOrderLabel(proximity.order) }
			);
		}
		return parts;
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

	const authorOptions = $derived(authorOptionItems);
	const titleOptions = $derived(titleOptionItems);
	const genreOptions = $derived(genreOptionItems);
	const stateOptions = $derived(stateOptionItems);
	const authorLabelById = $derived.by(() => new Map(authorOptions.map((option) => [option.id, option.label] as const)));
	const titleLabelById = $derived.by(() => new Map(titleOptions.map((option) => [option.id, option.label] as const)));
	const genreLabelById = $derived.by(() => new Map(genreOptions.map((option) => [option.id, option.label] as const)));
	const stateLabelById = $derived.by(() => new Map(stateOptions.map((option) => [option.id, option.label] as const)));
	const selectedTitleLabels = $derived.by(() =>
		selectedTitleIds.map((id) => titleLabelById.get(id) ?? id)
	);

	const activeSearchTermCount = $derived.by(() => {
		let count = mainQuery.trim() ? 1 : 0;
		for (const term of additionalTerms) {
			if (term.value.trim()) count += 1;
		}
		for (const term of proximityTerms) {
			if (term.value.trim()) count += 1;
		}
		return count;
	});

	const hasActiveFilters = $derived.by(
		() =>
			selectedTitleIds.length > 0 ||
			selectedGenres.length > 0 ||
			selectedTradAuthors.length > 0 ||
			selectedEstoAuthors.length > 0 ||
			selectedStates.length > 0
	);
	const filtersHaveValues = (filters: TexoroSearchFilters): boolean =>
		filters.titleIds.length > 0 ||
		filters.genres.length > 0 ||
		filters.traditionalAuthorIds.length > 0 ||
		filters.stylometryAuthorIds.length > 0 ||
		filters.states.length > 0;
	const submittedHasActiveFilters = $derived.by(() =>
		lastSubmittedSearch ? filtersHaveValues(lastSubmittedSearch.filters) : false
	);

	const buildCurrentSearchFilters = (): TexoroSearchFilters => ({
		titleIds: [...selectedTitleIds],
		titleLabels: [...selectedTitleLabels],
		genres: [...selectedGenres],
		traditionalAuthorIds: [...selectedTradAuthors],
		traditionalMatch: tradMatch,
		stylometryAuthorIds: [...selectedEstoAuthors],
		stylometryMatch: estoMatch,
		states: [...selectedStates]
	});

	const buildSearchFilterOptions = (filters: TexoroSearchFilters): Pick<
		SearchOptions,
		| 'workIds'
		| 'genres'
		| 'states'
		| 'traditionalAuthorIds'
		| 'traditionalMatch'
		| 'stylometryAuthorIds'
		| 'stylometryMatch'
	> => ({
		workIds: filters.titleIds,
		genres: filters.genres,
		states: filters.states,
		traditionalAuthorIds: filters.traditionalAuthorIds,
		traditionalMatch: filters.traditionalMatch,
		stylometryAuthorIds: filters.stylometryAuthorIds,
		stylometryMatch: filters.stylometryMatch
	});

	$effect(() => {
		if (additionalTerms.length > 0 || proximityTerms.length > 0) {
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
		return [...searchExecution.allResults].sort(
			(a, b) =>
				sumResultOccurrences(b) - sumResultOccurrences(a) ||
				b.score - a.score ||
				a.docId - b.docId
		);
	});

	const resultPageCount = $derived.by(() =>
		filteredResults.length > 0 ? Math.ceil(filteredResults.length / RESULTS_PAGE_SIZE) : 1
	);
	const resultPageStart = $derived.by(() =>
		filteredResults.length === 0 ? 0 : (resultsPage - 1) * RESULTS_PAGE_SIZE + 1
	);
	const resultPageEnd = $derived.by(() => Math.min(filteredResults.length, resultsPage * RESULTS_PAGE_SIZE));
	const visibleResults = $derived.by(() => {
		const start = (resultsPage - 1) * RESULTS_PAGE_SIZE;
		return filteredResults.slice(start, start + RESULTS_PAGE_SIZE);
	});
	const visiblePreviewSignature = $derived.by(() =>
		visibleResults
			.map((result) =>
				[
					result.docId,
					result.matches.map((match) => `${match.kind}:${match.source}:${match.occurrences}`).join('\u0003')
				].join('\u0004')
			)
			.join('\u0005')
	);
	const filteredTextsWithOccurrences = $derived.by(() => filteredResults.length);
	const filteredTotalOccurrences = $derived.by(() =>
		filteredResults.reduce((sum, result) => sum + sumResultOccurrences(result), 0)
	);

	$effect(() => {
		if (resultsPage > resultPageCount) {
			resultsPage = resultPageCount;
		}
	});

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
		author: 'Ocurrencias por autor',
		genre: 'Ocurrencias por género'
	};

	const chartEmptyMessages: Record<ChartKey, string> = {
		author: 'No hay datos de autoría estilométrica para graficar.',
		genre: 'No hay datos de género para graficar.'
	};

	const modePillButtonClass =
		'relative z-10 min-w-0 rounded-full border-0 [border-width:0px] bg-transparent px-3 py-1.5 text-[0.78rem] font-semibold outline-none ring-0 transition-colors focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 max-sm:w-full max-sm:text-left';
	const modePillIndicatorClass =
		'pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-white shadow-soft transition-[opacity,transform,width] duration-200 ease-out max-sm:hidden';
	const additionalModePillIndicatorClass =
		'pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-white shadow-soft transition-[opacity,transform,width] duration-200 ease-out max-sm:hidden';
	const interpretedQueryTermClass =
		'inline-flex max-w-full items-center rounded-full bg-surface-accent-purple px-2.5 py-1 font-semibold leading-none text-text-accent-purple align-middle';
	const queryClauseCount = $derived.by(() => submittedTerms.length);

	const queryLabelNoun = $derived.by(() => (queryClauseCount === 1 ? 'Término' : 'Términos'));

	const queryTermsLabel = $derived.by(() => {
		if (submittedTerms.length === 0) return '';
		const connectorLabel = (operator: string | null): string => {
			if (operator === 'all') return 'AND';
			if (operator === 'any') return 'OR';
			if (operator === 'globalAny') return 'OR';
			return operator?.toUpperCase() ?? '';
		};
		const expression = submittedTerms
			.map((term, index) => (index === 0 ? term.label : `${connectorLabel(term.operator)} ${term.label}`))
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
		if (comparisonMetric === 'occurrences') return 'Ocurrencias';
		if (comparisonMetric === 'share') return 'Reparto porcentual';
		return 'Frecuencia por 10.000 palabras';
	});

	const chartTitleWithQuery = (chartKey: ChartKey): string => {
		const suffix = queryTermsLabel.trim();
		return suffix ? `${chartTitles[chartKey]} · ${queryLabelNoun}: ${suffix}` : chartTitles[chartKey];
	};

	const formatNameList = (names: string[]): string => {
		if (names.length === 0) return '';
		if (names.length === 1) return names[0];
		if (names.length === 2) return `${names[0]} y ${names[1]}`;
		return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
	};

	const formatCompactAttribution = (set: AttributionSet): string => {
		if (set.unresolved) return 'No determinada';
		if (!set.groups.length) return 'Sin datos';

		const names: string[] = [];
		const seen = new Set<string>();
		for (const group of set.groups) {
			for (const member of group.members) {
				const authorName = member.authorName.trim();
				if (!authorName || seen.has(authorName)) continue;
				seen.add(authorName);
				names.push(authorName);
			}
		}
		if (!names.length) return 'Sin datos';
		return formatNameList(names);
	};

	const resultMetadataLine = (result: SearchResult): string => {
		const meta = result.meta;
		if (!meta) return 'Sin metadatos';
		const traditional = formatCompactAttribution(meta.traditionalAttribution);
		const stylometry = formatCompactAttribution(meta.stylometryAttribution);
		const genre = meta.genre.trim() || 'Sin género';
		return `Trad. ${traditional} · Estil. ${stylometry} · Género ${genre}`;
	};

	const closeTextDropdown = (): void => {
		openTextDropdownDocId = null;
	};

	const toggleTextDropdown = (event: MouseEvent, docId: number): void => {
		event.stopPropagation();
		openTextDropdownDocId = openTextDropdownDocId === docId ? null : docId;
	};

	const resultTextLinks = (result: SearchResult): TexoroWorkMeta['textLinks'] =>
		(result.meta?.textLinks ?? []).filter((link) => link.href.trim().length > 0);

	const createAdditionalTerm = (): AdditionalQueryTerm => ({
		id: nextAdditionalTermId++,
		value: ''
	});

	const createProximityTerm = (): ProximityQueryTerm => ({
		id: nextProximityTermId++,
		value: '',
		distance: 5,
		order: 'any'
	});

	const addAdditionalTerm = (): void => {
		if (additionalTerms.length + proximityTerms.length >= MAX_QUERY_TERMS - 1) return;
		additionalTerms = [...additionalTerms, createAdditionalTerm()];
		advancedSearchOpen = true;
	};

	const removeAdditionalTerm = (termId: number): void => {
		additionalTerms = additionalTerms.filter((term) => term.id !== termId);
	};

	const updateAdditionalTermValue = (termId: number, value: string): void => {
		additionalTerms = additionalTerms.map((term) => (term.id === termId ? { ...term, value } : term));
	};

	const setAdditionalMode = (event: MouseEvent, mode: AdditionalSearchMode): void => {
		additionalMode = mode;
		(event.currentTarget as HTMLButtonElement).blur();
	};

	const getAdditionalModeButton = (mode: AdditionalSearchMode): HTMLButtonElement | null => {
		if (mode === 'any') return additionalModeAnyButton;
		if (mode === 'globalAny') return additionalModeGlobalAnyButton;
		return additionalModeAllButton;
	};

	const updateAdditionalModePill = async (): Promise<void> => {
		await tick();
		const button = getAdditionalModeButton(additionalMode);
		if (!button) {
			additionalModePillStyle = 'opacity: 0;';
			return;
		}
		additionalModePillStyle = `width: ${button.offsetWidth}px; transform: translateX(${button.offsetLeft}px); opacity: 1;`;
	};

	const addProximityTerm = (): void => {
		if (additionalTerms.length + proximityTerms.length >= MAX_QUERY_TERMS - 1) return;
		proximityTerms = [...proximityTerms, createProximityTerm()];
		advancedSearchOpen = true;
	};

	const removeProximityTerm = (termId: number): void => {
		proximityTerms = proximityTerms.filter((term) => term.id !== termId);
	};

	const updateProximityTermValue = (termId: number, value: string): void => {
		proximityTerms = proximityTerms.map((term) => (term.id === termId ? { ...term, value } : term));
	};

	const updateProximityTermDistance = (termId: number, distance: number): void => {
		const clean = Math.min(100, Math.max(0, Number.isFinite(distance) ? Math.floor(distance) : 5));
		proximityTerms = proximityTerms.map((term) => (term.id === termId ? { ...term, distance: clean } : term));
	};

	const updateProximityTermOrder = (termId: number, order: SearchProximityOrder): void => {
		proximityTerms = proximityTerms.map((term) => (term.id === termId ? { ...term, order } : term));
	};

	const setProximityMode = (event: MouseEvent, mode: SearchBooleanMode): void => {
		proximityMode = mode;
		(event.currentTarget as HTMLButtonElement).blur();
	};

	const getProximityModeButton = (mode: SearchBooleanMode): HTMLButtonElement | null =>
		mode === 'any' ? proximityModeAnyButton : proximityModeAllButton;

	const updateProximityModePill = async (): Promise<void> => {
		await tick();
		const button = getProximityModeButton(proximityMode);
		if (!button) {
			proximityModePillStyle = 'opacity: 0;';
			return;
		}
		proximityModePillStyle = `width: ${button.offsetWidth}px; transform: translateX(${button.offsetLeft}px); opacity: 1;`;
	};

	const normalizeSearchValue = (value: string): string => value.trim().replace(/\s+/g, ' ');

	const formatFormulaValue = (value: string): string => {
		const normalized = normalizeSearchValue(value);
		return /\s/.test(normalized) ? `"${normalized}"` : normalized;
	};

	const formatClauseSourceForValue = (value: string): string => {
		const normalized = normalizeSearchValue(value);
		return /\s/.test(normalized) ? `"${normalized}"` : normalizePattern(normalized, preserveEnieForHighlight);
	};

	const formatProximitySourceForValue = (
		main: string,
		term: Pick<ProximityQueryTerm, 'value' | 'distance' | 'order'>
	): string =>
		`${formatClauseSourceForValue(main)} ~${term.order}<=${term.distance} ${formatClauseSourceForValue(term.value)}`;

	const proximityOrderLabel = (order: SearchProximityOrder): string => {
		if (order === 'after') return 'después';
		if (order === 'before') return 'antes';
		return 'en cualquier orden';
	};

	const proximityFormulaName = (order: SearchProximityOrder): string => {
		if (order === 'after') return 'NEAR_AFTER';
		if (order === 'before') return 'NEAR_BEFORE';
		return 'NEAR_ANY';
	};

	const formatProximityDisplayLabel = (
		main: string,
		term: Pick<ProximityQueryTerm, 'value' | 'distance' | 'order'>
	): string =>
		`${formatFormulaValue(term.value)} cerca de ${formatFormulaValue(main)} (máx. ${term.distance}, ${proximityOrderLabel(term.order)})`;

	const uniqueSearchValues = (values: string[]): string[] => {
		const seen = new Set<string>();
		const output: string[] = [];
		for (const value of values) {
			const normalized = normalizeSearchValue(value);
			if (!normalized || seen.has(normalized)) continue;
			seen.add(normalized);
			output.push(normalized);
		}
		return output;
	};

	const proximityBaseValuesForQuery = (query: StructuredSearchQuery): string[] =>
		uniqueSearchValues([query.main, ...(query.additionalTerms ?? [])]).map(formatFormulaValue);

	const textPart = (value: string): InterpretedQueryPart => ({ kind: 'text', value });
	const termPart = (value: string): InterpretedQueryPart => ({ kind: 'term', value });
	const quoteTerm = (value: string): string => `“${normalizeSearchValue(value)}”`;
	const isPatternTerm = (value: string): boolean => /[*?]/.test(value);
	const isExactPhraseTerm = (value: string): boolean => /\s/.test(normalizeSearchValue(value));

	const appendHumanTermList = (
		parts: InterpretedQueryPart[],
		terms: string[],
		conjunction: 'y' | 'o'
	): void => {
		terms.forEach((term, index) => {
			if (index > 0) {
				parts.push(textPart(index === terms.length - 1 ? ` ${conjunction} ` : ', '));
			}
			parts.push(termPart(term));
		});
	};

	const appendProximityTargets = (
		parts: InterpretedQueryPart[],
		baseTerms: string[],
		mode: SearchBooleanMode,
		options: { repeatPrefix: string }
	): void => {
		const quotedBaseTerms = baseTerms.map((base) => quoteTerm(base));
		if (quotedBaseTerms.length <= 1) {
			parts.push(termPart(quotedBaseTerms[0] ?? quoteTerm('')));
			return;
		}
		if (mode === 'any') {
			parts.push(textPart(`al menos uno de estos términos: `));
			appendHumanTermList(parts, quotedBaseTerms, 'o');
			return;
		}
		parts.push(termPart(quotedBaseTerms[0]));
		for (let index = 1; index < quotedBaseTerms.length; index += 1) {
			parts.push(textPart(index === quotedBaseTerms.length - 1 ? ` y ${options.repeatPrefix}` : `, ${options.repeatPrefix}`));
			parts.push(termPart(quotedBaseTerms[index]));
		}
	};

	const appendProximityRelativeToBases = (
		parts: InterpretedQueryPart[],
		baseTerms: string[],
		mode: SearchBooleanMode,
		term: Pick<ProximityQueryTerm, 'value' | 'distance'> & { order?: SearchProximityOrder }
	): void => {
		const cleanOrder = term.order ?? 'any';
		parts.push(termPart(quoteTerm(term.value)));
		if (cleanOrder === 'after') {
			parts.push(textPart(` aparezca hasta ${term.distance} palabras después de `));
			appendProximityTargets(parts, baseTerms, mode, { repeatPrefix: 'de ' });
			return;
		}
		if (cleanOrder === 'before') {
			parts.push(textPart(` aparezca hasta ${term.distance} palabras antes de `));
			appendProximityTargets(parts, baseTerms, mode, { repeatPrefix: 'de ' });
			return;
		}
		parts.push(textPart(` aparezca a un máximo de ${term.distance} palabras de `));
		appendProximityTargets(parts, baseTerms, mode, { repeatPrefix: 'de ' });
		parts.push(textPart(', en cualquier orden'));
	};

	const resolveFilterLabels = (ids: string[], labelById: Map<string, string>): string[] => {
		const output: string[] = [];
		const seen = new Set<string>();
		for (const id of ids) {
			const label = (labelById.get(id) ?? id).trim();
			if (!label || seen.has(label)) continue;
			seen.add(label);
			output.push(label);
		}
		return output;
	};

	interface InterpretedFilterView {
		titles: string[];
		genres: string[];
		traditionalAuthors: string[];
		traditionalMatch: 'or' | 'and';
		stylometryAuthors: string[];
		stylometryMatch: 'or' | 'and';
		states: string[];
	}

	const buildTextualClause = (query: StructuredSearchQuery): InterpretedQueryPart[] => {
		const parts: InterpretedQueryPart[] = [];
		const main = normalizeSearchValue(query.main);
		const additionalRaw = (query.additionalTerms ?? []).map(normalizeSearchValue).filter(Boolean);
		const proximityBaseTerms = uniqueSearchValues([main, ...additionalRaw]);
		const quotedMain = quoteTerm(main);
		const quotedAdditional = additionalRaw.map((term) => quoteTerm(term));

		if (query.additionalMode === 'globalAny' && additionalRaw.length > 0) {
			parts.push(textPart('Buscar textos que incluyan al menos uno de estos términos: '));
			appendHumanTermList(parts, [quotedMain, ...quotedAdditional], 'o');
		} else {
			if (isPatternTerm(main)) {
				parts.push(textPart('Buscar textos que incluyan el patrón '));
			} else if (isExactPhraseTerm(main)) {
				parts.push(textPart('Buscar textos que incluyan la frase exacta '));
			} else {
				parts.push(textPart('Buscar textos que incluyan '));
			}
			parts.push(termPart(quotedMain));
			if (quotedAdditional.length > 0) {
				if (query.additionalMode === 'any') {
					parts.push(textPart(' y que incluyan al menos uno de estos términos: '));
					appendHumanTermList(parts, quotedAdditional, 'o');
				} else {
					parts.push(textPart(' y que también incluyan '));
					appendHumanTermList(parts, quotedAdditional, 'y');
				}
			}
		}

		const proximity = (query.proximityTerms ?? [])
			.map((term) => ({
				value: normalizeSearchValue(term.value),
				distance: term.distance,
				order: term.order ?? 'any'
			}))
			.filter((term) => term.value);
		if (proximity.length === 1) {
			parts.push(textPart(' y en los que '));
			appendProximityRelativeToBases(parts, proximityBaseTerms, query.proximityMode ?? 'all', proximity[0]);
		} else if (proximity.length > 1) {
			if (query.proximityMode === 'any') {
				parts.push(textPart(' y en los que se cumpla al menos una de estas cercanías: '));
				proximity.forEach((term, index) => {
					if (index > 0) parts.push(textPart(' o '));
					appendProximityRelativeToBases(parts, proximityBaseTerms, query.proximityMode ?? 'all', term);
				});
			} else {
				parts.push(textPart(' y en los que se cumplan todas estas cercanías: '));
				proximity.forEach((term, index) => {
					if (index > 0) parts.push(textPart(' y '));
					appendProximityRelativeToBases(parts, proximityBaseTerms, query.proximityMode ?? 'all', term);
				});
			}
		}

		return parts;
	};

	const buildFiltersClause = (filters: InterpretedFilterView): InterpretedQueryPart[] => {
		const parts: InterpretedQueryPart[] = [];
		const hasFilters =
			filters.titles.length > 0 ||
			filters.genres.length > 0 ||
			filters.states.length > 0 ||
			filters.traditionalAuthors.length > 0 ||
			filters.stylometryAuthors.length > 0;
		if (!hasFilters) return parts;

		parts.push(textPart('Limitar a obras '));
		let hasPrevious = false;
		const pushJoin = (prefix = 'y ') => {
			if (hasPrevious) parts.push(textPart(`${prefix}`));
			hasPrevious = true;
		};

		if (filters.titles.length > 0) {
			pushJoin();
			parts.push(textPart('tituladas '));
			appendHumanTermList(parts, filters.titles.map(quoteTerm), 'o');
			parts.push(textPart(' '));
		}
		if (filters.genres.length > 0) {
			pushJoin();
			if (filters.genres.length === 1) {
				parts.push(textPart('del género '));
				parts.push(termPart(quoteTerm(filters.genres[0])));
			} else {
				parts.push(textPart('de los géneros '));
				appendHumanTermList(parts, filters.genres.map(quoteTerm), 'o');
			}
			parts.push(textPart(' '));
		}
		if (filters.states.length > 0) {
			pushJoin();
			parts.push(textPart('en estado '));
			appendHumanTermList(parts, filters.states.map(quoteTerm), 'o');
			parts.push(textPart(' '));
		}
		if (filters.traditionalAuthors.length > 0) {
			pushJoin('y con ');
			parts.push(
				textPart(
					filters.traditionalMatch === 'and'
						? 'atribución tradicional conjunta a '
						: 'atribución tradicional a '
				)
			);
			appendHumanTermList(
				parts,
				filters.traditionalAuthors.map(quoteTerm),
				filters.traditionalMatch === 'and' ? 'y' : 'o'
			);
			parts.push(textPart(' '));
		}
		if (filters.stylometryAuthors.length > 0) {
			pushJoin('y con ');
			parts.push(
				textPart(
					filters.stylometryMatch === 'and'
						? 'atribución estilométrica conjunta a '
						: 'atribución estilométrica a '
				)
			);
			appendHumanTermList(
				parts,
				filters.stylometryAuthors.map(quoteTerm),
				filters.stylometryMatch === 'and' ? 'y' : 'o'
			);
			parts.push(textPart(' '));
		}

		if (parts.length > 0 && parts[parts.length - 1].kind === 'text') {
			parts[parts.length - 1].value = parts[parts.length - 1].value.replace(/\s+$/, '');
		}
		return parts;
	};

	const buildTechnicalFormula = (query: StructuredSearchQuery): string => {
		const main = formatFormulaValue(query.main);
		const additional = (query.additionalTerms ?? []).map(formatFormulaValue).filter(Boolean);
		const parts =
			query.additionalMode === 'globalAny' && additional.length > 0
				? [`(${[main, ...additional].join(' OR ')})`]
				: [main];
		if (additional.length > 0 && query.additionalMode !== 'globalAny') {
			if (additional.length === 1) {
				parts.push(additional[0]);
			} else if (query.additionalMode === 'all') {
				parts.push(...additional);
			} else {
				parts.push(`(${additional.join(' OR ')})`);
			}
		}
		const proximityBaseTerms = proximityBaseValuesForQuery(query);
		const proximity = (query.proximityTerms ?? [])
			.filter((term) => term.value.trim())
			.flatMap((term) =>
				proximityBaseTerms.map(
					(base) =>
						`${proximityFormulaName(term.order ?? 'any')}(${base}, ${formatFormulaValue(term.value)}, <=${term.distance})`
				)
			);
		if (proximity.length > 0) {
			parts.push(
				proximity.length === 1
					? proximity[0]
					: `(${proximity.join(query.proximityMode === 'any' ? ' OR ' : ' AND ')})`
			);
		}
		return parts.join(' AND ');
	};

	const buildInterpretedSummaryParts = (
		query: StructuredSearchQuery,
		filters: InterpretedFilterView
	): InterpretedQueryPart[] => {
		const parts: InterpretedQueryPart[] = [];
		parts.push(...buildTextualClause(query));
		const filterParts = buildFiltersClause(filters);
		if (filterParts.length > 0) {
			parts.push(textPart('. '));
			parts.push(...filterParts);
		}
		parts.push(textPart('.'));
		return parts;
	};

	const buildTermDescriptor = (
		value: string,
		label: string,
		operator: string | null
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

	const buildEffectiveQuery = (): {
		query: string;
		terms: SubmittedQueryTerm[];
		structuredQuery: StructuredSearchQuery;
	} => {
		const terms: SubmittedQueryTerm[] = [];
		const normalizedMain = normalizeSearchValue(mainQuery);
		terms.push(buildTermDescriptor(normalizedMain, normalizedMain, null));

		const cleanAdditionalTerms = additionalTerms.map((term) => normalizeSearchValue(term.value)).filter(Boolean);
		for (const term of cleanAdditionalTerms) {
			terms.push(buildTermDescriptor(term, term, additionalMode));
		}
		const proximityBaseTerms = uniqueSearchValues([normalizedMain, ...cleanAdditionalTerms]);

		const cleanProximityTerms = proximityTerms
			.map((term) => ({
				value: normalizeSearchValue(term.value),
				distance: term.distance,
				order: term.order
			}))
			.filter((term) => term.value);
		for (const term of cleanProximityTerms) {
			for (const baseTerm of proximityBaseTerms) {
				terms.push({
					key: `proximity:${formatProximitySourceForValue(baseTerm, term)}`,
					label: formatProximityDisplayLabel(baseTerm, term),
					operator: proximityMode
				});
			}
		}

		const structuredQuery: StructuredSearchQuery = {
			main: normalizedMain,
			additionalMode,
			additionalTerms: cleanAdditionalTerms,
			proximityMode,
			proximityTerms: cleanProximityTerms
		};

		return {
			query: buildTechnicalFormula(structuredQuery),
			terms,
			structuredQuery
		};
	};

	const interpretedQuery = $derived.by(() => {
		const main = normalizeSearchValue(mainQuery);
		if (!main) return null as InterpretedQueryView | null;
		const structuredQuery: StructuredSearchQuery = {
			main,
			additionalMode,
			additionalTerms: additionalTerms.map((term) => normalizeSearchValue(term.value)).filter(Boolean),
			proximityMode,
			proximityTerms: proximityTerms
				.map((term) => ({
					value: normalizeSearchValue(term.value),
					distance: term.distance,
					order: term.order
				}))
				.filter((term) => term.value)
		};
		const interpretedFilters: InterpretedFilterView = {
			titles: resolveFilterLabels(selectedTitleIds, titleLabelById),
			genres: resolveFilterLabels(selectedGenres, genreLabelById),
			traditionalAuthors: resolveFilterLabels(selectedTradAuthors, authorLabelById),
			traditionalMatch: tradMatch,
			stylometryAuthors: resolveFilterLabels(selectedEstoAuthors, authorLabelById),
			stylometryMatch: estoMatch,
			states: resolveFilterLabels(selectedStates, stateLabelById)
		};
		return {
			summaryParts: buildInterpretedSummaryParts(structuredQuery, interpretedFilters)
		};
	});

	const validateSearchTerm = (value: string, label: string): string => {
		const trimmed = value.trim();
		if (!trimmed) return `${label}: introduce un término.`;
		if (!QUERY_ALLOWED_PATTERN.test(trimmed)) {
			return `${label}: solo se permiten palabras, espacios y los comodines * y ?.`;
		}
		return '';
	};

	const resetSearchControls = (): void => {
		mainQuery = '';
		advancedSearchOpen = false;
		filtersOpen = false;
		additionalTerms = [];
		additionalMode = 'all';
		proximityTerms = [];
		proximityMode = 'all';
		selectedTitleIds = [];
		selectedGenres = [];
		selectedTradAuthors = [];
		tradMatch = 'or';
		selectedEstoAuthors = [];
		estoMatch = 'or';
		selectedStates = [];
		submittedTerms = [];
		lastSubmittedSearch = null;
		searchExecution = null;
		resultsPage = 1;
		isPreparingResults = false;
		searchError = '';
		exportError = '';
		occurrencePreviews = new Map();
		previewLoadsByDocId = new Map();
		queuedPreviewDocIds = new Set();
		occurrenceDetailsCache = new Map();
		occurrenceDetailsLoads = new Map();
		openingOccurrenceKey = null;
		searchRequestId += 1;
		visiblePreviewRequestId += 1;
		previewRequestVersion += 1;
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
				`Total de ocurrencias en gráfico: ${decimalFormatter.format(chart.total)} · Modo: ${
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
			const citation =
				`Cita sugerida: ETSO, TEXORO. "${exportTitle}". ` +
				`Consulta: "${queryTermsLabel}". ` +
				`Generado el ${dateText}. ` +
				`Resultados: ${filteredTextsWithOccurrences} textos, ${decimalFormatter.format(filteredTotalOccurrences)} ocurrencias. ` +
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
		if (match.kind === 'proximity') {
			const proximity = parseProximityMatchSource(source);
			const chunks = proximity
				? [proximity.left, proximity.right].flatMap((part) => part.split(/\s+/))
				: source
						.split(/\s+~(?:any|after|before)<=\d+\s+|\s+~\d+\s+/)
						.flatMap((part) => part.replace(/^"|"$/g, '').split(/\s+/))
						.filter((chunk) => chunk.length > 0);
			const normalized = chunks
				.map((chunk) => normalizePattern(chunk, preserveEnieForHighlight))
				.filter((chunk) => chunk.length > 0);
			return Array.from(new Set(normalized));
		}

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
				markStyle:
					match.kind === 'proximity'
						? `${palette.mark}text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:2px;`
						: palette.mark
			};
		});
	};

	const snippetInnerBounds = (snippet: string): { start: number; end: number } => {
		const leadingEllipsis = snippet.match(/^\.\.\.\s*/u)?.[0].length ?? 0;
		const trailingEllipsis = snippet.match(/\s*\.\.\.$/u)?.[0].length ?? 0;
		return {
			start: leadingEllipsis,
			end: Math.max(leadingEllipsis, snippet.length - trailingEllipsis)
		};
	};

	const trimSnippetSlice = (snippet: string, start: number, end: number): { start: number; end: number } => {
		let trimmedStart = start;
		let trimmedEnd = end;
		while (trimmedStart < trimmedEnd && /\s/u.test(snippet[trimmedStart])) trimmedStart += 1;
		while (trimmedEnd > trimmedStart && /\s/u.test(snippet[trimmedEnd - 1])) trimmedEnd -= 1;
		return { start: trimmedStart, end: trimmedEnd };
	};

	const buildCenteredOccurrencePreview = (
		occurrence: SearchMatchOccurrence,
		assignments: MatchAssignment[],
		radius: number
	): Pick<SearchMatchOccurrence, 'snippet' | 'highlights'> => {
		const snippet = occurrence.snippet;
		const inner = snippetInnerBounds(snippet);
		const exactRanges =
			occurrence.highlights
				?.map((highlight) => ({
					start: Math.max(inner.start, Math.min(inner.end, highlight.start)),
					end: Math.max(inner.start, Math.min(inner.end, highlight.end)),
					tokenIndex: highlight.tokenIndex
				}))
				.filter((range) => range.end > range.start) ?? [];
		const inferredRanges = exactRanges.length
			? []
			: collectHighlightRanges(snippet, assignments).filter(
					(range) => range.end > inner.start && range.start < inner.end
				);
		const ranges = exactRanges.length ? exactRanges : inferredRanges;
		if (ranges.length === 0) return { snippet, highlights: occurrence.highlights ?? [] };

		const center = snippet.length / 2;
		const selected =
			exactRanges.length > 1
				? {
						start: Math.min(...exactRanges.map((range) => range.start)),
						end: Math.max(...exactRanges.map((range) => range.end))
					}
				: ranges
						.slice()
						.sort(
							(a, b) =>
								Math.abs((a.start + a.end) / 2 - center) -
									Math.abs((b.start + b.end) / 2 - center) ||
								a.start - b.start
						)[0];
		const visibleStart = Math.max(inner.start, selected.start - radius);
		const visibleEnd = Math.min(inner.end, selected.end + radius);
		const bodyBounds = trimSnippetSlice(snippet, visibleStart, visibleEnd);
		const prefix = bodyBounds.start > inner.start || snippet.trimStart().startsWith('...') ? '... ' : '';
		const suffix = bodyBounds.end < inner.end || snippet.trimEnd().endsWith('...') ? ' ...' : '';
		const body = snippet.slice(bodyBounds.start, bodyBounds.end);
		const adjustedHighlights = exactRanges
			.map((range) => ({
				start: Math.max(bodyBounds.start, Math.min(bodyBounds.end, range.start)),
				end: Math.max(bodyBounds.start, Math.min(bodyBounds.end, range.end)),
				tokenIndex: range.tokenIndex
			}))
			.filter((range) => range.end > range.start)
			.map((range) => ({
				start: range.start - bodyBounds.start + prefix.length,
				end: range.end - bodyBounds.start + prefix.length,
				tokenIndex: range.tokenIndex
			}));

		return {
			snippet: `${prefix}${body}${suffix}`,
			highlights: adjustedHighlights
		};
	};

	async function postJson<T>(url: string, body: unknown): Promise<T> {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify(body)
		});
		if (!response.ok) {
			const message = await response.text().catch(() => '');
			throw new Error(message || `Error HTTP ${response.status}`);
		}
		return (await response.json()) as T;
	}

	async function postBlob(url: string, body: unknown): Promise<Blob> {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify(body)
		});
		if (!response.ok) {
			const message = await response.text().catch(() => '');
			throw new Error(message || `Error HTTP ${response.status}`);
		}
		return await response.blob();
	}

	const formatDownloadStamp = (date: Date): string => {
		const pad = (value: number): string => String(value).padStart(2, '0');
		return [
			date.getFullYear(),
			pad(date.getMonth() + 1),
			pad(date.getDate()),
			pad(date.getHours()),
			pad(date.getMinutes()),
			pad(date.getSeconds())
		].join('-');
	};

	const loadTexoroStats = async (): Promise<void> => {
		const cached = getClientMemoryCache<TexoroStatsPayload>(TEXORO_STATS_CACHE_KEY);
		if (cached) {
			statsPayload = cached;
			isStatsLoading = false;
			return;
		}
		if (statsLoadPromise) return statsLoadPromise;
		statsLoadPromise = (async () => {
			try {
				statsPayload = await loadClientMemoryCache<TexoroStatsPayload>(TEXORO_STATS_CACHE_KEY, async () => {
					const response = await fetch('/api/texoro/stats');
					if (!response.ok) throw new Error(`No se pudieron cargar los indicadores de TEXORO: ${response.status}`);
					return (await response.json()) as TexoroStatsPayload;
				});
			} catch (cause) {
				console.warn('[texoro] stats load failed', cause);
				statsPayload = null;
			} finally {
				isStatsLoading = false;
			}
		})();
		return statsLoadPromise;
	};

	const ensureTexoroOptionsLoaded = async (): Promise<void> => {
		const cached = getClientMemoryCache<TexoroOptionsPayload>(TEXORO_OPTIONS_CACHE_KEY);
		if (cached) {
			titleOptionItems = cached.titles;
			authorOptionItems = cached.authors;
			genreOptionItems = cached.genres;
			stateOptionItems = cached.states;
			return;
		}
		if (optionsLoadPromise) return optionsLoadPromise;
		optionsLoadPromise = (async () => {
			try {
				const payload = await loadClientMemoryCache<TexoroOptionsPayload>(TEXORO_OPTIONS_CACHE_KEY, async () => {
					const response = await fetch('/api/texoro/options');
					if (!response.ok) throw new Error(`No se pudieron cargar los filtros de TEXORO: ${response.status}`);
					return (await response.json()) as TexoroOptionsPayload;
				});
				titleOptionItems = payload.titles;
				authorOptionItems = payload.authors;
				genreOptionItems = payload.genres;
				stateOptionItems = payload.states;
			} catch (cause) {
				console.warn('[texoro] options load failed', cause);
				optionsLoadPromise = null;
			}
		})();
		return optionsLoadPromise;
	};

	const fetchWorksMeta = async (): Promise<TexoroWorkMeta[]> => {
		const response = await fetch('/api/texoro/work-meta');
		if (!response.ok) {
			throw new Error(`No se pudieron cargar los metadatos de TEXORO: ${response.status}`);
		}
		return (await response.json()) as TexoroWorkMeta[];
	};

	const loadWorksMeta = async (): Promise<TexoroWorkMeta[]> => {
		if (worksMeta) return worksMeta;
		if (!worksMetaLoadPromise) {
			worksMetaLoadPromise = fetchWorksMeta()
				.then((items) => {
					worksMeta = items;
					return items;
				})
				.finally(() => {
					worksMetaLoadPromise = null;
				});
		}
		return worksMetaLoadPromise;
	};

	const fetchIndexManifest = async (): Promise<TexoroIndexManifest> => {
		if (!texoroIndexBaseUrl) {
			throw new Error('Falta PUBLIC_R2_PUBLIC_ASSETS_BASE_URL para inicializar TEXORO.');
		}
		const response = await fetch(withCacheBuster(joinUrl(texoroIndexBaseUrl, 'manifest.json')), {
			cache: 'no-store'
		});
		if (!response.ok) {
			throw new Error(`No se pudo inicializar TEXORO: ${response.status}`);
		}
		return (await response.json()) as TexoroIndexManifest;
	};

	const applyIndexManifest = (manifest: TexoroIndexManifest): void => {
		isEngineReady = true;
		indexStats = {
			works: manifest.stats.works,
			tokens: manifest.stats.tokens,
			vocabSize: manifest.stats.vocabSize
		};
		loadedIndexVersion = manifest.indexVersion;
		loadedPreserveEnieForHighlight = manifest.normalization.preserveEnie;
	};

	const initializeTexoroWorker = async (): Promise<void> => {
		if (isEngineReady && isTexoroClientWorkerReady()) return;
		if (texoroWorkerInitPromise) return texoroWorkerInitPromise;

		texoroWorkerInitPromise = (async () => {
			try {
				const loadedWorksMeta = await loadWorksMeta();
				const manifest = await initializeTexoroClientWorker({
					indexBaseUrl: texoroIndexBaseUrl,
					worksMeta: loadedWorksMeta
				});
				applyIndexManifest(manifest);
			} catch (cause) {
				console.warn('[texoro] using server search fallback', cause);
				terminateTexoroClientWorker('Worker TEXORO no disponible');
				try {
					applyIndexManifest(await fetchIndexManifest());
				} catch (manifestCause) {
					searchError =
						manifestCause instanceof Error ? manifestCause.message : 'No se pudo inicializar TEXORO';
				}
			} finally {
				texoroWorkerInitPromise = null;
			}
		})();

		return texoroWorkerInitPromise;
	};

	const runServerSearch = async (
		query: string,
		structuredQuery: StructuredSearchQuery,
		filters: TexoroSearchFilters
	): Promise<SearchExecution> =>
		postJson<SearchExecution>('/api/texoro/search', {
			query,
			structuredQuery,
			options: {
				limit: RESULTS_PAGE_SIZE,
				maxPhraseVerificationDocs: 220,
				snippetRadius: 115,
				includeSnippets: false,
				...buildSearchFilterOptions(filters)
			}
		});

	const runBrowserFirstSearch = async (
		query: string,
		structuredQuery: StructuredSearchQuery,
		filters: TexoroSearchFilters
	): Promise<SearchExecution> => {
		if (isEngineReady && isTexoroClientWorkerReady()) {
			try {
				const response = await requestTexoroClientWorker<{ execution?: SearchExecution }>({
					action: 'search',
					query,
					structuredQuery,
					options: {
						limit: RESULTS_PAGE_SIZE,
						maxPhraseVerificationDocs: 220,
						snippetRadius: 115,
						includeSnippets: false,
						...buildSearchFilterOptions(filters)
					}
				});
				if (response.execution) return response.execution;
			} catch (cause) {
				console.warn('[texoro] browser search failed; using server fallback', cause);
				terminateTexoroClientWorker('Worker TEXORO desactivado tras error de busqueda');
			}
		}

		return runServerSearch(query, structuredQuery, filters);
	};

	const buildOccurrencePreviewMap = async (
		results: SearchResult[]
	): Promise<Map<number, ResultOccurrencePreview>> => {
		const previews = new Map<number, ResultOccurrencePreview>();
		const eligible = results.filter((result) => result.matches.length > 0);
		if (eligible.length === 0) return previews;
		try {
			const response = await postJson<{
				items: Array<{
					docId: number;
					workId: string;
					snippets: Array<SearchMatchOccurrence & { matchKey: string }>;
				}>;
			}>('/api/texoro/previews', {
				items: eligible.map((result) => ({
					docId: result.docId,
					workId: result.workId,
					matches: result.matches
				})),
				options: {
					maxItemsPerDoc: 3,
					snippetRadius: RESULT_PREVIEW_SNIPPET_RADIUS
				}
			});
			const byDoc = new Map(response.items.map((item) => [item.docId, item]));
			for (const result of eligible) {
				const assignments = buildMatchAssignments(result.matches);
				const item = byDoc.get(result.docId);
				const previewItems =
					item?.snippets
						.map((snippet) => {
							const assignment = assignments.find((candidate) => candidate.key === snippet.matchKey);
							const centered = buildCenteredOccurrencePreview(
								snippet,
								assignment ? [assignment] : assignments,
								RESULT_PREVIEW_VISIBLE_RADIUS
							);
							return {
								...snippet,
								snippet: centered.snippet,
								highlights: centered.highlights,
								assignmentKey: snippet.matchKey,
								centeredSnippet: centered.snippet
							};
						})
						.sort((a, b) => a.start - b.start || a.end - b.end) ?? [];
				previews.set(result.docId, { loading: false, items: previewItems, error: '' });
			}
		} catch (cause) {
			for (const result of eligible) {
				previews.set(result.docId, {
					loading: false,
					items: [],
					error: cause instanceof Error ? cause.message : 'No se pudieron cargar las ocurrencias'
				});
			}
		}
		return previews;
	};

	const mergeOccurrencePreviewMap = (previews: Map<number, ResultOccurrencePreview>): void => {
		if (previews.size === 0) return;
		const next = new Map(occurrencePreviews);
		for (const [docId, preview] of previews) {
			next.set(docId, preview);
		}
		occurrencePreviews = next;
	};

	const getResultsForPage = (page: number): SearchResult[] => {
		const start = (Math.max(1, page) - 1) * RESULTS_PAGE_SIZE;
		return filteredResults.slice(start, start + RESULTS_PAGE_SIZE);
	};

	const prefetchResultPreviews = (results: SearchResult[]): Promise<void> => {
		const eligible = results.filter(
			(result) =>
				result.matches.length > 0 &&
				!occurrencePreviews.has(result.docId) &&
				!previewLoadsByDocId.has(result.docId)
		);
		if (eligible.length === 0) return Promise.resolve();

		const version = previewRequestVersion;
		const docIds = eligible.map((result) => result.docId);
		const pending = (async () => {
			try {
				const previews = await buildOccurrencePreviewMap(eligible);
				if (version !== previewRequestVersion) return;
				mergeOccurrencePreviewMap(previews);
			} finally {
				if (version !== previewRequestVersion) return;
				const nextLoads = new Map(previewLoadsByDocId);
				const nextQueued = new Set(queuedPreviewDocIds);
				for (const docId of docIds) {
					nextLoads.delete(docId);
					nextQueued.delete(docId);
				}
				previewLoadsByDocId = nextLoads;
				queuedPreviewDocIds = nextQueued;
			}
		})();

		const nextLoads = new Map(previewLoadsByDocId);
		const nextQueued = new Set(queuedPreviewDocIds);
		for (const docId of docIds) {
			nextLoads.set(docId, pending);
			nextQueued.add(docId);
		}
		previewLoadsByDocId = nextLoads;
		queuedPreviewDocIds = nextQueued;
		return pending;
	};

	const prefetchResultsPage = (page: number, mode: 'top' | 'all' = 'top'): void => {
		const pageResults = getResultsForPage(page);
		if (pageResults.length === 0) return;
		const candidates =
			mode === 'all' ? pageResults : pageResults.slice(0, INITIAL_PREVIEW_RESULT_COUNT);
		void prefetchResultPreviews(candidates);
	};

	const prefetchAdjacentPage = (page: number): void => {
		const nextPage = Math.min(Math.max(1, page), resultPageCount);
		if (nextPage === resultsPage) return;
		prefetchResultsPage(nextPage, 'all');
	};

	const hasPendingPreview = (result: SearchResult): boolean =>
		result.matches.length > 0 &&
		!occurrencePreviews.has(result.docId) &&
		(previewLoadsByDocId.has(result.docId) || queuedPreviewDocIds.has(result.docId));

	const observeResultRow = (node: HTMLElement, result: SearchResult) => {
		let current = result;
		let observer: IntersectionObserver | null = null;
		const loadPreview = (): void => {
			if (current.matches.length === 0 || occurrencePreviews.has(current.docId)) return;
			void prefetchResultPreviews([current]);
		};

		if (typeof IntersectionObserver === 'undefined') {
			loadPreview();
			return {
				update(next: SearchResult) {
					const changed = next.docId !== current.docId;
					current = next;
					if (changed) loadPreview();
				},
				destroy() {}
			};
		}

		observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				loadPreview();
			},
			{ rootMargin: RESULT_PREVIEW_SCROLL_ROOT_MARGIN }
		);
		observer.observe(node);

		return {
			update(next: SearchResult) {
				const changed = next.docId !== current.docId;
				current = next;
				if (changed) loadPreview();
			},
			destroy() {
				observer?.disconnect();
			}
		};
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
				(entry) =>
					(entry.match.kind === 'term' || entry.match.kind === 'proximity') &&
					entry.regexes.some((regex) => regex.test(token.norm))
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
		if (assignment.match.kind === 'proximity') return renderHighlightedRanges(snippet, ranges);

		const center = snippet.length / 2;
		const selected = ranges.sort(
			(a, b) =>
				Math.abs((a.start + a.end) / 2 - center) -
					Math.abs((b.start + b.end) / 2 - center) ||
				a.start - b.start
		)[0];

		return renderHighlightedRanges(snippet, [selected]);
	};

	const highlightExactOccurrenceSnippet = (
		snippet: string,
		assignment: MatchAssignment | undefined,
		occurrence: SearchMatchOccurrence
	): string => {
		if (!snippet.trim()) return '';
		if (!assignment || !occurrence.highlights?.length) {
			return highlightSingleOccurrenceSnippet(snippet, assignment);
		}

		const ranges = occurrence.highlights
			.map((highlight) => ({
				start: Math.max(0, Math.min(snippet.length, highlight.start)),
				end: Math.max(0, Math.min(snippet.length, highlight.end)),
				assignment
			}))
			.filter((range) => range.end > range.start)
			.sort((a, b) => a.start - b.start || a.end - b.end);

		return ranges.length > 0 ? renderHighlightedRanges(snippet, ranges) : escapeHtml(snippet);
	};

	const occurrencePositionParts = (
		occurrence: SearchMatchOccurrence
	): { prefix: string; value: string; suffix: string } => {
		const highlightIndexes = occurrence.highlights?.map((highlight) => highlight.tokenIndex) ?? [];
		const start = Math.min(occurrence.tokenIndex, ...highlightIndexes);
		const end = Math.max(occurrence.tokenEndIndex ?? occurrence.tokenIndex, ...highlightIndexes);
		const total = numberFormatter.format(occurrence.tokenCount);
		return {
			prefix: start === end ? 'palabra ' : 'palabras ',
			value: start === end ? numberFormatter.format(start) : `${numberFormatter.format(start)}-${numberFormatter.format(end)}`,
			suffix: ` de ${total}`
		};
	};

	const closeOccurrenceModal = (): void => {
		occurrenceModal = null;
		occurrenceLoading = false;
		occurrenceError = '';
		openingOccurrenceKey = null;
	};

	const occurrenceDetailsKey = (result: SearchResult, assignment: MatchAssignment): string =>
		`${result.docId}:${assignment.key}`;

	const rememberOccurrenceDetails = (
		key: string,
		details: SearchMatchOccurrences
	): SearchMatchOccurrences => {
		const next = new Map(occurrenceDetailsCache);
		next.set(key, details);
		while (next.size > OCCURRENCE_DETAILS_CACHE_LIMIT) {
			const oldestKey = next.keys().next().value;
			if (!oldestKey) break;
			next.delete(oldestKey);
		}
		occurrenceDetailsCache = next;
		return details;
	};

	const loadOccurrenceDetails = async (
		result: SearchResult,
		assignment: MatchAssignment
	): Promise<SearchMatchOccurrences> => {
		const key = occurrenceDetailsKey(result, assignment);
		const cached = occurrenceDetailsCache.get(key);
		if (cached) return cached;

		const existing = occurrenceDetailsLoads.get(key);
		if (existing) return existing;

		const pending = postJson<SearchMatchOccurrences>('/api/texoro/occurrences', {
			docId: result.docId,
			workId: result.workId,
			match: assignment.match,
			options: {
				maxItems: OCCURRENCE_MODAL_MAX_ITEMS,
				snippetRadius: 115,
				snippetMode: 'lines',
				lineContext: 3
			}
		});

		const nextLoads = new Map(occurrenceDetailsLoads);
		nextLoads.set(key, pending);
		occurrenceDetailsLoads = nextLoads;

		try {
			return rememberOccurrenceDetails(key, await pending);
		} finally {
			const remainingLoads = new Map(occurrenceDetailsLoads);
			remainingLoads.delete(key);
			occurrenceDetailsLoads = remainingLoads;
		}
	};

	const prefetchOccurrenceDetails = (result: SearchResult, assignment: MatchAssignment): void => {
		void loadOccurrenceDetails(result, assignment).catch(() => {
			// La interacción real mostrará el error si sigue ocurriendo.
		});
	};

	const openOccurrenceModal = async (
		result: SearchResult,
		assignment: MatchAssignment
	): Promise<void> => {
		const key = occurrenceDetailsKey(result, assignment);
		const cached = occurrenceDetailsCache.get(key) ?? null;
		occurrenceError = '';
		occurrenceLoading = false;
		if (cached) {
			occurrenceModal = {
				result,
				assignment,
				details: cached
			};
			return;
		}

		openingOccurrenceKey = key;
		try {
			const details = await loadOccurrenceDetails(result, assignment);
			if (openingOccurrenceKey !== key) return;
			occurrenceModal = {
				result,
				assignment,
				details
			};
		} catch (cause) {
			if (openingOccurrenceKey !== key) return;
			occurrenceModal = {
				result,
				assignment,
				details: null
			};
			occurrenceError =
				cause instanceof Error ? cause.message : 'No se pudieron cargar las ocurrencias';
		} finally {
			if (openingOccurrenceKey === key) openingOccurrenceKey = null;
			occurrenceLoading = false;
		}
	};

	const closeInfoModal = (): void => {
		infoModalOpen = false;
	};

	$effect(() => {
		if (!infoModalOpen && !occurrenceModal) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	});

	const scrollToResults = async (): Promise<void> => {
		await tick();
		(resultsPaginationRegion ?? resultsRegion)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	};

	const navigateResultsPage = async (page: number): Promise<void> => {
		const nextPage = Math.min(Math.max(1, page), resultPageCount);
		if (nextPage === resultsPage) return;
		visiblePreviewRequestId += 1;
		resultsPage = nextPage;
		await scrollToResults();
		prefetchResultsPage(nextPage, 'top');
	};

	const exportCurrentSearch = async (): Promise<void> => {
		if (!lastSubmittedSearch || !searchExecution) return;
		exportError = '';
		isExporting = true;
		try {
			const blob = await postBlob('/api/texoro/export.xlsx', {
				query: lastSubmittedSearch.query,
				structuredQuery: lastSubmittedSearch.structuredQuery,
				terms: lastSubmittedSearch.terms,
				filters: lastSubmittedSearch.filters
			});
			const downloadUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			const stamp = formatDownloadStamp(new Date());
			anchor.href = downloadUrl;
			anchor.download = `texoro-resultados-${stamp}.xlsx`;
			document.body.append(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(downloadUrl);
		} catch (cause) {
			exportError = cause instanceof Error ? cause.message : 'No se pudo exportar la búsqueda';
		} finally {
			isExporting = false;
		}
	};

	const canPrimeCurrentQuery = (): boolean => {
		const trimmedMain = mainQuery.trim();
		if (!trimmedMain || !QUERY_ALLOWED_PATTERN.test(trimmedMain)) return false;
		if (trimmedMain.replace(/[*?\s]/g, '').length < 3) return false;
		for (const term of additionalTerms) {
			const trimmed = term.value.trim();
			if (trimmed && !QUERY_ALLOWED_PATTERN.test(trimmed)) return false;
		}
		for (const term of proximityTerms) {
			const trimmed = term.value.trim();
			if (trimmed && !QUERY_ALLOWED_PATTERN.test(trimmed)) return false;
		}
		return true;
	};

	$effect(() => {
		const signature = visiblePreviewSignature;
		if (!searchExecution || isSearching || !signature || visibleResults.length === 0) {
			return;
		}
		prefetchResultsPage(resultsPage, 'top');
	});

	$effect(() => {
		const filters = buildCurrentSearchFilters();
		const primeSignature = [
			mainQuery,
			additionalMode,
			...additionalTerms.map((term) => term.value),
			proximityMode,
			...proximityTerms.map((term) => `${term.order}:${term.distance}:${term.value}`),
			...filters.titleIds,
			...filters.genres,
			...filters.traditionalAuthorIds,
			filters.traditionalMatch,
			...filters.stylometryAuthorIds,
			filters.stylometryMatch,
			...filters.states
		].join('\u0001');
		if (
			!primeSignature ||
			isSearching ||
			!canPrimeCurrentQuery()
		) {
			return;
		}

		const timer = window.setTimeout(() => {
			const { query, structuredQuery } = buildEffectiveQuery();
			const shouldPrefetchTexts =
				/\s/.test(mainQuery.trim()) ||
				additionalTerms.some((term) => term.value.trim()) ||
				proximityTerms.some((term) => term.value.trim());
			void initializeTexoroWorker()
				.then(() => {
					if (!isTexoroClientWorkerReady()) return;
					return requestTexoroClientWorker<void>({
						action: 'prime',
						query,
						structuredQuery,
						options: buildSearchFilterOptions(filters),
						wildcard: /[*?]/.test(query),
						prefetchTexts: shouldPrefetchTexts,
						textLimit: shouldPrefetchTexts ? 8 : undefined
					});
				})
				.catch((cause) => {
					console.warn('[texoro] prime failed', cause);
				});
		}, TEXORO_PRIME_DEBOUNCE_MS);

		return () => {
			window.clearTimeout(timer);
		};
	});

	$effect(() => {
		additionalMode;
		additionalModeAllButton;
		additionalModeAnyButton;
		additionalModeGlobalAnyButton;
		void updateAdditionalModePill();
	});

	$effect(() => {
		proximityMode;
		proximityModeAllButton;
		proximityModeAnyButton;
		void updateProximityModePill();
	});

	onMount(() => {
		let initDelayTimer = 0;
		let initIdleHandle = 0;
		let warmupIdleHandle = 0;
		const idleWindow = window as Window & {
			requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
			cancelIdleCallback?: (handle: number) => void;
		};
		const scheduleIdle = (callback: () => void, timeout = 2000): number => {
			if (idleWindow.requestIdleCallback) {
				return idleWindow.requestIdleCallback(callback, { timeout });
			}
			return window.setTimeout(callback, 0);
		};
		const cancelIdle = (handle: number): void => {
			if (!handle) return;
			if (idleWindow.cancelIdleCallback) {
				idleWindow.cancelIdleCallback(handle);
				return;
			}
			globalThis.clearTimeout(handle);
		};
		const handleResize = (): void => {
			void updateAdditionalModePill();
			void updateProximityModePill();
		};
		const onDocumentClick = (event: MouseEvent): void => {
			if (!openTextDropdownDocId) return;
			const target = event.target as HTMLElement | null;
			if (!target) {
				closeTextDropdown();
				return;
			}
			if (target.closest('.texoro-textos-dropdown-wrapper')) return;
			if (target.closest('.texoro-textos-dropdown')) return;
			closeTextDropdown();
		};
		const onEscape = (event: KeyboardEvent): void => {
			if (event.key !== 'Escape') return;
			closeTextDropdown();
		};
		window.addEventListener('resize', handleResize);
		document.addEventListener('click', onDocumentClick);
		document.addEventListener('keydown', onEscape);
		void updateAdditionalModePill();
		void updateProximityModePill();
		void loadTexoroStats();
		initDelayTimer = window.setTimeout(() => {
			initIdleHandle = scheduleIdle(() => {
				void initializeTexoroWorker().then(() => {
					if (!isTexoroClientWorkerReady()) return;
					warmupIdleHandle = scheduleIdle(() => {
						void requestTexoroClientWorker<void>({ action: 'warmup' }).catch((cause) => {
							console.warn('[texoro] warmup failed', cause);
						});
					}, 2500);
				});
			}, 2500);
		}, 2500);

		return () => {
			window.removeEventListener('resize', handleResize);
			document.removeEventListener('click', onDocumentClick);
			document.removeEventListener('keydown', onEscape);
			if (initDelayTimer) window.clearTimeout(initDelayTimer);
			cancelIdle(initIdleHandle);
			cancelIdle(warmupIdleHandle);
			releaseTexoroClientWorker();
		};
	});

	const submitSearch = async (event: SubmitEvent): Promise<void> => {
		event.preventDefault();
		searchError = '';
		exportError = '';
		searchExecution = null;
		resultsPage = 1;
		isPreparingResults = false;
		submittedTerms = [];
		lastSubmittedSearch = null;
		occurrencePreviews = new Map();
		previewLoadsByDocId = new Map();
		queuedPreviewDocIds = new Set();
		occurrenceDetailsCache = new Map();
		occurrenceDetailsLoads = new Map();
		closeTextDropdown();
		openingOccurrenceKey = null;
		previewRequestVersion += 1;
		chartCopyPending = { author: false, genre: false };
		const mainValidationError = validateSearchTerm(mainQuery, 'Búsqueda principal');
		if (mainValidationError) {
			searchError = mainValidationError;
			return;
		}

		let nonEmptyAdvancedTerms = 0;
		for (let index = 0; index < additionalTerms.length; index += 1) {
			const term = additionalTerms[index];
			if (!term.value.trim()) continue;
			nonEmptyAdvancedTerms += 1;
			const validationError = validateSearchTerm(term.value, `Término adicional ${index + 1}`);
			if (validationError) {
				searchError = validationError;
				return;
			}
		}
		for (let index = 0; index < proximityTerms.length; index += 1) {
			const term = proximityTerms[index];
			if (!term.value.trim()) continue;
			nonEmptyAdvancedTerms += 1;
			const validationError = validateSearchTerm(term.value, `Proximidad ${index + 1}`);
			if (validationError) {
				searchError = validationError;
				return;
			}
		}

		if (1 + nonEmptyAdvancedTerms > MAX_QUERY_TERMS) {
			searchError = `La consulta admite un máximo de ${MAX_QUERY_TERMS} términos en total.`;
			return;
		}

		const { query, terms, structuredQuery } = buildEffectiveQuery();
		const filters = buildCurrentSearchFilters();
		const requestId = ++searchRequestId;
		visiblePreviewRequestId += 1;
		isSearching = true;
		isPreparingResults = false;
		try {
			const execution = await runBrowserFirstSearch(query, structuredQuery, filters);
			if (requestId !== searchRequestId) return;
			submittedTerms = terms;
			lastSubmittedSearch = { query, structuredQuery, terms, filters };
			searchExecution = execution;
			void tick().then(() => {
				if (requestId !== searchRequestId) return;
				prefetchResultsPage(1, 'top');
			});
		} catch (cause) {
			submittedTerms = [];
			lastSubmittedSearch = null;
			searchError = cause instanceof Error ? cause.message : 'Error ejecutando la búsqueda';
		} finally {
			if (requestId === searchRequestId) {
				isSearching = false;
				isPreparingResults = false;
			}
		}
	};
</script>

{#snippet resultMetadataBlock(meta: TexoroWorkMeta, metadataTitle: string)}
	<div
		class="grid min-w-0 max-w-full grid-cols-1 gap-2 font-['Roboto',sans-serif] sm:flex sm:flex-wrap sm:items-start sm:gap-x-4 sm:gap-y-1 md:gap-x-5"
		title={metadataTitle}
	>
		<div class="grid min-w-0 max-w-full content-start">
			<p class="m-0 text-[0.68rem] leading-[1.2] font-semibold uppercase text-text-accent-purple">
				Atribución tradicional
			</p>
			<p class="m-0 text-[0.86rem] leading-[1.2] text-text-main">
				{formatCompactAttribution(meta.traditionalAttribution)}
			</p>
		</div>
		<div class="grid min-w-0 max-w-full content-start">
			<p class="m-0 text-[0.68rem] leading-[1.2] font-semibold uppercase text-text-accent-purple">
				Atribución estilométrica
			</p>
			<p class="m-0 text-[0.86rem] leading-[1.2] text-text-main">
				{formatCompactAttribution(meta.stylometryAttribution)}
			</p>
		</div>
		<div class="grid min-w-0 max-w-full content-start">
			<p class="m-0 text-[0.68rem] leading-[1.2] font-semibold uppercase text-text-accent-purple">
				Género
			</p>
			<p class="m-0 text-[0.86rem] leading-[1.2] text-text-main">
				{meta.genre.trim() || 'Sin género'}
			</p>
		</div>
		<div class="grid min-w-0 max-w-full content-start">
			<p class="m-0 text-[0.68rem] leading-[1.2] font-semibold uppercase text-text-accent-purple">
				Estado del texto
			</p>
			<p class="m-0 text-[0.86rem] leading-[1.2] text-text-main">
				{meta.textState.trim() || 'Sin estado'}
			</p>
		</div>
	</div>
{/snippet}

{#snippet resultTextAccessControl(docId: number, textLinks: TexoroWorkMeta['textLinks'])}
	<div class="texoro-textos-dropdown-wrapper relative w-full max-w-full sm:w-auto">
		{#if textLinks.length > 0}
			<button
				type="button"
				class="grid max-w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-[8px] border border-border-accent-blue bg-white px-[10px] py-2 text-left font-['Roboto',sans-serif] text-[12px] font-normal text-text-main transition-all hover:bg-surface-accent-blue focus:outline-3 focus:outline-brand-blue/15 focus:outline-offset-1"
				aria-haspopup="true"
				aria-expanded={openTextDropdownDocId === docId ? 'true' : 'false'}
				title="Acceso al texto"
				onclick={(event) => toggleTextDropdown(event, docId)}
			>
				<span class="inline-flex h-[14px] w-[14px] flex-none items-center justify-center text-brand-blue-dark" aria-hidden="true">
					<FolderOpen class="h-[14px] w-[14px] stroke-[2.1]" />
				</span>
				<span class="block overflow-hidden text-ellipsis whitespace-nowrap leading-[1.2] text-[0.82rem]">Acceso al texto</span>
				{#if openTextDropdownDocId === docId}
					<span class="inline-flex h-[13px] w-[13px] items-center justify-center text-text-soft" aria-hidden="true">
						<ChevronDown class="h-[13px] w-[13px] stroke-[2.2]" />
					</span>
				{:else}
					<span class="inline-flex h-[13px] w-[13px] items-center justify-center text-text-soft" aria-hidden="true">
						<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
					</span>
				{/if}
			</button>
			{#if openTextDropdownDocId === docId}
				<div
					class="texoro-textos-dropdown absolute left-0 top-[calc(100%+4px)] z-20 max-h-[min(300px,calc(100vh-24px))] w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto rounded-[8px] border border-border-accent-blue bg-white p-1.5 font-['Roboto',sans-serif] shadow-[0_10px_28px_rgba(7,36,110,0.16)] sm:left-auto sm:right-0 sm:w-auto sm:min-w-[220px] sm:max-w-[320px]"
				>
					{#each textLinks as link}
						<a
							href={link.href}
							data-sveltekit-preload-data={link.kind === 'bicuve' ? 'off' : undefined}
							class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-[6px] px-2.5 py-[9px] text-[12px] font-normal text-text-main no-underline transition-all hover:bg-surface-accent-blue hover:text-text-main hover:no-underline focus:bg-surface-accent-blue focus:text-text-main focus:no-underline focus:outline-none focus-visible:bg-surface-accent-blue focus-visible:text-text-main focus-visible:no-underline focus-visible:outline-none"
							target="_blank"
							rel="noopener noreferrer"
						>
							<span class="inline-flex h-[14px] w-[14px] flex-none items-center justify-center text-brand-blue-dark" aria-hidden="true">
								{#if link.kind === 'bicuve'}
									<BookOpen class="h-[14px] w-[14px] stroke-[2.1]" />
								{:else}
									<ExternalLink class="h-[14px] w-[14px] stroke-[2.1]" />
								{/if}
							</span>
							<span class="block min-w-0 whitespace-normal break-words leading-[1.35]">{link.label}</span>
							<span class="mt-[2px] inline-flex h-3 w-3 flex-none items-center justify-center text-text-soft" aria-hidden="true">
								<ChevronRight class="h-3 w-3 stroke-[2.1]" />
							</span>
						</a>
					{/each}
				</div>
			{/if}
		{:else}
			<span
				class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-[8px] border border-[rgba(91,111,132,0.22)] bg-[#f8f9fb] px-[10px] py-2 text-left font-['Roboto',sans-serif] text-[12px] font-normal text-[rgba(73,90,108,0.62)] opacity-[0.78]"
				aria-disabled="true"
				title="Sin acceso al texto"
			>
				<span class="inline-flex h-[14px] w-[14px] flex-none items-center justify-center text-[rgba(114,130,145,0.75)]" aria-hidden="true">
					<FolderOpen class="h-[14px] w-[14px] stroke-[2.1]" />
				</span>
				<span class="block overflow-hidden text-ellipsis whitespace-nowrap leading-[1.2] text-[0.82rem]">Acceso al texto</span>
				<span class="inline-flex h-[13px] w-[13px] items-center justify-center text-[rgba(114,130,145,0.75)]" aria-hidden="true">
					<ChevronRight class="h-[13px] w-[13px] stroke-[2.2]" />
				</span>
			</span>
		{/if}
	</div>
{/snippet}

{#snippet resultMetaDisclosure(meta: TexoroWorkMeta | null | undefined, metadataLine: string, docId: number, textLinks: TexoroWorkMeta['textLinks'])}
	<details class="texoro-result-disclosure group min-w-0 max-w-full">
		<summary class="flex w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-[8px] px-0 py-0.5 font-['Roboto',sans-serif] text-[0.78rem] font-semibold text-text-soft transition hover:text-brand-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue/20">
			<span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">Metadatos y acceso al texto</span>
			<ChevronDown class="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
		</summary>
		<div class="mt-2 grid min-w-0 max-w-full gap-3">
			{#if meta}
				{@render resultMetadataBlock(meta, metadataLine)}
			{:else}
				<p class="m-0 text-[0.86rem] leading-[1.35] text-text-soft">{metadataLine}</p>
			{/if}
			<div class="flex min-w-0 max-w-full justify-start">
				{@render resultTextAccessControl(docId, textLinks)}
			</div>
		</div>
	</details>
{/snippet}

<div class="grid gap-6">
	<Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'TEXORO' }]} />

	<FeatureHeroSection
		eyebrow=""
		title="TEXORO"
		subtitle="Búsquedas textuales en 3000 obras del Siglo de Oro"
		backgroundImage={fondoLogo}
		statsAriaLabel="Indicadores de TEXORO"
		statsLayout="three"
	>
		<p class="mt-[1.8rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-text-main">
			TEXORO es una plataforma de búsqueda textual que permite consultar de forma unificada un amplio corpus de obras del Siglo de Oro. El recurso reúne cerca de 3000 textos, con más de 38 millones de palabras indexadas y obras de más de 400 autores, y ofrece distintas posibilidades para explorar el patrimonio literario aurisecular desde criterios léxicos, textuales y documentales.
		</p>
		<p class="mt-[1.25rem] mb-0 max-w-[64ch] font-['Lora',serif] text-[1.01rem] leading-[1.62] text-text-main">
			El buscador permite localizar palabras, frases exactas y patrones con comodines, así como realizar consultas avanzadas mediante la combinación de términos, condiciones de proximidad y filtros por título, género, atribución tradicional, atribución estilométrica o estado del texto. De este modo, TEXORO facilita tanto búsquedas puntuales como exploraciones más complejas sobre la presencia, distribución y relación de palabras o expresiones en el conjunto del corpus.
		</p>
		<div class="mt-[1.25rem]">
			<AppButton
				type="button"
				variant="secondary"
				className="!h-[38px] !rounded-[10px] !px-4 !py-1.5 font-['Roboto',sans-serif] text-[0.83rem] font-semibold"
				onclick={() => (infoModalOpen = true)}
			>
				Guía de búsqueda
			</AppButton>
		</div>

		{#snippet stats()}
			<HeroStatCard
				Icon={BookOpen}
				value={numberFormatter.format(displayIndexStats?.works ?? 0)}
				label="Obras indexadas"
				desktopOffset="up"
				loading={isStatsLoading || !displayIndexStats}
			/>

			<HeroStatCard
				Icon={Search}
				value={numberFormatter.format(displayIndexStats?.tokens ?? 0)}
				label="Palabras indexadas"
				desktopOffset="down"
				loading={isStatsLoading || !displayIndexStats}
			/>

			<HeroStatCard
				Icon={Feather}
				value={numberFormatter.format(statsPayload?.authors ?? 0)}
				label="Autores"
				desktopOffset="up"
				loading={isStatsLoading || !statsPayload}
			/>
		{/snippet}
	</FeatureHeroSection>

	<section class="rounded-[14px] p-5 font-['Roboto',sans-serif]">
		<h2 class="m-0 font-['Roboto',sans-serif] text-[1.45rem] font-bold text-brand-blue-dark">Buscar en TEXORO</h2>
		<p class="mt-2 mb-0 text-[0.98rem] text-text-soft">
			Busca una palabra, frase exacta o patrón con comodines <code>*</code> y <code>?</code>. Si escribes varias
			palabras, se buscan como frase exacta.
		</p>

		<form class="mt-5 grid gap-4" onsubmit={submitSearch}>
			<div class="grid gap-4">
				<div class="relative">
					<input
						type="search"
						bind:value={mainQuery}
						placeholder="Ejemplos: amor | amor constante | honor*"
						class="h-[46px] w-full appearance-none rounded-[10px] border border-border bg-white py-2 pr-12 pl-11 text-[15px] text-text-main outline-none shadow-none transition focus:border-brand-blue/35 focus:shadow-none focus:outline-none focus-visible:border-brand-blue/35 focus-visible:outline-none"
					/>
					<span class="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-text-accent-purple">
						<Search class="h-4.5 w-4.5" />
					</span>
					<button
						type="submit"
						class="absolute inset-y-1.5 right-1.5 inline-flex w-9 items-center justify-center rounded-[8px] border-0 bg-surface-accent-blue text-brand-blue-dark transition hover:bg-border-accent-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue/25 disabled:cursor-not-allowed disabled:opacity-55"
						aria-label={isPreparingResults ? 'Preparando resultados' : isSearching ? 'Buscando' : 'Buscar'}
						title={isPreparingResults ? 'Preparando resultados' : isSearching ? 'Buscando' : 'Buscar'}
						disabled={isSearching || isPreparingResults}
					>
						{#if isSearching || isPreparingResults}
							<LoaderCircle class="h-4 w-4 animate-spin" aria-hidden="true" />
						{:else}
							<CornerDownLeft class="h-4.5 w-4.5" aria-hidden="true" />
						{/if}
					</button>
				</div>
			</div>

			<p class="m-0 text-[0.84rem] text-text-soft">
				Para combinar varios términos o buscar cercanías, abre la búsqueda avanzada.
			</p>

			<div
				class={`rounded-[10px] border border-border/70 bg-[var(--color-surface-subtle)] transition-[background-color,box-shadow] duration-200 ${
					advancedSearchOpen ? 'overflow-visible shadow-[0_8px_24px_rgba(25,46,80,0.06)]' : 'overflow-hidden'
				}`}
			>
				<button
					type="button"
					class="flex w-full items-center justify-between gap-3 border-0 bg-transparent px-4 py-3 text-left font-['Roboto',sans-serif] text-[0.92rem] font-semibold text-brand-blue-dark transition hover:rounded-[10px] hover:bg-surface-accent-blue"
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
					class={`border-t px-4 transition-[max-height,padding,opacity] duration-300 ease-out ${
						advancedSearchOpen
							? 'max-h-[2200px] overflow-visible border-border-accent-blue py-5 opacity-100'
							: 'max-h-0 border-transparent py-0 opacity-0'
					}`}
				>
					<p class="m-0 text-[0.86rem] leading-[1.5] text-text-soft">
						Añade términos y condiciones de cercanía sin escribir operadores. El límite total es de {MAX_QUERY_TERMS}
						condiciones contando la búsqueda principal.
					</p>

					<div class="mt-5 grid gap-6">
						<div class="grid gap-3">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h3 class="m-0 font-['Roboto',sans-serif] text-[0.98rem] font-semibold text-brand-blue-dark">
										Términos adicionales
									</h3>
									<p class="mt-1 mb-0 text-[0.82rem] text-text-soft">
										Cada término puede ser una palabra, frase o patrón.
									</p>
								</div>
								<div
									role="group"
									aria-label="Modo de combinación de términos adicionales"
									class="relative grid w-full min-w-0 max-w-full grid-cols-1 rounded-[12px] bg-surface-soft p-1 sm:w-auto sm:grid-cols-[auto_auto_auto] sm:rounded-full"
								>
									<span
										class={additionalModePillIndicatorClass}
										style={additionalModePillStyle}
										aria-hidden="true"
									></span>
									<button
										type="button"
										bind:this={additionalModeAllButton}
										class={`${modePillButtonClass} ${additionalMode === 'all' ? 'text-brand-blue-dark max-sm:bg-white max-sm:shadow-soft' : 'text-text-soft hover:text-brand-blue-dark'}`}
										onclick={(event) => setAdditionalMode(event, 'all')}
									>
										Principal + adicionales
									</button>
									<button
										type="button"
										bind:this={additionalModeAnyButton}
										class={`${modePillButtonClass} ${additionalMode === 'any' ? 'text-brand-blue-dark max-sm:bg-white max-sm:shadow-soft' : 'text-text-soft hover:text-brand-blue-dark'}`}
										onclick={(event) => setAdditionalMode(event, 'any')}
									>
										Principal + algún adicional
									</button>
									<button
										type="button"
										bind:this={additionalModeGlobalAnyButton}
										class={`${modePillButtonClass} ${additionalMode === 'globalAny' ? 'text-brand-blue-dark max-sm:bg-white max-sm:shadow-soft' : 'text-text-soft hover:text-brand-blue-dark'}`}
										onclick={(event) => setAdditionalMode(event, 'globalAny')}
									>
										Cualquiera
									</button>
								</div>
							</div>

							{#if additionalTerms.length === 0}
								<button
									type="button"
									class="rounded-[9px] border border-dashed border-border-accent-blue bg-surface px-3 py-2 text-left text-[0.78rem] font-semibold text-text-soft transition hover:bg-surface-accent-blue hover:text-text-main disabled:cursor-not-allowed disabled:opacity-55"
									disabled={additionalTerms.length + proximityTerms.length >= MAX_QUERY_TERMS - 1}
									onclick={addAdditionalTerm}
								>
									Añadir términos adicionales
								</button>
							{:else}
								{#each additionalTerms as term, index}
									<div class="grid gap-2 rounded-[10px] bg-surface-soft p-2 md:bg-transparent md:p-0 md:grid-cols-[minmax(0,1fr)_auto]">
										<div class="flex items-center justify-between gap-2 md:hidden">
											<span class="font-['Roboto',sans-serif] text-[0.76rem] font-semibold text-text-soft">
												Término adicional {index + 1}
											</span>
											<button
												type="button"
												class="rounded-[8px] border-0 bg-transparent px-2 py-1 text-[0.76rem] font-semibold text-text-soft transition hover:bg-[#fff5f7] hover:text-[#8f1e36]"
												onclick={() => removeAdditionalTerm(term.id)}
											>
												Eliminar
											</button>
										</div>
										<label class="sr-only" for={`additional-query-${term.id}`}>Término adicional</label>
										<input
											id={`additional-query-${term.id}`}
											type="search"
											value={term.value}
											placeholder="Ej: honra | honra constante | desdich?"
											class="h-[42px] rounded-[10px] border border-border bg-white px-3 text-[15px] text-text-main outline-none transition focus:border-brand-blue/35"
											oninput={(event) =>
												updateAdditionalTermValue(term.id, (event.currentTarget as HTMLInputElement).value)}
										/>
										<button
											type="button"
											class="hidden h-[42px] rounded-[10px] border border-border bg-white px-3 text-[0.84rem] font-semibold text-text-soft transition hover:border-[#d7b5bf] hover:bg-[#fff5f7] hover:text-[#8f1e36] md:block"
											onclick={() => removeAdditionalTerm(term.id)}
										>
											Eliminar
										</button>
									</div>
								{/each}

								<div class="grid gap-2">
									<button
										type="button"
										class="rounded-[9px] border border-dashed border-border-accent-blue bg-surface px-3 py-2 text-left text-[0.78rem] font-semibold text-text-soft transition hover:bg-surface-accent-blue hover:text-text-main disabled:cursor-not-allowed disabled:opacity-55"
										disabled={additionalTerms.length + proximityTerms.length >= MAX_QUERY_TERMS - 1}
										onclick={addAdditionalTerm}
									>
										Añadir términos adicionales
									</button>
									<p class="m-0 text-[0.82rem] text-text-soft">
										Condiciones activas: {activeSearchTermCount}/{MAX_QUERY_TERMS}
									</p>
								</div>
							{/if}
						</div>

						<div class="grid gap-3 border-t border-border-accent-blue pt-5">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h3 class="m-0 font-['Roboto',sans-serif] text-[0.98rem] font-semibold text-brand-blue-dark">
										Proximidad respecto a la búsqueda principal
									</h3>
									<p class="mt-1 mb-0 text-[0.82rem] text-text-soft">
										Busca términos cercanos a la palabra o frase principal.
									</p>
								</div>
								<div
									role="group"
									aria-label="Modo de combinación de condiciones de proximidad"
									class="relative grid w-full min-w-0 max-w-full grid-cols-1 rounded-[12px] bg-surface-soft p-1 sm:w-auto sm:grid-cols-[auto_auto] sm:rounded-full"
								>
									<span
										class={modePillIndicatorClass}
										style={proximityModePillStyle}
										aria-hidden="true"
									></span>
									<button
										type="button"
										bind:this={proximityModeAllButton}
										class={`${modePillButtonClass} ${proximityMode === 'all' ? 'text-brand-blue-dark max-sm:bg-white max-sm:shadow-soft' : 'text-text-soft hover:text-brand-blue-dark'}`}
										onclick={(event) => setProximityMode(event, 'all')}
									>
										Todas las condiciones
									</button>
									<button
										type="button"
										bind:this={proximityModeAnyButton}
										class={`${modePillButtonClass} ${proximityMode === 'any' ? 'text-brand-blue-dark max-sm:bg-white max-sm:shadow-soft' : 'text-text-soft hover:text-brand-blue-dark'}`}
										onclick={(event) => setProximityMode(event, 'any')}
									>
										Basta con una
									</button>
								</div>
							</div>

							{#if proximityTerms.length === 0}
								<button
									type="button"
									class="rounded-[9px] border border-dashed border-border-accent-blue bg-surface px-3 py-2 text-left text-[0.78rem] font-semibold text-text-soft transition hover:bg-surface-accent-blue hover:text-text-main disabled:cursor-not-allowed disabled:opacity-55"
									disabled={additionalTerms.length + proximityTerms.length >= MAX_QUERY_TERMS - 1}
									onclick={addProximityTerm}
								>
									Añadir términos de distancia
								</button>
							{:else}
								{#each proximityTerms as term, index}
									<div class="grid gap-2 rounded-[10px] bg-surface-soft p-2 md:bg-transparent md:p-0 md:grid-cols-[minmax(0,1fr)_112px_150px_auto]">
										<div class="flex items-center justify-between gap-2 md:hidden">
											<span class="font-['Roboto',sans-serif] text-[0.76rem] font-semibold text-text-soft">
												Proximidad {index + 1}
											</span>
											<button
												type="button"
												class="rounded-[8px] border-0 bg-transparent px-2 py-1 text-[0.76rem] font-semibold text-text-soft transition hover:bg-[#fff5f7] hover:text-[#8f1e36]"
												onclick={() => removeProximityTerm(term.id)}
											>
												Eliminar
											</button>
										</div>
										<label class="sr-only" for={`proximity-query-${term.id}`}>Término cercano</label>
										<input
											id={`proximity-query-${term.id}`}
											type="search"
											value={term.value}
											placeholder="Término cercano"
											class="h-[42px] rounded-[10px] border border-border bg-white px-3 text-[15px] text-text-main outline-none transition focus:border-brand-blue/35"
											oninput={(event) =>
												updateProximityTermValue(term.id, (event.currentTarget as HTMLInputElement).value)}
										/>
										<label class="sr-only" for={`proximity-distance-${term.id}`}>Distancia máxima</label>
										<input
											id={`proximity-distance-${term.id}`}
											type="number"
											min="0"
											max="100"
											value={term.distance}
											title="Distancia máxima en palabras intermedias"
											class="h-[42px] rounded-[10px] border border-border bg-white px-3 text-[15px] text-text-main outline-none transition focus:border-brand-blue/35"
											oninput={(event) =>
												updateProximityTermDistance(term.id, Number((event.currentTarget as HTMLInputElement).value))}
										/>
										<label class="sr-only" for={`proximity-order-${term.id}`}>Orden</label>
										<select
											id={`proximity-order-${term.id}`}
											class="h-[42px] rounded-[10px] border border-border bg-white px-3 text-[15px] text-text-main outline-none transition focus:border-brand-blue/35"
											value={term.order}
											onchange={(event) =>
												updateProximityTermOrder(
													term.id,
													(event.currentTarget as HTMLSelectElement).value as SearchProximityOrder
												)}
										>
											<option value="any">Cualquiera</option>
											<option value="after">Después</option>
											<option value="before">Antes</option>
										</select>
										<button
											type="button"
											class="hidden h-[42px] rounded-[10px] border border-border bg-white px-3 text-[0.84rem] font-semibold text-text-soft transition hover:border-[#d7b5bf] hover:bg-[#fff5f7] hover:text-[#8f1e36] md:block"
											onclick={() => removeProximityTerm(term.id)}
										>
											Eliminar
										</button>
									</div>
								{/each}

								<div class="grid gap-2">
									<button
										type="button"
										class="rounded-[9px] border border-dashed border-border-accent-blue bg-surface px-3 py-2 text-left text-[0.78rem] font-semibold text-text-soft transition hover:bg-surface-accent-blue hover:text-text-main disabled:cursor-not-allowed disabled:opacity-55"
										disabled={additionalTerms.length + proximityTerms.length >= MAX_QUERY_TERMS - 1}
										onclick={addProximityTerm}
									>
										Añadir términos de distancia
									</button>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<div
				class={`rounded-[10px] border border-border/70 bg-[var(--color-surface-subtle)] transition-[background-color,box-shadow] duration-200 ${
					filtersOpen ? 'overflow-visible shadow-[0_8px_24px_rgba(25,46,80,0.06)]' : 'overflow-hidden'
				}`}
			>
				<button
					type="button"
					class="flex w-full items-center justify-between gap-3 border-0 bg-transparent px-4 py-3 text-left font-['Roboto',sans-serif] text-[0.92rem] font-semibold text-brand-blue-dark transition hover:rounded-[10px] hover:bg-surface-accent-blue"
					aria-expanded={filtersOpen}
					onclick={() => {
						const nextOpen = !filtersOpen;
						filtersOpen = nextOpen;
						if (nextOpen) void ensureTexoroOptionsLoaded();
					}}
				>
					<span>Filtros</span>
					<span class={`inline-flex items-center justify-center transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} aria-hidden="true">
						<ChevronDown class="h-[15px] w-[15px] stroke-[2.2]" />
					</span>
				</button>

				<div
					class={`border-t px-4 transition-[max-height,padding,opacity] duration-300 ease-out ${
						filtersOpen
							? 'max-h-[1600px] overflow-visible border-border-accent-blue py-5 opacity-100'
							: 'max-h-0 border-transparent py-0 opacity-0'
					}`}
				>
					<div class="grid gap-6">
						<div class="grid gap-5 md:grid-cols-2">
							<TokenMultiSelect
								name="texoro-title"
								label="Título"
								placeholder="Escribe y selecciona títulos"
								options={titleOptions}
								selectedIds={selectedTitleIds}
								helpText="Selecciona una o varias obras para limitar la búsqueda textual a esos títulos."
								inputClass="js-static-multiselect"
								onIntent={() => {
									void ensureTexoroOptionsLoaded();
								}}
								onChange={(nextIds) => {
									selectedTitleIds = nextIds;
								}}
							/>

							<TokenMultiSelect
								name="texoro-genero"
								label="Género"
								placeholder="Escribe y selecciona géneros"
								options={genreOptions}
								selectedIds={selectedGenres}
								helpText="Selecciona uno o varios géneros para limitar los resultados."
								inputClass="js-static-multiselect"
								onIntent={() => {
									void ensureTexoroOptionsLoaded();
								}}
								onChange={(nextIds) => {
									selectedGenres = nextIds;
								}}
							/>
						</div>

						<div class="grid gap-5 md:grid-cols-2">
							<div class="flex flex-col gap-4 rounded-[8px] border border-border bg-[var(--color-surface-subtle)] p-4">
								<TokenMultiSelect
									name="texoro-traditional-attribution"
									label="Atribución tradicional"
									placeholder="Escribe y selecciona autores"
									options={authorOptions}
									selectedIds={selectedTradAuthors}
									helpText="Autores propuestos por la tradición filológica."
									inputClass="js-author-multiselect"
									onIntent={() => {
										void ensureTexoroOptionsLoaded();
									}}
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

							<div class="flex flex-col gap-4 rounded-[8px] border border-border bg-[var(--color-surface-subtle)] p-4">
								<TokenMultiSelect
									name="texoro-stylometry-attribution"
									label="Atribución estilometría"
									placeholder="Escribe y selecciona autores"
									options={authorOptions}
									selectedIds={selectedEstoAuthors}
									helpText="Autores sugeridos por el análisis estilométrico."
									inputClass="js-author-multiselect"
									onIntent={() => {
										void ensureTexoroOptionsLoaded();
									}}
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
							onIntent={() => {
								void ensureTexoroOptionsLoaded();
							}}
							onChange={(nextIds) => {
								selectedStates = nextIds;
							}}
						/>
					</div>
				</div>
			</div>

			{#if interpretedQuery}
				<div class="rounded-[10px] bg-surface-soft px-4 py-3">
					<p class="m-0 font-['Roboto',sans-serif] text-[0.84rem] font-semibold text-brand-blue-dark">Consulta interpretada</p>
					<p class="mt-1 mb-0 text-[0.9rem] leading-[1.75] text-text-main">
						{#each interpretedQuery.summaryParts as part}
							{#if part.kind === 'term'}
								<span class={interpretedQueryTermClass} title={part.value}>{part.value}</span>
							{:else}
								<span>{part.value}</span>
							{/if}
						{/each}
					</p>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
				<AppButton
					href="/texoro"
					variant="secondary"
					className="!h-[40px] !min-w-0 !w-full !rounded-[10px] !border-transparent !px-3 !py-2 font-['Roboto',sans-serif] text-[0.86rem] font-semibold tracking-[0.02em] shadow-none sm:!min-w-[136px] sm:!w-auto sm:!px-5 sm:text-[0.9rem]"
					onclick={(event) => {
						event.preventDefault();
						resetSearchControls();
					}}
				>
					Limpiar campos
				</AppButton>
				<AppButton
					type="submit"
					variant="primary"
					disabled={isSearching || isPreparingResults}
					className="!h-[40px] !min-w-0 !w-full gap-2 !rounded-[10px] !px-3 !py-2 font-['Roboto',sans-serif] text-[0.86rem] font-semibold tracking-[0.02em] sm:!min-w-[136px] sm:!w-auto sm:!px-5 sm:text-[0.9rem]"
				>
					{#if isSearching || isPreparingResults}
						<LoaderCircle class="h-4.5 w-4.5 animate-spin" />
						Buscando...
					{:else}
						Buscar
					{/if}
				</AppButton>
			</div>
		</form>

		{#if searchError}
			<p class="mt-3 mb-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.92rem] text-[#8f1e36]">{searchError}</p>
		{/if}

		{#if (isSearching || isPreparingResults) && !searchExecution}
			<div
				id="texoro-resultados"
				bind:this={resultsRegion}
				class="mt-14 flex scroll-mt-6 items-center gap-3 rounded-[12px] border border-border-accent-blue bg-white px-4 py-5 text-brand-blue-dark shadow-[0_6px_16px_rgba(25,46,80,0.07)]"
				aria-live="polite"
				aria-busy="true"
			>
				<LoaderCircle class="h-5 w-5 animate-spin" aria-hidden="true" />
				<p class="m-0 font-['Roboto',sans-serif] text-[0.95rem] font-semibold">
					{isPreparingResults ? 'Preparando resultados y contextos...' : 'Buscando en TEXORO...'}
				</p>
			</div>
		{/if}

		{#if searchExecution}
			<div
				id="texoro-resultados"
				bind:this={resultsRegion}
				class="mt-14 grid scroll-mt-6 gap-4"
				aria-live="polite"
			>
				<div class="flex flex-wrap items-center justify-between gap-3 max-md:flex-col max-md:justify-center max-md:text-center">
					<div class="max-md:w-full">
						<h2 class="m-0 font-['Roboto',sans-serif] text-[1.45rem] font-bold text-brand-blue-dark">
							Resultados de búsqueda
						</h2>
					</div>
					<AppButton
						type="button"
						variant="secondary"
						disabled={isExporting || isPreparingResults || !lastSubmittedSearch || filteredResults.length === 0}
						className="!h-[40px] !rounded-[10px] !px-4 !py-2 font-['Roboto',sans-serif] text-[0.88rem] font-semibold max-md:!mx-auto"
						title="Exportar resultados filtrados"
						onclick={() => {
							void exportCurrentSearch();
						}}
					>
						{#if isExporting}
							<LoaderCircle class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
							Exportando...
						{:else}
							<Download class="mr-2 h-4 w-4" aria-hidden="true" />
							Exportar resultados
						{/if}
					</AppButton>
				</div>

				{#if exportError}
					<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.92rem] text-[#8f1e36]">{exportError}</p>
				{/if}

				<div class="grid gap-3 text-center md:grid-cols-2">
					<div class="rounded-[12px] bg-surface-soft px-4 py-5">
						<p class="m-0 font-['Roboto',sans-serif] text-[2.4rem] leading-none font-bold text-brand-blue-dark">
							{numberFormatter.format(filteredTotalOccurrences)}
						</p>
						<p class="mt-2 mb-0 text-[0.9rem] font-semibold tracking-[0.03em] text-text-soft uppercase">
							Ocurrencias
						</p>
					</div>
					<div class="rounded-[12px] bg-surface-soft px-4 py-5">
						<p class="m-0 font-['Roboto',sans-serif] text-[2.4rem] leading-none font-bold text-brand-blue-dark">
							{numberFormatter.format(filteredTextsWithOccurrences)}
						</p>
						<p class="mt-2 mb-0 text-[0.9rem] font-semibold tracking-[0.03em] text-text-soft uppercase">
							Textos con ocurrencias
						</p>
					</div>
				</div>

				{#if submittedHasActiveFilters}
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
									Distribución general de ocurrencias
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
						{submittedHasActiveFilters
							? 'No se encontraron coincidencias con los filtros aplicados.'
							: 'No se encontraron coincidencias.'}
					</p>
				{:else}
					<div
						bind:this={resultsPaginationRegion}
						class="flex scroll-mt-24 flex-wrap items-center justify-between gap-3 max-md:flex-col max-md:justify-center max-md:gap-2 max-md:text-center"
					>
						<p class="m-0 font-['Roboto',sans-serif] text-[0.88rem] font-normal text-text-main max-md:w-full">
							Mostrando
							<span class="font-semibold text-brand-blue">
								{numberFormatter.format(resultPageStart)}-{numberFormatter.format(resultPageEnd)}
							</span>
							de <span class="font-semibold text-brand-blue">{numberFormatter.format(filteredResults.length)}</span> resultados
						</p>
						{#if resultPageCount > 1}
							<div class="flex items-center justify-center gap-2 max-md:w-full">
								<AppButton
									type="button"
									variant="secondary"
									disabled={resultsPage <= 1}
									className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
									title="Página anterior"
									onfocus={() => prefetchAdjacentPage(resultsPage - 1)}
									onpointerenter={() => prefetchAdjacentPage(resultsPage - 1)}
									onclick={() => {
										void navigateResultsPage(resultsPage - 1);
									}}
								>
									<ChevronLeft class="h-5 w-5" aria-hidden="true" />
									<span class="sr-only">Anterior</span>
								</AppButton>
								<span class="font-['Roboto',sans-serif] text-[0.86rem] font-normal text-text-main">
									Página <span class="font-semibold text-brand-blue">{numberFormatter.format(resultsPage)}</span> de
									<span class="font-semibold text-brand-blue">{numberFormatter.format(resultPageCount)}</span>
								</span>
								<AppButton
									type="button"
									variant="secondary"
									disabled={resultsPage >= resultPageCount}
									className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
									title="Página siguiente"
									onfocus={() => prefetchAdjacentPage(resultsPage + 1)}
									onpointerenter={() => prefetchAdjacentPage(resultsPage + 1)}
									onclick={() => {
										void navigateResultsPage(resultsPage + 1);
									}}
								>
									<ChevronRight class="h-5 w-5" aria-hidden="true" />
									<span class="sr-only">Siguiente</span>
								</AppButton>
							</div>
						{/if}
					</div>
					<ul class="m-0 grid list-none gap-3 p-0 max-md:mx-[-8px]">
						{#each visibleResults as result, resultIndex (result.docId)}
							{@const assignments = buildMatchAssignments(result.matches)}
							{@const resultOccurrences = sumResultOccurrences(result)}
							{@const preview = occurrencePreviews.get(result.docId)}
							{@const metadataLine = resultMetadataLine(result)}
							{@const textLinks = resultTextLinks(result)}
							<li
								class="overflow-hidden rounded-[11px] bg-white shadow-[0_6px_16px_rgba(25,46,80,0.07)]"
								data-texoro-result-index={resultIndex}
								use:observeResultRow={result}
							>
								<div class="grid gap-3 bg-surface-soft px-4 py-3">
									<div class="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
										<h3 class="m-0 min-w-0 font-['Roboto',sans-serif] text-[1.03rem] leading-[1.25] font-semibold text-brand-blue-dark">
											{#if result.meta}
												<a
													href={`/obras/${result.meta.slug}`}
													target="_blank"
													rel="noopener noreferrer"
													class="inline whitespace-normal break-words text-brand-blue no-underline hover:text-brand-blue-dark"
													title={formatDisplayWorkTitle(result.meta.title)}
												>{formatDisplayWorkTitle(result.meta.title)}</a>
											{:else}
												Obra sin metadatos
											{/if}
										</h3>
										<span class="w-fit max-w-full rounded-full bg-surface-accent-blue px-2.5 py-1 text-center font-['Roboto',sans-serif] text-[0.8rem] font-semibold whitespace-normal text-brand-blue-dark sm:justify-self-end">
											{numberFormatter.format(resultOccurrences)} {resultOccurrences === 1 ? 'ocurrencia' : 'ocurrencias'}
										</span>
									</div>
									{@render resultMetaDisclosure(result.meta, metadataLine, result.docId, textLinks)}
								</div>

								<div class="px-4 py-3">
									{#if preview?.error}
										<p class="mt-3 mb-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.88rem] text-[#8f1e36]">
											{preview.error}
										</p>
									{:else if preview?.items.length}
										<ol class="mt-3 m-0 list-none p-0 text-[0.95rem] leading-[1.55] text-text-main">
											{#each preview.items as item, index}
												{@const itemAssignment = assignments.find((assignment) => assignment.key === item.assignmentKey)}
												{@const itemPosition = occurrencePositionParts(item)}
												<li class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-brand-blue/15 py-3 first:border-t-0 first:pt-0 last:pb-0">
													<span class="font-['Roboto',sans-serif] text-[0.82rem] font-bold text-text-accent-purple">
														#{index + 1}
													</span>
													<div class="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
														<span class="texoro-occurrence-snippet block min-w-0">
															{@html highlightExactOccurrenceSnippet(item.centeredSnippet, itemAssignment, item)}
														</span>
														<span class="font-['Roboto',sans-serif] text-[0.76rem] font-medium whitespace-nowrap text-text-accent-purple sm:text-right">
															{itemPosition.prefix}<span class="font-bold">{itemPosition.value}</span>{itemPosition.suffix}
														</span>
													</div>
												</li>
											{/each}
										</ol>
									{:else if preview}
										<p class="mt-3 mb-0 text-[0.9rem] text-text-soft">No hay ocurrencias para mostrar.</p>
									{:else if hasPendingPreview(result)}
										<div class="texoro-preview-reserve mt-3" aria-hidden="true"></div>
									{:else}
										<div class="texoro-preview-reserve mt-3" aria-hidden="true"></div>
									{/if}

									<div class="mt-4 flex flex-wrap gap-1.5">
										{#each assignments as assignment}
											<button
												type="button"
												class="texoro-more-button"
												style="cursor:pointer;"
												disabled={openingOccurrenceKey === occurrenceDetailsKey(result, assignment)}
												aria-busy={openingOccurrenceKey === occurrenceDetailsKey(result, assignment) ? 'true' : undefined}
												onpointerenter={() => prefetchOccurrenceDetails(result, assignment)}
												onpointerdown={() => prefetchOccurrenceDetails(result, assignment)}
												ontouchstart={() => prefetchOccurrenceDetails(result, assignment)}
												onfocus={() => prefetchOccurrenceDetails(result, assignment)}
												onclick={() => openOccurrenceModal(result, assignment)}
												title={`Ver más ocurrencias de ${formatMatchDisplayLabel(assignment.match)}`}
											>
												<span class="texoro-more-button__label">Ver más</span>
												<span
													class="texoro-more-button__term"
													style={assignment.chipStyle}
												>
													{#each matchDisplayParts(assignment.match, { includeProximityMeta: false }) as part}
														<span
															class={part.kind === 'text' ? 'texoro-more-button__term-text' : 'texoro-more-button__meta'}
														>
															{part.value}
														</span>
													{/each}
												</span>
												<span class="texoro-more-button__count">
													{numberFormatter.format(assignment.match.occurrences)}
												</span>
											</button>
										{/each}
									</div>
								</div>
							</li>
						{/each}
					</ul>
					{#if resultPageCount > 1}
						<div class="flex flex-wrap items-center justify-center gap-2">
							<AppButton
								type="button"
								variant="secondary"
								disabled={resultsPage <= 1}
								className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
								title="Página anterior"
								onfocus={() => prefetchAdjacentPage(resultsPage - 1)}
								onpointerenter={() => prefetchAdjacentPage(resultsPage - 1)}
								onclick={() => {
									void navigateResultsPage(resultsPage - 1);
								}}
							>
								<ChevronLeft class="h-5 w-5" aria-hidden="true" />
								<span class="sr-only">Anterior</span>
							</AppButton>
							<span class="font-['Roboto',sans-serif] text-[0.86rem] font-normal text-text-main">
								Página <span class="font-semibold text-brand-blue">{numberFormatter.format(resultsPage)}</span> de
								<span class="font-semibold text-brand-blue">{numberFormatter.format(resultPageCount)}</span>
							</span>
							<AppButton
								type="button"
								variant="secondary"
								disabled={resultsPage >= resultPageCount}
								className="!h-9 !w-9 !rounded-full !border-transparent !bg-transparent !p-0 !text-brand-blue-dark shadow-none hover:!bg-surface-soft"
								title="Página siguiente"
								onfocus={() => prefetchAdjacentPage(resultsPage + 1)}
								onpointerenter={() => prefetchAdjacentPage(resultsPage + 1)}
								onclick={() => {
									void navigateResultsPage(resultsPage + 1);
								}}
							>
								<ChevronRight class="h-5 w-5" aria-hidden="true" />
								<span class="sr-only">Siguiente</span>
							</AppButton>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</section>
</div>

{#if occurrenceModal}
	{@const occurrenceTextLinks = resultTextLinks(occurrenceModal.result)}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-3 py-4">
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0"
			aria-label="Cerrar modal"
			tabindex="-1"
			onclick={closeOccurrenceModal}
		></button>
		<div
			class="relative grid max-h-[88vh] w-full max-w-[880px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[12px] bg-white shadow-[0_16px_40px_rgba(4,24,56,0.33)]"
			role="dialog"
			aria-modal="true"
			aria-label={`Ocurrencias de ${formatMatchDisplayLabel(occurrenceModal.assignment.match)}`}
			tabindex="-1"
		>
			<div class="relative grid gap-3 bg-surface-soft px-4 py-3 sm:gap-4">
				<div class="min-w-0 pr-11">
					<div class="min-w-0">
						<h3 class="m-0 min-w-0 font-['Roboto',sans-serif] text-[1.08rem] leading-[1.25] font-semibold text-brand-blue-dark">
							{#if occurrenceModal.result.meta}
								<a
									href={`/obras/${occurrenceModal.result.meta.slug}`}
									target="_blank"
									rel="noopener noreferrer"
									class="inline whitespace-normal break-words text-brand-blue no-underline hover:text-brand-blue-dark"
									title={formatDisplayWorkTitle(occurrenceModal.result.meta.title)}
								>
									{formatDisplayWorkTitle(occurrenceModal.result.meta.title)}
								</a>
							{:else}
								Obra sin metadatos
							{/if}
						</h3>
					</div>
				</div>
				<button
					type="button"
					class="absolute top-2.5 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent text-brand-blue-dark transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue/25"
					aria-label="Cerrar modal"
					onclick={closeOccurrenceModal}
				>
					<X class="h-4 w-4" aria-hidden="true" />
				</button>
				<div class="flex min-w-0 max-w-full flex-wrap items-center gap-2">
					{#if occurrenceModal.details}
						<span class="w-fit shrink-0 rounded-full bg-surface-accent-blue px-2.5 py-1 font-['Roboto',sans-serif] text-[0.8rem] font-semibold whitespace-nowrap text-brand-blue-dark">
							{numberFormatter.format(occurrenceModal.details.count)}
							{occurrenceModal.details.count === 1 ? 'ocurrencia' : 'ocurrencias'}
						</span>
					{/if}
					<span
						class="inline-flex max-w-full items-center gap-1 overflow-hidden rounded-full px-2.5 py-1 font-['Roboto',sans-serif] text-[0.82rem] font-semibold whitespace-nowrap"
						style={occurrenceModal.assignment.chipStyle}
					>
						{#each matchDisplayParts(occurrenceModal.assignment.match) as part}
							<span
								class={`${
									part.kind === 'text'
										? 'min-w-0 overflow-hidden text-ellipsis'
										: 'shrink-0 text-[0.72rem] font-bold opacity-75'
								}`}
							>
								{part.value}
							</span>
						{/each}
					</span>
				</div>
				<div>
					{@render resultMetaDisclosure(occurrenceModal.result.meta, resultMetadataLine(occurrenceModal.result), occurrenceModal.result.docId, occurrenceTextLinks)}
				</div>
			</div>

			<div class="min-h-0 overflow-auto overscroll-contain px-4 pt-3 pb-6">
				{#if occurrenceLoading}
					<p class="m-0 text-[0.93rem] text-text-soft">Cargando ocurrencias...</p>
				{:else if occurrenceError}
					<p class="m-0 rounded-[9px] border border-[#f3c0ca] bg-[#fff5f7] px-3 py-2 text-[0.9rem] text-[#8f1e36]">
						{occurrenceError}
					</p>
				{:else if occurrenceModal.details && occurrenceModal.details.items.length > 0}
					<ul class="m-0 grid list-none gap-2 p-0">
						{#each occurrenceModal.details.items as item, index}
							{@const itemPosition = occurrencePositionParts(item)}
							<li class="overflow-hidden rounded-[9px] bg-white shadow-[0_4px_12px_rgba(25,46,80,0.06)]">
								<div class="grid gap-2 bg-surface-soft px-3 py-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
									<p class="m-0 font-['Roboto',sans-serif] text-[0.79rem] font-semibold text-text-accent-purple">#{index + 1}</p>
									<p class="m-0 font-['Roboto',sans-serif] text-[0.75rem] font-medium text-text-accent-purple sm:text-right">
										{itemPosition.prefix}{itemPosition.value}{itemPosition.suffix}
									</p>
								</div>
								<div class="px-3 py-2">
									<p class="texoro-occurrence-modal-snippet m-0 text-[0.93rem] leading-[1.55] text-text-main">
										{@html highlightExactOccurrenceSnippet(item.snippet, occurrenceModal.assignment, item)}
									</p>
								</div>
							</li>
						{/each}
					</ul>
					{#if occurrenceModal.details.truncated}
						<div class="mt-3 grid gap-1 text-[0.84rem] text-text-soft">
							<p class="m-0">
								Se muestran las primeras {numberFormatter.format(occurrenceModal.details.items.length)} ocurrencias de
								{numberFormatter.format(occurrenceModal.details.count)}.
							</p>
							<p class="m-0">
								Si necesitas acceder a todas las ocurrencias,
								<a href="/contacto" class="font-medium">contacta con nosotros</a>.
							</p>
						</div>
					{/if}
				{:else}
					<p class="m-0 text-[0.93rem] text-text-soft">No hay ocurrencias para mostrar.</p>
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
		font-family: var(--font-reading);
		line-clamp: 3;
		-webkit-line-clamp: 3;
	}

	.texoro-occurrence-modal-snippet {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.texoro-preview-reserve {
		min-height: 7.25rem;
	}

	.texoro-result-disclosure > summary::-webkit-details-marker {
		display: none;
	}

	@media (max-width: 639px) {
		.texoro-more-button {
			flex-wrap: wrap;
			align-items: flex-start;
			border-radius: 12px;
			line-height: 1.2;
		}

		.texoro-more-button__term {
			max-width: 100%;
		}
	}

	.texoro-more-button {
		display: inline-flex;
		max-width: 100%;
		align-items: center;
		gap: 0.25rem;
		border: 0;
		border-radius: 999px;
		background: var(--color-surface-soft);
		padding: 0.25rem 0.625rem;
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 500;
		line-height: 1;
		color: var(--color-brand-blue-dark);
		transition: background-color 160ms ease;
	}

	.texoro-more-button:hover {
		background: var(--color-surface-accent-blue);
	}

	.texoro-more-button:disabled {
		cursor: wait;
		opacity: 0.72;
	}

	.texoro-more-button:focus-visible {
		outline: 2px solid rgba(13, 63, 145, 0.25);
		outline-offset: 2px;
	}

	.texoro-more-button__label {
		flex: none;
		font-weight: 500;
		white-space: nowrap;
	}

	.texoro-more-button__term {
		display: inline-flex;
		min-width: 0;
		max-width: 16rem;
		align-items: center;
		gap: 0.25rem;
		overflow: hidden;
		border-radius: 999px;
		padding: 0.25rem 0.625rem;
		font-size: 0.8rem;
		font-weight: 600;
		line-height: 1.05;
		white-space: nowrap;
	}

	.texoro-more-button__term-text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.texoro-more-button__meta {
		flex: none;
		font-size: 0.68rem;
		font-weight: 600;
		line-height: 1;
		opacity: 0.72;
	}

	.texoro-more-button__count {
		flex: none;
		border-radius: 999px;
		background: var(--color-surface-accent-blue);
		padding: 0.25rem 0.625rem;
		font-size: 0.8rem;
		font-weight: 700;
		line-height: 1;
		color: var(--color-brand-blue-dark);
		white-space: nowrap;
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
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0"
			aria-label="Cerrar guía"
			tabindex="-1"
			onclick={closeInfoModal}
		></button>
		<div
			class="relative grid max-h-[88vh] w-full max-w-[900px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[12px] bg-white shadow-[0_16px_40px_rgba(4,24,56,0.33)]"
			role="dialog"
			aria-modal="true"
			aria-label="Guía de búsqueda en TEXORO"
			tabindex="-1"
		>
			<div class="relative bg-surface-soft px-4 py-3">
				<div class="min-w-0 pr-11">
					<h3 class="m-0 font-['Roboto',sans-serif] text-[1.08rem] leading-[1.25] font-semibold text-brand-blue-dark">
						Guía de búsqueda en TEXORO
					</h3>
					<p class="mt-1 mb-0 text-[0.9rem] text-text-soft">
						Uso del buscador textual y de sus opciones avanzadas.
					</p>
				</div>
				<button
					type="button"
					class="absolute top-2.5 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent text-brand-blue-dark transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue/25"
					aria-label="Cerrar guía"
					onclick={closeInfoModal}
				>
					<X class="h-4 w-4" aria-hidden="true" />
				</button>
			</div>

			<div class="grid min-h-0 gap-4 overflow-auto overscroll-contain bg-surface-soft px-4 pt-4 pb-6">
				<section class="rounded-[12px] bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.06)]">
					<h4 class="m-0 font-['Roboto',sans-serif] text-[0.95rem] font-semibold text-brand-blue-dark">Qué hace el buscador</h4>
					<p class="mt-2 mb-0 text-[0.94rem] leading-[1.55] text-text-main">
						TEXORO busca palabras, frases exactas y patrones en el corpus. Primero localiza obras candidatas con índices de búsqueda y, cuando hace falta, verifica los textos para confirmar coincidencias y preparar contextos de lectura.
					</p>
				</section>

				<div class="grid gap-4 lg:grid-cols-2">
					<section class="rounded-[12px] bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.05)]">
						<h4 class="m-0 font-['Roboto',sans-serif] text-[0.94rem] font-semibold text-text-accent-purple">Búsqueda básica</h4>
						<ul class="mb-0 mt-2 grid gap-2 pl-5 text-[0.92rem] leading-[1.52] text-text-main">
							<li><b>Palabra exacta:</b> <code>amor</code>.</li>
							<li><b>Frase exacta:</b> si escribes varias palabras, por ejemplo <code>amor constante</code>, se buscan juntas y en ese orden.</li>
							<li><b>Caracteres permitidos:</b> letras, números, espacios y los comodines <code>*</code> y <code>?</code>.</li>
						</ul>
					</section>

					<section class="rounded-[12px] bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.05)]">
						<h4 class="m-0 font-['Roboto',sans-serif] text-[0.94rem] font-semibold text-text-accent-purple">Comodines</h4>
						<div class="mt-2 grid gap-3 text-[0.92rem] leading-[1.52] text-text-main">
							<div>
								<p class="m-0 font-['Roboto',sans-serif] font-semibold text-brand-blue-dark"><code>*</code> abre una parte de la palabra</p>
								<ul class="mb-0 mt-1 grid gap-1 pl-5">
									<li><code>amor*</code> encuentra <i>amor</i>, <i>amores</i> o <i>amoroso</i>.</li>
									<li><code>*mente</code> encuentra palabras acabadas en <i>mente</i>.</li>
									<li><code>a*or</code> localiza palabras que empiezan por <i>a</i> y terminan en <i>or</i>.</li>
								</ul>
							</div>
							<div>
								<p class="m-0 font-['Roboto',sans-serif] font-semibold text-brand-blue-dark"><code>?</code> sustituye una sola letra</p>
								<ul class="mb-0 mt-1 grid gap-1 pl-5">
									<li><code>am?r</code> puede localizar palabras de cuatro letras como <i>amar</i> o <i>amor</i>.</li>
								</ul>
							</div>
						</div>
					</section>

					<section class="rounded-[12px] bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.05)]">
						<h4 class="m-0 font-['Roboto',sans-serif] text-[0.94rem] font-semibold text-text-accent-purple">Búsqueda avanzada</h4>
						<ul class="mb-0 mt-2 grid gap-2 pl-5 text-[0.92rem] leading-[1.52] text-text-main">
							<li><b>Términos adicionales:</b> puedes exigir que aparezcan todos, al menos uno, o buscar cualquiera de los términos.</li>
							<li><b>Proximidad:</b> añade términos que deban aparecer cerca de la búsqueda principal, con distancia máxima y orden.</li>
							<li><b>Filtros:</b> limita por título, género, atribución tradicional, atribución estilométrica o estado del texto.</li>
						</ul>
					</section>

					<section class="rounded-[12px] bg-white px-4 py-3 shadow-[0_6px_16px_rgba(25,46,80,0.05)]">
						<h4 class="m-0 font-['Roboto',sans-serif] text-[0.94rem] font-semibold text-text-accent-purple">Resultados</h4>
						<ul class="mb-0 mt-2 grid gap-2 pl-5 text-[0.92rem] leading-[1.52] text-text-main">
							<li>La consulta interpretada resume antes de buscar qué se enviará al motor.</li>
							<li>Los resultados se ordenan por relevancia y número de ocurrencias.</li>
							<li>En cada obra se cargan contextos breves de las primeras ocurrencias visibles.</li>
							<li>El detalle de ocurrencias muestra fragmentos localizados y posición aproximada en la obra.</li>
							<li>La exportación XLSX guarda consulta, filtros, resultados y ocurrencias disponibles.</li>
						</ul>
					</section>
				</div>
			</div>
		</div>
	</div>
{/if}
