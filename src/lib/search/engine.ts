import { env as publicEnv } from '$env/dynamic/public';

import { IndexedDbCache } from './idb-cache';
import { buildSnippet, normalizePattern, normalizePlainText, tokenizeWithOffsets } from './normalize';
import { parseSearchQuery } from './query';

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
	TexoroVocabRoot,
	TexoroVocabShard,
	TexoroWildcardLengths,
	TexoroWorkMeta,
	TexoroWorksFile
} from './types';

interface SearchEngineConfig {
	indexBaseUrl?: string;
	textsBaseUrl?: string;
	preserveEnie?: boolean;
	cacheInIndexedDb?: boolean;
}

interface MatchOccurrencesOptions {
	maxItems?: number;
	snippetRadius?: number;
}

interface WarmupOptions {
	vocabBudgetBytes?: number;
	postingsBudgetBytes?: number;
	kgramBudgetBytes?: number;
}

interface TermMeta {
	term: string;
	termId: number;
	df: number;
	cf: number;
	len: number;
	postingsShard: string;
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
	hasPhrase: boolean;
}

interface PreparedText {
	raw: string;
	tokens: ReturnType<typeof tokenizeWithOffsets>;
}

const DEFAULT_LIMIT = 30;
const DEFAULT_MAX_PHRASE_VERIFY_DOCS = 200;
const DEFAULT_SNIPPET_RADIUS = 110;
const DEFAULT_WARMUP_VOCAB_BUDGET = 900_000;
const DEFAULT_WARMUP_POSTINGS_BUDGET = 900_000;
const DEFAULT_WARMUP_KGRAM_BUDGET = 800_000;

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const joinUrl = (base: string, path: string): string => `${stripTrailingSlash(base)}/${path.replace(/^\/+/, '')}`;

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

export class TexoroSearchEngine {
	readonly #indexBaseUrl: string;
	readonly #textsBaseUrl: string;
	readonly #preserveEnie: boolean;
	readonly #cacheInIndexedDb: boolean;
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
	#termMetaById = new Map<number, TermMeta>();
	#patternTermIds = new Map<string, number[]>();
	#preparedTexts = new Map<number, PreparedText>();
	#vocabShardLoads = new Map<string, Promise<TexoroVocabShard>>();
	#kgramShardLoads = new Map<string, Promise<TexoroKgramShard>>();
	#postingsShardLoads = new Map<string, Promise<Map<number, Array<[number, number]>>>>();
	#firstSearchWarmupPromise: Promise<void> | null = null;
	#wildcardWarmupPromise: Promise<void> | null = null;

	#docRowById = new Map<number, [number, string, string, string, number, number]>();
	#allTermIdsCache: number[] | null = null;

	constructor(config: SearchEngineConfig = {}) {
		this.#indexBaseUrl =
			stripTrailingSlash(config.indexBaseUrl || publicEnv.PUBLIC_TEXORO_INDEX_BASE_URL || '/api/texoro/index');
		this.#textsBaseUrl =
			stripTrailingSlash(config.textsBaseUrl || publicEnv.PUBLIC_TEXORO_TEXTS_BASE_URL || '/api/texoro/texts');
		this.#preserveEnie = config.preserveEnie ?? true;
		this.#cacheInIndexedDb = config.cacheInIndexedDb ?? true;
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

	async initialize(): Promise<void> {
		if (this.#initialized) return;

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
		await this.initialize();
		const normalizedQuery = normalizePlainText(query, this.#preserveEnie);
		const parsed = parseSearchQuery(query, this.#preserveEnie);

		if (parsed.groups.length === 0) {
			return {
				query,
				normalizedQuery,
				parsed,
				results: [],
				candidateCount: 0,
				textsWithOccurrences: 0,
				totalOccurrences: 0,
				verifiedCount: 0,
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
		const orderedCandidates = sortedNumeric(candidates).sort(
			(a, b) => (retrievalScores.get(b) ?? 0) - (retrievalScores.get(a) ?? 0)
		);

		const hasPhrase = groupEvaluations.some((group) => group.hasPhrase);
		const maxPhraseVerificationDocs = options.maxPhraseVerificationDocs ?? DEFAULT_MAX_PHRASE_VERIFY_DOCS;
		const verifiableDocs = new Set<number>(
			hasPhrase ? orderedCandidates.slice(0, maxPhraseVerificationDocs) : orderedCandidates
		);

		let verifiedCount = 0;
		const rawResults: SearchResult[] = [];

		for (const docId of orderedCandidates) {
			const matchByKey = new Map<string, SearchResultMatch>();
			let matchedGroups = 0;
			let snippet: string | undefined;
			const addMatch = (kind: SearchResultMatch['kind'], source: string, occurrences: number): void => {
				if (occurrences <= 0) return;
				const key = `${kind}:${source}`;
				const existing = matchByKey.get(key);
				if (existing) {
					existing.occurrences += occurrences;
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
				let groupSnippet: string | undefined;

				for (const clause of group.clauses) {
					if (clause.clause.kind === 'term') {
						addMatch('term', clause.clause.pattern, clause.scores.get(docId) ?? 0);
						continue;
					}

					if (!verifiableDocs.has(docId)) {
						groupOk = false;
						break;
					}

					const phraseMatch = await this.#verifyPhraseClause(
						docId,
						clause.clause.patterns,
						options.snippetRadius
					);
					verifiedCount += 1;
					if (!phraseMatch.matched) {
						groupOk = false;
						break;
					}
					addMatch('phrase', `"${clause.clause.literal}"`, phraseMatch.count);
					if (!groupSnippet && phraseMatch.snippet) {
						groupSnippet = phraseMatch.snippet;
					}
				}

				if (!groupOk) continue;
				matchedGroups += 1;
				if (!snippet && groupSnippet) snippet = groupSnippet;
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
				snippet,
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
		await this.#fillMissingSnippets(results, parsed, options.snippetRadius);

		return {
			query,
			normalizedQuery,
			parsed,
			results,
			candidateCount: orderedCandidates.length,
			textsWithOccurrences,
			totalOccurrences,
			verifiedCount,
			elapsedMs: Math.round(performance.now() - startedAt)
		};
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

		if (match.kind === 'term') {
			const regexes = patterns.map((pattern) => wildcardToRegex(pattern));
			for (const token of prepared.tokens) {
				if (!regexes.some((regex) => regex.test(token.norm))) continue;
				count += 1;
				if (items.length < maxItems) {
					items.push({
						start: token.start,
						end: token.end,
						snippet: buildSnippet(prepared.raw, token.start, token.end, snippetRadius)
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
					items.push({
						start: first.start,
						end: last.end,
						snippet: buildSnippet(prepared.raw, first.start, last.end, snippetRadius)
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
			.flatMap((clause) => (clause.kind === 'term' ? [clause.pattern] : clause.patterns))
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

	async #verifyPhraseClause(
		docId: number,
		patterns: string[],
		snippetRadius = DEFAULT_SNIPPET_RADIUS
	): Promise<{ matched: boolean; count: number; snippet?: string }> {
		const prepared = await this.#getPreparedText(docId);
		if (!prepared) return { matched: false, count: 0 };
		if (patterns.length === 0) return { matched: false, count: 0 };

		const tokenCount = prepared.tokens.length;
		if (tokenCount < patterns.length) return { matched: false, count: 0 };

		const regexes = patterns.map((pattern) => wildcardToRegex(pattern));
		const maxStart = tokenCount - patterns.length;
		let count = 0;
		let firstSnippet: string | undefined;

		for (let start = 0; start <= maxStart; start += 1) {
			let matched = true;
			for (let offset = 0; offset < patterns.length; offset += 1) {
				const token = prepared.tokens[start + offset];
				if (!regexes[offset].test(token.norm)) {
					matched = false;
					break;
				}
			}
			if (!matched) continue;

			count += 1;
			if (!firstSnippet) {
				const first = prepared.tokens[start];
				const last = prepared.tokens[start + patterns.length - 1];
				firstSnippet = buildSnippet(prepared.raw, first.start, last.end, snippetRadius);
			}
		}

		return { matched: count > 0, count, snippet: firstSnippet };
	}

	async #getPreparedText(docId: number): Promise<PreparedText | null> {
		const memory = this.#preparedTexts.get(docId);
		if (memory) return memory;

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
			const response = await fetch(joinUrl(this.#textsBaseUrl, encodeURIComponent(textKey)));
			if (!response.ok) {
				throw new Error(`Unable to fetch text ${textKey}: ${response.status}`);
			}
			rawText = await response.text();
			if (this.#cacheInIndexedDb) {
				await this.#cache.setText(cacheKey, manifest.indexVersion, rawText);
			}
		}

		const prepared: PreparedText = {
			raw: rawText,
			tokens: tokenizeWithOffsets(rawText, this.#preserveEnie)
		};
		this.#preparedTexts.set(docId, prepared);
		return prepared;
	}

	async #evaluateGroup(group: ParsedQueryClause[]): Promise<GroupEvaluation> {
		let currentDocs: Set<number> | null = null;
		let currentScores = new Map<number, number>();
		const clauses: ClauseEvaluation[] = [];
		let hasPhrase = false;

		for (const clause of group) {
			const evaluated = await this.#evaluateClause(clause);
			clauses.push(evaluated);
			if (clause.kind === 'phrase') hasPhrase = true;

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
			scores: currentScores,
			hasPhrase
		};
	}

	async #evaluateClause(clause: ParsedQueryClause): Promise<ClauseEvaluation> {
		if (clause.kind === 'term') {
			return this.#evaluateTermClause(clause.pattern, clause);
		}
		return this.#evaluatePhraseClause(clause.patterns, clause);
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

		const tokenDocs: Set<number>[] = [];
		const tokenScores: Map<number, number>[] = [];

		for (const pattern of patterns) {
			const termIds = await this.#resolvePatternTermIds(pattern);
			if (termIds.length === 0) {
				return { clause, docs: new Set<number>(), scores: new Map<number, number>() };
			}

			const docs = new Set<number>();
			const scores = new Map<number, number>();
			for (const termId of termIds) {
				const postings = await this.#getPostingsForTerm(termId);
				for (const [docId, tf] of postings) {
					docs.add(docId);
					scores.set(docId, (scores.get(docId) ?? 0) + tf);
				}
			}
			tokenDocs.push(docs);
			tokenScores.push(scores);
		}

		let docs = tokenDocs[0];
		for (let i = 1; i < tokenDocs.length; i += 1) {
			docs = intersectSets(docs, tokenDocs[i]);
		}

		const scores = new Map<number, number>();
		for (const docId of docs) {
			let total = 3;
			for (const tokenScore of tokenScores) {
				total += tokenScore.get(docId) ?? 0;
			}
			scores.set(docId, total);
		}

		return { clause, docs, scores };
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
			postingsShard: row[5]
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
			if (cached) return cached;
		}

		const response = await fetch(joinUrl(this.#indexBaseUrl, relativePath));
		if (!response.ok) {
			throw new Error(`Unable to fetch ${relativePath}: ${response.status}`);
		}
		const data = (await response.json()) as T;

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



