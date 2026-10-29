import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import ExcelJS from 'exceljs';
import { formatAttribution } from '../src/lib/domain/catalog.ts';
import { formatTraditionalAttributionCompact } from '../src/lib/utils/traditional-attribution-phrase.ts';
import { buildWorkTitleSearchText, formatDisplayWorkTitle } from '../src/lib/utils/format-display-work-title.ts';
import { normalizeResultSort, normalizeResultSortDirection, resultSortDirectionLabel, resultSortLabel, sortSearchResults } from '../src/lib/search/result-sort.ts';

// Run the real exporter, mock only search/index access, and inspect the generated XLSX.
const source = await readFile(new URL('../src/routes/api/texoro/export.xlsx/+server.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace(/^import\b[\s\S]*?;\n/gm, '').replace(/export const /g, 'const '), {
 compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }
}).outputText;
const attribution = (name) => ({ connector: 'and', groups: [{ members: [{authorId:name.toLowerCase(),authorName:name}] }] });
const makeResult = (id, inAuthorshipExam) => ({
 workId:id, publicId:null, docId:inAuthorshipExam ? 1 : 2, docTokenCount:10, score:1,
 matches:[{kind:'term',source:'amor',occurrences:1}],
 meta:{id, title:id, slug:id, titleVariants:[], genre:'Novela',generalGenre:'Prosa',textState:'Bueno',
  inAuthorshipExam, textLinks:[], shortSummary:'',
  traditionalAttribution:attribution(inAuthorshipExam ? 'Tradicional' : 'Cervantes'),
  // Empty non-Examen data must not be presented as an unperformed analysis.
  stylometryAttribution:inAuthorshipExam ? attribution('Estilométrico') : {connector:'and',groups:[]}}
});
const exportWorkbook = async (results) => {
 const dependencies = {
  ExcelJS, formatAttribution, formatTraditionalAttributionCompact, buildWorkTitleSearchText, formatDisplayWorkTitle,
  normalizeResultSort, normalizeResultSortDirection, resultSortDirectionLabel, resultSortLabel, sortSearchResults,
  error:(status,message) => {throw new Error(`${status}: ${message}`);},
  searchTexoro:async () => ({allResults:results,parsed:{warnings:[]}}),
  getServerTexoroEngine:async () => ({manifest:{indexVersion:'fixture'},getOccurrencesForMatch:async () => ({items:[{tokenIndex:1,tokenEndIndex:1,tokenCount:10,snippet:'un amor verdadero'}]})})
 };
 const post = new Function(...Object.keys(dependencies),`${compiled}\nreturn POST;`)(...Object.values(dependencies));
 const response = await post({request:new Request('https://local.test/export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'amor',sort:'title'})})});
 assert.equal(response.status,200);
 const workbook = new ExcelJS.Workbook();
 await workbook.xlsx.load(await response.arrayBuffer());
 return workbook;
};
const sheetRecords = (sheet) => {
 const headers=sheet.getRow(1).values.slice(1);
 return {headers,records:sheet.getRows(2,Math.max(0,sheet.rowCount-1))?.map(row => Object.fromEntries(headers.map((header,index) => [header,row.getCell(index+1).value ?? '']))) ?? []};
};

test('non-Examen XLSX has Autoría and no stylometric status in results or contexts', async () => {
 const workbook=await exportWorkbook([makeResult('noexam',false)]);
 for (const name of ['Resultados','Ocurrencias']) {
  const {headers,records}=sheetRecords(workbook.getWorksheet(name));
  assert.ok(headers.includes('Autoría'));
  assert.ok(!headers.includes('Atribución tradicional'));
  assert.ok(!headers.includes('Atribución estilométrica'));
  assert.equal(records[0]['Autoría'],'Cervantes');
  assert.ok(!JSON.stringify(records).includes('No analizada'));
 }
});
test('Examen XLSX retains traditional and stylometric attribution columns and values', async () => {
 const workbook=await exportWorkbook([makeResult('exam',true)]);
 for (const name of ['Resultados','Ocurrencias']) {
  const {headers,records}=sheetRecords(workbook.getWorksheet(name));
  assert.ok(!headers.includes('Autoría'));
  assert.equal(records[0]['Atribución tradicional'],'Tradicional');
  assert.equal(records[0]['Atribución estilométrica'],'Estilométrico');
 }
});
test('mixed XLSX keeps all attributions without assigning stylometry to non-Examen rows', async () => {
 const noexamResult=makeResult('noexam',false);
 noexamResult.meta.stylometryAttribution=attribution('No debe mostrarse');
 const workbook=await exportWorkbook([noexamResult,makeResult('exam',true)]);
 for (const name of ['Resultados','Ocurrencias']) {
  const {headers,records}=sheetRecords(workbook.getWorksheet(name));
  assert.ok(['Autoría','Atribución tradicional','Atribución estilométrica'].every(x => headers.includes(x)));
  const noexam=records.find(row => row['Título']==='noexam');
  const exam=records.find(row => row['Título']==='exam');
  assert.equal(noexam['Autoría'],'Cervantes');
  assert.equal(noexam['Atribución tradicional'],'');
  assert.equal(noexam['Atribución estilométrica'],'');
  assert.equal(exam['Autoría'],'');
  assert.equal(exam['Atribución tradicional'],'Tradicional');
  assert.equal(exam['Atribución estilométrica'],'Estilométrico');
 }
});
test('empty exports remain valid and use neutral authorship columns consistently', async () => {
 const workbook=await exportWorkbook([]);
 for (const name of ['Resultados','Ocurrencias']) {
  const {headers,records}=sheetRecords(workbook.getWorksheet(name));
  assert.ok(headers.includes('Autoría'));
  assert.ok(!headers.includes('Atribución estilométrica'));
  assert.deepEqual(records,[]);
 }
});
