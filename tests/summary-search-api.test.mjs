import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { createSummarySearchIndexLoader } from '../src/lib/server/summary-search-index.ts';

const source = await readFile(new URL('../src/routes/api/resumenes/search/+server.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace(/^import .*?;\n/gms, '').replace('export const GET:', 'const GET:'), {
 compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }
}).outputText;
const normalizePlainText = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const fixture = (works) => new Function('json','error','getWorksForSummaryIndex','getPublicSummaryAssetUrl','createSummarySearchIndexLoader','normalizePlainText','formatDisplayWorkTitle','formatTraditionalAttributionCompact', `${compiled};return GET;`)(
 (body,init) => Response.json(body,init), (status,message) => Object.assign(new Error(message),{status}),
 async()=>works, ()=>'/api/r2-public/resumenes/search-index.json', createSummarySearchIndexLoader,
 normalizePlainText, (s)=>s, (set)=>set.label
);
const work = (id, title='Título vigente') => ({ id, title, slug:'slug-vigente-'+id, genre:'Novela', shortSummary:'No contiene el término', traditionalAttribution:{groups:[],label:'Autor vigente'} });
const entry = (id,text) => ({id,summaryText:text,normalizedSummaryText:normalizePlainText(text),slug:'slug-antiguo',title:'Título antiguo'});
const payload = (entries)=>({schemaVersion:'etso-summary-search-index-v1',entries});

test('API finds Balán in the approved long Amadís summary and uses current public metadata', async()=>{
 const summary=JSON.parse(await readFile(new URL('../scripts/texoro-summaries/TEXORO_caballerias_amadis_de_gaula.json', import.meta.url),'utf8'));
 const current=work('amadis','Amadís de Gaula');
 const handler=fixture([current]);let calls=0;
 const fetch=async(url)=>{assert.equal(url,'/api/r2-public/resumenes/search-index.json');calls++;return Response.json(payload([
  entry('amadis',summary.resumen_largo.join('\n\n')), entry('embargo','Balán también aparece aquí')
 ]));};
 const response=await handler({url:new URL('https://etso.es/api/resumenes/search?q=Balán&limit=999&offset=0'),fetch});
 const result=await response.json();
 assert.equal(result.total,1);assert.equal(result.limit,20);assert.equal(result.hasMore,false);
 assert.equal(result.results[0].slug,current.slug);assert.equal(result.results[0].title,current.title);
 assert.equal(result.results[0].traditional,'Autor vigente');assert.equal(result.results[0].genre,'Novela');
 assert.equal(result.results[0].snippets[0].match,'Balán');assert.equal(calls,1);
});

test('API retains AND matching, offsets and collection author label',async()=>{
 const collection={...work('collection'),collectionSize:2,traditionalAttribution:{groups:[{members:[{authorId:'a'},{authorId:'b'}]}]}};
 const handler=fixture([work('first','A'),collection]);
 const fetch=async()=>Response.json(payload([entry('first','amor y vida'),entry('collection','vida y amor')]));
 const r=await(await handler({url:new URL('https://etso.es/api/resumenes/search?q=amor+vida&offset=1&limit=1'),fetch})).json();
 assert.equal(r.total,2);assert.equal(r.offset,1);assert.equal(r.results.length,1);assert.equal(r.results[0].traditional,'Varios');
 assert.equal(r.results[0].snippets.length,2);
});

test('asset failures produce a retryable error instead of incomplete brief-only results',async()=>{
 const handler=fixture([work('a')]);
 await assert.rejects(handler({url:new URL('https://etso.es/api/resumenes/search?q=amor'),fetch:async()=>new Response('',{status:503})}),e=>e.status===503);
 const result=await(await handler({url:new URL('https://etso.es/api/resumenes/search?q=amor'),fetch:async()=>Response.json(payload([entry('a','amor')]))})).json();
 assert.equal(result.total,1);
});

test('loader shares concurrent requests, refreshes after expiry and rejects invalid indexes',async()=>{
 let calls=0,clock=0;const load=createSummarySearchIndexLoader({now:()=>clock,ttlMs:10});
 const fetch=async()=>{calls++;return Response.json(payload([entry('a','amor')]));};
 await Promise.all([load('/index',fetch),load('/index',fetch)]);assert.equal(calls,1);
 clock=11;await load('/index',fetch);assert.equal(calls,2);
 await assert.rejects(load('/bad',async()=>Response.json(payload([entry('a','amor'),entry('a','vida')]))));
});
