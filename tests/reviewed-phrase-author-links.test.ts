import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTraditionalAttributionParts } from '../src/lib/utils/traditional-attribution-phrase.ts';
import type { AttributionSet } from '../src/lib/domain/catalog.ts';
const parts = (reviewedPhrase: string, members: {authorId: string; authorName: string; hasAuthorshipExam?: boolean}[]) => buildTraditionalAttributionParts({ reviewedPhrase, groups: [{members}], connector: 'and' } as AttributionSet);

test('links every repeated author in alternative collaborations and preserves exact approved prose', () => {
 const phrase = 'Obra atribuida a la colaboración de Pedro de Leiva y Pedro Correa o a la de Francisco de Leiva Ramírez de Arellano y Pedro Correa.';
 const result = parts(phrase, [{authorId:'leiva',authorName:'Pedro de Leiva'}, {authorId:'correa',authorName:'Pedro Correa',hasAuthorshipExam:false}, {authorId:'francisco',authorName:'Francisco de Leiva Ramírez de Arellano'}]);
 assert.equal(result.map(p=>p.value).join(''),phrase);
 assert.deepEqual(result.filter(p=>p.kind==='author').map(p=>p.authorId),['leiva','correa','francisco','correa']);
 assert.equal(result.find(p=>p.authorId==='correa')?.hasAuthorshipExam,false);
});

test('longest overlapping name wins and word boundaries exclude substrings', () => {
 const result=parts('Juan Pérez de Montalbán, Juan Pérez; Juan Pérezano.', [{authorId:'short',authorName:'Juan Pérez'},{authorId:'long',authorName:'Juan Pérez de Montalbán'}]);
 assert.deepEqual(result.filter(p=>p.kind==='author').map(p=>p.authorId),['long','short']);
 assert.equal(result.map(p=>p.value).join(''),'Juan Pérez de Montalbán, Juan Pérez; Juan Pérezano.');
});

test('approved abbreviated names and parenthetical identities preserve spelling', () => {
 const result=parts('Calderón, Coello y Moreto; Benavente y Antonio Enríquez Gómez.', [{authorId:'calderon_de_la_barca_pedro',authorName:'Pedro Calderón de la Barca'},{authorId:'coello_y_ochoa_antonio',authorName:'Antonio Coello y Ochoa'},{authorId:'moreto_y_cavana_agustin',authorName:'Agustín Moreto y Cavana'},{authorId:'benavente_no_identificado',authorName:'Benavente (identidad no precisada)'},{authorId:'enriquez_gomez_antonio',authorName:'Antonio Enríquez Gómez (Fernando de Zárate)'}]);
 assert.equal(result.filter(p=>p.kind==='author').length,5);
 assert.deepEqual(result.filter(p=>p.kind==='author').map(p=>p.value),['Calderón','Coello','Moreto','Benavente','Antonio Enríquez Gómez']);
});

test('aliases never introduce absent identities and ambiguous names remain text', () => {
 assert.deepEqual(parts('Calderón.', [{authorId:'other',authorName:'Pedro Correa'}]),[{kind:'text',value:'Calderón.'}]);
 assert.deepEqual(parts('Juan.', [{authorId:'a',authorName:'Juan'},{authorId:'b',authorName:'Juan'}]),[{kind:'text',value:'Juan.'}]);
});


test('links a repeated abbreviated Matos Fragoso mention', () => {
 const phrase = 'Juan de Matos Fragoso; también se ha atribuido únicamente a Matos Fragoso.';
 const result = parts(phrase, [{authorId:'matos_fragoso_juan_de',authorName:'Juan de Matos Fragoso'}]);
 assert.deepEqual(result.filter(p=>p.kind==='author').map(p=>p.value),['Juan de Matos Fragoso','Matos Fragoso']);
 assert.equal(result.map(p=>p.value).join(''),phrase);
});

test('links the complete approved Diego de Aguayo y Terones spelling', () => {
 const phrase = 'Obra atribuida a Diego de Aguayo y Terones.';
 const result = parts(phrase, [{authorId:'aguayo_diego_de',authorName:'Diego de Aguayo'}]);
 assert.deepEqual(result.filter(p=>p.kind==='author').map(p=>p.value),['Diego de Aguayo y Terones']);
 assert.equal(result.map(p=>p.value).join(''),phrase);
});
