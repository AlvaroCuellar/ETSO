import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import ts from 'typescript';

// Exercise real index positions and the browser/server shared engine with a two-poem collection.
test('general genres combine with subgenres and poems cannot match across boundaries', async () => {
 const root = await mkdtemp(join(tmpdir(), 'etso-search-sections-'));
 let server;
 try {
  const input = join(root, 'texts'); const output = join(root, 'index'); const modules = join(root, 'modules');
  await mkdir(input); await mkdir(modules);
  const raw = 'alpha beta\n\f\ngamma delta epsilon';
  await writeFile(join(input, 'collection.txt'), raw);
  execFileSync(process.execPath, ['scripts/build-search-index.mjs', '--input', input, '--output', output, '--workers', '1', '--compact'], { stdio: 'pipe' });
  const works = JSON.parse(await readFile(join(output, 'works.json'), 'utf8'));
  works.works[0][6] = [1, 3];
  await writeFile(join(output, 'works.json'), JSON.stringify(works));
  for (const name of await readdir('src/lib/search')) {
   if (!name.endsWith('.ts')) continue;
   const code = ts.transpileModule(await readFile(join('src/lib/search', name), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
   await writeFile(join(modules, name.replace(/\.ts$/, '.mjs')), code.replace(/(from\s+['"])(\.\/[^'"]+)(['"])/g, '$1$2.mjs$3'));
  }
  const { TexoroSearchEngine } = await import(pathToFileURL(join(modules, 'engine.mjs')).href);
  server = createServer(async (request, response) => {
   try { response.end(await readFile(join(output, new URL(request.url, 'http://local').pathname))); }
   catch { response.writeHead(404).end(); }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const engine = new TexoroSearchEngine({ indexBaseUrl: `http://127.0.0.1:${server.address().port}`, textLoader: async () => raw, cacheInIndexedDb: false });
  const id = works.works[0][1];
  const attribution = { groups: [], connector: 'and' };
  const meta = { id, title: 'Collection', titleVariants: [], slug: 'collection', genre: 'Lírica', generalGenre: 'Poesía', textState: '', shortSummary: '', textLinks: [], traditionalAttribution: attribution, stylometryAttribution: attribution };
  const map = new Map([[id, meta]]);
  assert.equal((await engine.search('alpha', map, { generalGenres: ['Poesía'], genres: ['Lírica'] })).totalOccurrences, 1);
  assert.equal((await engine.search('alpha', map, { generalGenres: ['Prosa'] })).totalOccurrences, 0);
  assert.equal((await engine.search('alpha', map, { generalGenres: ['Poesía'], genres: ['Comedia'] })).totalOccurrences, 0);
  const legacy = new Map([[id, { ...meta, generalGenre: undefined }]]);
  assert.equal((await engine.search('alpha', legacy, { generalGenres: ['Teatro'] })).totalOccurrences, 1);
  for (const phrase of ['"beta gamma"', '"alpha beta gamma"']) {
   assert.equal((await engine.search(phrase, map)).totalOccurrences, 0, phrase);
  }
  const intra = await engine.search('"alpha beta"', map);
  assert.equal(intra.totalOccurrences, 1);
  const phraseCross = await engine.getOccurrencesForMatch({ docId: 0, workId: id }, { kind: 'phrase', source: '"beta gamma"', occurrences: 1 });
  assert.equal(phraseCross.count, 0);
  for (const order of ['any', 'after', 'before']) {
   const q = { main: 'beta', proximityTerms: [{ value: 'gamma', distance: 5, order }] };
   assert.equal((await engine.search('beta', map, { structuredQuery: q })).totalOccurrences, 0, order);
   const occurrences = await engine.getOccurrencesForMatch({ docId: 0, workId: id }, { kind: 'proximity', source: `beta ~${order}<=5 gamma`, occurrences: 1 });
   assert.equal(occurrences.count, 0, order);
  }
  const group = { main: 'alpha', proximityTerms: [{ value: 'beta', distance: 5 }, { value: 'gamma', distance: 5 }] };
  assert.equal((await engine.search('alpha', map, { structuredQuery: group })).totalOccurrences, 0);
  const groupOccurrence = await engine.getOccurrencesForMatch({ docId: 0, workId: id }, { kind: 'proximityGroup', source: JSON.stringify({ anchor: 'alpha', terms: [{ value: 'beta', distance: 5, order: 'any' }, { value: 'gamma', distance: 5, order: 'any' }] }), occurrences: 1 });
  assert.equal(groupOccurrence.count, 0);
  const validGroup = await engine.search('gamma', map, { structuredQuery: { main: 'gamma', proximityTerms: [{ value: 'delta', distance: 5 }, { value: 'epsilon', distance: 5 }] } });
  assert.equal(validGroup.totalOccurrences, 1);
  const validGroupOccurrence = await engine.getOccurrencesForMatch(validGroup.results[0], validGroup.results[0].matches[0]);
  assert.equal(validGroupOccurrence.count, 1);
  assert.ok(!validGroupOccurrence.items[0].snippet.includes('alpha'));
  const crossPhraseSide = await engine.search('alpha', map, { structuredQuery: { main: 'alpha', proximityTerms: [{ value: '"beta gamma"', distance: 5 }] } });
  assert.equal(crossPhraseSide.totalOccurrences, 0);
  const valid = await engine.search('alpha', map, { structuredQuery: { main: 'alpha', proximityTerms: [{ value: 'beta', distance: 5 }] }, includeSnippets: true });
  assert.equal(valid.totalOccurrences, 1);
  assert.ok(!valid.results[0].snippet.includes('gamma'));
  for (const snippetMode of ['chars', 'lines']) {
   const occurrences = await engine.getOccurrencesForMatch(valid.results[0], valid.results[0].matches[0], { snippetMode });
   assert.equal(occurrences.count, 1);
   assert.ok(!occurrences.items[0].snippet.includes('gamma'));
  }
  works.works[0].length = 6;
  await writeFile(join(output, 'works.json'), JSON.stringify(works));
  const legacyEngine = new TexoroSearchEngine({ indexBaseUrl: `http://127.0.0.1:${server.address().port}`, textLoader: async () => raw, cacheInIndexedDb: false });
  assert.equal((await legacyEngine.search('"beta gamma"', map)).totalOccurrences, 1);
 } finally {
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
  await rm(root, { recursive: true, force: true });
 }
});
