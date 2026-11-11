import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

test('collection intersects with genre, subgenre, author and selected works in the text index', async (t) => {
	const root = await mkdtemp(join(tmpdir(), 'texoro-collection-filter-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	const input = join(root, 'texts');
	const index = join(root, 'index');
	const modules = join(root, 'modules');
	await mkdir(input);
	await mkdir(modules);

	const attribution = (authorId) => ({ connector: 'and', groups: [{ members: [{ authorId }] }] });
	const examen = 'examen-autorias';
	const lopeCollection = 'lope-de-vega';
	const works = [
		{ id: 'comedia-lope', text: 'amor amor', genre: 'Comedia', generalGenre: 'Teatro', collectionIds: [examen, lopeCollection] },
		{ id: 'auto-lope', text: 'amor', genre: 'Auto sacramental', generalGenre: 'Teatro', collectionIds: [examen, lopeCollection] },
		{ id: 'novela-lope', text: 'amor amor amor', genre: 'Novela', generalGenre: 'Prosa', collectionIds: [lopeCollection] },
		{ id: 'comedia-otra', text: 'amor amor amor amor', genre: 'Comedia', generalGenre: 'Teatro', collectionIds: [examen] },
		{ id: 'poema', text: 'amor amor amor amor amor', genre: 'Lírica', generalGenre: 'Poesía' }
	];
	const workMetaById = new Map(works.map(({ id, genre, generalGenre, collectionIds }) => [id, {
		id, genre, generalGenre, collectionIds,
		traditionalAttribution: attribution(id === 'comedia-otra' ? 'cervantes' : 'lope'),
		stylometryAttribution: { connector: 'and', groups: [] }
	}]));
	await Promise.all(works.map(({ id, text }) => writeFile(join(input, `${id}.txt`), text)));
	execFileSync(process.execPath, ['scripts/build-search-index.mjs', '--input', input, '--output', index, '--workers', '1', '--compact']);

	for (const name of await readdir('src/lib/search')) {
		if (!name.endsWith('.ts')) continue;
		const source = await readFile(join('src/lib/search', name), 'utf8');
		const { outputText } = ts.transpileModule(source, {
			compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
		});
		await writeFile(join(modules, name.replace(/\.ts$/, '.mjs')), outputText.replace(/(from\s+['"])(\.\/[^'"]+)(['"])/g, '$1$2.mjs$3'));
	}
	const { TexoroSearchEngine } = await import(pathToFileURL(join(modules, 'engine.mjs')).href);
	const loadedTexts = [];
	const engine = new TexoroSearchEngine({
		indexLoader: async (file) => JSON.parse(await readFile(join(index, file), 'utf8')),
		textLoader: async (file) => {
			loadedTexts.push(file);
			return readFile(join(input, file), 'utf8');
		},
		cacheInIndexedDb: false
	});

	const lope = { collectionId: lopeCollection };
	const theater = { ...lope, generalGenres: ['Teatro'] };
	const comedy = { ...theater, genres: ['Comedia'] };
	await engine.primeQuery('amor', { ...comedy, workMetaById, prefetchTexts: true });
	assert.deepEqual(loadedTexts, ['comedia-lope.txt']);

	const check = async (filters, ids, occurrences) => {
		const result = await engine.search('amor', workMetaById, filters);
		assert.deepEqual(result.allResults.map((work) => work.workId).sort(), ids);
		assert.equal(result.totalOccurrences, occurrences);
	};
	await check(lope, ['auto-lope', 'comedia-lope', 'novela-lope'], 6);
	await check(theater, ['auto-lope', 'comedia-lope'], 3);
	await check(comedy, ['comedia-lope'], 2);
	await check({ ...comedy, traditionalAuthorIds: ['cervantes'] }, [], 0);
	await check({ ...comedy, workIds: ['comedia-otra'] }, [], 0);
	await check({ ...lope, generalGenres: ['Poesía'] }, [], 0);
	await check({ collectionId: examen, genres: ['Comedia'] }, ['comedia-lope', 'comedia-otra'], 6);
	await check({}, ['auto-lope', 'comedia-lope', 'comedia-otra', 'novela-lope', 'poema'], 15);
});
