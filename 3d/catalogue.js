/** Reading Atlas catalogue adapter: original embedded sources are the authority. */
export const COLLECTION_NAMES={world:'World fiction',india:'India in fiction',nonfiction:'Nonfiction',science:'Science fiction',novellas:'Short novels',forgotten:'Rediscovered',contemporary:'Contemporary 2000–2026',authors:'Author reading paths',shortforms:'Essays, poems & stories'};
export const EXPECTED_COUNTS={world:300,india:125,nonfiction:277,science:50,novellas:250,forgotten:100,contemporary:100,authors:50,shortforms:160};

/** Parse an embedded JSON literal without evaluating a script from the source page. */
export function extractJson(source,marker){let start=source.indexOf(marker);if(start<0)throw Error('Missing catalogue data: '+marker);start+=marker.length;while(/\s/.test(source[start]))start++;let depth=0,quoted=false,escape=false;for(let i=start;i<source.length;i++){const c=source[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false}else if(c==='"')quoted=true;else if(c==='{'||c==='[')depth++;else if(c==='}'||c===']'){if(--depth===0)return JSON.parse(source.slice(start,i+1));}}throw Error('Incomplete catalogue data: '+marker)}
const scriptData=(source,id)=>{const doc=new DOMParser().parseFromString(source,'text/html'),el=doc.getElementById(id);if(!el)throw Error('Missing data element: '+id);return JSON.parse(el.textContent)};
const clean=v=>typeof v==='string'?v.trim():v==null?'':String(v);
const keyText=v=>clean(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
function record(collection,raw,index,group=null,guide=null){const source={...raw};const title=clean(raw.title),author=clean(raw.author);return {id:clean(raw.id)||`${collection}:${index}`,collection,title,author,year:raw.year??raw.publication??raw.era??'',note:clean(raw.note||raw.why||raw.description||raw.detail||raw.bridge),entry:clean(raw.entry),group,guide,authorGuide:guide,source,originalHref:collection==='authors'&&guide?.id?`../index.html#authors/${encodeURIComponent(guide.id)}`:`../index.html#${collection}`}}
export async function loadCatalogue(sourceURL='../index.html'){
 const response=await fetch(sourceURL);if(!response.ok)throw Error(`Unable to load the original Atlas (${response.status})`);
 const html=await response.text(),embedded=scriptData(html,'embedded-documents');
 const world=extractJson(embedded.world,'const DATA='),india=extractJson(embedded.india,'const DATAI='),nonfiction=extractJson(embedded.nonfiction,'const ATLASN='),newData=extractJson(embedded.new,'const EMBEDDED=');
 const expanded=scriptData(embedded.expanded,'data'),guides=scriptData(embedded.expanded,'author-guides-data');
 const collections={};
 collections.world=world.flatMap(group=>group.books.map(b=>({raw:b,group:{code:group.code,country:group.country,group:group.group,intro:group.intro,source_page:group.source_page,extended:group.extended}}))).map((o,i)=>record('world',o.raw,i,o.group));
 collections.india=india.flatMap(group=>group.books.map(b=>({raw:b,group:{code:group.code,language:group.language,intro:group.intro}}))).map((o,i)=>record('india',o.raw,i,o.group));
 const domains=new Map(nonfiction.domains.map(x=>[x.code,x]));
 collections.nonfiction=nonfiction.books.map((b,i)=>record('nonfiction',b,i,domains.get(b.domain)||null));
 for(const k of ['science','novellas','forgotten']){const arr=newData['new-data.json']?.[k];if(!Array.isArray(arr))throw Error(`Missing collection ${k}`);collections[k]=arr.map((b,i)=>record(k,b,i));}
 const guideMap=new Map(guides.map(g=>[keyText(g.author),g]));
 for(const k of ['contemporary','authors','shortforms']){if(!Array.isArray(expanded[k]))throw Error(`Missing collection ${k}`);collections[k]=expanded[k].map((b,i)=>record(k,b,i,null,k==='authors'?guideMap.get(keyText(b.author||b.title))||null:null));}
 const counts=Object.fromEntries(Object.keys(EXPECTED_COUNTS).map(k=>[k,collections[k].length]));
 const mismatches=Object.entries(EXPECTED_COUNTS).filter(([k,n])=>counts[k]!==n).map(([k,n])=>`${k}: ${counts[k]} (expected ${n})`);
 const missingGuides=collections.authors.filter(b=>!b.guide).map(b=>b.title);
 return {collections,authorGuides:guides,counts,mismatches,missingGuides,sources:{expanded:expanded.sources||null,original:newData['sources.json']||null}};
}

// Covers are best-effort references to a real edition, not a claim about the first edition.
// Requests are deduplicated, rate-limited, and transient failures are not retained indefinitely.
const infoCache=new Map(),inflight=new Map(),queue=[];let running=0,lastStart=0;const MAX_ACTIVE=2,MIN_GAP_MS=300,MAX_QUEUE=24,RETRY_MS=30000,MISS_TTL=3600000;
function coverKey(b,k){return `${k||b.collection||''}|${keyText(b.title)}|${keyText(b.author)}`}
const info=(status,extra={})=>({status,source:'Open Library',...extra});
function schedule(fn){return new Promise(resolve=>{if(queue.length>=MAX_QUEUE){resolve(info('deferred',{reason:'Cover lookup queue is busy'}));return}queue.push({fn,resolve});pump()})}
function pump(){if(running>=MAX_ACTIVE||!queue.length)return;let delay=Math.max(0,MIN_GAP_MS-(Date.now()-lastStart));if(delay){setTimeout(pump,delay);return}const item=queue.shift();running++;lastStart=Date.now();Promise.resolve().then(item.fn).catch(()=>info('unavailable-temporary',{reason:'Lookup failed'})).then(item.resolve).finally(()=>{running--;pump()});pump()}
export function getCoverInfo(book,collection){const e=infoCache.get(coverKey(book,collection));return e&&e.expires>Date.now()?e.value:info('not-checked')}
async function lookup(book,collection){if(!book?.title||!book?.author)return info('unavailable',{reason:'Title or author is missing'});if(collection==='authors'||collection==='shortforms')return info('unavailable',{reason:'This entry is an author path or a short work; no edition has been identified'});
 try{const u=new URL('https://openlibrary.org/search.json');u.searchParams.set('title',book.title);u.searchParams.set('author',book.author);u.searchParams.set('fields','title,author_name,cover_i,key,edition_key');u.searchParams.set('limit','8');const response=await fetch(u,{signal:AbortSignal.timeout(8000)});if(!response.ok)return info('unavailable-temporary',{reason:`Open Library returned ${response.status}`});const body=await response.json();const docs=Array.isArray(body.docs)?body.docs:[];const title=keyText(book.title),author=keyText(book.author);const exact=docs.filter(x=>keyText(x.title)===title&&Array.isArray(x.author_name)&&x.author_name.some(a=>keyText(a)===author));const candidate=exact.find(x=>Number.isInteger(x.cover_i)&&x.cover_i>0);if(candidate)return info('matched',{coverId:candidate.cover_i,workKey:candidate.key||null,matchedTitle:candidate.title,matchedAuthors:candidate.author_name,editionNote:'Cover may represent a different edition or translation.'});if(exact.length)return info('unavailable',{reason:'Exact work match has no cover image'});if(docs.length)return info('uncertain',{reason:'No exact title and author match',candidates:docs.length});return info('unavailable',{reason:'No catalogue match found'});}catch{return info('unavailable-temporary',{reason:'Network error or timeout'})}}
export async function resolveCover(book,collection){const key=coverKey(book,collection),cached=infoCache.get(key);if(cached&&cached.expires>Date.now())return cached.value.coverId||null;if(inflight.has(key))return (await inflight.get(key)).coverId||null;const request=schedule(()=>lookup(book,collection)).then(result=>{let ttl=result.status==='matched'?24*3600000:(result.status==='unavailable-temporary'||result.status==='deferred'?RETRY_MS:MISS_TTL);infoCache.set(key,{value:result,expires:Date.now()+ttl});inflight.delete(key);return result});inflight.set(key,request);return (await request).coverId||null}
