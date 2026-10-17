import assert from 'node:assert/strict';
import test from 'node:test';
import { renderReportNoteHtml } from '../src/lib/utils/render-inline-italics-html.ts';

test('TSV prose cannot inject executable HTML or attributes', () => {
 const html = renderReportNoteHtml('<script>alert(1)</script><img src=x onerror=alert(1)> <i onclick="x">no</i> <i>sí</i> https://example.org/?x=" onclick="bad');
 assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('<img'));
 assert.ok(!html.includes('<i onclick'));
 assert.ok(html.includes('<i>sí</i>'));
 assert.ok(html.includes('href="https://example.org/?x="'));
 assert.ok(!html.includes('href="https://example.org/?x=" onclick='));
});
test('citation punctuation stays outside link and balanced DOI parentheses stay inside', () => {
 assert.match(renderReportNoteHtml('(https://doi.org/10.1/abc(12)).'), /href="https:\/\/doi.org\/10\.1\/abc\(12\)"[^>]*>[^<]+<\/a>\)\./);
 assert.equal(renderReportNoteHtml('Uno\nVerso\n\nOtro <i>título</i>.'), 'Uno\nVerso\n\nOtro <i>título</i>.');
});
