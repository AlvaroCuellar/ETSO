const ROOT_FILES = new Set([
	'manifest.json',
	'works.json',
	'public-ids.json',
	'vocab.json',
	'kgrams.json',
	'wildcard-lengths.json'
]);

export const isFrequencyIndexFile = (path: string): boolean =>
	ROOT_FILES.has(path) ||
	/^(?:postings\/p-|vocab-shards\/v-|kgram-shards\/kg-)\d+\.json$/.test(path);
