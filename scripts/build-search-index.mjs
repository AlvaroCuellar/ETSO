#!/usr/bin/env node

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import process from 'node:process';

const TOKEN_REGEX = /[\p{L}\p{N}]+/gu;
const DEFAULTS = {
	input: 'data/texts',
	output: 'data/search-index',
	encoding: 'utf8',
	kgram: 3,
	vocabShardTargetBytes: 256_000,
	postingsShardTargetBytes: 512_000,
	kgramShardTargetBytes: 256_000,
	preserveEnie: true,
	pretty: true
};

const DEFAULT_SCHEMA_VERSION = 'etso-search-index-v1';

const usage = () => {
	console.log(`Usage: node scripts/build-search-index.mjs [options]\n\nOptions:\n  --input <dir>                         Input TXT directory (default: ${DEFAULTS.input})\n  --output <dir>                        Output index directory (default: ${DEFAULTS.output})\n  --encoding <name>                     Text encoding for TXT files (default: ${DEFAULTS.encoding})\n  --kgram <n>                           K value for wildcard index (default: ${DEFAULTS.kgram})\n  --vocab-shard-target-bytes <n>        Approximate target size per vocab shard\n  --postings-shard-target-bytes <n>     Approximate target size per postings shard\n  --kgram-shard-target-bytes <n>        Approximate target size per kgram shard\n  --preserve-enie                       Preserve ñ when removing diacritics (default)\n  --no-preserve-enie                    Fold ñ into n\n  --pretty                              Pretty JSON output (default)\n  --compact                             Compact JSON output\n  --help                                Show this help\n`);
};

const parsePositiveInt = (raw, name) => {
	const value = Number.parseInt(raw, 10);
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`Invalid value for ${name}: ${raw}`);
	}
	return value;
};

const parseArgs = (argv) => {
	const options = { ...DEFAULTS };

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--help' || arg === '-h') {
			usage();
			process.exit(0);
		}
		if (arg === '--preserve-enie') {
			options.preserveEnie = true;
			continue;
		}
		if (arg === '--no-preserve-enie') {
			options.preserveEnie = false;
			continue;
		}
		if (arg === '--pretty') {
			options.pretty = true;
			continue;
		}
		if (arg === '--compact') {
			options.pretty = false;
			continue;
		}

		const next = argv[i + 1];
		if (!next) {
			throw new Error(`Missing value for ${arg}`);
		}

		if (arg === '--input') {
			options.input = next;
			i += 1;
			continue;
		}
		if (arg === '--output') {
			options.output = next;
			i += 1;
			continue;
		}
		if (arg === '--encoding') {
			options.encoding = next;
			i += 1;
			continue;
		}
		if (arg === '--kgram') {
			options.kgram = parsePositiveInt(next, '--kgram');
			i += 1;
			continue;
		}
		if (arg === '--vocab-shard-target-bytes') {
			options.vocabShardTargetBytes = parsePositiveInt(next, '--vocab-shard-target-bytes');
			i += 1;
			continue;
		}
		if (arg === '--postings-shard-target-bytes') {
			options.postingsShardTargetBytes = parsePositiveInt(next, '--postings-shard-target-bytes');
			i += 1;
			continue;
		}
		if (arg === '--kgram-shard-target-bytes') {
			options.kgramShardTargetBytes = parsePositiveInt(next, '--kgram-shard-target-bytes');
			i += 1;
			continue;
		}

		throw new Error(`Unknown argument: ${arg}`);
	}

	return {
		...options,
		input: resolve(process.cwd(), options.input),
		output: resolve(process.cwd(), options.output)
	};
};

const stableCompare = (a, b) => {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
};

const normalizePlainText = (input, preserveEnie) => {
	const lower = input.toLowerCase();
	if (!preserveEnie) {
		return lower.normalize('NFD').replace(/\p{M}+/gu, '');
	}

	const ENIE_MARKER = '\u0000';
	return lower
		.replaceAll('ñ', ENIE_MARKER)
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.replaceAll(ENIE_MARKER, 'ñ');
};

const tokenize = (normalizedText) => normalizedText.match(TOKEN_REGEX) ?? [];

const estimateBytes = (value) => Buffer.byteLength(JSON.stringify(value), 'utf8');

const chunkByTargetBytes = (items, targetBytes, estimateItemBytes) => {
	const chunks = [];
	let currentItems = [];
	let currentBytes = 0;

	for (const item of items) {
		const itemBytes = estimateItemBytes(item);
		if (currentItems.length > 0 && currentBytes + itemBytes > targetBytes) {
			chunks.push({ items: currentItems, estimatedBytes: currentBytes });
			currentItems = [];
			currentBytes = 0;
		}
		currentItems.push(item);
		currentBytes += itemBytes;
	}

	if (currentItems.length > 0) {
		chunks.push({ items: currentItems, estimatedBytes: currentBytes });
	}

	return chunks;
};

const toShardId = (prefix, index) => `${prefix}-${String(index).padStart(4, '0')}`;

const collectFiles = async (inputDir) => {
	const entries = await readdir(inputDir, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.txt')
		.map((entry) => entry.name)
		.sort(stableCompare);
};

const ensureDir = async (dirPath) => {
	await mkdir(dirPath, { recursive: true });
};

const writeJson = async (filePath, value, pretty) => {
	const text = `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
	await writeFile(filePath, text, 'utf8');
};

const buildIndex = async (options) => {
	const fileNames = await collectFiles(options.input);
	if (fileNames.length === 0) {
		throw new Error(`No .txt files found in ${options.input}`);
	}

	const works = [];
	const termStats = new Map();
	let totalChars = 0;
	let totalTokens = 0;

	for (let docId = 0; docId < fileNames.length; docId += 1) {
		const fileName = fileNames[docId];
		const workId = basename(fileName, '.txt');
		const filePath = join(options.input, fileName);
		const rawText = await readFile(filePath, options.encoding);
		const normalized = normalizePlainText(rawText, options.preserveEnie);
		const tokens = tokenize(normalized);
		const localTf = new Map();

		for (const token of tokens) {
			localTf.set(token, (localTf.get(token) ?? 0) + 1);
		}

		for (const [term, tf] of localTf) {
			let current = termStats.get(term);
			if (!current) {
				current = { cf: 0, df: 0, docTf: new Map() };
				termStats.set(term, current);
			}
			current.cf += tf;
			current.df += 1;
			current.docTf.set(docId, tf);
		}

		works.push([docId, workId, fileName, `${workId}.txt`, tokens.length, rawText.length]);
		totalChars += rawText.length;
		totalTokens += tokens.length;
	}

	const sortedTerms = Array.from(termStats.entries()).sort((a, b) => stableCompare(a[0], b[0]));
	const termEntries = sortedTerms.map(([term, stats], termId) => {
		const postings = Array.from(stats.docTf.entries())
			.map(([docId, tf]) => [docId, tf])
			.sort((a, b) => a[0] - b[0]);
		return {
			termId,
			term,
			df: stats.df,
			cf: stats.cf,
			len: term.length,
			postings
		};
	});

	const totalPostingsPairs = termEntries.reduce((sum, entry) => sum + entry.postings.length, 0);

	const postingsChunks = chunkByTargetBytes(
		termEntries,
		options.postingsShardTargetBytes,
		(entry) => estimateBytes([entry.termId, entry.postings]) + 1
	);

	const postingsDir = join(options.output, 'postings');
	const postingsShardMeta = [];
	const postingsShardByTermId = new Map();

	for (let i = 0; i < postingsChunks.length; i += 1) {
		const chunk = postingsChunks[i];
		const shardId = toShardId('p', i);
		const fileName = `${shardId}.json`;
		const first = chunk.items[0];
		const last = chunk.items[chunk.items.length - 1];
		for (const item of chunk.items) {
			postingsShardByTermId.set(item.termId, shardId);
		}
		postingsShardMeta.push({
			id: shardId,
			file: `postings/${fileName}`,
			termMin: first.term,
			termMax: last.term,
			minTermId: first.termId,
			maxTermId: last.termId,
			termsCount: chunk.items.length,
			estimatedBytes: chunk.estimatedBytes
		});
	}

	const vocabRows = termEntries.map((entry) => [
		entry.term,
		entry.termId,
		entry.df,
		entry.cf,
		entry.len,
		postingsShardByTermId.get(entry.termId)
	]);

	const vocabChunks = chunkByTargetBytes(
		vocabRows,
		options.vocabShardTargetBytes,
		(row) => estimateBytes(row) + 1
	);

	const vocabShardMeta = [];
	const vocabDir = join(options.output, 'vocab-shards');

	for (let i = 0; i < vocabChunks.length; i += 1) {
		const chunk = vocabChunks[i];
		const shardId = toShardId('v', i);
		const fileName = `${shardId}.json`;
		const first = chunk.items[0];
		const last = chunk.items[chunk.items.length - 1];
		vocabShardMeta.push({
			id: shardId,
			file: `vocab-shards/${fileName}`,
			termMin: first[0],
			termMax: last[0],
			minTermId: first[1],
			maxTermId: last[1],
			termsCount: chunk.items.length,
			estimatedBytes: chunk.estimatedBytes
		});
	}

	const lengthsMap = new Map();
	for (const entry of termEntries) {
		if (!lengthsMap.has(entry.len)) lengthsMap.set(entry.len, []);
		lengthsMap.get(entry.len).push(entry.termId);
	}
	const wildcardLengths = Array.from(lengthsMap.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([len, ids]) => [len, ids.sort((a, b) => a - b)]);

	const gramsMap = new Map();
	for (const entry of termEntries) {
		const padded = `$${entry.term}$`;
		if (padded.length < options.kgram) continue;
		const seen = new Set();
		for (let i = 0; i <= padded.length - options.kgram; i += 1) {
			const gram = padded.slice(i, i + options.kgram);
			if (seen.has(gram)) continue;
			seen.add(gram);
			if (!gramsMap.has(gram)) gramsMap.set(gram, []);
			gramsMap.get(gram).push(entry.termId);
		}
	}

	const gramRows = Array.from(gramsMap.entries())
		.sort((a, b) => stableCompare(a[0], b[0]))
		.map(([gram, ids]) => [gram, ids.sort((a, b) => a - b)]);

	const kgramChunks = chunkByTargetBytes(
		gramRows,
		options.kgramShardTargetBytes,
		(row) => estimateBytes(row) + 1
	);

	const kgramShardMeta = [];
	for (let i = 0; i < kgramChunks.length; i += 1) {
		const chunk = kgramChunks[i];
		const shardId = toShardId('kg', i);
		const fileName = `${shardId}.json`;
		const first = chunk.items[0];
		const last = chunk.items[chunk.items.length - 1];
		kgramShardMeta.push({
			id: shardId,
			file: `kgram-shards/${fileName}`,
			gramMin: first[0],
			gramMax: last[0],
			gramsCount: chunk.items.length,
			estimatedBytes: chunk.estimatedBytes
		});
	}

	const generatedAt = new Date().toISOString();
	const indexVersion = `v1-${generatedAt.replace(/[:.]/g, '-')}`;

	await rm(options.output, { recursive: true, force: true });
	await ensureDir(options.output);
	await ensureDir(postingsDir);
	await ensureDir(vocabDir);
	await ensureDir(join(options.output, 'kgram-shards'));

	for (let i = 0; i < postingsChunks.length; i += 1) {
		const chunk = postingsChunks[i];
		const shard = postingsShardMeta[i];
		await writeJson(
			join(options.output, shard.file),
			{
				schemaVersion: 'etso-search-postings-v1',
				indexVersion,
				shard,
				postings: chunk.items.map((entry) => [entry.termId, entry.postings])
			},
			options.pretty
		);
	}

	for (let i = 0; i < vocabChunks.length; i += 1) {
		const chunk = vocabChunks[i];
		const shard = vocabShardMeta[i];
		await writeJson(
			join(options.output, shard.file),
			{
				schemaVersion: 'etso-search-vocab-shard-v1',
				indexVersion,
				shard,
				terms: chunk.items
			},
			options.pretty
		);
	}

	for (let i = 0; i < kgramChunks.length; i += 1) {
		const chunk = kgramChunks[i];
		const shard = kgramShardMeta[i];
		await writeJson(
			join(options.output, shard.file),
			{
				schemaVersion: 'etso-search-kgram-shard-v1',
				indexVersion,
				k: options.kgram,
				boundary: '$',
				shard,
				grams: chunk.items
			},
			options.pretty
		);
	}

	await writeJson(
		join(options.output, 'works.json'),
		{
			schemaVersion: 'etso-search-works-v1',
			indexVersion,
			generatedAt,
			works,
			totals: {
				works: works.length,
				tokens: totalTokens,
				chars: totalChars
			}
		},
		options.pretty
	);

	await writeJson(
		join(options.output, 'vocab.json'),
		{
			schemaVersion: 'etso-search-vocab-v1',
			indexVersion,
			generatedAt,
			shardStrategy: 'adaptive-lexical',
			totalTerms: termEntries.length,
			shards: vocabShardMeta,
			lookup: {
				byLexicalRange: true,
				byTermIdRange: true
			}
		},
		options.pretty
	);

	await writeJson(
		join(options.output, 'kgrams.json'),
		{
			schemaVersion: 'etso-search-kgrams-v1',
			indexVersion,
			generatedAt,
			k: options.kgram,
			boundary: '$',
			totalKgrams: gramRows.length,
			shards: kgramShardMeta
		},
		options.pretty
	);

	await writeJson(
		join(options.output, 'wildcard-lengths.json'),
		{
			schemaVersion: 'etso-search-wildcard-lengths-v1',
			indexVersion,
			generatedAt,
			minLength: wildcardLengths[0]?.[0] ?? 0,
			maxLength: wildcardLengths[wildcardLengths.length - 1]?.[0] ?? 0,
			lengths: wildcardLengths
		},
		options.pretty
	);

	await writeJson(
		join(options.output, 'manifest.json'),
		{
			schemaVersion: DEFAULT_SCHEMA_VERSION,
			indexVersion,
			generatedAt,
			build: {
				node: process.version,
				inputDir: options.input,
				outputDir: options.output,
				cli: {
					encoding: options.encoding,
					kgram: options.kgram,
					vocabShardTargetBytes: options.vocabShardTargetBytes,
					postingsShardTargetBytes: options.postingsShardTargetBytes,
					kgramShardTargetBytes: options.kgramShardTargetBytes,
					preserveEnie: options.preserveEnie,
					pretty: options.pretty
				}
			},
			normalization: {
				lowercase: true,
				removeDiacritics: true,
				preserveEnie: options.preserveEnie
			},
			tokenization: {
				regex: TOKEN_REGEX.source,
				unicode: true
			},
			stats: {
				works: works.length,
				tokens: totalTokens,
				chars: totalChars,
				vocabSize: termEntries.length,
				totalPostingsPairs,
				totalKgrams: gramRows.length
			},
			files: {
				manifest: 'manifest.json',
				works: 'works.json',
				vocab: 'vocab.json',
				kgrams: 'kgrams.json',
				wildcardLengths: 'wildcard-lengths.json'
			},
			directories: {
				postings: 'postings',
				vocabShards: 'vocab-shards',
				kgramShards: 'kgram-shards'
			},
			shards: {
				postings: postingsShardMeta,
				vocab: vocabShardMeta,
				kgrams: kgramShardMeta
			}
		},
		options.pretty
	);

	return {
		works: works.length,
		tokens: totalTokens,
		vocab: termEntries.length,
		kgrams: gramRows.length,
		postingsShards: postingsShardMeta.length,
		vocabShards: vocabShardMeta.length,
		kgramShards: kgramShardMeta.length,
		output: options.output
	};
};

const main = async () => {
	try {
		const options = parseArgs(process.argv.slice(2));
		const result = await buildIndex(options);
		console.log(`[build-search-index] Done. works=${result.works} tokens=${result.tokens} vocab=${result.vocab}`);
		console.log(
			`[build-search-index] shards: postings=${result.postingsShards} vocab=${result.vocabShards} kgrams=${result.kgramShards}`
		);
		console.log(`[build-search-index] Output: ${result.output}`);
	} catch (error) {
		console.error(`[build-search-index] Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 1;
	}
};

await main();
