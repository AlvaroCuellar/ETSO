import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import ts from 'typescript';

test('compound proximity counts agree with displayed distinct groups for repeated anchors, phrases, orders and sections', async (t) => {
 const root = await mkdtemp(join(tmpdir(), 'etso-proximity-parity-'));
 let server;
 try {
  const input = join(root, 'texts'), output = join(root, 'index'), modules = join(root, 'modules');
  await mkdir(input); await mkdir(modules);
  const texts = new Map([
   ['repeated', 'amor amor vida vida vida vida vida vida vida amor amor cielo'],
   ['phrases', 'luz azul amor verde cielo claro luz azul amor verde cielo claro'],
   ['sections', 'amor amor\n\f\ncielo']
  ]);
  try { texts.set('real', await readFile('deploy/input/private-assets/texts/LEIVA&CORREA_AmorAstuciaYValor(Transk-IMPR).txt', 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const [id, raw] of texts) await writeFile(join(input, `${id}.txt`), raw);
  execFileSync(process.execPath, ['scripts/build-search-index.mjs', '--input', input, '--output', output, '--workers', '1', '--compact'], { stdio: 'pipe' });
  const works = JSON.parse(await readFile(join(output, 'works.json'), 'utf8'));
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
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const engine = new TexoroSearchEngine({ indexBaseUrl: `http://127.0.0.1:${server.address().port}`, textLoader: async (id) => texts.get(id.replace(/\.txt$/, '')), cacheInIndexedDb: false });
  const attribution = { groups: [], connector: 'and' };
  const metadata = new Map(works.works.map((row) => [row[1], { id: row[1], inAuthorshipExam: false, title: row[1], titleVariants: [], slug: row[1], genre: 'Comedia', textState: '', shortSummary: '', textLinks: [], traditionalAttribution: attribution, stylometryAttribution: attribution }]));
  const verify = async (id, main, terms, expected) => {
   const structuredQuery = { main, proximityMode: 'all', proximityTerms: terms.map(([value, order]) => ({ value, order, distance: 20 })) };
   const found = await engine.search(main, metadata, { workIds: [id], structuredQuery });
   assert.equal(found.totalOccurrences, expected, `${id}: search`);
   if (expected === 0) return;
   assert.equal(found.results.length, 1);
   const match = found.results[0].matches.find((item) => item.kind === 'proximityGroup');
   assert.ok(match);
   const detail = await engine.getOccurrencesForMatch(found.results[0], match, { maxItems: 1000 });
   assert.equal(detail.count, found.totalOccurrences, `${id}: count/detail parity`);
   assert.equal(detail.items.length, expected);
   assert.equal(new Set(detail.items.map((item) => JSON.stringify(item.highlights))).size, expected);
   t.diagnostic(`${id}: ${main} / ${terms.map(([value, order]) => `${value}:${order}`).join(', ')} => ${expected}/${detail.count}`);
  };
  // Previously this returned 3 indexed groups but only 2 displayed groups.
  await verify('repeated', 'amor', [['amor', 'any'], ['cielo', 'any']], 2);
  await verify('repeated', 'amor', [['amor', 'after'], ['cielo', 'after']], 3);
  await verify('repeated', 'amor', [['amor', 'before'], ['cielo', 'before']], 0);
  await verify('repeated', 'amor', [['amor', 'before'], ['cielo', 'after']], 3);
  await verify('phrases', '"luz azul"', [['"luz azul"', 'any'], ['"cielo claro"', 'any']], 1);
  await verify('sections', 'amor', [['amor', 'any'], ['cielo', 'any']], 0);
  if (texts.has('real')) {
   // The real audit reproduction previously returned 421 indexed vs 366 displayed.
   await verify('real', 'que', [['que', 'any'], ['de', 'any']], 366);
  } else t.diagnostic('Private real-work fixture unavailable; synthetic regressions still exercised.');
 } finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
 }
});
