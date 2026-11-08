#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { isFrequencyIndexFile } from '../../src/lib/search/frequency-index.ts';
import { readLocalTexoroFrequencyJson, texoroFrequencyManifestFiles } from '../../src/lib/server/texoro-frequency-index.ts';

const { values } = parseArgs({
	options: { input: { type: 'string' }, output: { type: 'string' } }
});

if (!values.input || !values.output) {
	throw new Error('Uso: node deploy/scripts/build-frequency-index.mjs --input <índice> --output <directorio nuevo>');
}

const input = await realpath(values.input);
const outputParent = await realpath(dirname(resolve(values.output)));
const output = join(outputParent, basename(resolve(values.output)));
const pathFromInput = relative(input, output);
if (!pathFromInput || (pathFromInput !== '..' && !pathFromInput.startsWith(`..${sep}`))) {
	throw new Error('La salida no puede estar dentro del índice de origen.');
}

/** @param {string} path */
const ensureAbsent = async (path) => {
	try {
		await lstat(path);
	} catch (cause) {
		if (/** @type {NodeJS.ErrnoException} */ (cause).code === 'ENOENT') return;
		throw cause;
	}
	throw new Error(`La salida ya existe: ${path}`);
};

/** @param {unknown} value */
const isCount = (value) => Number.isSafeInteger(value) && Number(value) >= 0;

const rootFields = new Map([
	['index', ['normalization', 'tokenization', 'stats', 'features', 'files', 'directories', 'shards']],
	['works', ['works', 'totals']],
	['public-ids', ['publicIds']],
	['vocab', ['shardStrategy', 'totalTerms', 'shards', 'lookup']],
	['kgrams', ['k', 'boundary', 'totalKgrams', 'shards']],
	['wildcard-lengths', ['minLength', 'maxLength', 'lengths']]
]);

const shardFields = new Set([
	'id', 'file', 'termMin', 'termMax', 'minTermId', 'maxTermId', 'termsCount',
	'gramMin', 'gramMax', 'gramsCount', 'estimatedBytes'
]);

/** @param {any} shard @param {Set<string>} files */
const isPublicShard = (shard, files) => files.has(shard.file) &&
	Object.entries(shard).every(([key, value]) => shardFields.has(key) &&
		(typeof value === 'string' || isCount(value)));

/**
 * @param {string} path
 * @param {any} value
 * @param {string} version
 * @param {Set<string>} files
 */
const checkFrequencyFile = (path, value, version, files) => {
	assert.equal(value.indexVersion, version, `Versión incoherente en ${path}`);
	const schema = 'etso-search-';
	let kind;
	let payload;
	if (path.startsWith('postings/')) {
		kind = 'postings';
		payload = 'postings';
		assert.ok(value.postings.every((/** @type {[number, number[][]]} */ posting) => posting.length === 2 &&
			isCount(posting[0]) && posting[1].every((/** @type {number[]} */ row) =>
				row.length === 2 && row.every(isCount))), `Postings inválidos en ${path}`);
	} else if (path.startsWith('vocab-shards/')) {
		kind = 'vocab-shard';
		payload = 'terms';
		assert.ok(value.terms.every((/** @type {any[]} */ row) => row.length === 6 &&
			typeof row[0] === 'string' && row.slice(1, 5).every(isCount) && /^p-\d+$/.test(row[5])),
		`Vocabulario inválido en ${path}`);
	} else if (path.startsWith('kgram-shards/')) {
		kind = 'kgram-shard';
		payload = 'grams';
		assert.ok(value.grams.every((/** @type {any[]} */ row) => row.length === 2 &&
			typeof row[0] === 'string' && row[1].every(isCount)), `K-gramas inválidos en ${path}`);
	} else {
		kind = path === 'manifest.json' ? 'index' : path.slice(0, -5);
		if (kind === 'works') {
			assert.ok(value.works.every((/** @type {any[]} */ row) => row.length === 6 &&
				isCount(row[0]) && typeof row[1] === 'string' && row[2] === '' && row[3] === '' &&
				isCount(row[4]) && row[5] === 0), `Obras inválidas en ${path}`);
		} else if (kind === 'public-ids') {
			assert.ok(value.publicIds.every((/** @type {any[]} */ row) => row.length === 2 && row.every(isCount)),
				`Identificadores inválidos en ${path}`);
		} else if (kind === 'wildcard-lengths') {
			assert.ok(value.lengths.every((/** @type {any[]} */ row) => row.length === 2 &&
				isCount(row[0]) && row[1].every(isCount)), `Longitudes inválidas en ${path}`);
		}
	}
	assert.equal(value.schemaVersion, `${schema}${kind}-v1`, `Esquema inesperado en ${path}`);
	if (payload) {
		const fields = ['schemaVersion', 'indexVersion', 'shard', payload];
		if (kind === 'kgram-shard') fields.push('k', 'boundary');
		assert.ok(Object.keys(value).every((field) => fields.includes(field)), `Campos inesperados en ${path}`);
		assert.ok(value.shard.file === path && isPublicShard(value.shard, files), `Fragmento inválido en ${path}`);
	} else {
		const fields = ['schemaVersion', 'indexVersion', 'generatedAt', ...(rootFields.get(kind) ?? [])];
		assert.ok(Object.keys(value).every((field) => fields.includes(field)), `Campos inesperados en ${path}`);
		if (kind === 'vocab' || kind === 'kgrams') {
			assert.ok(value.shards.every((/** @type {any} */ shard) => isPublicShard(shard, files)),
				`Fragmentos inválidos en ${path}`);
		}
	}
};

await ensureAbsent(output);
const sourceManifest = await readFile(join(input, 'manifest.json'), 'utf8');
const manifestJson = await readLocalTexoroFrequencyJson(input, 'manifest.json');
assert.ok(manifestJson, 'Falta el manifiesto de frecuencias.');
const manifest = JSON.parse(manifestJson);
const indexVersion = JSON.parse(sourceManifest).indexVersion;
assert.match(indexVersion, /^v\d+-[A-Za-z0-9-]+$/);
assert.deepEqual(manifest.features, {
	publicIds: manifest.features.publicIds, positions: false, proximity: false, byteOffsets: false
});
assert.ok(!Object.hasOwn(manifest.shards, 'positions') && !Object.hasOwn(manifest.directories, 'positions'));
assert.ok(!Object.hasOwn(manifest.stats, 'totalPositionEntries') && !Object.hasOwn(manifest, 'build'));

const files = texoroFrequencyManifestFiles(manifest).sort();
const fileSet = new Set(files);
assert.equal(fileSet.size, files.length, 'El manifiesto repite nombres de archivo.');
assert.ok(files.every(isFrequencyIndexFile), 'El manifiesto incluye un archivo fuera de la lista permitida.');
assert.ok(Object.values(manifest.shards).flat().every((shard) => isPublicShard(shard, fileSet)),
	'El manifiesto incluye metadatos de fragmentos inesperados.');

const stage = await mkdtemp(join(outputParent, `.${basename(output)}-`));
const releaseHash = createHash('sha256');
let bytes = 0;
try {
	for (const path of files) {
		const body = await readLocalTexoroFrequencyJson(input, path);
		assert.ok(body, `Falta ${path} en el índice.`);
		checkFrequencyFile(path, JSON.parse(body), indexVersion, fileSet);
		const target = join(stage, path);
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, body, { flag: 'wx' });
		const written = await readFile(target);
		const hash = createHash('sha256').update(written).digest('hex');
		assert.equal(hash, createHash('sha256').update(body).digest('hex'), `No se pudo verificar ${path}`);
		releaseHash.update(`${hash}  ${path}\n`);
		bytes += written.length;
	}
	assert.equal(await readFile(join(input, 'manifest.json'), 'utf8'), sourceManifest,
		'El manifiesto de origen cambió durante la copia.');
	await ensureAbsent(output);
	await rename(stage, output);
} catch (cause) {
	await rm(stage, { recursive: true, force: true });
	throw cause;
}

console.log(JSON.stringify({ indexVersion, files: files.length, bytes, sha256: releaseHash.digest('hex') }));
