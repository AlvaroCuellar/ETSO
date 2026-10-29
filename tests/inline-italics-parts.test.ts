import test from 'node:test';
import assert from 'node:assert/strict';
import { withInlineItalics } from '../src/lib/utils/inline-italics-parts.ts';

test('approved title italics stay separate from surrounding prose', () => {
 assert.deepEqual(withInlineItalics([{value:'En <i>Las cuentas del Gran Capitán</i> se observa.'}]), [
  {value:'En ',italic:false},{value:'Las cuentas del Gran Capitán',italic:true},{value:' se observa.',italic:false}
 ]);
});
test('italics span linked author parts without changing link identity', () => {
 const parts=withInlineItalics([{kind:'text',value:'<i>Obra de '},{kind:'author',authorId:'lope',value:'Lope'},{kind:'text',value:'</i> y otra.'}]);
 assert.deepEqual(parts,[{kind:'text',value:'Obra de ',italic:true},{kind:'author',authorId:'lope',value:'Lope',italic:true},{kind:'text',value:' y otra.',italic:false}]);
});
test('unsupported markup remains literal, without turning into HTML', () => {
 const value='<script>alert(1)</script><i onclick="bad">texto</i>';
 const parts=withInlineItalics([{value}]);
 assert.equal(parts.map(p=>p.value).join(''),'<script>alert(1)</script><i onclick="bad">texto');
 assert.ok(parts.every(p=>!p.italic));
});
