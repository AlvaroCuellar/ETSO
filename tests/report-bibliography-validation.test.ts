import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { parseCatalogSnapshot, validateFiles, validateReportBibliography } from '../scripts/validate-report-bibliography.mjs';

const bibliography = () => ({
	entriesByKey: { study: { text: 'Referencia' } } as Record<string, { text: string }>,
	views: {
		informes: { base: { sections: [{ id: 'citation', entryKeys: ['study'] }] } },
		comoCitarnos: { sections: [{ id: 'works', entryKeys: ['study'] }] }
	}
});
const catalog = { workIds: new Set(['work']), authorIds: new Set(['author']) };
const rule = () => ({ id: 'rule', workIds: ['work'], entryKeys: ['study'] });
const config = (rules: unknown[]) => ({ schemaVersion: 1, moreInformation: { sourceSectionIds: ['works'] }, rules });

const snapshotPath = fileURLToPath(new URL('../data/referencias/catalogo-identificadores.json', import.meta.url));

test('la configuración real referencia obras y autores del snapshot versionado', async () => {
	assert.deepEqual(await validateFiles(fileURLToPath(new URL('../', import.meta.url)), undefined, { snapshotPath }), []);
});

test('rechaza reglas duplicadas y referencias inexistentes con localización', () => {
	const errors = validateReportBibliography(bibliography(), config([rule(), { ...rule(), entryKeys: ['missing'] }]), catalog);
	assert.ok(errors.some((error: string) => error.includes('id de regla duplicado rule')));
	assert.ok(errors.some((error: string) => error.includes('rules[1].entryKeys') && error.includes('missing')));
});

test('rechaza selectores vacíos, erratas, listas vacías y tipos incorrectos', () => {
	const errors = validateReportBibliography(bibliography(), config([
		{ id: 'empty', workIds: [], authorIds: [], entryKeys: [] },
		{ id: 'typo', workId: ['work'], entryKeys: ['study'] },
		{ id: 'invalid', workIds: 'work', entryKeys: ['study'] }
	]), catalog);
	assert.ok(errors.some((error: string) => error.includes('necesita al menos')));
	assert.ok(errors.some((error: string) => error.includes('campo desconocido workId')));
	assert.ok(errors.some((error: string) => error.includes('entryKeys: se esperaba una lista no vacía')));
	assert.ok(errors.some((error: string) => error.includes('workIds: se esperaba una lista')));
});

test('rechaza obras, autores y referencias de vistas inexistentes', () => {
	const data = bibliography();
	data.views.informes.base.sections[0].entryKeys = ['absent'];
	const errors = validateReportBibliography(data, config([{ ...rule(), workIds: ['absent-work'], authorIds: ['absent-author'] }]), catalog);
	for (const id of ['absent-work', 'absent-author', 'absent']) assert.ok(errors.some((error: string) => error.includes(`inexistente ${id}.`)));
});

test('exige versión de esquema, secciones fuente válidas y registro de cada estudio relacionado', () => {
	const data = bibliography();
	data.entriesByKey['unlisted'] = { text: 'Otro estudio' };
	const errors = validateReportBibliography(data, { schemaVersion: 2, moreInformation: { sourceSectionIds: ['missing'] }, rules: [{ ...rule(), entryKeys: ['unlisted'] }] }, catalog);
	assert.ok(errors.some((error: string) => error.includes('schemaVersion')));
	assert.ok(errors.some((error: string) => error.includes('sourceSectionIds') && error.includes('inexistente missing')));
	assert.ok(errors.some((error: string) => error.includes('unlisted no figura')));
});

test('permite combinar selectores existentes sin duplicar identificadores dentro de listas', () => {
	assert.deepEqual(validateReportBibliography(bibliography(), config([{ ...rule(), authorIds: ['author'] }]), catalog), []);
	assert.ok(validateReportBibliography(bibliography(), config([{ ...rule(), workIds: ['work', 'work'] }]), catalog).some((error: string) => error.includes('duplicado work')));
});

test('rechaza snapshots ficticios, versiones incorrectas e identificadores duplicados', () => {
	assert.throws(() => parseCatalogSnapshot({ schemaVersion: 2, workIds: ['work'], authorIds: ['author'] }), /schemaVersion/);
	assert.throws(() => parseCatalogSnapshot({ schemaVersion: 1, workIds: [], authorIds: ['author'] }), /workIds/);
	assert.throws(() => parseCatalogSnapshot({ schemaVersion: 1, workIds: ['work'], authorIds: ['author', 'author'] }), /authorIds/);
	const fake = parseCatalogSnapshot({ schemaVersion: 1, workIds: ['other'], authorIds: ['author'] });
	assert.ok(validateReportBibliography(bibliography(), config([rule()]), fake).some((error: string) => error.includes('inexistente work')));
});

test('genera snapshot determinista desde SQLite temporal y valida sin SQLite; faltas y corrupción fallan', async () => {
	const root = fileURLToPath(new URL('../', import.meta.url));
	const dir = mkdtempSync(join(tmpdir(), 'etso-bibliography-'));
	const path = join(dir, 'catalog.json');
	const sqlitePath = join(dir, 'fixture.sqlite');
	try {
		const identifiers = parseCatalogSnapshot(JSON.parse(readFileSync(snapshotPath, 'utf8')));
		const db = new DatabaseSync(sqlitePath);
		try {
			db.exec('CREATE TABLE works (id TEXT PRIMARY KEY); CREATE TABLE authors (id TEXT PRIMARY KEY); BEGIN');
			const insertWork = db.prepare('INSERT INTO works (id) VALUES (?)');
			const insertAuthor = db.prepare('INSERT INTO authors (id) VALUES (?)');
			for (const id of identifiers.workIds) insertWork.run(id);
			for (const id of identifiers.authorIds) insertAuthor.run(id);
			db.exec('COMMIT');
		} finally { db.close(); }
		assert.deepEqual(await validateFiles(root, sqlitePath, { writeSnapshotPath: path }), []);
		const first = readFileSync(path, 'utf8');
		const modified = statSync(path).mtimeMs;
		assert.deepEqual(await validateFiles(root, sqlitePath, { writeSnapshotPath: path }), []);
		assert.equal(readFileSync(path, 'utf8'), first);
		assert.equal(statSync(path).mtimeMs, modified);
		assert.deepEqual(await validateFiles(root, join(dir, 'absent.sqlite'), { snapshotPath: path }), []);
		await assert.rejects(validateFiles(root, undefined, { snapshotPath: join(dir, 'absent.json') }), /ENOENT/);
		writeFileSync(path, '{corrupt');
		await assert.rejects(validateFiles(root, undefined, { snapshotPath: path }), SyntaxError);
		await assert.rejects(validateFiles(root, join(dir, 'absent.sqlite')));
	} finally { rmSync(dir, { recursive: true, force: true }); }
});

test('configuraciones mal formadas y metadatos vacíos producen errores legibles', () => {
	assert.ok(validateReportBibliography(null, null, catalog).length > 0);
	const errors = validateReportBibliography({ entriesByKey: { empty: {} }, views: { comoCitarnos: { sections: {} }, informes: { base: { sections: [null] }, overridesByInformeId: [] } } }, config([rule()]), catalog);
	assert.ok(errors.some((error: string) => error.includes('entriesByKey.empty')));
	assert.ok(errors.some((error: string) => error.includes('sección inválida')));
	assert.ok(errors.some((error: string) => error.includes('overridesByInformeId')));
});
