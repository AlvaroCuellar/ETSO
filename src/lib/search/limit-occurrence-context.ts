import type { SearchMatchOccurrence } from './types';

type Snippet = Pick<SearchMatchOccurrence, 'snippet' | 'highlights'>;
type Range = { start: number; end: number };

const MAX_SNIPPET_LENGTH = 800;
const LEADING_OMISSION = '… ';
const TRAILING_OMISSION = ' …';
const MAX_EXCERPT_LENGTH = MAX_SNIPPET_LENGTH - LEADING_OMISSION.length - TRAILING_OMISSION.length - 3;

const splitsSurrogate = (text: string, offset: number): boolean => {
	const before = text.charCodeAt(offset - 1);
	const after = text.charCodeAt(offset);
	return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff;
};

const renderExcerpt = (value: Snippet, ranges: Range[], gap: string): Snippet => {
	const first = ranges[0];
	const last = ranges[ranges.length - 1];
	if (ranges.length === 1 && first.start === 0 && first.end === value.snippet.length) return value;

	let snippet = first.start > 0 ? LEADING_OMISSION : '';
	const highlights: NonNullable<Snippet['highlights']> = [];
	for (const range of ranges) {
		if (range !== first) snippet += gap;
		const start = range.start + Number(splitsSurrogate(value.snippet, range.start));
		const end = range.end - Number(splitsSurrogate(value.snippet, range.end));
		const offset = snippet.length - start;
		for (const hit of value.highlights ?? []) {
			const hitStart = Math.max(start, hit.start);
			const hitEnd = Math.min(end, hit.end);
			if (hitEnd > hitStart) {
				highlights.push({ ...hit, start: hitStart + offset, end: hitEnd + offset });
			}
		}
		snippet += value.snippet.slice(start, end);
	}
	if (last.end < value.snippet.length) snippet += TRAILING_OMISSION;
	return { snippet, highlights: value.highlights ? highlights : undefined };
};

// Bound line context in words and every excerpt in characters, including the match itself.
// The character mode already selects its context by radius, so it skips the word limit.
export const limitOccurrenceContext = (value: Snippet, wordsPerSide: number | null = 40): Snippet => {
	if (wordsPerSide === null && value.snippet.length <= MAX_SNIPPET_LENGTH) return value;

	let hitStart = value.snippet.length;
	let hitEnd = 0;
	for (const hit of value.highlights ?? []) {
		hitStart = Math.min(hitStart, hit.start);
		hitEnd = Math.max(hitEnd, hit.end);
	}

	let left = 0;
	let right = value.snippet.length;
	if (hitEnd > hitStart && wordsPerSide !== null) {
		const before = [...value.snippet.slice(0, hitStart).matchAll(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)];
		const after = [...value.snippet.slice(hitEnd).matchAll(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)];
		if (before.length > wordsPerSide) left = before[before.length - wordsPerSide]?.index ?? hitStart;
		if (after.length > wordsPerSide) {
			const lastWord = after[wordsPerSide - 1];
			right = lastWord ? hitEnd + lastWord.index! + lastWord[0].length : hitEnd;
		}
	}

	const gap = wordsPerSide === null ? ' … ' : '\n…\n';
	const omissionLength = (left > 0 ? LEADING_OMISSION.length : 0) +
		(right < value.snippet.length ? TRAILING_OMISSION.length : 0);
	if (right - left + omissionLength <= MAX_SNIPPET_LENGTH) {
		return renderExcerpt(value, [{ start: left, end: right }], gap);
	}
	if (hitEnd <= hitStart) {
		return renderExcerpt(value, [{ start: left, end: left + MAX_EXCERPT_LENGTH }], gap);
	}
	if (hitEnd - hitStart <= MAX_EXCERPT_LENGTH) {
		const sideBudget = Math.floor((MAX_EXCERPT_LENGTH - (hitEnd - hitStart)) / 2);
		const start = Math.max(left, Math.min(hitStart - sideBudget, right - MAX_EXCERPT_LENGTH));
		return renderExcerpt(value, [{ start, end: start + MAX_EXCERPT_LENGTH }], gap);
	}

	// Very distant matches retain both endpoints instead of turning the whole span into context.
	const firstLength = Math.floor(MAX_EXCERPT_LENGTH / 2);
	const lastLength = MAX_EXCERPT_LENGTH - firstLength;
	const start = Math.max(left, hitStart - Math.floor(firstLength / 4));
	const end = Math.min(right, hitEnd + Math.floor(lastLength / 4));
	return renderExcerpt(value, [
		{ start, end: start + firstLength },
		{ start: end - lastLength, end }
	], gap);
};
