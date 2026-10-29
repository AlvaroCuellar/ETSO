import { error, json } from '@sveltejs/kit';
import { getPublicSummaryAssetUrl } from '$lib/server/r2-public';
import { createSummarySearchIndexLoader } from '$lib/server/summary-search-index';
import { getWorksForSummaryIndex } from '$lib/server/catalog-runtime';
import { normalizePlainText } from '$lib/search/normalize';
import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';
import { formatTraditionalAttributionCompact } from '$lib/utils/traditional-attribution-phrase';

import type { RequestHandler } from './$types';

interface SummarySearchEntry {
	id: string;
	slug: string;
	title: string;
	displayTitle: string;
	genre: string;
	traditional: string;
	summaryText: string;
	normalizedSummaryText: string;
}

interface SummarySnippet {
	before: string;
	match: string;
	after: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;
const SNIPPET_RADIUS = 145;
const loadPublishedIndex = createSummarySearchIndexLoader();

const normalizeSearchText = (value: string): string =>
	normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

const splitSearchTerms = (value: string): string[] =>
	[...new Set(normalizeSearchText(value)
		.split(/\s+/)
		.map((term) => term.trim())
		.filter((term) => term.length > 0))];

const formatTraditionalAttribution = (work: Awaited<ReturnType<typeof getWorksForSummaryIndex>>[number]): string => {
	const authorIds = new Set(work.traditionalAttribution.groups.flatMap((group) => group.members.map((member) => member.authorId)));
	return work.collectionSize && authorIds.size > 1 ? 'Varios' : formatTraditionalAttributionCompact(work.traditionalAttribution);
};

const buildNormalizedIndex = (value: string): { normalized: string; originalIndexes: number[] } => {
	let normalized = '';
	const originalIndexes: number[] = [];

	for (let index = 0; index < value.length; index += 1) {
		const normalizedChar = normalizePlainText(value[index] ?? '', false);
		if (!normalizedChar) continue;
		for (const char of normalizedChar) {
			normalized += char;
			originalIndexes.push(index);
		}
	}

	return { normalized, originalIndexes };
};

const makeSnippet = (
	rawText: string,
	indexedText: { normalized: string; originalIndexes: number[] },
	term: string
): SummarySnippet | null => {
	const normalizedMatchIndex = indexedText.normalized.indexOf(term);
	if (normalizedMatchIndex < 0) return null;

	const matchStart = indexedText.originalIndexes[normalizedMatchIndex] ?? 0;
	const matchEnd = (indexedText.originalIndexes[normalizedMatchIndex + term.length - 1] ?? matchStart) + 1;
	const snippetStart = Math.max(0, matchStart - SNIPPET_RADIUS);
	const snippetEnd = Math.min(rawText.length, matchEnd + SNIPPET_RADIUS);

	return {
		before: `${snippetStart > 0 ? '...' : ''}${rawText.slice(snippetStart, matchStart)}`,
		match: rawText.slice(matchStart, matchEnd),
		after: `${rawText.slice(matchEnd, snippetEnd)}${snippetEnd < rawText.length ? '...' : ''}`
	};
};

const makeSnippets = (rawText: string, terms: string[]): SummarySnippet[] => {
	const indexedText = buildNormalizedIndex(rawText);
	const snippets: SummarySnippet[] = [];

	for (const term of terms) {
		const snippet = makeSnippet(rawText, indexedText, term);
		if (!snippet) return [];
		snippets.push(snippet);
	}

	return snippets;
};

const getSummarySearchIndex = async (fetcher: typeof fetch): Promise<SummarySearchEntry[]> => {
	const [works, publishedEntries] = await Promise.all([
		getWorksForSummaryIndex(),
		loadPublishedIndex(getPublicSummaryAssetUrl('search-index.json'), fetcher).catch(() => {
			throw error(503, 'No se pudo cargar el índice de resúmenes. Inténtalo de nuevo.');
		})
	]);
	const publicWorks = new Map(works.map((work) => [work.id, work]));
	// The public catalogue controls identity and visibility, even if a cached asset is older.
	return publishedEntries.flatMap(({ id, summaryText, normalizedSummaryText }) => {
		const work = publicWorks.get(id);
		if (!work || !summaryText.trim()) return [];
		return [{
			id: work.id,
			slug: work.slug,
			title: work.title,
			displayTitle: formatDisplayWorkTitle(work.title),
			genre: work.genre.trim() || 'Sin género',
			traditional: formatTraditionalAttribution(work),
			summaryText,
			normalizedSummaryText
		}];
	}).sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base', ignorePunctuation: true }));
};

export const GET: RequestHandler = async ({ url, fetch }) => {
	const warmup = url.searchParams.get('warmup') === '1';
	const query = url.searchParams.get('q')?.trim() ?? '';
	const terms = splitSearchTerms(query);
	const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
	const rawOffset = Number(url.searchParams.get('offset') ?? 0);
	const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(MAX_LIMIT, Math.trunc(rawLimit))) : DEFAULT_LIMIT;
	const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;

	if (warmup) {
		const index = await getSummarySearchIndex(fetch);
		return json(
			{ ready: true, indexed: index.length },
			{
				headers: {
					'cache-control': 'no-store'
				}
			}
		);
	}

	if (terms.length === 0) {
		return json({ query, total: 0, offset, limit, hasMore: false, results: [] });
	}

	const index = await getSummarySearchIndex(fetch);
	const results = [];
	let matchedCount = 0;

	for (const entry of index) {
		if (!terms.every((term) => entry.normalizedSummaryText.includes(term))) continue;

		const snippets = makeSnippets(entry.summaryText, terms);
		if (snippets.length !== terms.length) continue;

		if (matchedCount >= offset && results.length < limit) {
			results.push({
				slug: entry.slug,
				title: entry.displayTitle,
				genre: entry.genre,
				traditional: entry.traditional,
				snippets
			});
		}

		matchedCount += 1;
	}

	return json(
		{
			query,
			total: matchedCount,
			offset,
			limit,
			hasMore: offset + results.length < matchedCount,
			results
		},
		{
			headers: {
				'cache-control': 'no-store'
			}
		}
	);
};
