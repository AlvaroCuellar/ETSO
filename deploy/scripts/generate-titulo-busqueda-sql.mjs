import { createClient } from '@libsql/client';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TRAILING_ARTICLE_PATTERN =
	/^(?<body>.+?),\s*(?<article>El|La|Los|Las)(?<suffix>\s+\([^()]+\))?$/u;
const LEADING_ARTICLE_PATTERN =
	/^(?<article>El|La|Los|Las)\s+(?<body>.+?)(?<suffix>\s+\([^()]+\))?$/iu;

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

const addUnique = (values, seen, value) => {
	const normalized = value.replace(/\s+/g, ' ').trim();
	if (!normalized) return;
	const key = normalized.toLocaleLowerCase('es-ES');
	if (seen.has(key)) return;
	seen.add(key);
	values.push(normalized);
};

const buildTitleSearchVariants = (value) => {
	const variants = [];
	const seen = new Set();
	const trimmed = value.trim();
	if (!trimmed) return variants;

	addUnique(variants, seen, trimmed);
	addUnique(variants, seen, formatDisplayWorkTitle(trimmed));

	const trailingMatch = trimmed.match(TRAILING_ARTICLE_PATTERN);
	if (trailingMatch?.groups) {
		const body = trailingMatch.groups.body.trim();
		const article = normalizeArticle(trailingMatch.groups.article);
		const suffix = trailingMatch.groups.suffix ?? '';
		addUnique(variants, seen, body);
		addUnique(variants, seen, `${article} ${lowercaseLeadingCharacter(body)}${suffix}`);
		addUnique(variants, seen, `${body}, ${article}${suffix}`);
		addUnique(variants, seen, `${body} ${article}${suffix}`);
	}

	const leadingMatch = trimmed.match(LEADING_ARTICLE_PATTERN);
	if (leadingMatch?.groups) {
		const body = leadingMatch.groups.body.trim();
		const article = normalizeArticle(leadingMatch.groups.article);
		const suffix = leadingMatch.groups.suffix ?? '';
		addUnique(variants, seen, body);
		addUnique(variants, seen, `${body}, ${article}${suffix}`);
		addUnique(variants, seen, `${body} ${article}${suffix}`);
	}

	return variants;
};

const buildWorkTitleSearchText = (title, titleVariants = []) =>
	[title, ...titleVariants].flatMap(buildTitleSearchVariants).join(' ');

const splitTitleVariants = (value) => {
	if (!value) return [];
	return value
		.split('|')
		.map((chunk) => chunk.trim())
		.filter((chunk) => chunk.length > 0);
};

const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;

const dbPath = path.resolve(process.argv[2] ?? 'data/sqlite/etso-prueba.sqlite');
const outputPath = path.resolve(process.argv[3] ?? 'deploy/turso-titulo-busqueda.sql');

const readSqlString = (source, start) => {
	if (source[start] !== "'") throw new Error(`Se esperaba comilla SQL en posicion ${start}.`);
	let value = '';
	let index = start + 1;

	while (index < source.length) {
		const char = source[index];
		if (char === "'") {
			if (source[index + 1] === "'") {
				value += "'";
				index += 2;
				continue;
			}
			return { value, next: index + 1 };
		}
		value += char;
		index += 1;
	}

	throw new Error('Cadena SQL sin cerrar.');
};

const parseWorksInsertLine = (line) => {
	const prefix = 'INSERT INTO works VALUES(';
	if (!line.startsWith(prefix)) return null;
	let index = prefix.length;
	const fields = [];

	while (fields.length < 4) {
		while (/\s/.test(line[index] ?? '')) index += 1;
		const parsed = readSqlString(line, index);
		fields.push(parsed.value);
		index = parsed.next;
		while (/\s/.test(line[index] ?? '')) index += 1;
		if (fields.length < 4) {
			if (line[index] !== ',') throw new Error(`INSERT works inesperado: ${line.slice(0, 120)}`);
			index += 1;
		}
	}

	return {
		id: fields[0],
		titulo: fields[2],
		titleVariants: splitTitleVariants(fields[3])
	};
};

const loadWorksFromSqlBackup = async (inputPath) => {
	const contents = await readFile(inputPath, 'utf8');
	const works = [];

	for (const line of contents.split(/\r?\n/)) {
		const work = parseWorksInsertLine(line);
		if (work) works.push(work);
	}

	return works.sort((a, b) => a.id.localeCompare(b.id));
};

const loadWorksFromSqlite = async (inputPath) => {
	const db = createClient({ url: pathToFileURL(inputPath).href });
	const tableInfo = await db.execute('PRAGMA table_info(works)');
	const columns = new Set(tableInfo.rows.map((row) => String(row.name)));

	if (!columns.has('id') || !columns.has('titulo')) {
		throw new Error('La tabla works debe tener columnas id y titulo.');
	}

	const titleVariantsColumn = columns.has('otrostitulos')
		? 'otrostitulos'
		: columns.has('variaciones_titulo')
			? 'variaciones_titulo'
			: null;
	const selectColumns = ['id', 'titulo', ...(titleVariantsColumn ? [titleVariantsColumn] : [])];
	const result = await db.execute(`SELECT ${selectColumns.join(', ')} FROM works ORDER BY id`);

	return result.rows.map((row) => ({
		id: String(row.id ?? ''),
		titulo: String(row.titulo ?? ''),
		titleVariants: titleVariantsColumn ? splitTitleVariants(String(row[titleVariantsColumn] ?? '')) : []
	}));
};

const works = dbPath.toLocaleLowerCase('es-ES').endsWith('.sql')
	? await loadWorksFromSqlBackup(dbPath)
	: await loadWorksFromSqlite(dbPath);

const statements = [
	'-- Generado por deploy/scripts/generate-titulo-busqueda-sql.mjs',
	`-- Origen: ${dbPath}`,
	'-- Ejecutar una sola vez el ALTER TABLE. Si la columna ya existe, comenta esa linea.',
	'BEGIN;',
	'ALTER TABLE works ADD COLUMN titulo_busqueda TEXT;'
];

for (const row of works) {
	const id = row.id.trim();
	const title = row.titulo;
	if (!id) continue;
	const searchText = buildWorkTitleSearchText(title, row.titleVariants);
	statements.push(
		`UPDATE works SET titulo_busqueda = ${sqlString(searchText)} WHERE id = ${sqlString(id)};`
	);
}

statements.push('COMMIT;', '');

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, statements.join('\n'), 'utf8');

console.log(`SQL generado: ${outputPath}`);
console.log(`Obras procesadas: ${works.length}`);
