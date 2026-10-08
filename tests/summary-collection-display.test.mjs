import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@libsql/client';

test('summary index compacts collection authors while preserving single authors and theatre collaboration', async () => {
	const root = await mkdtemp(join(tmpdir(), 'etso-summary-collections-'));
	const db = createClient({ url: `file:${join(root, 'catalogue.sqlite')}` });
	try {
		await db.executeMultiple(`
			CREATE TABLE works (id TEXT, slug TEXT, titulo TEXT, genero TEXT, resumen_breve TEXT, collection_size INTEGER);
			CREATE TABLE authors (id TEXT, nombre TEXT);
			CREATE TABLE attribution_sets (id INTEGER, work_id TEXT, raw_expression TEXT, attribution_type TEXT);
			CREATE TABLE attribution_groups (id INTEGER, attribution_set_id INTEGER, group_order INTEGER);
			CREATE TABLE attribution_members (attribution_group_id INTEGER, author_id TEXT, member_order INTEGER);
			INSERT INTO authors VALUES ('one', 'Miguel de Cervantes Saavedra'), ('two', 'Lope de Vega Carpio');
		`);
		const input = join(root, 'summaries'); await mkdir(input);
		for (const [index, id, size, names] of [[1, 'multi', 20, ['one', 'two']], [2, 'single', 10, ['one']], [3, 'theatre', null, ['one', 'two']]]) {
			await db.execute({ sql: 'INSERT INTO works VALUES (?, ?, ?, ?, ?, ?)', args: [id, id, id, 'Sonetos', 'Resumen', size] });
			await db.execute({ sql: "INSERT INTO attribution_sets VALUES (?, ?, '', 'tradicional')", args: [index, id] });
			await db.execute({ sql: 'INSERT INTO attribution_groups VALUES (?, ?, 0)', args: [index, index] });
			for (const [memberOrder, author] of names.entries()) await db.execute({ sql: 'INSERT INTO attribution_members VALUES (?, ?, ?)', args: [index, author, memberOrder] });
			await writeFile(join(input, `${id}.json`), JSON.stringify({ resumen_breve: ['Resumen de la obra.'], resumen_largo: ['Texto del resumen.'] }));
		}
		const output = join(root, 'index.json');
		execFileSync(process.execPath, ['scripts/build-summary-search-index.mjs', '--sqlite', join(root, 'catalogue.sqlite'), '--input', input, '--output', output], { stdio: 'pipe' });
		const entries = new Map(JSON.parse(await readFile(output, 'utf8')).entries.map((entry) => [entry.id, entry]));
		assert.equal(entries.get('multi').traditional, 'Varios');
		assert.equal(entries.get('single').traditional, 'Miguel de Cervantes Saavedra');
		assert.equal(entries.get('theatre').traditional, 'Miguel de Cervantes Saavedra y Lope de Vega Carpio');
		assert.equal((await db.execute('SELECT count(*) AS count FROM attribution_members')).rows[0].count, 5);
		// Legacy catalogues without the new column still build the same author labels.
		await db.execute('ALTER TABLE works DROP COLUMN collection_size');
		execFileSync(process.execPath, ['scripts/build-summary-search-index.mjs', '--sqlite', join(root, 'catalogue.sqlite'), '--input', input, '--output', output], { stdio: 'pipe' });
		const legacy = JSON.parse(await readFile(output, 'utf8')).entries.find((entry) => entry.id === 'multi');
		assert.equal(legacy.traditional, 'Miguel de Cervantes Saavedra y Lope de Vega Carpio');
	} finally {
		db.close();
		await rm(root, { recursive: true, force: true });
	}
});
