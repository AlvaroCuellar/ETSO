import type { AttributionSet } from '$lib/domain/catalog';

export interface TexoroManifestShard {
	id: string;
	file: string;
	termMin?: string;
	termMax?: string;
	minTermId?: number;
	maxTermId?: number;
	termsCount?: number;
	gramMin?: string;
	gramMax?: string;
	gramsCount?: number;
	estimatedBytes: number;
}

export interface TexoroIndexManifest {
	schemaVersion: string;
	indexVersion: string;
	generatedAt: string;
	normalization: {
		lowercase: boolean;
		removeDiacritics: boolean;
		preserveEnie: boolean;
	};
	tokenization: {
		regex: string;
		unicode: boolean;
	};
	stats: {
		works: number;
		tokens: number;
		chars: number;
		vocabSize: number;
		totalPostingsPairs: number;
		totalPositionEntries?: number;
		totalKgrams: number;
	};
	features?: {
		positions?: boolean;
		proximity?: boolean;
		byteOffsets?: boolean;
	};
	files: {
		manifest: string;
		works: string;
		vocab: string;
		kgrams: string;
		wildcardLengths: string;
	};
	directories: {
		postings: string;
		positions?: string;
		vocabShards: string;
		kgramShards: string;
	};
	shards: {
		postings: TexoroManifestShard[];
		positions?: TexoroManifestShard[];
		vocab: TexoroManifestShard[];
		kgrams: TexoroManifestShard[];
	};
}

export interface TexoroWorksFile {
	schemaVersion: string;
	indexVersion: string;
	generatedAt: string;
	works: Array<[number, string, string, string, number, number]>;
	totals: {
		works: number;
		tokens: number;
		chars: number;
	};
}

export interface TexoroVocabRoot {
	schemaVersion: string;
	indexVersion: string;
	generatedAt: string;
	shardStrategy: string;
	totalTerms: number;
	shards: Array<{
		id: string;
		file: string;
		termMin: string;
		termMax: string;
		minTermId: number;
		maxTermId: number;
		termsCount: number;
		estimatedBytes: number;
	}>;
	lookup: {
		byLexicalRange: boolean;
		byTermIdRange: boolean;
	};
}

export type TexoroVocabShardTerm = [string, number, number, number, number, string, string?];

export interface TexoroVocabShard {
	schemaVersion: string;
	indexVersion: string;
	shard: {
		id: string;
		file: string;
		termMin: string;
		termMax: string;
		minTermId: number;
		maxTermId: number;
		termsCount: number;
		estimatedBytes: number;
	};
	terms: TexoroVocabShardTerm[];
}

export interface TexoroPostingsShard {
	schemaVersion: string;
	indexVersion: string;
	shard: {
		id: string;
		file: string;
		termMin: string;
		termMax: string;
		minTermId: number;
		maxTermId: number;
		termsCount: number;
		estimatedBytes: number;
	};
	postings: Array<[number, Array<[number, number]>]>;
}

export type TexoroTermOccurrence = [tokenIndex: number, byteStart: number, byteEnd: number];
export type TexoroPositionsDoc = [docId: number, tf: number, occurrences: TexoroTermOccurrence[]];

export interface TexoroPositionsShard {
	schemaVersion: string;
	indexVersion: string;
	shard: {
		id: string;
		file: string;
		termMin: string;
		termMax: string;
		minTermId: number;
		maxTermId: number;
		termsCount: number;
		estimatedBytes: number;
	};
	positions: Array<[number, TexoroPositionsDoc[]]>;
}

export interface TexoroKgramsRoot {
	schemaVersion: string;
	indexVersion: string;
	generatedAt: string;
	k: number;
	boundary: string;
	totalKgrams: number;
	shards: Array<{
		id: string;
		file: string;
		gramMin: string;
		gramMax: string;
		gramsCount: number;
		estimatedBytes: number;
	}>;
}

export interface TexoroKgramShard {
	schemaVersion: string;
	indexVersion: string;
	k: number;
	boundary: string;
	shard: {
		id: string;
		file: string;
		gramMin: string;
		gramMax: string;
		gramsCount: number;
		estimatedBytes: number;
	};
	grams: Array<[string, number[]]>;
}

export interface TexoroWildcardLengths {
	schemaVersion: string;
	indexVersion: string;
	generatedAt: string;
	minLength: number;
	maxLength: number;
	lengths: Array<[number, number[]]>;
}

export interface TexoroWorkMeta {
	id: string;
	title: string;
	titleVariants: string[];
	slug: string;
	genre: string;
	textState: string;
	shortSummary: string;
	traditionalAttribution: AttributionSet;
	stylometryAttribution: AttributionSet;
}

export interface ParsedQueryTerm {
	kind: 'term';
	pattern: string;
}

export interface ParsedQueryPhrase {
	kind: 'phrase';
	patterns: string[];
	literal: string;
}

export interface ParsedQueryProximity {
	kind: 'proximity';
	left: ParsedQueryTerm | ParsedQueryPhrase;
	right: ParsedQueryTerm | ParsedQueryPhrase;
	distance: number;
	order: SearchProximityOrder;
}

export type ParsedQueryClause = ParsedQueryTerm | ParsedQueryPhrase | ParsedQueryProximity;

export interface ParsedQuery {
	groups: ParsedQueryClause[][];
	warnings: string[];
}

export interface SearchResultMatch {
	kind: 'term' | 'phrase' | 'proximity';
	source: string;
	occurrences: number;
	tokenIndex?: number;
}

export interface SearchResult {
	workId: string;
	docId: number;
	docTokenCount: number;
	score: number;
	meta?: TexoroWorkMeta;
	snippet?: string;
	matches: SearchResultMatch[];
}

export interface SearchMatchOccurrence {
	start: number;
	end: number;
	tokenIndex: number;
	tokenEndIndex?: number;
	tokenCount: number;
	snippet: string;
	highlights?: Array<{
		start: number;
		end: number;
		tokenIndex: number;
	}>;
}

export interface SearchMatchOccurrences {
	workId: string;
	docId: number;
	match: SearchResultMatch;
	count: number;
	items: SearchMatchOccurrence[];
	truncated: boolean;
}

export interface SearchExecution {
	query: string;
	normalizedQuery: string;
	parsed: ParsedQuery;
	results: SearchResult[];
	allResults: SearchResult[];
	candidateCount: number;
	textsWithOccurrences: number;
	totalOccurrences: number;
	verifiedCount: number;
	positionsShardLoads?: number;
	textLoads?: number;
	elapsedMs: number;
}

export type SearchBooleanMode = 'all' | 'any';
export type SearchProximityOrder = 'any' | 'after' | 'before';

export interface StructuredSearchQuery {
	main: string;
	additionalMode?: SearchBooleanMode;
	additionalTerms?: string[];
	proximityMode?: SearchBooleanMode;
	proximityTerms?: Array<{
		value: string;
		distance: number;
		order?: SearchProximityOrder;
	}>;
}

export interface SearchOptions {
	limit?: number;
	maxPhraseVerificationDocs?: number;
	snippetRadius?: number;
	includeSnippets?: boolean;
	structuredQuery?: StructuredSearchQuery;
	structuredClauses?: Array<
		| { kind: 'term'; value: string; operator?: 'and' | 'or' | null }
		| { kind: 'phrase'; value: string; operator?: 'and' | 'or' | null }
		| { kind: 'proximity'; value: string; distance: number; operator?: 'near'; order?: SearchProximityOrder }
	>;
}



