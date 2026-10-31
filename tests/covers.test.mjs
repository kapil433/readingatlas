import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../3d/catalogue.js',import.meta.url),'utf8');
let serial=0;
async function fresh(){return import('data:text/javascript;base64,'+Buffer.from(source+'\n// test '+serial++).toString('base64'));}
function response(value){return{ok:true,json:async()=>value};}

test('real cover accepts an exact title and explicitly verified author alias',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return response(String(url).includes('/authors/')?{name:'Лев Толстой',alternate_names:['Leo Tolstoy']}:{docs:[{title:'War and Peace',author_name:['Лев Толстой'],author_key:['OL26783A'],cover_i:12621906,key:'/works/OL267171W'}]});};
 try{const m=await fresh(),book={title:'War and Peace',author:'Leo Tolstoy',collection:'world'};assert.equal(await m.resolveCover(book,'world'),12621906);assert.equal(m.getCoverInfo(book,'world').matchedBy,'verified-author-alias');assert.equal(calls.length,2);assert.match(calls[0],/author_key/);}finally{globalThis.fetch=original;}
});
test('similar titles or unverified authors never receive an unrelated cover',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>response(String(url).includes('/authors/')?{name:'Another Writer',alternate_names:['Other Author']}:{docs:[{title:'Exact Work',author_name:['Other Author'],author_key:['OL123A'],cover_i:3},{title:'Exact Work: Study Guide',author_name:['Expected Author'],cover_i:4}]});
 try{const m=await fresh(),b={title:'Exact Work',author:'Expected Author'};assert.equal(await m.resolveCover(b,'world'),null);assert.equal(m.getCoverInfo(b,'world').status,'uncertain');}finally{globalThis.fetch=original;}
});
test('non-Latin author names remain distinct and concurrent lookups deduplicate',async()=>{
 const original=globalThis.fetch;let requests=0;
 globalThis.fetch=async()=>{requests++;return response({docs:[{title:'Книга',author_name:['Иван'],cover_i:7}]});};
 try{const m=await fresh(),a={title:'Книга',author:'Иван'},b={title:'Книга',author:'Анна'};assert.deepEqual(await Promise.all([m.resolveCover(a,'world'),m.resolveCover(a,'world')]),[7,7]);assert.equal(requests,1);assert.equal(await m.resolveCover(b,'world'),null);assert.equal(requests,2);}finally{globalThis.fetch=original;}
});
test('alias verification is bounded and repeated author failures are not retried within one lookup',async()=>{
 const original=globalThis.fetch;let authorRequests=0;
 globalThis.fetch=async url=>{if(String(url).includes('/authors/')){authorRequests++;throw Error('Network unavailable');}return response({docs:Array.from({length:8},()=>({title:'Work',author_name:['Other'],author_key:['OL1A','OL2A','OL3A','OL4A'],cover_i:8}))});};
 try{const m=await fresh(),b={title:'Work',author:'Expected'};assert.equal(await m.resolveCover(b,'world'),null);assert.equal(authorRequests,3);assert.equal(m.getCoverInfo(b,'world').status,'unavailable-temporary');}finally{globalThis.fetch=original;}
});
