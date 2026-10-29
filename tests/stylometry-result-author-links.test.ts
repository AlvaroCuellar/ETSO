import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStylometryResultParts, resolveStylometryResult } from '../src/lib/utils/stylometry-result.ts';
import type { AttributionSet, CatalogWork } from '../src/lib/domain/catalog.ts';
const author = (authorId: string, authorName: string) => ({authorId, authorName});
const work = (result1: string, result2: string, authors: ReturnType<typeof author>[] = []) => ({result1,result2, traditionalAttribution:{groups:[{members:authors}],connector:'and'} as AttributionSet, stylometryAttribution:{groups:[],connector:'and'} as AttributionSet}) as CatalogWork;

test('manual results preserve both conclusions and repeated compound author names', () => {
 const value = work('Pedro Correa y Francisco de Leiva Ramírez de Arellano ofrecen afinidades.', 'No se confirma Pedro Correa.', [author('correa','Pedro Correa'),author('leiva','Francisco de Leiva Ramírez de Arellano')]);
 const parts = buildStylometryResultParts(value);
 assert.equal(parts.map(p=>p.value).join(''),resolveStylometryResult(value));
 assert.deepEqual(parts.filter(p=>p.kind==='author').map(p=>p.authorId),['correa','leiva','correa']);
});

test('result aliases link Matos and Terones without changing prose or matching substrings', () => {
 const value = work('Matos Fragoso y Diego de Aguayo y Terones.', 'Matosano queda como texto.', [author('matos_fragoso_juan_de','Juan de Matos Fragoso'),author('aguayo_diego_de','Diego de Aguayo')]);
 const parts = buildStylometryResultParts(value);
 assert.equal(parts.map(p=>p.value).join(''),resolveStylometryResult(value));
 assert.deepEqual(parts.filter(p=>p.kind==='author').map(p=>p.value),['Matos Fragoso','Diego de Aguayo y Terones']);
});

test('mixed explicit keys and discarded named authors use extra authoritative identities', () => {
 const value = work('Se descarta a Pedro Correa frente a #matos_fragoso_juan_de.', '#unknown sigue pendiente.');
 const parts = buildStylometryResultParts(value,{},[author('correa','Pedro Correa'),author('matos_fragoso_juan_de','Juan de Matos Fragoso')]);
 assert.equal(parts.map(p=>p.value).join(''),'Se descarta a Pedro Correa frente a Juan de Matos Fragoso. #unknown sigue pendiente.');
 assert.deepEqual(parts.filter(p=>p.kind==='author').map(p=>p.authorId),['correa','matos_fragoso_juan_de']);
});

test('automatic result uses generated name and retains secondary conclusion', () => {
 const value = work('auto','Pedro Correa queda descartado.',[author('correa','Pedro Correa')]);
 value.stylometryAttribution = {groups:[{members:[{...author('matos_fragoso_juan_de','Juan de Matos Fragoso'),confidence:'segura'}]}],connector:'and'} as AttributionSet;
 const parts = buildStylometryResultParts(value);
 assert.equal(parts.map(p=>p.value).join(''),resolveStylometryResult(value));
 assert.deepEqual(parts.filter(p=>p.kind==='author').map(p=>p.authorId),['matos_fragoso_juan_de','correa']);
});

test('empty results and ambiguous literal identities do not infer a person', () => {
 assert.deepEqual(buildStylometryResultParts(work('','')),[]);
 const parts = buildStylometryResultParts(work('Juan.',''),{},[author('a','Juan'),author('b','Juan')]);
 assert.deepEqual(parts,[{kind:'text',value:'Juan.'}]);
});


test('canonical names outrank parenthetical aliases and scoped José never leaks', () => {
 const identities = [author('calleja_diego','Diego Calleja'),author('calleja_diego_otro','Diego Calleja (otro)'),author('figueroa_y_cordova_jose','José Figueroa y Córdova')];
 const value = work('Diego Calleja y José; Carlos de Arellano.','');
 value.id = 'FIGUEROA-DIEGO_SirenaDeTinacria(Transk-IMPR)';
 const parts = buildStylometryResultParts(value,{},identities);
 assert.deepEqual(parts.filter(p=>p.kind==='author').map(p=>p.authorId),['calleja_diego','figueroa_y_cordova_jose']);
 assert.equal(parts.map(p=>p.value).join(''),value.result1);
 value.id = 'OTHER';
 assert.deepEqual(buildStylometryResultParts(value,{},identities).filter(p=>p.kind==='author').map(p=>p.authorId),['calleja_diego']);
});

test('ficha input can omit secondary prose and its authors while report input retains both', () => {
 const value = work('Pedro Correa presenta afinidades.', 'Se descarta a Diego de Aguayo y Terones.', [author('correa','Pedro Correa'),author('aguayo_diego_de','Diego de Aguayo')]);
 const ficha = buildStylometryResultParts({...value,result2:undefined});
 assert.equal(ficha.map(p=>p.value).join(''),value.result1);
 assert.deepEqual(ficha.filter(p=>p.kind==='author').map(p=>p.authorId),['correa']);
 const report = buildStylometryResultParts(value);
 assert.equal(report.map(p=>p.value).join(''),`${value.result1} ${value.result2}`);
 assert.deepEqual(report.filter(p=>p.kind==='author').map(p=>p.authorId),['correa','aguayo_diego_de']);
});


test('standalone manual marker uses the current attribution without upgrading its confidence', () => {
 const noAssociation = work('manual', 'No');
 noAssociation.stylometryAttribution = {groups: [], connector: 'and', rawExpression: 'no_apunta_a_ningun_autor[sin_confianza]'};
 const expected = 'Los análisis de estilometría no permiten asociar esta obra de forma clara con ningún perfil autorial del corpus.';
 // Both BERMUDEZ_PrimeroAlReyQueAlHonor and VILLEGAS-DIEGO_NacimientoDeSanJuanBautista(Auto) have this attribution.
 assert.equal(resolveStylometryResult(noAssociation), expected);
 for (const marker of ['manual', ' MANUAL ', 'Manual.', 'manual!']) {
  const value = work(marker, 'Matiz aprobado.', [author('reyes_matias_de_los', 'Matías de los Reyes')]);
  value.stylometryAttribution = {groups: [{members: [{...author('reyes_matias_de_los', 'Matías de los Reyes'), confidence: 'probable'}]}], connector: 'and'};
  const primary = 'Los análisis de estilometría permiten asociar esta obra con el perfil autorial de Matías de los Reyes, por cuanto algunas de sus obras aparecen en las primeras posiciones, aunque no de forma concluyente.';
  assert.equal(resolveStylometryResult({...value, result2: undefined}), primary);
  assert.equal(resolveStylometryResult(value), `${primary} Matiz aprobado.`);
  assert.deepEqual(buildStylometryResultParts({...value, result2: undefined}).filter(p => p.kind === 'author').map(p => p.authorId), ['reyes_matias_de_los']);
 }
});

test('manual as a word in an approved conclusion is preserved literally', () => {
 for (const text of ['La revisión manual permite mantener esta conclusión.', 'Manual de atribución: no constituye un marcador.']) {
  assert.equal(resolveStylometryResult(work(text, 'No')), text);
 }
});
