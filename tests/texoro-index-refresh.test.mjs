import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const serverSource = await readFile(new URL('../src/lib/server/texoro-runtime.ts', import.meta.url), 'utf8');
const serverFunction = serverSource.slice(serverSource.indexOf('export const getServerTexoroEngine'));
const catalogueRefresh = serverSource.slice(serverSource.indexOf('let refreshedCatalogIndexVersion'), serverSource.indexOf('const stripTrailingSlash'));
const metadataFunction = serverSource.slice(serverSource.indexOf('export const getTexoroWorkMeta'), serverSource.indexOf('export const getTexoroOptions'));
const checkInterval = serverSource.match(/const ENGINE_VERSION_CHECK_MS = ([\d_]+);/)[1];
const serverFactory = compile(`let engine = null; let enginePromise = null; let engineVersionCheckedAt = 0;
const ENGINE_VERSION_CHECK_MS = ${checkInterval}; const TEXORO_GLOBAL_CACHE_MS = 600000;
let cachedTexoroStats = null; let cachedTexoroWorkMeta = null; let cachedTexoroOptions = null;
${catalogueRefresh}
${metadataFunction}
${serverFunction}`);

const serverFixture = () => {
  const state = { now: 1000, version: 'v1', creations: 0, initializations: 0, manifestLoads: 0, failInitialize: false, failCatalogRefresh: false, catalogReads: 0, textCacheClears: 0, publishedWorks: [{id:'one'}], snapshotWorks: [{id:'one'}] };
  class Engine {
    manifest = null;
    constructor() { state.creations++; }
    async initialize() {
      state.initializations++;
      await Promise.resolve();
      if (state.failInitialize) throw new Error('publication incomplete');
      this.manifest = { indexVersion: state.version };
    }
    async search(query, metadata) { return Array.from(metadata.keys()); }
  }
  const exports = {};
  new Function('exports', 'Date', 'TexoroSearchEngine', 'fetchIndexManifest', 'globalThis', 'getTexoroIndexBaseUrl', 'readPrivateTextByTextKey', 'process', 'refreshCatalogSnapshot', 'getAllWorks', 'toTexoroWorkMeta', 'buildWorkMetaMap', 'clearPrivateTextCache', serverFactory)(
    exports, { now: () => state.now }, Engine,
    async () => { state.manifestLoads++; await Promise.resolve(); return { indexVersion: state.version, stats: { works: state.publishedWorks.length } }; },
    { fetch: () => { throw new Error('No network allowed'); } },
    () => 'https://test.invalid/search', () => {}, { env: {} },
    async () => { state.catalogReads++; await Promise.resolve(); if (state.failCatalogRefresh) throw new Error('Turso temporarily unavailable'); state.snapshotWorks = state.publishedWorks.slice(); },
    async () => state.snapshotWorks, (work) => work, (works) => new Map(works.map((w) => [w.id, w])), () => { state.textCacheClears++; }
  );
  return { state, get: exports.getServerTexoroEngine, metadata: exports.getTexoroWorkMeta, search: exports.searchTexoro };
};

test('server shares initialization and version checks, retains matching index and refreshes after 60 seconds', async () => {
  const { state, get } = serverFixture();
  const first = await Promise.all([get(), get(), get()]);
  assert.equal(state.creations, 1);
  assert.equal(first[0], first[1]);
  assert.equal(state.catalogReads, 1);
  assert.equal(state.textCacheClears, 1);
  state.version = 'v2';
  state.now += 59_999;
  assert.equal(await get(), first[0]);
  assert.equal(state.manifestLoads, 0);
  state.now++;
  const fresh = await Promise.all([get(), get(), get()]);
  assert.equal(state.manifestLoads, 1);
  assert.equal(state.creations, 2);
  assert.equal(fresh[0], fresh[1]);
  assert.equal(fresh[0].manifest.indexVersion, 'v2');
  state.now += 60_000;
  assert.equal(await get(), fresh[0]);
  assert.equal(state.manifestLoads, 2);
  assert.equal(state.creations, 2);
  assert.equal(state.catalogReads, 2);
  assert.equal(state.textCacheClears, 2);
});

test('failed server refresh releases its promise for the next request', async () => {
  const { state, get } = serverFixture();
  await get();
  state.now += 60_000;
  state.version = 'v2';
  state.failInitialize = true;
  await assert.rejects(get(), /publication incomplete/);
  state.failInitialize = false;
  assert.equal((await get()).manifest.indexVersion, 'v2');
});

const clientSource = await readFile(new URL('../src/lib/search/texoro-client-worker.ts', import.meta.url), 'utf8');
const clientFactory = compile(clientSource.replaceAll('import.meta.url', JSON.stringify('https://test.invalid/worker-client.js')));
const mismatch = () => ({ ok: false, error: 'Index version mismatch for vocab.json: expected v1, got v2' });
const clientFixture = () => {
  const state = { version: 'v1', engineVersion: '', requests: [], inits: 0, initialMismatches: 0, persistentMismatch: false, expectedIds: ['one'] };
  class Worker {
    terminate() {}
    postMessage(request) {
      state.requests.push(request);
      const response = (async () => {
        if (request.action === 'init') {
          state.inits++;
          if (state.initialMismatches-- > 0) return mismatch();
          await Promise.resolve();
          state.engineVersion = state.version;
          return { ok: true, result: { manifest: { indexVersion: state.version }, missingWorkIds: state.expectedIds.filter((id) => !request.worksMeta.some((w) => w.id === id)) } };
        }
        const engineVersion = state.engineVersion;
        await Promise.resolve();
        if (state.persistentMismatch || engineVersion !== state.version) return mismatch();
        return { ok: true, result: { execution: { indexVersion: state.engineVersion } } };
      })();
      response.then((value) => this.onmessage({ data: { id: request.id, ...value } }));
    }
  }
  const exports = {};
  new Function('exports', 'Worker', 'globalThis', clientFactory)(exports, Worker, globalThis);
  return { state, api: exports, config: { indexBaseUrl: 'https://test.invalid/search', worksMeta: [{ id: 'one', title: 'One' }] } };
};

test('worker reuse includes fresh index version, preserves metadata invalidation and coalesces concurrent init', async () => {
  const { state, api, config } = clientFixture();
  await Promise.all([api.initializeTexoroClientWorker({ ...config, indexVersion: 'v1' }), api.initializeTexoroClientWorker({ ...config, indexVersion: 'v1' })]);
  assert.equal(state.inits, 1);
  await api.initializeTexoroClientWorker({ ...config, indexVersion: 'v1' });
  assert.equal(state.inits, 1);
  state.version = 'v2';
  await Promise.all([api.initializeTexoroClientWorker({ ...config, indexVersion: 'v2' }), api.initializeTexoroClientWorker({ ...config, indexVersion: 'v2' })]);
  assert.equal(state.inits, 2);
  await api.initializeTexoroClientWorker({ ...config, worksMeta: [{ id: 'one', title: 'Changed' }], indexVersion: 'v2' });
  assert.equal(state.inits, 3);
});

test('concurrent outdated requests share one worker refresh and each retry once', async () => {
  const { state, api, config } = clientFixture();
  await api.initializeTexoroClientWorker({ ...config, indexVersion: 'v1' });
  state.version = 'v2';
  const result = await Promise.all([api.requestTexoroClientWorker({ action: 'search', query: 'amor' }), api.requestTexoroClientWorker({ action: 'search', query: 'muerte' })]);
  assert.equal(state.inits, 2);
  assert.equal(state.requests.filter((r) => r.action === 'search').length, 4);
  assert.ok(result.every((r) => r.execution.indexVersion === 'v2'));
  assert.equal(api.getTexoroClientWorkerManifest().indexVersion, 'v2');
});

test('persistent mismatch is returned after one retry and does not loop', async () => {
  const { state, api, config } = clientFixture();
  await api.initializeTexoroClientWorker({ ...config, indexVersion: 'v1' });
  state.version = 'v2';
  state.persistentMismatch = true;
  await assert.rejects(api.requestTexoroClientWorker({ action: 'search', query: 'amor' }), /Index version mismatch/);
  assert.equal(state.inits, 2);
  assert.equal(state.requests.filter((r) => r.action === 'search').length, 2);
});

test('initial publication mismatch retries once and still coalesces concurrent callers', async () => {
  const { state, api, config } = clientFixture();
  state.version = 'v2';
  state.initialMismatches = 1;
  const result = await Promise.all([api.initializeTexoroClientWorker({ ...config, indexVersion: 'v1' }), api.initializeTexoroClientWorker({ ...config, indexVersion: 'v1' })]);
  assert.equal(state.inits, 2);
  assert.ok(result.every((r) => r.indexVersion === 'v2'));
});


test('new-version search waits for one shared catalogue refresh and includes the new work', async () => {
  const { state, get, metadata, search } = serverFixture();
  await get();
  assert.deepEqual(await metadata(), [{ id: 'one' }]);
  state.version = 'v2';
  state.publishedWorks = [{ id: 'one' }, { id: 'two' }];
  state.now += 60_000;
  const results = await Promise.all([search('amor'), search('muerte')]);
  assert.ok(results.every((ids) => ids.includes('two')));
  assert.equal(state.catalogReads, 2);
  assert.deepEqual(await metadata(), state.publishedWorks);
  state.now += 60_000;
  await Promise.all([search('amor'), search('muerte')]);
  assert.equal(state.catalogReads, 2);
});

test('explicit metadata refresh requires actual R2 version and deduplicates the event', async () => {
  const { state, metadata } = serverFixture();
  await metadata();
  await metadata('v1');
  await metadata('arbitrary-version');
  assert.equal(state.catalogReads, 1);
  state.version = 'v2';
  state.publishedWorks = [{ id: 'one' }, { id: 'two' }];
  const results = await Promise.all([metadata('v2'), metadata('v2')]);
  assert.ok(results.every((works) => works.length === 2));
  assert.equal(state.catalogReads, 2);
  await metadata('v2');
  assert.equal(state.catalogReads, 2);
});

test('metadata refresh replaces stale work IDs even when the work count is unchanged', async () => {
  const { state, metadata } = serverFixture();
  assert.deepEqual(await metadata(), [{id:'one'}]);
  state.version = 'v2';
  state.publishedWorks = [{id:'two'}];
  const results = await Promise.all([metadata('v2'), metadata('v2')]);
  assert.ok(results.every((works) => works[0].id === 'two'));
  assert.equal(state.catalogReads, 1);
  await metadata('v2');
  await metadata('invented-v3');
  assert.equal(state.catalogReads, 1);
});

test('failed catalogue refresh does not mark new index coherent and preserves old metadata', async () => {
  const { state, get, metadata } = serverFixture();
  await get();
  assert.deepEqual(await metadata(), [{id:'one'}]);
  state.now += 60_000;
  state.version = 'v2';
  state.publishedWorks = [{id:'two'}];
  state.failCatalogRefresh = true;
  await assert.rejects(get(), /Turso temporarily unavailable/);
  assert.equal(state.textCacheClears, 1);
  assert.deepEqual(await metadata(), [{id:'one'}]);
  state.failCatalogRefresh = false;
  assert.equal((await get()).manifest.indexVersion, 'v2');
  assert.deepEqual(await metadata(), [{id:'two'}]);
  assert.equal(state.catalogReads, 3);
  assert.equal(state.textCacheClears, 2);
});

test('first server engine refreshes a catalogue loaded before publication by another page', async () => {
  const {state,metadata,search} = serverFixture();
  assert.deepEqual(await metadata(), [{id:'one'}]);
  state.version = 'v2';
  state.publishedWorks = [{id:'two'}];
  const results = await Promise.all([search('amor'),search('muerte')]);
  assert.ok(results.every((ids) => ids.length === 1 && ids[0] === 'two'));
  assert.deepEqual(await metadata(), [{id:'two'}]);
  assert.equal(state.catalogReads, 1);
  assert.equal(state.textCacheClears, 1);
  await search('amor');
  assert.equal(state.catalogReads, 1);
  assert.equal(state.textCacheClears, 1);
});

test('worker requests fresh metadata only when new index has missing work IDs', async () => {
  const { state, api, config } = clientFixture();
  let metadataLoads = 0;
  config.refreshWorksMeta = async (version) => {
    assert.equal(version, 'v2');
    metadataLoads++;
    return [{ id: 'one' }, { id: 'two' }];
  };
  await api.initializeTexoroClientWorker({ ...config, indexVersion: 'v1' });
  assert.equal(metadataLoads, 0);
  state.version = 'v2';
  state.expectedIds.push('two');
  await Promise.all([api.initializeTexoroClientWorker({ ...config, indexVersion: 'v2' }), api.initializeTexoroClientWorker({ ...config, indexVersion: 'v2' })]);
  assert.equal(metadataLoads, 1);
  assert.ok(state.requests.at(-1).worksMeta.some((w) => w.id === 'two'));
  await api.requestTexoroClientWorker({ action: 'search', query: 'amor' });
  assert.equal(metadataLoads, 1);
});

test('persistent missing metadata is surfaced after one refresh', async () => {
  const { state, api, config } = clientFixture();
  state.expectedIds.push('two');
  let metadataLoads = 0;
  config.refreshWorksMeta = async () => { metadataLoads++; return config.worksMeta; };
  await assert.rejects(api.initializeTexoroClientWorker(config), /metadata mismatch after one refresh/);
  assert.equal(metadataLoads, 1);
  assert.equal(state.inits, 2);
});

const catalogSource = await readFile(new URL('../src/lib/server/catalog-runtime.ts', import.meta.url), 'utf8');
const snapshotFunctions = catalogSource.slice(catalogSource.indexOf('const refreshSnapshot ='), catalogSource.indexOf('const distancesBySnapshot'));
const snapshotFactory = compile(`
let cachedSnapshot = { works: [{id:'old'}] }; let cachedAt = 1000; let cachedSnapshotPromise = null;
const CACHE_MS = 600000; const SLOW_SNAPSHOT_LOG_MS = 999999;
${snapshotFunctions}
exports.getSnapshot = getSnapshot;
`);
const snapshotFixture = () => {
  const state = {now:1001, reads:0, resolve:null, reject:null};
  const exports = {};
  new Function('exports', 'Date', 'console', 'createSnapshot', snapshotFactory)(
    exports, {now:() => state.now}, {warn(){}, error(){}},
    () => { state.reads++; return new Promise((resolve,reject) => {state.resolve=resolve;state.reject=reject;}); }
  );
  return {state, api:exports};
};

test('failed strict catalogue refresh shares reads and retains the valid snapshot for other pages', async () => {
  const {state,api} = snapshotFixture();
  const refreshes = Promise.allSettled([api.refreshCatalogSnapshot(),api.refreshCatalogSnapshot()]);
  assert.equal(state.reads, 1);
  assert.deepEqual(await api.getSnapshot(), {works:[{id:'old'}]});
  state.reject(new Error('Turso temporarily unavailable'));
  const results = await refreshes;
  assert.ok(results.every((result) => result.status === 'rejected'));
  assert.deepEqual(await api.getSnapshot(), {works:[{id:'old'}]});
  assert.equal(state.reads, 1);
});

test('strict index update joins regular catalogue refresh without issuing a second read', async () => {
  const {state,api} = snapshotFixture();
  state.now += 600000;
  assert.deepEqual(await api.getSnapshot(), {works:[{id:'old'}]});
  const strictRefresh = api.refreshCatalogSnapshot();
  assert.equal(state.reads, 1);
  state.resolve({works:[{id:'new'}]});
  await strictRefresh;
  assert.deepEqual(await api.getSnapshot(), {works:[{id:'new'}]});
  assert.equal(state.reads, 1);
});
