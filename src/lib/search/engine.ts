import { IndexedDbCache } from './idb-cache';
import { buildSnippet, normalizePattern, normalizePlainText, tokenizeWithOffsets } from './normalize';
import { parseSearchQuery, parseStructuredQuery, parseStructuredSearchQuery } from './query';

import type {
	ParsedQuery,
	ParsedQueryClause,
	SearchExecution,
	SearchMatchOccurrence,
	SearchMatchOccurrences,
	SearchOptions,
	SearchResult,
	SearchResultMatch,
	TexoroIndexManifest,
	TexoroKgramShard,
	TexoroKgramsRoot,
	TexoroPostingsShard,
	TexoroPositionsDoc,
	TexoroPositionsShard,
	TexoroVocabRoot,
	TexoroVocabShard,
	TexoroWildcardLengths,
	TexoroWorkMeta,
	TexoroWorksFile
} from './types';

interface SearchEngineConfig {
	indexBaseUrl?: string;
	textsBaseUrl?: string;
	textLoader?: (textKey: string) => Promise<string | null>;
	preserveEnie?: boolean;
	cacheInIndexedDb?: boolean;
	preparedTextCacheMaxDocs?: number;
}

interface MatchOccurrencesOptions {
	maxItems?: number;
	snippetRadius?: number;
	snippetMode?: 'chars' | 'lines';
	lineContext?: number;
}

interface PreviewRequestItem {
	docId: number;
	workId: string;
	matches: SearchResultMatch[];
}

interface PreviewOptions {
	maxItemsPerDoc?: number;
	snippetRadius?: number;
}

interface WarmupOptions {
	vocabBudgetBytes?: number;
	postingsBudgetBytes?: number;
	kgramBudgetBytes?: number;
}

interface PrimeQueryOptions {
	structuredClauses?: SearchOptions['structuredClauses'];
	structuredQuery?: SearchOptions['structuredQuery'];
	prefetchTexts?: boolean;
	textLimit?: number;
	textConcurrency?: number;
}

interface TextWarmupOptions {
	limit?: number;
	concurrency?: number;
	docIds?: number[];
}

interface TermMeta {
	term: string;
	termId: number;
	df: number;
	cf: number;
	len: number;
	postingsShard: string;
	positionsShard?: string;
}

interface ClauseEvaluation {
	clause: ParsedQueryClause;
	docs: Set<number>;
	scores: Map<number, number>;
}

interface GroupEvaluation {
	clauses: ClauseEvaluation[];
	docs: Set<number>;
	scores: Map<number, number>;
}

interface PreparedText {
	raw: string;
	tokens: ReturnType<typeof tokenizeWithOffsets>;
}

interface ClausePositionOccurrence {
	tokenStart: number;
	tokenEnd: number;
	byteStart: number;
	byteEnd: number;
}

interface PreparedSpan {
	start: number;
	end: number;
	tokenStart: number;
	tokenEnd: number;
}

interface RawOccurrenceHighlight {
	start: number;
	end: number;
	tokenIndex: number;
}

interface TextLineRange {
	start: number;
	contentEnd: number;
	end: number;
	isBlank: boolean;
}

const DEFAULT_LIMIT = 30;
const DEFAULT_SNIPPET_RADIUS = 110;
const DEFAULT_LINE_CONTEXT = 3;
const DEFAULT_WARMUP_VOCAB_BUDGET = 900_000;
const DEFAULT_WARMUP_POSTINGS_BUDGET = 900_000;
const DEFAULT_WARMUP_KGRAM_BUDGET = 800_000;
const DEFAULT_TEXT_WARMUP_CONCURRENCY = 4;

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const joinUrl = (base: string, path: string): string => `${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;
const withQueryParam = (url: string, key: string, value: string): string => {
	const separator = url.includes('?') ? '&' : '?';
	return `${url}${separator}${key}=${encodeURIComponent(value)}`;
};
const withCacheBuster = (url: string): string => {
	return withQueryParam(url, 't', String(Date.now()));
};
const withIndexVersion = (url: string, indexVersion: string | null): string =>
	indexVersion ? withQueryParam(url, 'v', indexVersion) : url;

const readPayloadIndexVersion = (value: unknown): string | null => {
	if (!value || typeof value !== 'object') return null;
	const raw = value as { indexVersion?: unknown };
	return typeof raw.indexVersion === 'string' ? raw.indexVersion : null;
};

const wildcardToRegex = (pattern: string): RegExp => {
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

const findPreparedSpans = (
	tokens: ReturnType<typeof tokenizeWithOffsets>,
	patterns: string[]
): PreparedSpan[] => {
	if (patterns.length === 0 || tokens.length < patterns.length) return [];
	const regexes = patterns.map((pattern) => wildcardToRegex(pattern));
	const spans: PreparedSpan[] = [];
	const maxStart = tokens.length - regexes.length;

	for (let start = 0; start <= maxStart; start += 1) {
		let matched = true;
		for (let offset = 0; offset < regexes.length; offset += 1) {
			if (!regexes[offset].test(tokens[start + offset].norm)) {
				matched = false;
				break;
			}
		}
		if (!matched) continue;
		const first = tokens[start];
		const last = tokens[start + regexes.length - 1];
		spans.push({
			start: first.start,
			end: last.end,
			tokenStart: start,
			tokenEnd: start + regexes.length - 1
		});
	}

	return spans;
};

const intersectSets = (left: Set<number>, right: Set<number>): Set<number> => {
	const output = new Set<number>();
	const [small, large] = left.size <= right.size ? [left, right] : [right, left];
	for (const value of small) {
		if (large.has(value)) output.add(value);
	}
	return output;
};

const unionSets = (sets: Set<number>[]): Set<number> => {
	const output = new Set<number>();
	for (const entry of sets) {
		for (const value of entry) output.add(value);
	}
	return output;
};

const sortedNumeric = (values: Iterable<number>): number[] => Array.from(values).sort((a, b) => a - b);

const buildTextLineRanges = (rawText: string): TextLineRange[] => {
	const lines: TextLineRange[] = [];
	let start = 0;

	for (let index = 0; index < rawText.length; index += 1) {
		if (rawText[index] !== '\n') continue;
		const contentEnd = index > start && rawText[index - 1] === '\r' ? index - 1 : index;
		lines.push({
			start,
			contentEnd,
			end: index + 1,
			isBlank: contentEnd === start
		});
		start = index + 1;
	}

	lines.push({
		start,
		contentEnd: rawText.length,
		end: rawText.length,
		isBlank: rawText.length === start
	});

	return lines;
};

const findLineIndexForOffset = (lines: TextLineRange[], offset: number): number => {
	if (lines.length === 0) return 0;
	const normalizedOffset = Math.max(0, offset);
	let low = 0;
	let high = lines.length - 1;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const line = lines[mid];
		if (normalizedOffset < line.start) {
			high = mid - 1;
			continue;
		}
		if (normalizedOffset >= line.end && mid < lines.length - 1) {
			low = mid + 1;
			continue;
		}
		return mid;
	}

	return Math.max(0, Math.min(lines.length - 1, low));
};

const buildLineSnippetWithHighlights = (
	rawText: string,
	start: number,
	end: number,
	highlights: RawOccurrenceHighlight[],
	lines: TextLineRange[],
	lineContext = DEFAULT_LINE_CONTEXT
): Pick<SearchMatchOccurrence, 'snippet' | 'highlights'> => {
	if (lines.length === 0) {
		return buildSnippetWithHighlights(rawText, start, end, highlights);
	}

	const effectiveHighlights = highlights.length > 0 ? highlights : [{ start, end, tokenIndex: 0 }];
	const highlightStart = Math.min(start, ...effectiveHighlights.map((highlight) => highlight.start));
	const highlightEnd = Math.max(end, ...effectiveHighlights.map((highlight) => highlight.end));
	const firstHitLine = findLineIndexForOffset(lines, highlightStart);
	const lastHitLine = findLineIndexForOffset(lines, Math.max(highlightStart, highlightEnd - 1));
	const context = Math.max(0, Math.floor(lineContext));
	const nonBlankLineIndexes = lines
		.map((line, index) => (line.isBlank ? -1 : index))
		.filter((index) => index >= 0);
	const firstHitPosition = nonBlankLineIndexes.findIndex((lineIndex) => lineIndex >= firstHitLine);
	const lastHitPosition = nonBlankLineIndexes.findLastIndex((lineIndex) => lineIndex <= lastHitLine);
	if (firstHitPosition < 0 || lastHitPosition < 0) {
		return buildSnippetWithHighlights(rawText, start, end, highlights);
	}

	const firstPosition = Math.max(0, firstHitPosition - context);
	const lastPosition = Math.min(nonBlankLineIndexes.length - 1, lastHitPosition + context);
	const selectedLineIndexes = nonBlankLineIndexes.slice(firstPosition, lastPosition + 1);
	const localHighlights: Array<{ start: number; end: number; tokenIndex: number }> = [];
	let snippet = '';

	for (const lineIndex of selectedLineIndexes) {
		const line = lines[lineIndex];
		if (snippet.length > 0) snippet += '\n';
		const localLineStart = snippet.length;
		const lineText = rawText.slice(line.start, line.contentEnd);
		snippet += lineText;

		for (const highlight of highlights) {
			if (highlight.end <= line.start || highlight.start >= line.contentEnd) continue;
			const localStart = localLineStart + Math.max(highlight.start, line.start) - line.start;
			const localEnd = localLineStart + Math.min(highlight.end, line.contentEnd) - line.start;
			if (localEnd <= localStart) continue;
			localHighlights.push({
				start: localStart,
				end: localEnd,
				tokenIndex: highlight.tokenIndex
			});
		}
	}

	localHighlights.sort((a, b) => a.start - b.start || a.end - b.end);

	return {
		snippet,
		highlights: localHighlights
	};
};

const buildSnippetWithHighlights = (
	rawText: string,
	start: number,
	end: number,
	highlights: RawOccurrenceHighlight[],
	radius = DEFAULT_SNIPPET_RADIUS
): Pick<SearchMatchOccurrence, 'snippet' | 'highlights'> => {
	const left = Math.max(0, start - radius);
	const right = Math.min(rawText.length, end + radius);
	const rawSlice = rawText.slice(left, right);
	const leadingWhitespace = rawSlice.match(/^\s*/u)?.[0].length ?? 0;
	const trailingWhitespace = rawSlice.match(/\s*$/u)?.[0].length ?? 0;
	const bodyStart = left + leadingWhitespace;
	const bodyEnd = right - trailingWhitespace;
	const prefix = left > 0 ? '... ' : '';
	const suffix = right < rawText.length ? ' ...' : '';
	const sortedHighlights = highlights
		.filter((highlight) => highlight.end > bodyStart && highlight.start < bodyEnd)
		.map((highlight) => ({
			...highlight,
			start: Math.max(highlight.start, bodyStart),
			end: Math.min(highlight.end, bodyEnd)
		}))
		.sort((a, b) => a.start - b.start || a.end - b.end);
	const localHighlights = sortedHighlights.map((highlight) => ({
		start: -1,
		end: -1,
		tokenIndex: highlight.tokenIndex
	}));

	let snippet = prefix;
	let pendingSpace = false;
	for (let absoluteIndex = bodyStart; absoluteIndex < bodyEnd; absoluteIndex += 1) {
		const char = rawText[absoluteIndex];
		if (/\s/u.test(char)) {
			pendingSpace = snippet.length > prefix.length;
			continue;
		}
		if (pendingSpace) {
			snippet += ' ';
			pendingSpace = false;
		}
		for (let index = 0; index < sortedHighlights.length; index += 1) {
			if (sortedHighlights[index].start === absoluteIndex) {
				localHighlights[index].start = snippet.length;
			}
		}
		snippet += char;
		for (let index = 0; index < sortedHighlights.length; index += 1) {
			if (sortedHighlights[index].end === absoluteIndex + 1) {
				localHighlights[index].end = snippet.length;
			}
		}
	}
	snippet += suffix;

	return {
		snippet,
		highlights: localHighlights.filter((highlight) => highlight.start >= 0 && highlight.end > highlight.start)
	};
};

const rangeIntersectsPrefix = (termMin: string, termMax: string, prefix: string): boolean => {
	const prefixUpper = `${prefix}\uffff`;
	return termMax >= prefix && termMin <= prefixUpper;
};

const shardCoverage = (shard: { termsCount?: number; gramsCount?: number; estimatedBytes: number }): number =>
	shard.termsCount ?? shard.gramsCount ?? shard.estimatedBytes;

const selectShardsForBudget = <T extends { estimatedBytes: number; termsCount?: number; gramsCount?: number }>(
	shards: T[],
	budgetBytes: number
): T[] => {
	if (!Number.isFinite(budgetBytes) || budgetBytes <= 0) return [];

	const sorted = [...shards].sort((left, right) => {
		const coverageDelta = shardCoverage(right) - shardCoverage(left);
		if (coverageDelta !== 0) return coverageDelta;
		return left.estimatedBytes - right.estimatedBytes;
	});

	const selected: T[] = [];
	let usedBytes = 0;
	for (const shard of sorted) {
		if (selected.length > 0 && usedBytes + shard.estimatedBytes > budgetBytes) continue;
		selected.push(shard);
		usedBytes += shard.estimatedBytes;
		if (usedBytes >= budgetBytes) break;
	}

	return selected;
};

const runWithConcurrency = async <T>(
	items: T[],
	concurrency: number,
	task: (item: T) => Promise<void>
): Promise<void> => {
	const size = Math.max(1, Math.floor(concurrency));
	let nextIndex = 0;

	const worker = async (): Promise<void> => {
		while (nextIndex < items.length) {
			const currentIndex = nextIndex;
			nextIndex += 1;
			await task(items[currentIndex]);
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(size, items.length) }, () => worker())
	);
};

export class TexoroSearchEngine {
	readonly #indexBaseUrl: string;
	readonly #textsBaseUrl: string;
	readonly #textLoader?: (textKey: string) => Promise<string | null>;
	readonly #preserveEnie: boolean;
	readonly #cacheInIndexedDb: boolean;
	readonly #preparedTextCacheMaxDocs: number;
	readonly #cache = new IndexedDbCache();

	#initialized = false;
	#manifest: TexoroIndexManifest | null = null;
	#worksFile: TexoroWorksFile | null = null;
	#vocabRoot: TexoroVocabRoot | null = null;
	#kgramsRoot: TexoroKgramsRoot | null = null;
	#wildcardLengths: TexoroWildcardLengths | null = null;

	#vocabShards = new Map<string, TexoroVocabShard>();
	#kgramShards = new Map<string, TexoroKgramShard>();
	#postingsShards = new Map<string, Map<number, Array<[number, number]>>>();
	#positionsShards = new Map<string, Map<number, TexoroPositionsDoc[]>>();
	#termMetaById = new Map<number, TermMeta>();
	#patternTermIds = new Map<string, number[]>();
	#preparedTexts = new Map<number, PreparedText>();
	#preparedTextLoads = new Map<number, Promise<PreparedText | null>>();
	#vocabShardLoads = new Map<string, Promise<TexoroVocabShard>>();
	#kgramShardLoads = new Map<string, Promise<TexoroKgramShard>>();
	#postingsShardLoads = new Map<string, Promise<Map<number, Array<[number, number]>>>>();
	#positionsShardLoads = new Map<string, Promise<Map<number, TexoroPositionsDoc[]>>>();
	#firstSearchWarmupPromise: Promise<void> | null = null;
	#wildcardWarmupPromise: Promise<void> | null = null;
	#primedQueries = new Map<string, Promise<void>>();
	#positionsShardLoadCount = 0;
	#textLoadCount = 0;

	#docRowById = new Map<number, [number, string, string, string, number, number]>();
	#allTermIdsCache: number[] | null = null;

	constructor(config: SearchEngineConfig = {}) {
		this.#indexBaseUrl = stripTrailingSlash(config.indexBaseUrl || '');
		this.#textsBaseUrl = stripTrailingSlash(config.textsBaseUrl || '');
		this.#textLoader = config.textLoader;
		this.#preserveEnie = config.preserveEnie ?? true;
		this.#cacheInIndexedDb = config.cacheInIndexedDb ?? true;
		this.#preparedTextCacheMaxDocs = Math.max(1, Math.floor(config.preparedTextCacheMaxDocs ?? 64));
	}

	get manifest(): TexoroIndexManifest | null {
		return this.#manifest;
	}

	async warmupForFirstSearch(options: WarmupOptions = {}): Promise<void> {
		if (this.#firstSearchWarmupPromise) return this.#firstSearchWarmupPromise;

		this.#firstSearchWarmupPromise = (async () => {
			await this.initialize();
			await Promise.all([
				this.#warmupVocabShards(options.vocabBudgetBytes ?? DEFAULT_WARMUP_VOCAB_BUDGET),
				this.#warmupPostingsShards(options.postingsBudgetBytes ?? DEFAULT_WARMUP_POSTINGS_BUDGET)
			]);
		})();

		return this.#firstSearchWarmupPromise;
	}

	async warmupWildcardSupport(options: WarmupOptions = {}): Promise<void> {
		if (this.#wildcardWarmupPromise) return this.#wildcardWarmupPromise;

		this.#wildcardWarmupPromise = (async () => {
			await this.initialize();
			await Promise.all([
				this.warmupForFirstSearch(options),
				this.#warmupKgramShards(options.kgramBudgetBytes ?? DEFAULT_WARMUP_KGRAM_BUDGET)
			]);
		})();

		return this.#wildcardWarmupPromise;
	}

	async warmupAllTexts(options: TextWarmupOptions = {}): Promise<void> {
		await this.initialize();
		const docIdsSource = options.docIds ?? Array.from(this.#docRowById.keys()).sort((a, b) => a - b);
		const limit =
			typeof options.limit === 'number' && options.limit > 0
				? Math.min(options.limit, docIdsSource.length)
				: docIdsSource.length;
		const docIds = docIdsSource.slice(0, limit);
		if (docIds.length === 0) return;

		await this.#warmupPreparedTexts(docIds, options.concurrency ?? DEFAULT_TEXT_WARMUP_CONCURRENCY);
	}

	async primeQuery(query: string, options: PrimeQueryOptions = {}): Promise<void> {
		const normalizedQuery = query.trim();
		if (!normalizedQuery) return;

		const cacheKey = `${normalizedQuery}::${options.prefetchTexts === true ? 'texts' : 'index'}::${
			options.textLimit ?? ''
		}`;
		const pending = this.#primedQueries.get(cacheKey);
		if (pending) return pending;

		const primePromise = (async () => {
			await this.initialize();
			const parsed = options.structuredQuery
				? parseStructuredQuery(options.structuredQuery, this.#preserveEnie)
				: options.structuredClauses?.length
					? parseStructuredSearchQuery(options.structuredClauses, this.#preserveEnie)
					: parseSearchQuery(normalizedQuery, this.#preserveEnie);
			if (parsed.groups.length === 0) return;

			const groupEvaluations: GroupEvaluation[] = [];
			const retrievalScores = new Map<number, number>();

			for (const group of parsed.groups) {
				const evaluated = await this.#evaluateGroup(group);
				groupEvaluations.push(evaluated);
				for (const [docId, score] of evaluated.scores) {
					const current = retrievalScores.get(docId) ?? 0;
					if (score > current) retrievalScores.set(docId, score);
				}
			}

			if (!options.prefetchTexts) return;

			const orderedCandidates = sortedNumeric(unionSets(groupEvaluations.map((group) => group.docs))).sort(
				(a, b) => (retrievalScores.get(b) ?? 0) - (retrievalScores.get(a) ?? 0)
			);
			if (orderedCandidates.length === 0) return;

			const textLimit =
				typeof options.textLimit === 'number' && options.textLimit > 0
					? Math.min(options.textLimit, orderedCandidates.length)
					: Math.min(8, orderedCandidates.length);
			await this.#warmupPreparedTexts(
				orderedCandidates.slice(0, textLimit),
				options.textConcurrency ?? DEFAULT_TEXT_WARMUP_CONCURRENCY
			);
		})();

		this.#primedQueries.set(cacheKey, primePromise);
		try {
			await primePromise;
		} finally {
			this.#primedQueries.delete(cacheKey);
		}
	}

	async initialize(): Promise<void> {
		if (this.#initialized) return;
		if (!this.#indexBaseUrl) {
			throw new Error(
				'Falta PUBLIC_R2_PUBLIC_ASSETS_BASE_URL o PUBLIC_TEXORO_INDEX_BASE_URL para inicializar TEXORO.'
			);
		}

		const manifest = await this.#fetchJson<TexoroIndexManifest>('manifest.json', null);
		this.#manifest = manifest;

		if (this.#cacheInIndexedDb) {
			await this.#cache.clearMismatchedVersion(manifest.indexVersion);
		}

		const [worksFile, vocabRoot, kgramsRoot, wildcardLengths] = await Promise.all([
			this.#fetchJson<TexoroWorksFile>('works.json', manifest.indexVersion),
			this.#fetchJson<TexoroVocabRoot>('vocab.json', manifest.indexVersion),
			this.#fetchJson<TexoroKgramsRoot>('kgrams.json', manifest.indexVersion),
			this.#fetchJson<TexoroWildcardLengths>('wildcard-lengths.json', manifest.indexVersion)
		]);

		this.#worksFile = worksFile;
		this.#vocabRoot = vocabRoot;
		this.#kgramsRoot = kgramsRoot;
		this.#wildcardLengths = wildcardLengths;

		this.#docRowById = new Map(worksFile.works.map((row) => [row[0], row]));
		this.#initialized = true;
	}

	async search(query: string, workMetaById: Map<string, TexoroWorkMeta>, options: SearchOptions = {}): Promise<SearchExecution> {
		const startedAt = performance.now();
		const positionsShardLoadsAtStart = this.#positionsShardLoadCount;
		const textLoadsAtStart = this.#textLoadCount;
		await this.initialize();
		const normalizedQuery = normalizePlainText(query, this.#preserveEnie);
		const parsed = options.structuredQuery
			? parseStructuredQuery(options.structuredQuery, this.#preserveEnie)
			: options.structuredClauses?.length
				? parseStructuredSearchQuery(options.structuredClauses, this.#preserveEnie)
				: parseSearchQuery(query, this.#preserveEnie);

		if (parsed.groups.length === 0) {
			return {
				query,
				normalizedQuery,
				parsed,
				results: [],
				allResults: [],
				candidateCount: 0,
				textsWithOccurrences: 0,
				totalOccurrences: 0,
				verifiedCount: 0,
				positionsShardLoads: this.#positionsShardLoadCount - positionsShardLoadsAtStart,
				textLoads: this.#textLoadCount - textLoadsAtStart,
				elapsedMs: Math.round(performance.now() - startedAt)
			};
		}

		const groupEvaluations: GroupEvaluation[] = [];
		const retrievalScores = new Map<number, number>();

		for (const group of parsed.groups) {
			const evaluated = await this.#evaluateGroup(group);
			groupEvaluations.push(evaluated);
			for (const [docId, score] of evaluated.scores) {
				const current = retrievalScores.get(docId) ?? 0;
				if (score > current) retrievalScores.set(docId, score);
			}
		}

		const candidates = unionSets(groupEvaluations.map((group) => group.docs));
		const allowedWorkIds = Array.isArray(options.workIds)
			? new Set(options.workIds.map((workId) => workId.trim()).filter(Boolean))
			: null;
		const orderedCandidates = sortedNumeric(candidates).sort(
			(a, b) => (retrievalScores.get(b) ?? 0) - (retrievalScores.get(a) ?? 0)
		);
		const scopedCandidates = allowedWorkIds
			? orderedCandidates.filter((docId) => {
					const row = this.#docRowById.get(docId);
					return row ? allowedWorkIds.has(row[1]) : false;
				})
			: orderedCandidates;

		const verifiedCount = 0;
		const rawResults: SearchResult[] = [];

		for (const docId of scopedCandidates) {
			const matchByKey = new Map<string, SearchResultMatch>();
			let matchedGroups = 0;
			const addMatch = (kind: SearchResultMatch['kind'], source: string, occurrences: number): void => {
				if (occurrences <= 0) return;
				const key = `${kind}:${source}`;
				const existing = matchByKey.get(key);
				if (existing) {
					existing.occurrences = Math.max(existing.occurrences, occurrences);
					return;
				}
				matchByKey.set(key, {
					kind,
					source,
					occurrences
				});
			};

			for (const group of groupEvaluations) {
				if (!group.docs.has(docId)) continue;

				let groupOk = true;
				const consumedByProximity = new Set<string>();
				for (const clause of group.clauses) {
					if (clause.clause.kind !== 'proximity') continue;
					consumedByProximity.add(this.#formatClauseSource(clause.clause.left));
				}

				for (const clause of group.clauses) {
					const clauseSource = this.#formatClauseSource(clause.clause);
					if (clause.clause.kind === 'term') {
						if (!consumedByProximity.has(clauseSource)) {
							addMatch('term', clause.clause.pattern, clause.scores.get(docId) ?? 0);
						}
						continue;
					}
					if (clause.clause.kind === 'proximity') {
						addMatch(
							'proximity',
							this.#formatProximitySource(
								clause.clause.left,
								clause.clause.right,
								clause.clause.distance,
								clause.clause.order
							),
							clause.scores.get(docId) ?? 0
						);
						continue;
					}

					const phraseCount = clause.scores.get(docId) ?? 0;
					if (phraseCount <= 0) {
						groupOk = false;
						break;
					}
					if (!consumedByProximity.has(clauseSource)) {
						addMatch('phrase', `"${clause.clause.literal}"`, phraseCount);
					}
				}

				if (!groupOk) continue;
				matchedGroups += 1;
			}

			if (matchedGroups === 0) continue;

			const row = this.#docRowById.get(docId);
			if (!row) continue;
			const workId = row[1];

			rawResults.push({
				workId,
				docId,
				docTokenCount: row[4],
				score: (retrievalScores.get(docId) ?? 0) + matchedGroups,
				meta: workMetaById.get(workId),
				matches: Array.from(matchByKey.values())
			});
		}

		rawResults.sort((a, b) => b.score - a.score || a.docId - b.docId);
		const textsWithOccurrences = rawResults.length;
		const totalOccurrences = rawResults.reduce(
			(acc, result) =>
				acc + result.matches.reduce((matchAcc, match) => matchAcc + (match.occurrences ?? 0), 0),
			0
		);

		const limit = options.limit ?? DEFAULT_LIMIT;
		const results = rawResults.slice(0, limit);
		if (options.includeSnippets === true) {
			await this.#fillMissingSnippets(results, parsed, options.snippetRadius);
		}

		return {
			query,
			normalizedQuery,
			parsed,
			results,
			allResults: rawResults,
			candidateCount: scopedCandidates.length,
			textsWithOccurrences,
			totalOccurrences,
			verifiedCount,
			positionsShardLoads: this.#positionsShardLoadCount - positionsShardLoadsAtStart,
			textLoads: this.#textLoadCount - textLoadsAtStart,
			elapsedMs: Math.round(performance.now() - startedAt)
		};
	}

	async ensureSnippets(results: SearchResult[], query: string, options: Pick<SearchOptions, 'snippetRadius'> = {}): Promise<void> {
		if (results.length === 0) return;
		await this.initialize();
		const parsed = parseSearchQuery(query, this.#preserveEnie);
		if (parsed.groups.length === 0) return;
		await this.#fillMissingSnippets(results, parsed, options.snippetRadius);
	}

	async getOccurrencesForMatch(
		result: Pick<SearchResult, 'docId' | 'workId'>,
		match: SearchResultMatch,
		options: MatchOccurrencesOptions = {}
	): Promise<SearchMatchOccurrences> {
		await this.initialize();
		const prepared = await this.#getPreparedText(result.docId);
		if (!prepared) {
			return {
				workId: result.workId,
				docId: result.docId,
				match,
				count: 0,
				items: [],
				truncated: false
			};
		}

		const maxItems = options.maxItems ?? 300;
		const snippetRadius = options.snippetRadius ?? DEFAULT_SNIPPET_RADIUS;
		const snippetMode = options.snippetMode === 'lines' ? 'lines' : 'chars';
		const lineContext = options.lineContext ?? DEFAULT_LINE_CONTEXT;
		const lineRanges = snippetMode === 'lines' ? buildTextLineRanges(prepared.raw) : [];
		const buildOccurrenceSnippet = (
			start: number,
			end: number,
			highlights: RawOccurrenceHighlight[]
		): Pick<SearchMatchOccurrence, 'snippet' | 'highlights'> =>
			snippetMode === 'lines'
				? buildLineSnippetWithHighlights(prepared.raw, start, end, highlights, lineRanges, lineContext)
				: buildSnippetWithHighlights(prepared.raw, start, end, highlights, snippetRadius);
		const patterns = this.#extractPatternsFromMatch(match);
		if (patterns.length === 0) {
			return {
				workId: result.workId,
				docId: result.docId,
				match,
				count: 0,
				items: [],
				truncated: false
			};
		}

		const items: SearchMatchOccurrence[] = [];
		let count = 0;

		if (match.kind === 'proximity') {
			const proximity = this.#parseProximitySource(match.source);
			if (!proximity) {
				return {
					workId: result.workId,
					docId: result.docId,
					match,
					count: 0,
					items: [],
					truncated: false
				};
			}
			const leftSpans = findPreparedSpans(prepared.tokens, proximity.left);
			const rightSpans = findPreparedSpans(prepared.tokens, proximity.right);

			for (const leftSpan of leftSpans) {
				for (const rightSpan of rightSpans) {
					const gap = this.#proximityGap(leftSpan, rightSpan, proximity.order);
					if (gap === null) continue;
					if (gap > proximity.distance) {
						if (rightSpan.tokenStart > leftSpan.tokenEnd) break;
						continue;
					}
					count += 1;
					if (items.length < maxItems) {
						const first = leftSpan.start < rightSpan.start ? leftSpan : rightSpan;
						const last = leftSpan.start < rightSpan.start ? rightSpan : leftSpan;
						const snippet = buildOccurrenceSnippet(
							first.start,
							last.end,
							[
								{ start: leftSpan.start, end: leftSpan.end, tokenIndex: leftSpan.tokenStart + 1 },
								{ start: rightSpan.start, end: rightSpan.end, tokenIndex: rightSpan.tokenStart + 1 }
							]
						);
						items.push({
							start: first.start,
							end: last.end,
							tokenIndex: Math.min(leftSpan.tokenStart, rightSpan.tokenStart) + 1,
							tokenEndIndex: Math.max(leftSpan.tokenEnd, rightSpan.tokenEnd) + 1,
							tokenCount: prepared.tokens.length,
							...snippet
						});
					}
				}
			}
		} else if (match.kind === 'term') {
			const regexes = patterns.map((pattern) => wildcardToRegex(pattern));
			for (let index = 0; index < prepared.tokens.length; index += 1) {
				const token = prepared.tokens[index];
				if (!regexes.some((regex) => regex.test(token.norm))) continue;
				count += 1;
				if (items.length < maxItems) {
					const snippet = buildOccurrenceSnippet(
						token.start,
						token.end,
						[{ start: token.start, end: token.end, tokenIndex: index + 1 }]
					);
					items.push({
						start: token.start,
						end: token.end,
						tokenIndex: index + 1,
						tokenEndIndex: index + 1,
						tokenCount: prepared.tokens.length,
						...snippet
					});
				}
			}
		} else {
			const regexes = patterns.map((pattern) => wildcardToRegex(pattern));
			const tokenCount = prepared.tokens.length;
			const maxStart = tokenCount - regexes.length;
			for (let start = 0; start <= maxStart; start += 1) {
				let matched = true;
				for (let offset = 0; offset < regexes.length; offset += 1) {
					const token = prepared.tokens[start + offset];
					if (!regexes[offset].test(token.norm)) {
						matched = false;
						break;
					}
				}
				if (!matched) continue;
				count += 1;
				if (items.length < maxItems) {
					const first = prepared.tokens[start];
					const last = prepared.tokens[start + regexes.length - 1];
					const snippet = buildOccurrenceSnippet(
						first.start,
						last.end,
						[{ start: first.start, end: last.end, tokenIndex: start + 1 }]
					);
					items.push({
						start: first.start,
						end: last.end,
						tokenIndex: start + 1,
						tokenEndIndex: start + regexes.length,
						tokenCount,
						...snippet
					});
				}
			}
		}

		return {
			workId: result.workId,
			docId: result.docId,
			match,
			count,
			items,
			truncated: count > items.length
		};
	}

	async #fillMissingSnippets(results: SearchResult[], parsed: ParsedQuery, snippetRadius?: number): Promise<void> {
		const fallbackPatterns = parsed.groups
			.flatMap((group) => group)
			.flatMap((clause) => this.#patternsForClause(clause))
			.slice(0, 6);

		if (fallbackPatterns.length === 0) return;

		for (const result of results) {
			if (result.snippet) continue;
			const snippet = await this.#findSnippetForPatterns(result.docId, fallbackPatterns, snippetRadius);
			if (snippet) result.snippet = snippet;
		}
	}

	async #findSnippetForPatterns(
		docId: number,
		patterns: string[],
		snippetRadius = DEFAULT_SNIPPET_RADIUS
	): Promise<string | undefined> {
		const prepared = await this.#getPreparedText(docId);
		if (!prepared) return undefined;
		const regexes = patterns.map((pattern) => wildcardToRegex(pattern));
		for (const token of prepared.tokens) {
			if (regexes.some((regex) => regex.test(token.norm))) {
				return buildSnippet(prepared.raw, token.start, token.end, snippetRadius);
			}
		}
		return undefined;
	}

	#extractPatternsFromMatch(match: SearchResultMatch): string[] {
		if (match.kind === 'proximity') {
			const proximity = this.#parseProximitySource(match.source);
			const parts = proximity
				? [...proximity.left, ...proximity.right]
				: match.source.split(/\s+~(?:any|after|before)<=\d+\s+|\s+~\d+\s+/);
			return parts
				.flatMap((part) => part.trim().split(/\s+/))
				.map((part) => normalizePattern(part, this.#preserveEnie))
				.filter((part) => part.length > 0);
		}
		if (match.kind === 'term') {
			const normalized = normalizePattern(match.source, this.#preserveEnie);
			return normalized ? [normalized] : [];
		}

		const source = match.source.trim();
		const phraseBody =
			source.startsWith('"') && source.endsWith('"') ? source.slice(1, -1) : source;
		const patterns = phraseBody
			.split(/\s+/)
			.map((part) => normalizePattern(part, this.#preserveEnie))
			.filter((part) => part.length > 0);
		return patterns;
	}

	#patternsForClause(clause: ParsedQueryClause): string[] {
		if (clause.kind === 'term') return [clause.pattern];
		if (clause.kind === 'phrase') return clause.patterns;
		return [...this.#patternsForClause(clause.left), ...this.#patternsForClause(clause.right)];
	}

	#parseProximitySource(
		source: string
	): { left: string[]; right: string[]; distance: number; order: 'any' | 'after' | 'before' } | null {
		const match = source.match(/^(.*?)\s+~(any|after|before)<=(\d+)\s+(.*?)$/);
		const legacyMatch = match ? null : source.match(/^(.*?)\s+~(\d+)\s+(.*?)$/);
		const parts = match
			? { left: match[1], order: match[2] as 'any' | 'after' | 'before', distance: match[3], right: match[4] }
			: legacyMatch
				? { left: legacyMatch[1], order: 'after' as const, distance: legacyMatch[2], right: legacyMatch[3] }
				: null;
		if (!parts) return null;
		const left = parts.left
			.replace(/^"|"$/g, '')
			.split(/\s+/)
			.map((part) => normalizePattern(part, this.#preserveEnie))
			.filter(Boolean);
		const right = parts.right
			.replace(/^"|"$/g, '')
			.split(/\s+/)
			.map((part) => normalizePattern(part, this.#preserveEnie))
			.filter(Boolean);
		const parsedDistance = Number.parseInt(parts.distance, 10);
		const distance = Math.min(100, Math.max(0, Number.isFinite(parsedDistance) ? parsedDistance : 0));
		return left.length && right.length ? { left, right, distance, order: parts.order } : null;
	}

	async getPreviewsForResults(
		items: PreviewRequestItem[],
		options: PreviewOptions = {}
	): Promise<{
		items: Array<{
			docId: number;
			workId: string;
			snippets: Array<SearchMatchOccurrence & { matchKey: string }>;
		}>;
	}> {
		await this.initialize();
		const maxItemsPerDoc = Math.max(1, Math.min(options.maxItemsPerDoc ?? 3, 10));
		const snippetRadius = options.snippetRadius ?? DEFAULT_SNIPPET_RADIUS;
		const output: Array<{
			docId: number;
			workId: string;
			snippets: Array<SearchMatchOccurrence & { matchKey: string }>;
		}> = [];

		for (const item of items) {
			const snippets: Array<SearchMatchOccurrence & { matchKey: string }> = [];
			for (const match of item.matches) {
				if (snippets.length >= maxItemsPerDoc) break;
				const remainingItems = Math.max(1, maxItemsPerDoc - snippets.length);
				const details = await this.getOccurrencesForMatch(
					{ docId: item.docId, workId: item.workId },
					match,
					{ maxItems: match.kind === 'proximity' ? 1 : remainingItems, snippetRadius }
				);
				for (const occurrence of details.items) {
					snippets.push({
						...occurrence,
						matchKey: `${match.kind}:${match.source}`
					});
					if (match.kind === 'proximity' || snippets.length >= maxItemsPerDoc) break;
				}
			}
			output.push({ docId: item.docId, workId: item.workId, snippets });
		}

		return { items: output };
	}

	#formatClauseSource(clause: ParsedQueryClause): string {
		if (clause.kind === 'term') return clause.pattern;
		if (clause.kind === 'phrase') return `"${clause.literal}"`;
		return this.#formatProximitySource(clause.left, clause.right, clause.distance, clause.order);
	}

	#formatProximitySource(
		left: ParsedQueryClause,
		right: ParsedQueryClause,
		distance: number,
		order: 'any' | 'after' | 'before'
	): string {
		return `${this.#formatClauseSource(left)} ~${order}<=${distance} ${this.#formatClauseSource(right)}`;
	}

	async #getPreparedText(docId: number): Promise<PreparedText | null> {
		const memory = this.#preparedTexts.get(docId);
		if (memory) return memory;
		const pending = this.#preparedTextLoads.get(docId);
		if (pending) return pending;

		const loadPromise = (async () => {
			const row = this.#docRowById.get(docId);
			if (!row) return null;
			const textKey = row[3];
			const manifest = this.#manifest;
			if (!manifest) return null;

			const cacheKey = `text:${textKey}`;
			let rawText: string | null = null;
			if (this.#cacheInIndexedDb) {
				rawText = await this.#cache.getText(cacheKey, manifest.indexVersion);
			}

			if (!rawText) {
				if (this.#textLoader) {
					rawText = await this.#textLoader(textKey);
					if (!rawText) {
						throw new Error(`Unable to fetch text ${textKey}: 404`);
					}
				} else {
					if (!this.#textsBaseUrl) {
						throw new Error('No hay cargador de TXT configurado para TEXORO.');
					}
					const response = await fetch(
						withIndexVersion(joinUrl(this.#textsBaseUrl, encodeURIComponent(textKey)), manifest.indexVersion)
					);
					if (!response.ok) {
						throw new Error(`Unable to fetch text ${textKey}: ${response.status}`);
					}
					rawText = await response.text();
				}
				if (this.#cacheInIndexedDb) {
					await this.#cache.setText(cacheKey, manifest.indexVersion, rawText);
				}
			}

			const prepared: PreparedText = {
				raw: rawText,
				tokens: tokenizeWithOffsets(rawText, this.#preserveEnie)
			};
			this.#textLoadCount += 1;
			this.#preparedTexts.set(docId, prepared);
			this.#trimPreparedTextCache();
			return prepared;
		})();

		this.#preparedTextLoads.set(docId, loadPromise);
		try {
			return await loadPromise;
		} finally {
			this.#preparedTextLoads.delete(docId);
		}
	}

	async #evaluateGroup(group: ParsedQueryClause[]): Promise<GroupEvaluation> {
		let currentDocs: Set<number> | null = null;
		let currentScores = new Map<number, number>();
		const clauses: ClauseEvaluation[] = [];

		for (const clause of group) {
			const evaluated = await this.#evaluateClause(clause);
			clauses.push(evaluated);

			if (currentDocs === null) {
				currentDocs = new Set(evaluated.docs);
				currentScores = new Map(evaluated.scores);
				continue;
			}

			const nextDocs = intersectSets(currentDocs, evaluated.docs);
			const nextScores = new Map<number, number>();
			for (const docId of nextDocs) {
				nextScores.set(docId, (currentScores.get(docId) ?? 0) + (evaluated.scores.get(docId) ?? 0));
			}
			currentDocs = nextDocs;
			currentScores = nextScores;
		}

		return {
			clauses,
			docs: currentDocs ?? new Set<number>(),
			scores: currentScores
		};
	}

	async #evaluateClause(clause: ParsedQueryClause): Promise<ClauseEvaluation> {
		if (clause.kind === 'term') {
			return this.#evaluateTermClause(clause.pattern, clause);
		}
		if (clause.kind === 'proximity') {
			return this.#evaluateProximityClause(clause);
		}
		return this.#evaluatePhraseClause(clause.patterns, clause);
	}

	#trimPreparedTextCache(): void {
		while (this.#preparedTexts.size > this.#preparedTextCacheMaxDocs) {
			const firstKey = this.#preparedTexts.keys().next().value as number | undefined;
			if (firstKey === undefined) return;
			this.#preparedTexts.delete(firstKey);
		}
	}

	async #evaluateTermClause(pattern: string, clause: ParsedQueryClause): Promise<ClauseEvaluation> {
		const termIds = await this.#resolvePatternTermIds(pattern);
		const docs = new Set<number>();
		const scores = new Map<number, number>();

		for (const termId of termIds) {
			const postings = await this.#getPostingsForTerm(termId);
			for (const [docId, tf] of postings) {
				docs.add(docId);
				scores.set(docId, (scores.get(docId) ?? 0) + tf);
			}
		}

		return { clause, docs, scores };
	}

	async #evaluatePhraseClause(patterns: string[], clause: ParsedQueryClause): Promise<ClauseEvaluation> {
		if (patterns.length === 0) {
			return { clause, docs: new Set<number>(), scores: new Map<number, number>() };
		}

		const positions = await this.#positionsForSimpleClause(clause);
		const docs = new Set<number>();
		const scores = new Map<number, number>();
		for (const [docId, occurrences] of positions) {
			if (occurrences.length <= 0) continue;
			docs.add(docId);
			scores.set(docId, occurrences.length);
		}

		return { clause, docs, scores };
	}

	#proximityGap(
		left: { tokenStart: number; tokenEnd: number },
		right: { tokenStart: number; tokenEnd: number },
		order: 'any' | 'after' | 'before'
	): number | null {
		if (right.tokenStart > left.tokenEnd) {
			return order === 'before' ? null : right.tokenStart - left.tokenEnd - 1;
		}
		if (right.tokenEnd < left.tokenStart) {
			return order === 'after' ? null : left.tokenStart - right.tokenEnd - 1;
		}
		return null;
	}

	async #evaluateProximityClause(clause: Extract<ParsedQueryClause, { kind: 'proximity' }>): Promise<ClauseEvaluation> {
		const [leftPositions, rightPositions] = await Promise.all([
			this.#positionsForSimpleClause(clause.left),
			this.#positionsForSimpleClause(clause.right)
		]);
		const docs = new Set<number>();
		const scores = new Map<number, number>();

		for (const [docId, leftOccurrences] of leftPositions) {
			const rightOccurrences = rightPositions.get(docId);
			if (!rightOccurrences || leftOccurrences.length === 0 || rightOccurrences.length === 0) continue;
			let count = 0;

			for (const left of leftOccurrences) {
				for (const right of rightOccurrences) {
					const gap = this.#proximityGap(left, right, clause.order);
					if (gap === null) continue;
					if (gap > clause.distance) {
						if (right.tokenStart > left.tokenEnd) break;
						continue;
					}
					count += 1;
				}
			}
			if (count <= 0) continue;
			docs.add(docId);
			scores.set(docId, count);
		}

		return { clause, docs, scores };
	}

	async #positionsForSimpleClause(
		clause: ParsedQueryClause
	): Promise<Map<number, ClausePositionOccurrence[]>> {
		if (clause.kind === 'proximity') {
			return this.#positionsForSimpleClause(clause.right);
		}
		if (clause.kind === 'term') {
			const termIds = await this.#resolvePatternTermIds(clause.pattern);
			const byDoc = new Map<number, ClausePositionOccurrence[]>();
			for (const termId of termIds) {
				const docs = await this.#getPositionsForTerm(termId);
				for (const [docId, , occurrences] of docs) {
					const current = byDoc.get(docId) ?? [];
					current.push(
						...occurrences.map((occurrence) => ({
							tokenStart: occurrence[0],
							tokenEnd: occurrence[0],
							byteStart: occurrence[1],
							byteEnd: occurrence[2]
						}))
					);
					byDoc.set(docId, current);
				}
			}
			for (const occurrences of byDoc.values()) {
				occurrences.sort((a, b) => a.tokenStart - b.tokenStart || a.tokenEnd - b.tokenEnd);
			}
			return byDoc;
		}

		const patternDocs: Array<Map<number, ClausePositionOccurrence[]>> = [];
		for (const pattern of clause.patterns) {
			patternDocs.push(await this.#positionsForSimpleClause({ kind: 'term', pattern }));
		}
		if (patternDocs.length === 0) return new Map();

		const output = new Map<number, ClausePositionOccurrence[]>();
		for (const [docId, starts] of patternDocs[0]) {
			const occurrenceSets = patternDocs.map((byDoc) => byDoc.get(docId));
			if (occurrenceSets.some((items) => !items || items.length === 0)) continue;
			const tokenLookup = occurrenceSets.map(
				(items) => new Map((items ?? []).map((occurrence) => [occurrence.tokenStart, occurrence]))
			);
			const matches: ClausePositionOccurrence[] = [];
			for (const start of starts) {
				let last = start;
				let matched = true;
				for (let offset = 1; offset < tokenLookup.length; offset += 1) {
					const next = tokenLookup[offset].get(start.tokenStart + offset);
					if (!next) {
						matched = false;
						break;
					}
					last = next;
				}
				if (matched) {
					matches.push({
						tokenStart: start.tokenStart,
						tokenEnd: last.tokenEnd,
						byteStart: start.byteStart,
						byteEnd: last.byteEnd
					});
				}
			}
			if (matches.length > 0) output.set(docId, matches);
		}
		return output;
	}

	async #resolvePatternTermIds(pattern: string): Promise<number[]> {
		const cached = this.#patternTermIds.get(pattern);
		if (cached) return cached;

		const normalizedPattern = normalizePattern(pattern, this.#preserveEnie);
		if (!normalizedPattern) {
			this.#patternTermIds.set(pattern, []);
			return [];
		}

		const termIds = normalizedPattern.includes('*') || normalizedPattern.includes('?')
			? await this.#resolveWildcardPattern(normalizedPattern)
			: await this.#resolveExactPattern(normalizedPattern);

		this.#patternTermIds.set(pattern, termIds);
		return termIds;
	}

	async #resolveExactPattern(term: string): Promise<number[]> {
		const shardMeta = this.#vocabRoot?.shards.find((shard) => term >= shard.termMin && term <= shard.termMax);
		if (!shardMeta) return [];
		const shard = await this.#loadVocabShard(shardMeta.id);
		const row = shard.terms.find((entry) => entry[0] === term);
		if (!row) return [];
		return [row[1]];
	}

	async #resolveWildcardPattern(pattern: string): Promise<number[]> {
		const allStars = /^\*+$/.test(pattern);
		if (allStars) {
			return this.#getAllTermIds();
		}
		if (isPrefixPattern(pattern)) {
			const prefix = pattern.slice(0, -1);
			if (!prefix) return this.#getAllTermIds();
			return this.#resolvePrefixPattern(prefix);
		}

		const lengthCandidates = this.#candidateTermIdsByLength(pattern);
		let candidateIds: number[] | null = lengthCandidates;

		const requiredKgrams = this.#requiredKgramsForPattern(pattern);
		if (requiredKgrams.length > 0) {
			const gramCandidates: number[][] = [];
			for (const gram of requiredKgrams) {
				const ids = await this.#getTermIdsForKgram(gram);
				if (ids.length === 0) {
					this.#patternTermIds.set(pattern, []);
					return [];
				}
				gramCandidates.push(ids);
			}
			candidateIds = this.#intersectSortedLists(gramCandidates);
			if (lengthCandidates) {
				candidateIds = this.#intersectSortedLists([candidateIds, lengthCandidates]);
			}
		}

		const regex = wildcardToRegex(pattern);
		const filtered: number[] = [];

		for (const termId of candidateIds ?? []) {
			const termMeta = await this.#getTermMeta(termId);
			if (!termMeta) continue;
			if (!regex.test(termMeta.term)) continue;
			filtered.push(termId);
		}

		return filtered.sort((a, b) => a - b);
	}

	async #resolvePrefixPattern(prefix: string): Promise<number[]> {
		const root = this.#vocabRoot;
		if (!root) return [];
		const output: number[] = [];
		for (const shardMeta of root.shards) {
			if (!shardMayContainPrefix(shardMeta.termMin, shardMeta.termMax, prefix)) continue;
			const shard = await this.#loadVocabShard(shardMeta.id);
			for (const row of shard.terms) {
				if (!row[0].startsWith(prefix)) continue;
				output.push(row[1]);
			}
		}
		return output.sort((a, b) => a - b);
	}

	#candidateTermIdsByLength(pattern: string): number[] | null {
		const lengths = this.#wildcardLengths?.lengths;
		if (!lengths || lengths.length === 0) return [];

		const minLength = Array.from(pattern).filter((char) => char !== '*').length;
		const hasStar = pattern.includes('*');
		const maxLength = hasStar ? Number.POSITIVE_INFINITY : minLength;

		const selected: number[] = [];
		for (const [length, ids] of lengths) {
			if (length < minLength) continue;
			if (length > maxLength) continue;
			selected.push(...ids);
		}
		return selected.length > 0 ? selected.sort((a, b) => a - b) : [];
	}

	#requiredKgramsForPattern(pattern: string): string[] {
		const k = this.#kgramsRoot?.k ?? 3;
		const hasLeadingWildcard = pattern.startsWith('*');
		const hasTrailingWildcard = pattern.endsWith('*');
		const padded = `${hasLeadingWildcard ? '' : '$'}${pattern}${hasTrailingWildcard ? '' : '$'}`;
		const pieces = padded.split(/[*?]+/).filter((piece) => piece.length > 0);
		const grams = new Set<string>();

		for (const piece of pieces) {
			if (piece.length < k) continue;
			for (let i = 0; i <= piece.length - k; i += 1) {
				grams.add(piece.slice(i, i + k));
			}
		}

		return Array.from(grams).sort();
	}

	async #getTermIdsForKgram(gram: string): Promise<number[]> {
		const shardMeta = this.#kgramsRoot?.shards.find((shard) => gram >= shard.gramMin && gram <= shard.gramMax);
		if (!shardMeta) return [];
		const shard = await this.#loadKgramShard(shardMeta.id);
		const row = shard.grams.find((entry) => entry[0] === gram);
		if (!row) return [];
		return row[1];
	}

	#intersectSortedLists(lists: number[][]): number[] {
		if (lists.length === 0) return [];
		if (lists.length === 1) return [...lists[0]];
		const sortedByLength = [...lists].sort((a, b) => a.length - b.length);
		let result = sortedByLength[0];
		for (let i = 1; i < sortedByLength.length; i += 1) {
			const set = new Set(sortedByLength[i]);
			result = result.filter((value) => set.has(value));
			if (result.length === 0) break;
		}
		return result;
	}

	async #getTermMeta(termId: number): Promise<TermMeta | undefined> {
		const cached = this.#termMetaById.get(termId);
		if (cached) return cached;

		const shardMeta = this.#vocabRoot?.shards.find(
			(shard) => termId >= shard.minTermId && termId <= shard.maxTermId
		);
		if (!shardMeta) return undefined;
		const shard = await this.#loadVocabShard(shardMeta.id);
		const row = shard.terms.find((entry) => entry[1] === termId);
		if (!row) return undefined;
		const meta: TermMeta = {
			term: row[0],
			termId: row[1],
			df: row[2],
			cf: row[3],
			len: row[4],
			postingsShard: row[5],
			positionsShard: row[6]
		};
		this.#termMetaById.set(termId, meta);
		return meta;
	}

	async #getPostingsForTerm(termId: number): Promise<Array<[number, number]>> {
		const term = await this.#getTermMeta(termId);
		if (!term) return [];
		const shardMap = await this.#loadPostingsShard(term.postingsShard);
		return shardMap.get(termId) ?? [];
	}

	async #getPositionsForTerm(termId: number): Promise<TexoroPositionsDoc[]> {
		const term = await this.#getTermMeta(termId);
		if (!term?.positionsShard) return [];
		const shardMap = await this.#loadPositionsShard(term.positionsShard);
		return shardMap.get(termId) ?? [];
	}

	async #loadVocabShard(shardId: string): Promise<TexoroVocabShard> {
		const cached = this.#vocabShards.get(shardId);
		if (cached) return cached;
		const pending = this.#vocabShardLoads.get(shardId);
		if (pending) return pending;
		const shardMeta = this.#vocabRoot?.shards.find((item) => item.id === shardId);
		if (!shardMeta) {
			throw new Error(`Missing vocab shard metadata for ${shardId}`);
		}
		const loadPromise = (async () => {
			const shard = await this.#fetchJson<TexoroVocabShard>(shardMeta.file, this.#manifest?.indexVersion ?? null);
			this.#vocabShards.set(shardId, shard);
			return shard;
		})();
		this.#vocabShardLoads.set(shardId, loadPromise);
		try {
			return await loadPromise;
		} finally {
			this.#vocabShardLoads.delete(shardId);
		}
	}

	async #loadKgramShard(shardId: string): Promise<TexoroKgramShard> {
		const cached = this.#kgramShards.get(shardId);
		if (cached) return cached;
		const pending = this.#kgramShardLoads.get(shardId);
		if (pending) return pending;
		const shardMeta = this.#kgramsRoot?.shards.find((item) => item.id === shardId);
		if (!shardMeta) {
			throw new Error(`Missing kgram shard metadata for ${shardId}`);
		}
		const loadPromise = (async () => {
			const shard = await this.#fetchJson<TexoroKgramShard>(shardMeta.file, this.#manifest?.indexVersion ?? null);
			this.#kgramShards.set(shardId, shard);
			return shard;
		})();
		this.#kgramShardLoads.set(shardId, loadPromise);
		try {
			return await loadPromise;
		} finally {
			this.#kgramShardLoads.delete(shardId);
		}
	}

	async #loadPostingsShard(shardId: string): Promise<Map<number, Array<[number, number]>>> {
		const cached = this.#postingsShards.get(shardId);
		if (cached) return cached;
		const pending = this.#postingsShardLoads.get(shardId);
		if (pending) return pending;
		const shardMeta = this.#manifest?.shards.postings.find((item) => item.id === shardId);
		if (!shardMeta) {
			throw new Error(`Missing postings shard metadata for ${shardId}`);
		}
		const loadPromise = (async () => {
			const shard = await this.#fetchJson<TexoroPostingsShard>(shardMeta.file, this.#manifest?.indexVersion ?? null);
			const map = new Map<number, Array<[number, number]>>(shard.postings);
			this.#postingsShards.set(shardId, map);
			return map;
		})();
		this.#postingsShardLoads.set(shardId, loadPromise);
		try {
			return await loadPromise;
		} finally {
			this.#postingsShardLoads.delete(shardId);
		}
	}

	async #loadPositionsShard(shardId: string): Promise<Map<number, TexoroPositionsDoc[]>> {
		const cached = this.#positionsShards.get(shardId);
		if (cached) return cached;
		const pending = this.#positionsShardLoads.get(shardId);
		if (pending) return pending;
		const shardMeta = this.#manifest?.shards.positions?.find((item) => item.id === shardId);
		if (!shardMeta) {
			throw new Error(`Missing positions shard metadata for ${shardId}`);
		}
		const loadPromise = (async () => {
			const shard = await this.#fetchJson<TexoroPositionsShard>(shardMeta.file, this.#manifest?.indexVersion ?? null);
			const map = new Map<number, TexoroPositionsDoc[]>(shard.positions);
			this.#positionsShards.set(shardId, map);
			this.#positionsShardLoadCount += 1;
			return map;
		})();
		this.#positionsShardLoads.set(shardId, loadPromise);
		try {
			return await loadPromise;
		} finally {
			this.#positionsShardLoads.delete(shardId);
		}
	}

	async #warmupVocabShards(budgetBytes: number): Promise<void> {
		const shards = this.#vocabRoot?.shards ?? [];
		if (shards.length === 0) return;
		const selected = selectShardsForBudget(shards, budgetBytes);
		if (selected.length === 0) return;
		await Promise.all(selected.map((shard) => this.#loadVocabShard(shard.id)));
	}

	async #warmupPostingsShards(budgetBytes: number): Promise<void> {
		const shards = this.#manifest?.shards.postings ?? [];
		if (shards.length === 0) return;
		const selected = selectShardsForBudget(shards, budgetBytes);
		if (selected.length === 0) return;
		await Promise.all(selected.map((shard) => this.#loadPostingsShard(shard.id)));
	}

	async #warmupKgramShards(budgetBytes: number): Promise<void> {
		const shards = this.#kgramsRoot?.shards ?? [];
		if (shards.length === 0) return;
		const selected = selectShardsForBudget(shards, budgetBytes);
		if (selected.length === 0) return;
		await Promise.all(selected.map((shard) => this.#loadKgramShard(shard.id)));
	}

	async #warmupPreparedTexts(docIds: number[], concurrency: number): Promise<void> {
		const uniqueDocIds = Array.from(new Set(docIds));
		if (uniqueDocIds.length === 0) return;

		await runWithConcurrency(uniqueDocIds, concurrency, async (docId) => {
			try {
				await this.#getPreparedText(docId);
			} catch {
				// Background warmups should stay silent; the search path will report real failures.
			}
		});
	}

	#getAllTermIds(): number[] {
		if (this.#allTermIdsCache) return this.#allTermIdsCache;
		const all = this.#wildcardLengths?.lengths.flatMap((entry) => entry[1]) ?? [];
		this.#allTermIdsCache = all.sort((a, b) => a - b);
		return this.#allTermIdsCache;
	}

	async #fetchJson<T>(relativePath: string, indexVersion: string | null): Promise<T> {
		const cacheKey = `json:${relativePath}`;
		if (indexVersion && this.#cacheInIndexedDb) {
			const cached = await this.#cache.getJson<T>(cacheKey, indexVersion);
			if (cached && readPayloadIndexVersion(cached) === indexVersion) return cached;
		}

		const isManifest = relativePath === 'manifest.json';
		const requestUrl = joinUrl(this.#indexBaseUrl, relativePath);
		const fetchJsonFromUrl = async (url: string, init?: RequestInit): Promise<T> => {
			const response = await fetch(url, init);
			if (!response.ok) {
				throw new Error(`Unable to fetch ${relativePath}: ${response.status}`);
			}
			return (await response.json()) as T;
		};

		let data = await fetchJsonFromUrl(
			isManifest ? withCacheBuster(requestUrl) : withIndexVersion(requestUrl, indexVersion),
			isManifest ? { cache: 'no-store' } : undefined
		);

		if (indexVersion && readPayloadIndexVersion(data) !== indexVersion) {
			data = await fetchJsonFromUrl(withCacheBuster(withIndexVersion(requestUrl, indexVersion)), {
				cache: 'no-store'
			});
			const payloadIndexVersion = readPayloadIndexVersion(data);
			if (payloadIndexVersion !== indexVersion) {
				throw new Error(
					`Index version mismatch for ${relativePath}: expected ${indexVersion}, got ${payloadIndexVersion ?? 'missing'}`
				);
			}
		}

		if (indexVersion && this.#cacheInIndexedDb) {
			await this.#cache.setJson(cacheKey, indexVersion, data);
		}

		return data;
	}
}

export const buildWorkMetaMap = (items: TexoroWorkMeta[]): Map<string, TexoroWorkMeta> =>
	new Map(items.map((item) => [item.id, item]));

export const isPrefixPattern = (pattern: string): boolean => /\*$/.test(pattern) && !pattern.slice(0, -1).includes('*') && !pattern.includes('?');

export const shardMayContainPrefix = (termMin: string, termMax: string, prefix: string): boolean =>
	rangeIntersectsPrefix(termMin, termMax, prefix);



