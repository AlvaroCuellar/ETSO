#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const usage = () => {
	console.log('Usage: node scripts/validate-search-index.mjs [--index-dir <dir>]');
};

const parseArgs = (argv) => {
	let indexDir = resolve(process.cwd(), 'data', 'search-index');
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--help' || arg === '-h') {
			usage();
			process.exit(0);
		}
		if (arg === '--index-dir') {
			const next = argv[i + 1];
			if (!next) throw new Error('Missing value for --index-dir');
			indexDir = resolve(process.cwd(), next);
			i += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}
	return { indexDir };
};

const readJson = async (pathValue) => JSON.parse(await readFile(pathValue, 'utf8'));

const ensureExists = async (pathValue) => {
	await access(pathValue, fsConstants.F_OK);
};

const main = async () => {
	const { indexDir } = parseArgs(process.argv.slice(2));

	const required = [
		'manifest.json',
		'works.json',
		'vocab.json',
		'kgrams.json',
		'wildcard-lengths.json'
	];
	for (const name of required) {
		await ensureExists(join(indexDir, name));
	}

	const manifest = await readJson(join(indexDir, 'manifest.json'));
	const works = await readJson(join(indexDir, 'works.json'));
	const vocabRoot = await readJson(join(indexDir, 'vocab.json'));
	const kgramsRoot = await readJson(join(indexDir, 'kgrams.json'));
	const wildcardLengths = await readJson(join(indexDir, 'wildcard-lengths.json'));

	if (manifest.indexVersion !== works.indexVersion) {
		throw new Error('Index version mismatch between manifest and works.json');
	}
	if (manifest.indexVersion !== vocabRoot.indexVersion) {
		throw new Error('Index version mismatch between manifest and vocab.json');
	}
	if (manifest.indexVersion !== kgramsRoot.indexVersion) {
		throw new Error('Index version mismatch between manifest and kgrams.json');
	}
	if (manifest.indexVersion !== wildcardLengths.indexVersion) {
		throw new Error('Index version mismatch between manifest and wildcard-lengths.json');
	}

	const termMeta = new Map();
	for (const shardMeta of vocabRoot.shards) {
		const shard = await readJson(join(indexDir, shardMeta.file));
		for (const row of shard.terms) {
			const [term, termId, df, cf, len, postingsShard] = row;
			if (termMeta.has(termId)) {
				throw new Error(`Duplicate termId in vocab shards: ${termId}`);
			}
			termMeta.set(termId, { term, df, cf, len, postingsShard });
		}
	}

	if (termMeta.size !== vocabRoot.totalTerms) {
		throw new Error(`Unexpected total terms: vocab=${vocabRoot.totalTerms}, loaded=${termMeta.size}`);
	}

	const worksCount = works.works.length;
	let postingsTermCount = 0;
	for (const shardMeta of manifest.shards.postings) {
		const shard = await readJson(join(indexDir, shardMeta.file));
		for (const [termId, postings] of shard.postings) {
			const meta = termMeta.get(termId);
			if (!meta) throw new Error(`Postings reference unknown termId: ${termId}`);
			if (meta.postingsShard !== shardMeta.id) {
				throw new Error(`Term ${termId} expected in shard ${meta.postingsShard}, found in ${shardMeta.id}`);
			}
			for (const [docId, tf] of postings) {
				if (!Number.isInteger(docId) || docId < 0 || docId >= worksCount) {
					throw new Error(`Invalid docId in postings term ${termId}: ${docId}`);
				}
				if (!Number.isInteger(tf) || tf <= 0) {
					throw new Error(`Invalid tf in postings term ${termId}: ${tf}`);
				}
			}
			postingsTermCount += 1;
		}
	}

	const wildcardTermIds = new Set();
	for (const [length, termIds] of wildcardLengths.lengths) {
		if (!Number.isInteger(length) || length <= 0) throw new Error(`Invalid wildcard length: ${length}`);
		for (const termId of termIds) {
			if (!termMeta.has(termId)) throw new Error(`wildcard-lengths references unknown termId: ${termId}`);
			wildcardTermIds.add(termId);
		}
	}

	let kgramEntries = 0;
	for (const shardMeta of kgramsRoot.shards) {
		const shard = await readJson(join(indexDir, shardMeta.file));
		for (const [gram, termIds] of shard.grams) {
			if (typeof gram !== 'string' || gram.length === 0) {
				throw new Error('Invalid kgram entry');
			}
			for (const termId of termIds) {
				if (!termMeta.has(termId)) throw new Error(`kgram references unknown termId: ${termId}`);
			}
			kgramEntries += 1;
		}
	}

	console.log('[validate-search-index] OK');
	console.log(`[validate-search-index] works=${worksCount} terms=${termMeta.size} postingsTerms=${postingsTermCount}`);
	console.log(`[validate-search-index] wildcardTermIds=${wildcardTermIds.size} kgrams=${kgramEntries}`);
};

main().catch((error) => {
	console.error(`[validate-search-index] Error: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
});
