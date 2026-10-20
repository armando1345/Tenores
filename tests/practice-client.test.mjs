import test from 'node:test';
import assert from 'node:assert/strict';
import { compactAnalysis } from '../practice/compact.js';
import { assertCloudinary } from '../practice/reference-source.js';
const mk=(n,hop=10)=>({engineVersion:'1',songId:'fum',scores:{total:80,pitch:1,rhythm:2,stability:3},tips:['a'],curves:{hopMs:hop,startSec:0,ref:Array.from({length:n},(_,i)=>i%7===0?null:60+Math.sin(i)*3.14159),user:Array.from({length:n},(_,i)=>i%5===0?null:61.123456+i%3)}});
test('compactAnalysis submuestrea, redondea y conserva null',()=>{
  const a=mk(16000),c=compactAnalysis(a);
  assert(c.curves.ref.length<=4000&&c.curves.user.length<=4000);assert.equal(c.curves.hopMs,40);
  assert.equal(c.curves.ref[0],null);assert.deepEqual(c.scores,a.scores);assert.deepEqual(c.tips,a.tips);
  for(const v of c.curves.user)assert(v===null||Math.round(v*100)/100===v);
  assert.equal(compactAnalysis(mk(100)).curves.hopMs,10);
});
test('El análisis de 160 s compactado cabe en 262 144',()=>{assert(JSON.stringify(compactAnalysis(mk(16000))).length<262144);});
test('assertCloudinary exige res.cloudinary.com',()=>{
  assertCloudinary('https://res.cloudinary.com/x.wav');
  assert.throws(()=>assertCloudinary('https://example.com/x.wav'),{message:'Para generar la curva, la referencia debe estar en Cloudinary (res.cloudinary.com).'});
});
