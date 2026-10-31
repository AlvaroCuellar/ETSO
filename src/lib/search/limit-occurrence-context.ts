import type { SearchMatchOccurrence } from './types';

type Snippet = Pick<SearchMatchOccurrence, 'snippet' | 'highlights'>;

// Apply after selecting source lines: keep verse layout, but bound long prose paragraphs.
export const limitOccurrenceContext = (value: Snippet, wordsPerSide = 40): Snippet => {
	if (!value.highlights?.length) return value;
	const start = Math.min(...value.highlights.map((hit) => hit.start));
	const end = Math.max(...value.highlights.map((hit) => hit.end));
	const before = [...value.snippet.slice(0, start).matchAll(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)];
	const after = [...value.snippet.slice(end).matchAll(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)];
	const left = before.length > wordsPerSide ? before[before.length - wordsPerSide].index! : 0;
	const lastWord = after[wordsPerSide - 1];
	const right = after.length > wordsPerSide && lastWord
		? end + lastWord.index! + lastWord[0].length
		: value.snippet.length;
	if (left === 0 && right === value.snippet.length) return value;
	const prefix = left > 0 ? '… ' : '';
	const suffix = right < value.snippet.length ? ' …' : '';
	return {
		snippet: prefix + value.snippet.slice(left, right) + suffix,
		highlights: value.highlights.map((hit) => ({
			...hit, start: hit.start - left + prefix.length, end: hit.end - left + prefix.length
		}))
	};
};
