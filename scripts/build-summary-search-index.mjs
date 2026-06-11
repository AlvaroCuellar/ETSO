#!/usr/bin/env node

import { createClient } from '@libsql/client';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const SCHEMA_VERSION = 'etso-summary-search-index-v1';
const EMPTY_SHORT_SUMMARY = 'Sin resumen breve disponible.';
const UNRESOLVED_AUTHOR_ID = 'desconocido';
const TRAILING_ARTICLE_PATTERN =
	/^(?<body>.+?),\s*(?<article>El|La|Los|Las)(?<suffix>\s+\([^()]+\))?$/u;

const DEFAULTS = {
	sqlite: 'deploy/input/turso/etso.sqlite',
	input: 'deploy/input/public-assets/resumenes',
	output: 'deploy/input/public-assets/resumenes/search-index.json',
	pretty: false
};

const usage = () => {
	console.log(`Usage: node scripts/build-summary-search-index.mjs [options]

Options:
  --sqlite <file>      SQLite catalog path (default: ${DEFAULTS.sqlite})
  --input <dir>        Summaries JSON directory (default: ${DEFAULTS.input})
  --output <file>      Output index JSON path (default: ${DEFAULTS.output})
  --pretty             Pretty JSON output
  --compact            Compact JSON output (default)
  --help               Show this help
`);
};

const parseArgs = (argv) => {
	const options = { ...DEFAULTS };
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--help' || arg === '-h') {
			usage();
			process.exit(0);
		}
		if (arg === '--pretty') {
			options.pretty = true;
			continue;
		}
		if (arg === '--compact') {
			options.pretty = false;
			continue;
		}

		const next = argv[index + 1];
		if (!next) throw new Error(`Missing value for ${arg}`);
		if (arg === '--sqlite') {
			options.sqlite = next;
			index += 1;
			continue;
		}
		if (arg === '--input') {
			options.input = next;
			index += 1;
			continue;
		}
		if (arg === '--output') {
			options.output = next;
			index += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return {
		...options,
		sqlite: resolve(process.cwd(), options.sqlite),
		input: resolve(process.cwd(), options.input),
		output: resolve(process.cwd(), options.output)
	};
};

const normalizePlainText = (input, preserveEnie = true) => {
	const lower = input.toLowerCase();
	if (!preserveEnie) {
		return lower.normalize('NFD').replace(/\p{M}+/gu, '');
	}
	const marker = '\u0000';
	return lower
		.replaceAll('ñ', marker)
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.replaceAll(marker, 'ñ');
};

const normalizeSearchText = (value) => normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

const normalizeArticle = (value) => {
	const lower = value.toLocaleLowerCase('es-ES');
	return lower.charAt(0).toLocaleUpperCase('es-ES') + lower.slice(1);
};

const lowercaseLeadingCharacter = (value) =>
	value.replace(/^\p{Lu}/u, (match) => match.toLocaleLowerCase('es-ES'));

const formatDisplayWorkTitle = (value) => {
	const trimmed = value.trim();
	if (!trimmed) return trimmed;

	const match = trimmed.match(TRAILING_ARTICLE_PATTERN);
	if (!match?.groups) return trimmed;

	const body = lowercaseLeadingCharacter(match.groups.body.trim());
	const article = normalizeArticle(match.groups.article);
	const suffix = match.groups.suffix ?? '';
	return `${article} ${body}${suffix}`;
};

const formatNameList = (names) => {
	if (names.length === 0) return '';
	if (names.length === 1) return names[0];
	if (names.length === 2) return `${names[0]} y ${names[1]}`;
	return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
};

const memberNameFromId = (authorId, authorById) => {
	const name = authorById.get(authorId);
	if (name) return name;
	return authorId
		.split('_')
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(' ');
};

const traditionalLabel = (workId, attributionByWorkId, authorById) => {
	const set = attributionByWorkId.get(workId);
	if (!set || set.rawExpression.toLowerCase().includes(UNRESOLVED_AUTHOR_ID)) return 'Desconocido';

	const names = [];
	const seen = new Set();
	for (const group of [...set.groups.values()].sort((a, b) => a.groupOrder - b.groupOrder)) {
		for (const member of group.members.sort((a, b) => a.memberOrder - b.memberOrder)) {
			if (member.authorId === UNRESOLVED_AUTHOR_ID) return 'Desconocido';
			const name = memberNameFromId(member.authorId, authorById).trim();
			if (!name || seen.has(name)) continue;
			seen.add(name);
			names.push(name);
		}
	}
	return names.length > 0 ? formatNameList(names) : 'Desconocido';
};

const joinSummaryParts = (parts) =>
	Array.isArray(parts)
		? parts
				.map((part) => (typeof part === 'string' ? part.trim() : ''))
				.filter((part) => part.length > 0)
				.join('\n\n')
		: '';

const joinNamedItems = (label, items) => {
	if (!Array.isArray(items)) return '';
	const rows = items
		.map((item) => [item?.nombre?.trim(), item?.descripcion?.trim()].filter(Boolean).join(': '))
		.filter((item) => item.length > 0);
	return rows.length > 0 ? `${label}\n${rows.join('\n')}` : '';
};

const joinThemeItems = (label, items) => {
	if (!Array.isArray(items)) return '';
	const rows = items
		.map((item) => [item?.tema?.trim(), item?.descripcion?.trim()].filter(Boolean).join(': '))
		.filter((item) => item.length > 0);
	return rows.length > 0 ? `${label}\n${rows.join('\n')}` : '';
};

const buildSummarySearchText = (summary, shortText, longText) =>
	[
		shortText.trim().length > 0 && shortText.trim() !== EMPTY_SHORT_SUMMARY
			? `Resumen automatico breve\n${shortText}`
			: '',
		longText.trim().length > 0 ? `Resumen automatico amplio\n${longText}` : '',
		joinNamedItems('Personajes principales', summary?.personajes_principales),
		joinNamedItems('Espacios principales', summary?.espacios_principales),
		joinThemeItems('Tematicas principales', summary?.tematicas_principales)
	]
		.filter((text) => text.trim().length > 0)
		.join('\n\n');

const readSummary = async (inputDir, workId) => {
	try {
		const raw = await readFile(join(inputDir, `${workId}.json`), 'utf8');
		return JSON.parse(raw);
	} catch (cause) {
		if (cause && typeof cause === 'object' && cause.code === 'ENOENT') return null;
		throw cause;
	}
};

const collectCatalogData = async (sqlitePath) => {
	const db = createClient({ url: `file:${sqlitePath}`, authToken: 'local' });
	const [workResult, authorResult, attributionResult] = await Promise.all([
		db.execute(`
			SELECT id, slug, titulo, genero, resumen_breve
			FROM works
			WHERE resumen_breve IS NOT NULL
			ORDER BY titulo COLLATE NOCASE
		`),
		db.execute('SELECT id, nombre FROM authors'),
		db.execute(`
			SELECT
				s.work_id,
				s.raw_expression,
				g.id AS group_id,
				g.group_order,
				m.author_id,
				m.member_order
			FROM attribution_sets s
			LEFT JOIN attribution_groups g ON g.attribution_set_id = s.id
			LEFT JOIN attribution_members m ON m.attribution_group_id = g.id
			WHERE s.attribution_type = 'tradicional'
			ORDER BY s.work_id, g.group_order, m.member_order
		`)
	]);

	const authorById = new Map(authorResult.rows.map((row) => [String(row.id), String(row.nombre)]));
	const attributionByWorkId = new Map();
	for (const row of attributionResult.rows) {
		const workId = String(row.work_id);
		if (!attributionByWorkId.has(workId)) {
			attributionByWorkId.set(workId, {
				rawExpression: String(row.raw_expression ?? ''),
				groups: new Map()
			});
		}
		if (row.group_id == null || row.group_order == null || !row.author_id) continue;
		const set = attributionByWorkId.get(workId);
		const groupId = Number(row.group_id);
		if (!set.groups.has(groupId)) {
			set.groups.set(groupId, {
				groupOrder: Number(row.group_order),
				members: []
			});
		}
		set.groups.get(groupId).members.push({
			authorId: String(row.author_id),
			memberOrder: Number(row.member_order ?? 0)
		});
	}

	return {
		works: workResult.rows.map((row) => ({
			id: String(row.id),
			slug: String(row.slug ?? ''),
			title: String(row.titulo ?? ''),
			genre: String(row.genero ?? '').trim() || 'Sin genero',
			shortSummary: String(row.resumen_breve ?? '').trim() || EMPTY_SHORT_SUMMARY
		})),
		authorById,
		attributionByWorkId
	};
};

const buildIndex = async (options) => {
	const { works, authorById, attributionByWorkId } = await collectCatalogData(options.sqlite);
	const entries = [];
	let missingSummaryFiles = 0;

	for (const work of works) {
		if (!work.slug) {
			throw new Error(`La obra ${work.id} no tiene slug en SQLite.`);
		}
		const summary = await readSummary(options.input, work.id);
		if (!summary) {
			missingSummaryFiles += 1;
			continue;
		}

		const shortText = joinSummaryParts(summary.resumen_breve) || work.shortSummary;
		const longText = joinSummaryParts(summary.resumen_largo);
		const summaryText = buildSummarySearchText(summary, shortText, longText);
		if (!summaryText) continue;

		entries.push({
			id: work.id,
			slug: work.slug,
			title: work.title,
			displayTitle: formatDisplayWorkTitle(work.title),
			genre: work.genre,
			traditional: traditionalLabel(work.id, attributionByWorkId, authorById),
			summaryText,
			normalizedSummaryText: normalizeSearchText(summaryText)
		});
	}

	entries.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
	const output = {
		schemaVersion: SCHEMA_VERSION,
		generatedAt: new Date().toISOString(),
		entries
	};

	await mkdir(dirname(options.output), { recursive: true });
	await writeFile(options.output, `${JSON.stringify(output, null, options.pretty ? 2 : 0)}\n`, 'utf8');

	return {
		entries: entries.length,
		missingSummaryFiles,
		output: options.output
	};
};

const main = async () => {
	try {
		const options = parseArgs(process.argv.slice(2));
		const result = await buildIndex(options);
		console.log(
			`[build-summary-search-index] Done. entries=${result.entries} missingSummaryFiles=${result.missingSummaryFiles}`
		);
		console.log(`[build-summary-search-index] Output: ${result.output}`);
	} catch (error) {
		console.error(`[build-summary-search-index] Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 1;
	}
};

await main();
