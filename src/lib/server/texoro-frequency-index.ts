import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isFrequencyIndexFile } from '../search/frequency-index.ts';

import type {
	TexoroIndexManifest,
	TexoroManifestShard,
	TexoroVocabShard,
	TexoroWorksFile
} from '../search/types.ts';

export const projectTexoroFrequencyManifest = (source: TexoroIndexManifest): TexoroIndexManifest => {
	const shardsFor = (shards: TexoroManifestShard[], directory: string): TexoroManifestShard[] =>
		shards.filter((shard) => shard.file.startsWith(directory + '/') && isFrequencyIndexFile(shard.file));

	const hasPublicIds = source.features?.publicIds === true && source.files.publicIds === 'public-ids.json';
	const { works, tokens, chars, vocabSize, totalPostingsPairs, totalKgrams } = source.stats;
	return {
		schemaVersion: source.schemaVersion,
		indexVersion: source.indexVersion,
		generatedAt: source.generatedAt,
		normalization: source.normalization,
		tokenization: source.tokenization,
		stats: { works, tokens, chars, vocabSize, totalPostingsPairs, totalKgrams },
		features: { publicIds: hasPublicIds, positions: false, proximity: false, byteOffsets: false },
		files: {
			manifest: 'manifest.json',
			works: 'works.json',
			...(hasPublicIds ? { publicIds: 'public-ids.json' } : {}),
			vocab: 'vocab.json',
			kgrams: 'kgrams.json',
			wildcardLengths: 'wildcard-lengths.json'
		},
		directories: { postings: 'postings', vocabShards: 'vocab-shards', kgramShards: 'kgram-shards' },
		shards: {
			postings: shardsFor(source.shards.postings, 'postings'),
			vocab: shardsFor(source.shards.vocab, 'vocab-shards'),
			kgrams: shardsFor(source.shards.kgrams, 'kgram-shards')
		}
	};
};

export const texoroFrequencyManifestFiles = (manifest: TexoroIndexManifest): string[] => [
	...Object.values(manifest.files),
	...[...manifest.shards.postings, ...manifest.shards.vocab, ...manifest.shards.kgrams].map(({ file }) => file)
];

interface FrequencySnapshot {
	allowedFiles: Set<string>;
	projectedFiles: Map<string, string>;
}

let currentSnapshot: { key: string; snapshot: Promise<FrequencySnapshot> } | undefined;

// Never follow a shard symlink into a private directory, even if its name is allowed.
const readIndexFile = async (root: string, relativePath: string): Promise<string | null> => {
	const filename = resolve(root, relativePath);
	try {
		if ((await realpath(filename)) !== filename) return null;
		return await readFile(filename, 'utf8');
	} catch (cause) {
		if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw cause;
	}
};

const getFrequencySnapshot = async (root: string): Promise<FrequencySnapshot> => {
	const { mtimeMs, size } = await stat(resolve(root, 'manifest.json'));
	const key = JSON.stringify([root, mtimeMs, size]);
	if (currentSnapshot?.key === key) return currentSnapshot.snapshot;

	const snapshot = (async () => {
		const source = await readIndexFile(root, 'manifest.json');
		if (source === null) throw new Error('No se pudo leer el manifiesto local de TEXORO.');
		const manifest = projectTexoroFrequencyManifest(JSON.parse(source) as TexoroIndexManifest);
		return {
			allowedFiles: new Set(texoroFrequencyManifestFiles(manifest)),
			projectedFiles: new Map([['manifest.json', JSON.stringify(manifest)]])
		};
	})();
	const active = { key, snapshot };
	currentSnapshot = active;
	try {
		return await snapshot;
	} catch (cause) {
		if (currentSnapshot === active) currentSnapshot = undefined;
		throw cause;
	}
};

export const readLocalTexoroFrequencyJson = async (
	directory: string,
	relativePath: string
): Promise<string | null> => {
	if (!isFrequencyIndexFile(relativePath)) return null;
	const root = await realpath(directory);
	const snapshot = await getFrequencySnapshot(root);
	if (!snapshot.allowedFiles.has(relativePath)) return null;

	const cached = snapshot.projectedFiles.get(relativePath);
	if (cached !== undefined) return cached;
	const source = await readIndexFile(root, relativePath);
	if (source === null) return null;

	let body: string;
	if (relativePath === 'works.json') {
		const works = JSON.parse(source) as TexoroWorksFile;
		body = JSON.stringify({
			...works,
			works: works.works.map(([docId, workId, , , tokens]) => [docId, workId, '', '', tokens, 0])
		} satisfies TexoroWorksFile);
	} else if (relativePath.startsWith('vocab-shards/')) {
		const vocab = JSON.parse(source) as TexoroVocabShard;
		body = JSON.stringify({
			...vocab,
			terms: vocab.terms.map(([term, termId, df, cf, len, postingsShard]) => [term, termId, df, cf, len, postingsShard])
		} satisfies TexoroVocabShard);
	} else {
		return source;
	}
	snapshot.projectedFiles.set(relativePath, body);
	return body;
};
