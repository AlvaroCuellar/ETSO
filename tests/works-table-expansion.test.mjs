import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const createTable = () => {
	const script = readFileSync(new URL('../src/lib/components/search/WorksTable.svelte', import.meta.url), 'utf8')
		.match(/<script lang="ts">([\s\S]*?)<\/script>/)[1];
	const ast = ts.createSourceFile('works-table.ts', script, ts.ScriptTarget.Latest, true);
	const declaration = ast.statements.filter(ts.isVariableStatement)
		.flatMap(statement => [...statement.declarationList.declarations])
		.find(item => item.name.getText(ast) === 'toggleRowExpanded');
	const pending = new Map();
	const context = vm.createContext({
		loadShortSummary: work => new Promise(resolve => pending.set(work.id, resolve))
	});
	vm.runInContext(ts.transpileModule(`
		let expandedRows = new Set();
		const toggleRowExpanded = ${declaration.initializer.getText(ast)};
		globalThis.table = {
			toggle: id => toggleRowExpanded({ rowId: id, work: { id } }),
			get expanded() { return Array.from(expandedRows).sort(); }
		};
	`, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText, context);
	return { table: context.table, pending };
};

test('two concurrent summary loads keep both detail panels open', async () => {
	const { table, pending } = createTable();
	const first = table.toggle('a');
	const second = table.toggle('b');
	assert.deepEqual([...table.expanded], ['a', 'b'], 'panels should open while summaries load');
	pending.get('b')(); await second;
	pending.get('a')(); await first;
	assert.deepEqual([...table.expanded], ['a', 'b']);
});

test('closing a detail panel during its summary load does not reopen it afterwards', async () => {
	const { table, pending } = createTable();
	const opening = table.toggle('a');
	await table.toggle('a');
	assert.deepEqual([...table.expanded], []);
	pending.get('a')(); await opening;
	assert.deepEqual([...table.expanded], []);
});
