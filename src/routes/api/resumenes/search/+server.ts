import { json } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getWorksForSummaryIndex } from '$lib/server/catalog-runtime';
import { fetchPublicR2Json, getSummariesBaseUrl } from '$lib/server/r2-public';
import { normalizePlainText } from '$lib/search/normalize';
import { formatDisplayWorkTitle } from '$lib/utils/format-display-work-title';

import type { RequestHandler } from './$types';

interface SummaryJson {
	resumen_breve?: string[];
	resumen_largo?: string[];
}

interface SummarySearchEntry {
	id: string;
	slug: string;
	title: string;
	displayTitle: string;
	genre: string;
	traditional: string;
	shortText: string;
	longText: string;
	normalizedShortText: string;
	normalizedLongText: string;
}

interface SummarySnippet {
	before: string;
	match: string;
	after: string;
}

const EMPTY_SHORT_SUMMARY = 'Sin resumen breve disponible.';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;
const SNIPPET_RADIUS = 145;
const SUMMARY_INDEX_CONCURRENCY = 12;

let summaryIndexPromise: Promise<SummarySearchEntry[]> | null = null;

const normalizeSearchText = (value: string): string =>
	normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

const splitSearchTerms = (value: string): string[] =>
	normalizeSearchText(value)
		.split(/\s+/)
		.map((term) => term.trim())
		.filter((term) => term.length > 0);

const formatNameList = (names: string[]): string => {
	if (names.length === 0) return '';
	if (names.length === 1) return names[0];
	if (names.length === 2) return `${names[0]} y ${names[1]}`;
	return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
};

const formatTraditionalAttribution = (work: Awaited<ReturnType<typeof getWorksForSummaryIndex>>[number]): string => {
	const set = work.traditionalAttribution;
	if (set.unresolved || set.groups.length === 0) return 'Desconocido';

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

	return names.length > 0 ? formatNameList(names) : 'Desconocido';
};

const joinSummaryParts = (parts: string[] | undefined): string =>
	Array.isArray(parts)
		? parts
				.map((part) => part.trim())
				.filter((part) => part.length > 0)
				.join('\n\n')
		: '';

const loadLocalSummary = async (workId: string): Promise<SummaryJson | null> => {
	try {
		const raw = await readFile(join(process.cwd(), 'data', 'resumenes', `${workId}.json`), 'utf8');
		return JSON.parse(raw) as SummaryJson;
	} catch {
		return null;
	}
};

const loadRemoteSummary = async (workId: string): Promise<SummaryJson | null> => {
	try {
		return await fetchPublicR2Json<SummaryJson>(getSummariesBaseUrl(), `${workId}.json`);
	} catch {
		return null;
	}
};

const loadFullSummary = async (workId: string): Promise<SummaryJson | null> =>
	(await loadLocalSummary(workId)) ?? (await loadRemoteSummary(workId));

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
	normalizedText: string,
	terms: string[]
): SummarySnippet | null => {
	let normalizedMatchIndex = -1;
	let matchedTerm = '';

	for (const term of terms) {
		const index = normalizedText.indexOf(term);
		if (index >= 0 && (normalizedMatchIndex < 0 || index < normalizedMatchIndex)) {
			normalizedMatchIndex = index;
			matchedTerm = term;
		}
	}

	if (normalizedMatchIndex < 0 || !matchedTerm) return null;

	const indexedText = buildNormalizedIndex(rawText);
	const matchStart = indexedText.originalIndexes[normalizedMatchIndex] ?? 0;
	const matchEnd = (indexedText.originalIndexes[normalizedMatchIndex + matchedTerm.length - 1] ?? matchStart) + 1;
	const snippetStart = Math.max(0, matchStart - SNIPPET_RADIUS);
	const snippetEnd = Math.min(rawText.length, matchEnd + SNIPPET_RADIUS);

	return {
		before: `${snippetStart > 0 ? '...' : ''}${rawText.slice(snippetStart, matchStart)}`,
		match: rawText.slice(matchStart, matchEnd),
		after: `${rawText.slice(matchEnd, snippetEnd)}${snippetEnd < rawText.length ? '...' : ''}`
	};
};

const buildSummarySearchIndex = async (): Promise<SummarySearchEntry[]> => {
	const works = await getWorksForSummaryIndex();
	const entries: SummarySearchEntry[] = [];

	let nextIndex = 0;
	const workers = Array.from({ length: Math.min(SUMMARY_INDEX_CONCURRENCY, works.length) }, async () => {
		while (nextIndex < works.length) {
			const work = works[nextIndex];
			nextIndex += 1;
			if (!work) continue;

			const fullSummary = await loadFullSummary(work.id);
			const shortText = joinSummaryParts(fullSummary?.resumen_breve) || work.shortSummary;
			const longText = joinSummaryParts(fullSummary?.resumen_largo);
			const hasShortText = shortText.trim().length > 0 && shortText.trim() !== EMPTY_SHORT_SUMMARY;
			const hasLongText = longText.trim().length > 0;
			if (!hasShortText && !hasLongText) continue;

			entries.push({
				id: work.id,
				slug: work.slug,
				title: work.title,
				displayTitle: formatDisplayWorkTitle(work.title),
				genre: work.genre.trim() || 'Sin género',
				traditional: formatTraditionalAttribution(work),
				shortText,
				longText,
				normalizedShortText: normalizeSearchText(shortText),
				normalizedLongText: normalizeSearchText(longText)
			});
		}
	});

	await Promise.all(workers);
	return entries.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
};

const getSummarySearchIndex = (): Promise<SummarySearchEntry[]> => {
	summaryIndexPromise ??= buildSummarySearchIndex();
	return summaryIndexPromise;
};

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const terms = splitSearchTerms(query);
	const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
	const rawOffset = Number(url.searchParams.get('offset') ?? 0);
	const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(MAX_LIMIT, Math.trunc(rawLimit))) : DEFAULT_LIMIT;
	const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;

	if (terms.length === 0) {
		return json({ query, total: 0, offset, limit, hasMore: false, results: [] });
	}

	const index = await getSummarySearchIndex();
	const results = [];
	let matchedCount = 0;

	for (const entry of index) {
		const matchesShort = terms.every((term) => entry.normalizedShortText.includes(term));
		const matchesLong = terms.every((term) => entry.normalizedLongText.includes(term));
		if (!matchesShort && !matchesLong) continue;

		const snippet =
			(matchesShort ? makeSnippet(entry.shortText, entry.normalizedShortText, terms) : null) ??
			(matchesLong ? makeSnippet(entry.longText, entry.normalizedLongText, terms) : null);
		if (!snippet) continue;

		if (matchedCount >= offset && results.length < limit) {
			results.push({
				slug: entry.slug,
				title: entry.displayTitle,
				genre: entry.genre,
				traditional: entry.traditional,
				snippet
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
				'cache-control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600'
			}
		}
	);
};
