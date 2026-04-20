# TEXORO Search Index Scripts

This folder contains local Node.js scripts to build and validate TEXORO search artifacts.

## 1. Build Script

`build-search-index.mjs` builds a static, shardable index from TXT files only.

### Goals

- No dependency on SvelteKit runtime.
- Deterministic ordering (same corpus -> same shard boundaries and IDs).
- Designed for local build + upload artifacts to R2.
- Decoupled from SQLite/Turso metadata.

### Default Input and Output

- Input TXT directory: `data/texts`
- Output index directory: `data/search-index`

### CLI

```bash
node scripts/build-search-index.mjs \
  --input data/texts \
  --output data/search-index \
  --vocab-shard-target-bytes 256000 \
  --postings-shard-target-bytes 512000 \
  --kgram 3 \
  --preserve-enie \
  --pretty
```

### Supported Flags

- `--input <dir>`: TXT input directory.
- `--output <dir>`: output directory.
- `--encoding <name>`: text encoding for TXT files (`utf8` by default).
- `--kgram <n>`: k for wildcard k-grams (default `3`).
- `--vocab-shard-target-bytes <n>`: target size for `vocab-shards/*`.
- `--postings-shard-target-bytes <n>`: target size for `postings/*`.
- `--kgram-shard-target-bytes <n>`: target size for `kgram-shards/*`.
- `--preserve-enie`: preserve `ñ` when removing diacritics (default).
- `--no-preserve-enie`: fold `ñ` into `n`.
- `--pretty`: pretty JSON output (default).
- `--compact`: compact JSON output.

## 2. Output Contract

The build always writes these root files:

- `manifest.json`
- `works.json`
- `vocab.json`
- `kgrams.json`
- `wildcard-lengths.json`
- `postings/*.json`

And these scale-oriented shard directories:

- `vocab-shards/*.json`
- `kgram-shards/*.json`

### `manifest.json`

Global build metadata:

- `schemaVersion`, `indexVersion`, `generatedAt`
- normalization and tokenization settings
- corpus stats (`works`, `tokens`, `vocabSize`, etc.)
- root files and shard directory map
- shard manifests for postings/vocab/kgrams

### `works.json`

Document catalog used by search layer:

- `works: [docId, workId, fileName, textKey, tokenCount, charCount][]`
- `workId` comes from TXT basename
- `textKey` defaults to `${workId}.txt`

### `vocab.json` + `vocab-shards/*.json`

Lexical directory and shard contents.

- `vocab.json` stores shard ranges (`termMin`, `termMax`, `minTermId`, `maxTermId`)
- each shard stores:
  - `terms: [term, termId, df, cf, len, postingsShard][]`

This supports:

- exact term lookup
- prefix loading by lexical ranges
- termId -> postings shard resolution

### `postings/*.json`

Doc-level recovery index (no global positions):

- `postings: [termId, [[docId, tf], ...]][]`

This supports candidate retrieval for exact/wildcard + boolean logic.

### `kgrams.json` + `kgram-shards/*.json`

Wildcard expansion index:

- k-grams generated from `$term$`
- each shard stores `grams: [gram, termIds[]][]`

This avoids scanning the full vocabulary for wildcard patterns.

### `wildcard-lengths.json`

Length filter index:

- `lengths: [length, termIds[]][]`

Useful for `?`, `???`, and mixed wildcard pruning.

## 3. Query Capabilities Enabled by Structure

- Exact word: `amor`
- Exact phrase: `"amor constante"` (verified in TXT candidates)
- Prefix: `am*`
- Internal/mixed wildcard: `a*or`
- One-char wildcard: `am?r`
- Length wildcard: `???`
- Star-only patterns: `*`, `**`, `***`
- Phrase with wildcard: `"amor const*"`
- Boolean `AND` / `OR` and mixed expressions

## 4. Recommended Build + Deploy Flow

1. Build locally:

```bash
node scripts/build-search-index.mjs
```

2. Validate output in `data/search-index`.
3. Upload `data/search-index/**` to R2 bucket.
4. Serve via public domain/Worker.
5. Point frontend env vars to the index/text base URLs.

## 5. SvelteKit Integration Notes

- Keep this script external to runtime logic.
- Frontend should consume index artifacts through a configurable base URL.
- Join search hits to SQLite/Turso metadata by `workId`.
- Cache shards and candidate TXT in IndexedDB using `manifest.indexVersion`.
- Use two-phase search:
  - phase 1: candidate retrieval from doc-level postings
  - phase 2: phrase/proximity verification in candidate TXT only

## 6. NPM Script Examples

Add these in `package.json`:

```json
{
  "scripts": {
    "index:texts": "node scripts/build-search-index.mjs",
    "index:texts:compact": "node scripts/build-search-index.mjs --compact",
    "index:validate": "node scripts/validate-search-index.mjs"
  }
}
```

Run validation after build:

```bash
npm run index:texts
npm run index:validate
```
