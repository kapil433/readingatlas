/**
 * Reading Atlas progress bridge.
 *
 * Legacy keys and schemas come from the existing embedded HTML, not inferred
 * from catalogue order. Calls read the current value on every operation so a
 * separate Atlas tab can continue using the same origin/storage keys.
 * Unknown, corrupt or ambiguous records are never replaced.
 */
const DESK_KEY='readingAtlas:3d:reading-desk:v1';
const NEW_KEY='readingAtlas:v1';
const EXPANDED_KEY='readingAtlas:expanded:v1';
let deskError=null;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const nonempty=value=>typeof value==='string'&&value.length>0;
function storage(){try{const s=globalThis.localStorage;if(!s)throw Error('Browser storage is unavailable');return s}catch(error){throw Error(error?.message||'Browser storage is unavailable')}}
function readJSON(key){const raw=storage().getItem(key);if(raw===null)return {};let value;try{value=JSON.parse(raw)}catch{throw Error('Saved progress is not valid JSON; it was not changed')}if(!object(value))throw Error('Saved progress has an unexpected format; it was not changed');return value}
function writeJSON(key,value){storage().setItem(key,JSON.stringify(value))}
function fail(error){return error?.message||'Browser storage is unavailable'}
function readDeskRecord(){const raw=storage().getItem(DESK_KEY);if(raw===null)return {version:1,ids:[]};let value;try{value=JSON.parse(raw)}catch{throw Error('The reading desk has invalid saved data; it was not changed')}if(!object(value)||value.version!==1||!Array.isArray(value.ids)||value.ids.some(v=>!nonempty(v))||new Set(value.ids).size!==value.ids.length)throw Error('The reading desk has an unsupported format; it was not changed');return value}
/** Returns a fresh array in saved order; inspect getDeskStatus() for read errors. */
export function loadDesk(){try{const {ids}=readDeskRecord();deskError=null;return [...ids]}catch(error){deskError=fail(error);return []}}
/** Returns a recoverable status; rejected writes leave the previous record intact. */
export function saveDesk(ids){try{if(!Array.isArray(ids)||ids.some(id=>!nonempty(id)))throw Error('Reading desk items must have stable IDs');const previous=readDeskRecord();const unique=[...new Set(ids)];writeJSON(DESK_KEY,{...previous,version:1,ids:unique});deskError=null;return {ok:true}}catch(error){deskError=fail(error);return {ok:false,error:deskError}}}
export function getDeskStatus(){return {ok:deskError===null,error:deskError}}

function matchingSource(book){if(!object(book)||!object(book.source))return null;const s=book.source;if(!nonempty(s.title)||!nonempty(s.author)||book.title!==s.title.trim()||book.author!==s.author.trim())return null;return s}
/** A verified legacy key, or null where a record cannot safely be resolved. */
function mapping(book){const s=matchingSource(book);if(!s)return null;const collection=book.collection;
 if(collection==='world'){const code=book.group?.code;if(!nonempty(code)||!Number.isInteger(s.num)||s.num<1)return null;return {kind:'individual',key:`worldFiction:${code}:${s.num}:${s.title}:read`}}
 if(collection==='india'){if(!nonempty(s.id))return null;return {kind:'individual',key:`indiaNovel:${s.id}:read`}}
 if(collection==='nonfiction'){if(!nonempty(s.domain))return null;return {kind:'individual',key:`nfNovel:${s.domain}:${s.title}:read`}}
 if(['science','novellas','forgotten'].includes(collection))return {kind:'object',container:NEW_KEY,key:`${s.author}|${s.title}`.toLowerCase()};
 if(['contemporary','shortforms','authors'].includes(collection))return {kind:'object',container:EXPANDED_KEY,key:`${collection}|${s.title}|${s.author}`};
 return null;
}
function itemFor(state,key,book){if(!Object.hasOwn(state,key))return {};const value=state[key];if(!object(value))throw Error('The original progress record has an unexpected format; it was not changed');const s=book.source;if((value.title!==undefined&&value.title!==s.title)||(value.author!==undefined&&value.author!==s.author))throw Error('The original progress record matches a different title or author; it was not changed');return value}
function guideTasks(book){const s=matchingSource(book),guide=book?.guide||book?.authorGuide;if(!s||book.collection!=='authors'||s.title!==s.author||!object(guide)||guide.author!==s.author||!Array.isArray(guide.books)||!guide.books.length)return null;const ids=guide.books.map(t=>t?.id);if(ids.some(id=>!nonempty(id))||new Set(ids).size!==ids.length)return null;return guide.books}
function taskId(book,task){const tasks=guideTasks(book);const id=typeof task==='string'?task:task?.id;if(!tasks||!nonempty(id))return null;const match=tasks.filter(t=>t.id===id);if(match.length!==1)return null;if(object(task)&&task.title!==undefined&&task.title!==match[0].title)return null;return id}
const unsupported=error=>({supported:false,done:null,...(error?{error}: {})});
/** Return {supported,done}; authors' completion is derived from all checklist tasks. */
export function getProgress(book){const m=mapping(book);if(!m)return unsupported();try{
 if(m.kind==='individual'){const raw=storage().getItem(m.key);if(raw!==null&&raw!=='1')return unsupported('Original progress has an unknown value');return {supported:true,done:raw==='1'}}
 const state=readJSON(m.container),item=itemFor(state,m.key,book);
 if(book.collection==='authors'){const tasks=guideTasks(book);if(!tasks)return unsupported('Author checklist identity is not verified');if(item.books!==undefined&&!object(item.books))return unsupported('Author checklist has an unexpected format');return {supported:true,done:tasks.every(task=>item.books?.[task.id]===true)}}
 if(item.read!==undefined&&typeof item.read!=='boolean')return unsupported('Original read marker has an unexpected value');return {supported:true,done:item.read===true};
 }catch(error){return unsupported(fail(error))}}
/** A route is not bulk-marked: the original author view derives it from tasks. */
export function setProgress(book,done){const m=mapping(book);if(!m||typeof done!=='boolean'||book.collection==='authors')return {supported:false,ok:false};try{
 if(m.kind==='individual'){const s=storage(),raw=s.getItem(m.key);if(raw!==null&&raw!=='1')throw Error('Original progress has an unknown value; it was not changed');if(done)s.setItem(m.key,'1');else s.removeItem(m.key);return {supported:true,ok:true}}
 const state=readJSON(m.container),item=itemFor(state,m.key,book);if(item.read!==undefined&&typeof item.read!=='boolean')throw Error('Original read marker has an unexpected value; it was not changed');state[m.key]={...item,title:book.source.title,author:book.source.author,read:done};writeJSON(m.container,state);return {supported:true,ok:true};
 }catch(error){return {supported:false,ok:false,error:fail(error)}}}
export function getTaskProgress(book,task){const id=taskId(book,task),m=mapping(book);if(!id||!m||book.collection!=='authors')return unsupported();try{const state=readJSON(EXPANDED_KEY),item=itemFor(state,m.key,book);if(item.books!==undefined&&!object(item.books))return unsupported('Author checklist has an unexpected format');const value=item.books?.[id];if(value!==undefined&&typeof value!=='boolean')return unsupported('Author checklist marker has an unexpected value');return {supported:true,done:value===true}}catch(error){return unsupported(fail(error))}}
export function setTaskProgress(book,task,done){const id=taskId(book,task),m=mapping(book);if(!id||!m||book.collection!=='authors'||typeof done!=='boolean')return {supported:false,ok:false};try{const state=readJSON(EXPANDED_KEY),item=itemFor(state,m.key,book);if(item.books!==undefined&&!object(item.books))throw Error('Author checklist has an unexpected format; it was not changed');const value=item.books?.[id];if(value!==undefined&&typeof value!=='boolean')throw Error('Author checklist marker has an unexpected value; it was not changed');state[m.key]={...item,title:book.source.title,author:book.source.author,checklistVersion:1,books:{...item.books,[id]:done}};writeJSON(EXPANDED_KEY,state);return {supported:true,ok:true}}catch(error){return {supported:false,ok:false,error:fail(error)}}}
