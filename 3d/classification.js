/** Source-grounded shelf classification and persistent catalogue identity. */
export const FLOORS=[
 {id:0,number:'G',name:'The World & Indian Languages',sections:['world','india'],colors:[0x473b30,0x8b6b4c,0xc2ab7b]},
 {id:1,number:'01',name:'The House of Ideas',sections:['nonfiction'],colors:[0x33483d,0x688b71,0xbab69a]},
 {id:2,number:'02',name:'Other Worlds & Rediscoveries',sections:['science','forgotten'],colors:[0x263a4b,0x526f84,0xaaa798]},
 {id:3,number:'03',name:'The Rooms of Short Reading',sections:['novellas','shortforms'],colors:[0x5b3c35,0x9c7362,0xcdb6a2]},
 {id:4,number:'04',name:'The Contemporary Gallery',sections:['contemporary'],colors:[0x50442e,0x897852,0xcdb994]},
 {id:5,number:'05',name:'The Authors’ Observatory',sections:['authors'],colors:[0x413e52,0x716e8a,0xbeb0a4]}
];
const COLLECTION_FLOOR=Object.fromEntries(FLOORS.flatMap(f=>f.sections.map(s=>[s,f.id])));
const GALLERIES={MATH:'Mathematics & Computing',CPLX:'Mathematics & Computing',CS:'Mathematics & Computing',AI:'Mathematics & Computing',PHYS:'Nature & the Physical World',BIO:'Nature & the Physical World',EARTH:'Nature & the Physical World',PHIL:'Mind, Language & Philosophy',MIND:'Mind, Language & Philosophy',LANG:'Mind, Language & Philosophy',NOND:'Mind, Language & Philosophy',ANTH:'People, History & Power',IND:'People, History & Power',ECON:'People, History & Power',POL:'People, History & Power',HIST:'People, History & Power',GLOB:'People, History & Power',PROD:'Making, Art & Organisations',MEDIA:'Making, Art & Organisations',WRITE:'Making, Art & Organisations',MUSIC:'Making, Art & Organisations',ARCH:'Making, Art & Organisations'};
const PERIODS=[{id:'before-1900',label:'Before 1900',min:-Infinity,max:1899},{id:'1900-1945',label:'1900–1945',min:1900,max:1945},{id:'1946-1989',label:'1946–1989',min:1946,max:1989},{id:'1990-2009',label:'1990–2009',min:1990,max:2009},{id:'2010-onwards',label:'2010 onwards',min:2010,max:Infinity}];
const COLLECTION_LABELS={world:'World Fiction',india:'Indian Languages',nonfiction:'Nonfiction',science:'Science Fiction',forgotten:'Rediscovered',novellas:'Short Novels',shortforms:'Essays, Poems & Stories',contemporary:'Contemporary',authors:'Authors’ Observatory'};
const clean=v=>String(v??'').trim();
const slug=v=>clean(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'unclassified';
function yearOf(b){const x=b.source?.year??b.year;if(typeof x==='number'&&Number.isInteger(x))return x;if(typeof x==='string'&&/^\d{4}$/.test(x.trim()))return Number(x);return null}
function periodFor(book){const year=yearOf(book);return year===null?{id:'undated',label:'Undated or uncertain'}:PERIODS.find(x=>year>=x.min&&year<=x.max)||{id:'undated',label:'Undated or uncertain'}}
function classify(b){const k=b.collection,s=b.source||{},g=b.group||{};switch(k){
 case 'world':return {code:clean(g.code)||'unclassified',label:g.country||'Unclassified',gallery:'World Fiction',intro:g.intro||'',provenance:'source-country-section'};
 case 'india':return {code:clean(g.code)||'unclassified',label:g.language||'Unclassified language',gallery:'Indian Languages',intro:g.intro||'',provenance:'source-language-section'};
 case 'nonfiction':return {code:clean(s.domain||g.code)||'unclassified',label:g.name||'Unclassified subject',gallery:GALLERIES[s.domain||g.code]||'Other subjects',intro:g.intro||'',provenance:'source-subject'};
 case 'science':case 'forgotten':case 'novellas':{const period=periodFor(b);return {code:period.id,label:period.label,gallery:COLLECTION_LABELS[k],intro:'Grouped by the publication year recorded in the original catalogue.',provenance:period.id==='undated'?'missing-source-year':'derived-source-year'}}
 case 'shortforms':return {code:slug(s.kind),label:s.kind||'Unclassified form',gallery:'Essays, Poems & Stories',intro:'Organised by the form identified in the original catalogue.',provenance:s.kind?'source-form':'unclassified'};
 case 'contemporary':{let p=clean(s.period);return {code:p?slug(p):'unclassified',label:p||'Unclassified period',gallery:'Contemporary',intro:'Original reading-list period, with publication years shown on individual entries.',provenance:p?'source-period':'unclassified'}}
 case 'authors':{let era=clean(s.era);return {code:slug(era),label:era||'Unclassified era',gallery:'Authors’ Observatory',intro:'Author paths grouped by the eras used in the original Atlas.',provenance:era?'source-era':'unclassified'}}
 default:return {code:'unclassified',label:'Unclassified',gallery:COLLECTION_LABELS[k]||k,intro:'',provenance:'unclassified'};
}}
/** Stable source identity; title-derived keys cannot survive substantive changes without an explicit alias. */
export function sourceIdentity(b){const k=b.collection,s=b.source||{},g=b.group||{};if(k==='world'&&g.code&&s.num!=null)return `world:${slug(g.code)}:${s.num}`;if(k==='india'&&s.id)return `india:${slug(s.id)}`;if(k==='nonfiction'&&s.domain&&s.num!=null)return `nonfiction:${slug(s.domain)}:${s.num}`;if(k==='authors'&&(b.guide||b.authorGuide)?.id)return `authors:${slug((b.guide||b.authorGuide).id)}`;return `${slug(k)}:${slug(b.author)}:${slug(b.title)}`}
export function searchText(b){const source=b.source||{},group=b.group||{};return [b.title,b.author,b.year,b.note,b.entry,source.country,source.region,source.lang,source.genre,source.genres,source.kind,source.format,source.tag,source.award,source.era,source.period,group.country,group.name,group.language,b.groupLabel,b.gallery].flat(Infinity).filter(x=>typeof x==='string'||typeof x==='number').join(' ').toLocaleLowerCase()}
const DEFAULT_MANIFEST={version:1,entries:{},groups:{},aliases:{}};
async function loadManifest(){try{const r=await fetch('./catalogue-manifest.json');if(!r.ok)return null;return await r.json()}catch{return null}}
/** Classify all source entries; read the checked-in identity manifest unless supplied for tests. */
export async function buildAtlas(loaded,options={}){
 if(!loaded?.collections)throw Error('Catalogue collections are required');
 const manifest=options.manifest??await loadManifest()??DEFAULT_MANIFEST;
 const oldEntries=manifest.entries||{},aliases=manifest.aliases||{},oldGroups=manifest.groups||{};
 const groupsById=new Map(),bookById=new Map(),matchedManifestKeys=new Set(),seenSource=new Map();
 const report={sourceCounts:{},classifiedCounts:{},sourceTotal:0,classifiedTotal:0,groupCounts:{},duplicateSourceIdentities:[],duplicateUIDs:[],duplicateSlots:[],newIdentities:[],missingManifestEntries:[],movedClassifications:[],unclassified:[],missingGuides:[],guideTasks:0,expected:loaded.mismatches||[],warnings:[],manifestAvailable:manifest!==DEFAULT_MANIFEST};
 const proposed={version:1,entries:{...oldEntries},groups:{...oldGroups},aliases:{...aliases}};
 const nextSlot={},usedSlots=new Map();for(const e of Object.values(oldEntries)){if(e.groupId&&Number.isInteger(e.slot)&&e.slot>=0)nextSlot[e.groupId]=Math.max(nextSlot[e.groupId]||0,e.slot+1)}
 let groupSeq=Math.max(99999,...Object.values(oldGroups).map(g=>Number.isFinite(g.order)?g.order:0))+1,bookSeq=Math.max(99999,...Object.values(oldEntries).map(e=>Number.isFinite(e.order)?e.order:0))+1;const books=[];
 for(const floor of FLOORS){for(const collection of floor.sections){const raw=loaded.collections[collection];if(!Array.isArray(raw))throw Error('Missing collection: '+collection);report.sourceCounts[collection]=raw.length;report.sourceTotal+=raw.length;
  for(const b of raw){const c=classify(b),groupId=`${collection}:${slug(c.code)}`;let group=groupsById.get(groupId);if(!group){const saved=oldGroups[groupId]||{};group={id:groupId,floor:floor.id,collection,label:c.label,gallery:c.gallery,intro:c.intro,provenance:c.provenance,books:[],order:Number.isFinite(saved.order)?saved.order:groupSeq++};groupsById.set(groupId,group);if(!proposed.groups[groupId])proposed.groups[groupId]={order:group.order,label:group.label}}
   if(c.provenance==='unclassified'||c.provenance==='missing-source-year')report.unclassified.push({collection,title:b.title,reason:c.provenance});
   const key=sourceIdentity(b),prev=seenSource.get(key)||0;seenSource.set(key,prev+1);if(prev)report.duplicateSourceIdentities.push({key,title:b.title,occurrence:prev+1});
   const manifestKey=aliases[key]||key,existing=prev?null:oldEntries[manifestKey];if(existing){matchedManifestKeys.add(manifestKey);if(existing.groupId&&existing.groupId!==groupId)report.movedClassifications.push({uid:existing.uid,from:existing.groupId,to:groupId})}else report.newIdentities.push(key);
   let uid=existing?.uid||key;if(prev)uid=`${uid}:duplicate-${prev+1}`;
   if(bookById.has(uid)){report.duplicateUIDs.push({uid,key,title:b.title});let n=2;while(bookById.has(`${uid}:collision-${n}`))n++;uid=`${uid}:collision-${n}`}
   const rank=Number.isFinite(existing?.order)?existing.order:bookSeq++;let slot=existing?.groupId===groupId&&Number.isInteger(existing.slot)?existing.slot:(nextSlot[groupId]||0);let slotKey=`${groupId}:${slot}`;if(usedSlots.has(slotKey)){report.duplicateSlots.push({groupId,slot,identities:[usedSlots.get(slotKey),key]});slot=nextSlot[groupId]||0;while(usedSlots.has(`${groupId}:${slot}`))slot++;slotKey=`${groupId}:${slot}`;}usedSlots.set(slotKey,key);nextSlot[groupId]=Math.max(nextSlot[groupId]||0,slot+1);const out={...b,uid,groupId,floor:floor.id,groupLabel:group.label,gallery:group.gallery,sourceIdentity:key,order:rank,slot};books.push(out);group.books.push(out);bookById.set(uid,out);
   if(!existing&&!prev)proposed.entries[key]={uid,groupId,order:rank,slot,title:b.title,author:b.author};
   if(collection==='authors'){const guide=b.guide||b.authorGuide;if(!guide)report.missingGuides.push(b.title);else report.guideTasks+=(guide.books||[]).length}
  }
 }}
 report.missingManifestEntries=Object.keys(oldEntries).filter(k=>!matchedManifestKeys.has(k));
 const groups=[...groupsById.values()];groups.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));for(const g of groups){g.books.sort((a,b)=>a.order-b.order||a.uid.localeCompare(b.uid));report.groupCounts[g.collection]=(report.groupCounts[g.collection]||0)+1;report.classifiedCounts[g.collection]=(report.classifiedCounts[g.collection]||0)+g.books.length;report.classifiedTotal+=g.books.length}
 const groupById=new Map(groups.map(g=>[g.id,g]));if(report.duplicateSourceIdentities.length||report.duplicateUIDs.length||report.duplicateSlots.length)report.warnings.push('Duplicate source identities require manual review; entries were not merged.');if(report.missingManifestEntries.length)report.warnings.push('Some manifest records did not match the source; review corrections or add aliases.');if(report.movedClassifications.length)report.warnings.push('Source classification changed for existing records; review spatial address migration.');
 report.proposedManifest=proposed;return {floors:FLOORS,groups,books,bookById,groupById,report};
}
