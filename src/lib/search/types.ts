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
		totalKgrams: number;
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
		vocabShards: string;
		kgramShards: string;
	};
	shards: {
		postings: TexoroManifestShard[];
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

export type TexoroVocabShardTerm = [string, number, number, number, number, string];

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
	slug: string;
	genre: string;
	shortSummary: string;
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

export type ParsedQueryClause = ParsedQueryTerm | ParsedQueryPhrase;

export interface ParsedQuery {
	groups: ParsedQueryClause[][];
	warnings: string[];
}

export interface SearchResultMatch {
	kind: 'term' | 'phrase';
	source: string;
	occurrences: number;
}

export interface SearchResult {
	workId: string;
	docId: number;
	score: number;
	meta?: TexoroWorkMeta;
	snippet?: string;
	matches: SearchResultMatch[];
}

export interface SearchMatchOccurrence {
	start: number;
	end: number;
	snippet: string;
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
	candidateCount: number;
	textsWithOccurrences: number;
	totalOccurrences: number;
	verifiedCount: number;
	elapsedMs: number;
}

export interface SearchOptions {
	limit?: number;
	maxPhraseVerificationDocs?: number;
	snippetRadius?: number;
}
