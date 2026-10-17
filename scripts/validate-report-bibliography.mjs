import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @param {unknown} value @returns {value is Record<string, any>} */
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
/** @param {unknown} value @returns {value is string} */
const string = (value) => typeof value === 'string' && value.trim().length > 0 && value === value.trim();

/**
 * Pure validation: no network, file changes or application runtime.
 * @param {unknown} bibliographyInput
 * @param {unknown} relatedInput
 * @param {{workIds: Set<string>, authorIds: Set<string>}} [catalog]
 * @returns {string[]}
 */
export function validateReportBibliography(bibliographyInput, relatedInput, catalog) {
	const bibliography = object(bibliographyInput) ? bibliographyInput : {};
	const related = object(relatedInput) ? relatedInput : {};
	const errors = [];
	const entries = object(bibliography?.entriesByKey) ? bibliography.entriesByKey : {};
	if (!Object.keys(entries).length) errors.push('entriesByKey debe contener referencias.');
	/** @param {unknown} value @param {string} path @param {{required?: boolean, known?: Set<string>}} [options] @returns {string[]} */
	const array = (value, path, { required = false, known } = {}) => {
		if (value === undefined && !required) return [];
		if (!Array.isArray(value) || (required && !value.length)) {
			errors.push(`${path}: se esperaba una lista${required ? ' no vacía' : ''}.`);
			return [];
		}
		const seen = new Set();
		for (const item of value) {
			if (!string(item)) errors.push(`${path}: identificador vacío o inválido.`);
			else {
				if (seen.has(item)) errors.push(`${path}: identificador duplicado ${item}.`);
				if (known && !known.has(item)) errors.push(`${path}: identificador inexistente ${item}.`);
				seen.add(item);
			}
		}
		return value.filter(string);
	};
	for (const [key, entry] of Object.entries(entries)) {
		const hasParts = Array.isArray(entry?.parts) && entry.parts.length > 0 && entry.parts.every((/** @type {unknown} */ part) => object(part) && string(part.value));
		if (!object(entry) || !(string(entry.text) || hasParts || (string(entry.title) && (string(entry.author) || string(entry.authors))))) errors.push(`entriesByKey.${key}: falta texto, partes válidas o título y autor.`);
	}
	/** @param {unknown} value @returns {Record<string, any>[]} */
	const sections = (value) => Array.isArray(value) ? value.filter(object) : [];
	/** @param {Record<string, any>} section @returns {string[]} */
	const sectionKeys = (section) => Array.isArray(section.entryKeys) ? section.entryKeys : [];
	const entryKeys = new Set(Object.keys(entries));
	if (related?.schemaVersion !== 1) errors.push('schemaVersion debe ser 1.');
	const sourceIds = array(related?.moreInformation?.sourceSectionIds, 'moreInformation.sourceSectionIds', {
		required: true,
		known: new Set(sections(bibliography?.views?.comoCitarnos?.sections).map((section) => section.id))
	});
	const pool = new Set([
		...sections(bibliography?.views?.informes?.base?.sections).flatMap(sectionKeys),
		...sections(bibliography?.views?.comoCitarnos?.sections).filter((section) => sourceIds.includes(section.id)).flatMap(sectionKeys)
	]);
	if (!Array.isArray(related?.rules)) errors.push('rules debe ser una lista.');
	const ruleIds = new Set();
	for (const [index, rule] of (Array.isArray(related?.rules) ? related.rules : []).entries()) {
		const path = `rules[${index}]`;
		if (!object(rule)) { errors.push(`${path}: regla inválida.`); continue; }
		if (!string(rule.id)) errors.push(`${path}: falta un id válido.`);
		else if (ruleIds.has(rule.id)) errors.push(`${path}: id de regla duplicado ${rule.id}.`);
		ruleIds.add(rule.id);
		for (const key of Object.keys(rule)) {
			if (!['id', 'workIds', 'authorIds', 'entryKeys'].includes(key)) errors.push(`${path}: campo desconocido ${key}.`);
		}
		const works = array(rule.workIds, `${path}.workIds`, { known: catalog?.workIds });
		const authors = array(rule.authorIds, `${path}.authorIds`, { known: catalog?.authorIds });
		if (!works.length && !authors.length) errors.push(`${path}: necesita al menos una obra o un autor.`);
		const keys = array(rule.entryKeys, `${path}.entryKeys`, { required: true, known: entryKeys });
		for (const key of keys) if (string(key) && !pool.has(key)) errors.push(`${path}.entryKeys: ${key} no figura en las secciones bibliográficas seleccionadas ni en la base de informes.`);
	}
	/** @param {unknown} view @param {string} path */
	const validateView = (view, path) => {
		if (!object(view) || !Array.isArray(view.sections)) { errors.push(`${path}: faltan sections.`); return; }
		const ids = new Set();
		for (const [index, section] of view.sections.entries()) {
			const sectionPath = `${path}.sections[${index}]`;
			if (!object(section)) { errors.push(`${sectionPath}: sección inválida.`); continue; }
			if (!string(section.id) || ids.has(section.id)) errors.push(`${sectionPath}: id de sección ausente o duplicado.`);
			ids.add(section.id);
			array(section.entryKeys, `${sectionPath}.entryKeys`, { required: true, known: entryKeys });
		}
	};
	validateView(bibliography?.views?.informes?.base, 'views.informes.base');
	const overrides = bibliography?.views?.informes?.overridesByInformeId;
	if (overrides !== undefined && !object(overrides)) errors.push('overridesByInformeId debe ser un objeto.');
	for (const [id, view] of Object.entries(object(overrides) ? overrides : {})) {
		validateView(view, `views.informes.overridesByInformeId.${id}`);
	}
	validateView(bibliography?.views?.comoCitarnos, 'views.comoCitarnos');
	return errors;
}

/** @param {unknown} snapshot @returns {{workIds: Set<string>, authorIds: Set<string>}} */
export function parseCatalogSnapshot(snapshot) {
	if (!object(snapshot) || snapshot.schemaVersion !== 1) throw new Error('Snapshot de catálogo: schemaVersion debe ser 1.');
	if (Object.keys(snapshot).some((key) => !['schemaVersion', 'workIds', 'authorIds'].includes(key))) throw new Error('Snapshot de catálogo: contiene campos desconocidos.');
	for (const key of ['workIds', 'authorIds']) {
		const values = snapshot[key];
		if (!Array.isArray(values) || !values.length || values.some((id) => !string(id)) || new Set(values).size !== values.length) {
			throw new Error(`Snapshot de catálogo: ${key} debe contener identificadores válidos, únicos y no vacíos.`);
		}
	}
	return { workIds: new Set(snapshot.workIds), authorIds: new Set(snapshot.authorIds) };
}

/** @param {string} sqlitePath */
export async function readSqliteCatalog(sqlitePath) {
	const { DatabaseSync } = await import('node:sqlite');
	const db = new DatabaseSync(sqlitePath, { readOnly: true });
	try {
		return parseCatalogSnapshot({
			schemaVersion: 1,
			workIds: db.prepare('SELECT id FROM works ORDER BY id').all().map((row) => row.id),
			authorIds: db.prepare('SELECT id FROM authors ORDER BY id').all().map((row) => row.id)
		});
	} finally { db.close(); }
}

/**
 * @param {string} root
 * @param {string} [sqlitePath]
 * @param {{snapshotPath?: string, writeSnapshotPath?: string}} [options]
 */
export async function validateFiles(root, sqlitePath = resolve(root, 'deploy/input/turso/etso.sqlite'), options = {}) {
	/** @param {string} name */
	const read = (name) => JSON.parse(readFileSync(resolve(root, 'data/referencias', name), 'utf8'));
	if (options.snapshotPath && options.writeSnapshotPath) throw new Error('No se pueden combinar --snapshot y --write-catalog-snapshot.');
	const catalog = options.snapshotPath
		? parseCatalogSnapshot(JSON.parse(readFileSync(options.snapshotPath, 'utf8')))
		: await readSqliteCatalog(sqlitePath);
	const errors = validateReportBibliography(read('bibliografia.json'), read('informes-relacionados.json'), catalog);
	if (!errors.length && options.writeSnapshotPath) {
		const text = JSON.stringify({ schemaVersion: 1, workIds: [...catalog.workIds].sort(), authorIds: [...catalog.authorIds].sort() }, null, '\t') + '\n';
		if (!existsSync(options.writeSnapshotPath) || readFileSync(options.writeSnapshotPath, 'utf8') !== text) writeFileSync(options.writeSnapshotPath, text);
	}
	return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const root = fileURLToPath(new URL('../', import.meta.url));
		const args = process.argv.slice(2);
		let sqlitePath;
		/** @type {{snapshotPath?: string, writeSnapshotPath?: string}} */
		const options = {};
		if (args[0] === '--snapshot' && args.length === 2) options.snapshotPath = resolve(args[1]);
		else if (args[0] === '--write-catalog-snapshot' && (args.length === 2 || args.length === 3)) {
			options.writeSnapshotPath = resolve(args[1]);
			if (args[2]) sqlitePath = resolve(args[2]);
		} else if (args.length <= 1 && !args[0]?.startsWith('--')) sqlitePath = args[0] ? resolve(args[0]) : undefined;
		else throw new Error('Uso: [sqlitePath] | --snapshot archivo.json | --write-catalog-snapshot archivo.json [sqlitePath]');
		const errors = await validateFiles(root, sqlitePath, options);
		if (errors.length) throw new Error(errors.join('\n'));
		console.log('Bibliografía validada: reglas, referencias, obras y autores del catálogo local.');
	} catch (error) {
		console.error(`Bibliografía inválida:\n${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 1;
	}
}
