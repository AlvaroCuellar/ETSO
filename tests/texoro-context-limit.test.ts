import assert from 'node:assert/strict';
import test from 'node:test';
import { limitOccurrenceContext } from '../src/lib/search/limit-occurrence-context.ts';

const words = (count: number) => Array.from({ length: count }, () => 'palabra').join(' ');
const sample = (before: string, match: string, after: string) => ({
 snippet: before + match + after,
 highlights: [{ start: before.length, end: before.length + match.length, tokenIndex: 0 }]
});

test('long prose is capped at 40 words on either side with exact highlighting', () => {
 const value = sample(words(300) + ' ', 'hallazgo', ' ' + words(500));
 const result = limitOccurrenceContext(value);
 assert.equal(result.snippet.match(/palabra/g)?.length, 80);
 assert.ok(result.snippet.startsWith('… '));
 assert.ok(result.snippet.endsWith(' …'));
 const hit = result.highlights![0];
 assert.equal(result.snippet.slice(hit.start, hit.end), 'hallazgo');
 assert.equal(value.highlights[0].start, words(300).length + 1);
});

test('short verses preserve their line breaks and punctuation unchanged', () => {
 const value = sample('Primer verso.\nSegundo verso,\n', 'hallazgo', '\nTercer verso.');
 assert.deepEqual(limitOccurrenceContext(value), value);
});

test('a proximity match spanning many words remains complete with both highlights', () => {
 const middle = 'primero ' + words(120) + ' último';
 const value = sample(words(60) + '\n', middle, '\n' + words(60));
 value.highlights = [
  { start: value.highlights[0].start, end: value.highlights[0].start + 7, tokenIndex: 0 },
  { start: value.highlights[0].end - 6, end: value.highlights[0].end, tokenIndex: 1 }
 ];
 const result = limitOccurrenceContext(value);
 assert.ok(result.snippet.includes(middle));
 assert.deepEqual(result.highlights!.map(h => result.snippet.slice(h.start, h.end)), ['primero', 'último']);
});

test('beginning and end of a work do not acquire a false omission marker', () => {
 const first = limitOccurrenceContext(sample('', 'hallazgo', ' ' + words(60)));
 assert.ok(!first.snippet.startsWith('…'));
 assert.ok(first.snippet.endsWith(' …'));
 const last = limitOccurrenceContext(sample(words(60) + ' ', 'hallazgo', ''));
 assert.ok(last.snippet.startsWith('… '));
 assert.ok(!last.snippet.endsWith('…'));
});
