import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { createHash } from 'node:crypto';

const compile = async (path) => ts.transpileModule((await readFile(new URL(path, import.meta.url), 'utf8'))
 .replace(/^import\b[\s\S]*?;\n/gm, '').replace(/export (const|class|interface) /g, '$1 '), {
 compilerOptions: {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}
}).outputText;
const helperSource = await compile('../src/lib/server/biteso-correction-proposals.ts');
const helperFixture = (env, send) => new Function('createHash','dev','env','getFeedbackRecipientEmail','checkRateLimit','fetch','console', `${helperSource}\nreturn {submitCorrectionEmail,CorrectionDeliveryError,getCorrectionProposalFormValues};`)(createHash,false,env,()=>'test@example.invalid',()=>({limited:false}),send,{info(){},warn(){},error(){}});
const form = () => {
 const value=new FormData();value.set('proposed_text','A corrected passage.');value.set('contributor_name','A reader');value.set('contributor_email','reader@example.invalid');value.set('contributor_comment','Please check this passage.');return value;
};
const input = () => ({formData:form(),kind:'summary',workId:'work',workSlug:'work',workTitle:'A work',originalText:'Original passage.',sourceUrl:'https://etso.es/obras/work/resumen',clientAddress:'127.0.0.1'});

test('absent configuration and rejected/network deliveries cannot acknowledge receipt', async () => {
 let requests=0;
 const cases=[
  [{},async()=>{requests++;throw new Error('Should not call');}],
  [{RESEND_API_KEY:'not-a-real-key'},async()=>new Response('Private provider detail',{status:500})],
  [{RESEND_API_KEY:'not-a-real-key'},async()=>{throw new Error('Private network detail');}]
 ];
 for(const [env,send] of cases){
  const h=helperFixture(env,send);
  await assert.rejects(h.submitCorrectionEmail(input()),e=>e instanceof h.CorrectionDeliveryError && !/Private|RESEND|not-a-real-key/.test(e.message));
 }
 assert.equal(requests,0);
});

test('accepted delivery is the only successful outcome and preserves validation',async()=>{
 let body;
 const h=helperFixture({RESEND_API_KEY:'not-a-real-key'},async(_url,init)=>{body=JSON.parse(init.body);return new Response('{"id":"test"}',{status:200});});
 assert.deepEqual(await h.submitCorrectionEmail(input()),{ok:true,emailDelivered:true});
 assert.match(body.text,/A corrected passage/);
 const bad=input();bad.formData.set('website','spam');await assert.rejects(h.submitCorrectionEmail(bad),/Solicitud no válida/);
});

for(const [kind,path,key] of [
 ['summary','../src/routes/obras/[slug]/resumen/+page.server.ts','summaryCorrectionProposal'],
 ['biteso','../src/routes/biteso/[id]/+page.server.ts','correctionProposal']
]){
 const source=await compile(path);
 test(`${kind} action reports delivery failure with503 and retains entered fields`,async()=>{
  const h=helperFixture({},async()=>{throw new Error('No mail');});
  const work={id:'work',slug:'work',title:'A work'};
  const deps={
   error:()=>{throw new Error('Unexpected route error');},fail:(status,data)=>({status,data}),redirect:()=>{throw new Error('Unexpected redirect');},
   setPublicCatalogCacheHeaders:()=>{},localizePath:x=>x,getWorkResultPresentation:async()=>({work}),
   getBitesoBySlug:async()=>({workId:'work',id:'work',text:'Original passage.'}),getBitesoWorkBySlug:async()=>work,getWorkById:async()=>work,getWorkBySlug:async()=>work,getWorkByPublicId:async()=>work,
   getPublicSummaryAssetUrl:x=>x,loadSummaryDocument:async()=>({document:{resumenBreve:['Original passage.'],resumenLargo:[],personajes:[],espacios:[],tematicas:[]}}),buildSummaryCorrectionText:()=> 'Original passage.',
   ...h
  };
  for (const deliver of [h.submitCorrectionEmail, async () => ({ok:true,emailDelivered:false})]) {
  deps.submitCorrectionEmail = deliver;
  const action=new Function(...Object.keys(deps),`${source}\nreturn actions.default;`)(...Object.values(deps));
  const result=await action({request:{formData:async()=>form()},params:{id:'work',slug:'work'},url:new URL('https://etso.es/work'),getClientAddress:()=> '127.0.0.1',fetch:()=>{throw new Error('No requests');}});
  assert.equal(result.status,503);
  assert.equal(result.data[key].ok,false);
  assert.equal(result.data[key].values.proposedText,'A corrected passage.');
  assert.equal(result.data[key].values.contributorName,'A reader');
  assert.equal(result.data[key].values.contributorEmail,'reader@example.invalid');
  assert.equal(result.data[key].values.contributorComment,'Please check this passage.');
  assert.doesNotMatch(result.data[key].message,/se ha enviado correctamente/);
  }
  if (kind === 'summary') {
   for (const unavailable of [true, false]) {
    let submitted = false;
    deps.loadSummaryDocument = async () => ({document:null, unavailable});
    deps.submitCorrectionEmail = async () => {submitted = true; throw new Error('Must not send without source');};
    const action = new Function(...Object.keys(deps),`${source}\nreturn actions.default;`)(...Object.values(deps));
    const result = await action({request:{formData:async()=>form()},params:{slug:'work'},fetch:()=>{throw new Error('No requests');}});
    assert.equal(result.status, unavailable ? 503 : 404);
    assert.equal(result.data[key].ok, false);
    assert.deepEqual(result.data[key].values, h.getCorrectionProposalFormValues(form()));
    assert.equal(submitted, false);
   }
  }
 });
}
