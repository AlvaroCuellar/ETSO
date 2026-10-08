import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

test('index preserves poem authors, validates collection membership and accepts legacy inputs', async () => {
 const root = await mkdtemp(join(tmpdir(), 'etso-section-authors-'));
 try {
  const input = join(root, 'texts'); const output = join(root, 'index'); const sidecar = join(root, 'section-authors.json');
  await mkdir(input);
  await writeFile(join(input, 'collection.txt'), 'alpha beta\n\f\ngamma delta');
  await writeFile(join(input, 'other.txt'), 'epsilon');
  const metadata = join(root, 'catalogue.sqlite');
  const db = new DatabaseSync(metadata);
  db.exec("CREATE TABLE works(id TEXT, public_id INTEGER); INSERT INTO works VALUES('collection',1),('other',2); CREATE TABLE work_author_index(work_id TEXT,author_id TEXT,attribution_type TEXT); INSERT INTO work_author_index VALUES('collection','cervantes','tradicional'),('collection','lope','tradicional');");
  db.close();
  const build = (workers = '1') => execFileSync(process.execPath, ['scripts/build-search-index.mjs', '--input', input, '--output', output, '--metadata-sqlite', metadata, '--workers', workers, '--compact'], { stdio: 'pipe' });
  const payload = (authors) => JSON.stringify({ schemaVersion: 'etso-section-authors-v1', works: { collection: authors } });
  await writeFile(sidecar, payload([['cervantes'], ['lope']]));
  for (const workers of ['1', '2']) {
   build(workers);
   const works = JSON.parse(await readFile(join(output, 'works.json'), 'utf8'));
   assert.deepEqual(works.works[0][6], [1,3]);
   assert.deepEqual(works.works[0][7], [['cervantes'],['lope']]);
  }
  for (const invalid of [[['cervantes']], [['cervantes'],['unknown']], [['cervantes'],[]]]) {
   await writeFile(sidecar, payload(invalid));
   assert.throws(() => build(), /Invalid section|outside collection/);
  }
  await rm(sidecar);
  build();
  const legacy = JSON.parse(await readFile(join(output,'works.json'),'utf8'));
  assert.equal(legacy.works[0][7], undefined);
  assert.deepEqual(legacy.works[0][6], [1,3]);
  const classified = new DatabaseSync(metadata);
  classified.exec("ALTER TABLE works ADD COLUMN collection_size INTEGER; UPDATE works SET collection_size=2 WHERE id='collection';");
  classified.close();
  assert.throws(() => build(), /Missing section authors metadata/);
  await writeFile(sidecar, JSON.stringify({schemaVersion:'etso-section-authors-v1',works:{}}));
  assert.throws(() => build(), /Missing or incomplete section authors/);
  await writeFile(sidecar, payload([['cervantes'],['lope']]));
  build();
 } finally { await rm(root, { recursive:true, force:true }); }
});
