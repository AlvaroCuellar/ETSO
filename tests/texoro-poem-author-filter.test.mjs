import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import ts from 'typescript';

test('author filters restrict poem counts, phrases, proximity, snippets and previews, including concurrent requests', async () => {
 const root = await mkdtemp(join(tmpdir(), 'etso-poem-authors-'));
 let server;
 try {
  const input = join(root, 'texts'), output = join(root, 'index'), modules = join(root, 'modules');
  await mkdir(input); await mkdir(modules);
  const raw = 'amor vida amor\n\f\namor sueño\n\f\nvida sueño amor';
  await writeFile(join(input, 'collection.txt'), raw);
  await writeFile(join(root, 'section-authors.json'), JSON.stringify({ schemaVersion: 'etso-section-authors-v1', works: { collection: [['cervantes'], ['lope'], ['cervantes', 'lope']] } }));
  execFileSync(process.execPath, ['scripts/build-search-index.mjs', '--input', input, '--output', output, '--workers', '1', '--compact'], { stdio: 'pipe' });
  const works = JSON.parse(await readFile(join(output, 'works.json'), 'utf8'));
  for (const name of await readdir('src/lib/search')) {
   if (!name.endsWith('.ts')) continue;
   const code = ts.transpileModule(await readFile(join('src/lib/search', name), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
   await writeFile(join(modules, name.replace(/\.ts$/, '.mjs')), code.replace(/(from\s+['"])(\.\/[^'"]+)(['"])/g, '$1$2.mjs$3'));
  }
  const { TexoroSearchEngine } = await import(pathToFileURL(join(modules, 'engine.mjs')).href);
  const { normalizePoemAuthorFilter } = await import(pathToFileURL(join(modules, 'poem-author-filter.mjs')).href);
  server = createServer(async (request, response) => {
   try { response.end(await readFile(join(output, new URL(request.url, 'http://local').pathname))); }
   catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const config = { indexBaseUrl: `http://127.0.0.1:${server.address().port}`, textLoader: async () => raw, cacheInIndexedDb: false };
  const engine = new TexoroSearchEngine(config);
  const id = works.works[0][1];
  const meta = { id, title: 'Collection', titleVariants: [], slug: 'collection', genre: 'Sonetos', generalGenre: 'Poesía', collectionSize: 3, textState: 'Bueno', shortSummary: '', textLinks: [], traditionalAttribution: { groups: [{ members: [{ authorId: 'cervantes' }, { authorId: 'lope' }] }], connector: 'and' }, stylometryAttribution: { groups: [], connector: 'and' } };
  const map = new Map([[id, meta]]);
  const opts = (authorIds, match = 'or') => ({ traditionalAuthorIds: authorIds, traditionalMatch: match, includeSnippets: true });
  assert.equal((await engine.search('amor', map)).totalOccurrences, 4);
  const [cervantes, lope] = await Promise.all([engine.search('amor', map, opts(['cervantes'])), engine.search('amor', map, opts(['lope']))]);
  assert.equal(cervantes.totalOccurrences, 3); assert.equal(lope.totalOccurrences, 2);
  assert.equal(cervantes.results[0].docTokenCount, 6); assert.equal(lope.results[0].docTokenCount, 5);
  assert.equal((await engine.search('amor', map, opts(['cervantes', 'lope']))).totalOccurrences, 4);
  assert.equal((await engine.search('amor', map, opts(['cervantes', 'lope'], 'and'))).totalOccurrences, 1);
  assert.equal((await engine.search('amor', map, opts(['unknown']))).totalOccurrences, 0);
  assert.equal((await engine.search('"amor sueño"', map, opts(['cervantes']))).totalOccurrences, 0);
  const phrase = await engine.search('"amor sueño"', map, opts(['lope']));
  assert.equal(phrase.totalOccurrences, 1); assert.equal(phrase.results[0].snippet, 'amor sueño');
  assert.equal((await engine.search('am*', map, opts(['cervantes']))).totalOccurrences, 3);
  const proximity = { main: 'amor', proximityTerms: [{ value: 'vida', distance: 1, order: 'any' }] };
  assert.equal((await engine.search('amor', map, { ...opts(['cervantes']), structuredQuery: proximity })).totalOccurrences, 3);
  assert.equal((await engine.search('amor', map, { ...opts(['lope']), structuredQuery: proximity })).totalOccurrences, 1);
  const group = { main: 'vida', proximityTerms: [{ value: 'amor', distance: 2 }, { value: 'sueño', distance: 2 }] };
  const grouped = await engine.search('vida', map, { ...opts(['cervantes']), structuredQuery: group });
  assert.equal(grouped.totalOccurrences, 1);
  const groupedDetails = await engine.getOccurrencesForMatch(grouped.results[0], grouped.results[0].matches[0]);
  assert.equal(groupedDetails.count, 1); assert.equal(groupedDetails.items[0].snippet, 'vida sueño amor');
  for (const result of [cervantes.results[0], lope.results[0], phrase.results[0]]) {
   const match = result.matches[0];
   const details = await engine.getOccurrencesForMatch(result, { ...match, poemAuthorFilter: normalizePoemAuthorFilter(match.poemAuthorFilter) }, { snippetMode: 'lines' });
   assert.equal(details.count, match.occurrences);
   assert.ok(details.items.every(item => !item.snippet.includes('\f')));
   const previews = await engine.getPreviewsForResults([result], { maxItemsPerDoc: 10 });
   assert.equal(previews.items[0].snippets.length, details.count);
  }
  assert.ok(!(await engine.getOccurrencesForMatch(cervantes.results[0], cervantes.results[0].matches[0])).items.some(item => item.snippet === 'amor sueño'));
  assert.equal(normalizePoemAuthorFilter(null), undefined);
  assert.deepEqual(normalizePoemAuthorFilter({ authorIds: ['cervantes', ' cervantes ', null], match: 'and' }), { authorIds: ['cervantes'], match: 'and' });
  // Existing coauthored theatre keeps work-level authorship semantics.
  const ordinary = new Map([[id, { ...meta, generalGenre: 'Teatro', collectionSize: undefined }]]);
  assert.equal((await engine.search('amor', ordinary, opts(['cervantes']))).totalOccurrences, 4);
  // An old index must report unavailable filtering instead of a false zero.
  works.works[0].length = 7;
  await writeFile(join(output, 'works.json'), JSON.stringify(works));
  const old = new TexoroSearchEngine(config);
  assert.equal((await old.search('amor', map)).totalOccurrences, 4);
  await assert.rejects(old.search('amor', map, opts(['cervantes'])), /búsqueda por poeta no está disponible/);
  // Unrelated filters and ordinary coauthored works remain usable with old indexes.
  assert.equal((await old.search('amor', map, { ...opts(['cervantes']), generalGenres: ['Teatro'] })).totalOccurrences, 0);
  assert.equal((await old.search('amor', map, { ...opts(['cervantes']), workIds: ['other-work'] })).totalOccurrences, 0);
  assert.equal((await old.search('amor', ordinary, opts(['cervantes']))).totalOccurrences, 4);
 } finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
 }
});
