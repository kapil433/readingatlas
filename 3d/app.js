import { buildJourneys } from './journeys.js';
import { loadMemory, saveNote, saveJourney, clearNotes, exportReaderMemory } from './reader-memory.js';
import { loadCatalogue, resolveCover, getCoverInfo, COLLECTION_NAMES as names } from './catalogue.js';
import { buildAtlas, FLOORS, searchText } from './classification.js';
import { createLibraryWorld } from './world.js';
import { createAtlasMap } from './atlas-map.js';
import { loadDesk, saveDesk, getDeskStatus, getProgress, setProgress, getTaskProgress, setTaskProgress } from './progress.js';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let atlas, world, currentFloor=0, currentCollection='world', currentGroup=null, overview=true;
let selectedBook=null, selectedAngle=0, resultLimit=40, desk=loadDesk(), detailGeneration=0, mapTimer, hashGuard=false, pendingRoute=null, globe=null;
const searchIndex=new Map();
const mobileFloors=document.createElement('nav');mobileFloors.className='mobile-floor-labels';mobileFloors.setAttribute('aria-label','Six floors in the building');mobileFloors.innerHTML=[...FLOORS].reverse().map(f=>`<button type="button" data-floor="${f.id}"><span>${f.number}</span>${esc(f.name)}</button>`).join('');$('.viewport').append(mobileFloors);
function notify(text){$('#status').textContent=text;}
function address(b){const a=world?.getAddress?.(b.uid),slot=b.slot??0;return `${FLOORS[b.floor].number} · ${FLOORS[b.floor].name} / ${b.groupLabel} / Bay ${a?.bay??Math.floor(slot/24)+1} · Book ${slot%24+1}`;}
function setHash(params){const value=new URLSearchParams(params).toString();if(location.hash.slice(1)!==value)history.replaceState(null,'',`#${value}`);}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function openDialog(id){closeDialogs();if(!$(id).open)$(id).showModal();}
function hideDirectory(){if(matchMedia('(max-width:850px)').matches){document.body.classList.remove('directory-open');$('#directory-toggle').setAttribute('aria-expanded','false');}}
function floorCount(id){return atlas?.books.filter(b=>b.floor===id).length||0;}
function drawFloors(){
 $('#floors').innerHTML=FLOORS.map(f=>`<button type="button" class="floor" data-floor="${f.id}" aria-current="${!overview&&f.id===currentFloor}"><span class="floor-num">${f.number}</span><span><strong>${esc(f.name)}</strong><small>${floorCount(f.id)} entries · ${f.sections.map(k=>esc(names[k])).join(' / ')}</small></span></button>`).join('');
 $('#lift-floors').innerHTML=[...FLOORS].reverse().map(f=>`<button class="lift-floor" type="button" data-floor="${f.id}"><span>${f.number}</span><strong>${esc(f.name)}</strong><small>${floorCount(f.id)} entries</small></button>`).join('');
}
function drawCollections(){const select=$('#collections');select.innerHTML=FLOORS[currentFloor].sections.map(k=>`<option value="${k}">${esc(names[k])} · ${atlas.report.sourceCounts[k]}</option>`).join('');select.value=currentCollection;}
function drawGroups(){
 if(!atlas)return;const q=$('#group-query').value.trim().toLocaleLowerCase();let gallery='';
 const groups=atlas.groups.filter(g=>g.collection===currentCollection&&(!q||`${g.label} ${g.gallery} ${g.intro}`.toLocaleLowerCase().includes(q)));
 $('#groups').innerHTML=groups.map(g=>{const heading=gallery===g.gallery?'':`<div class="gallery-label">${esc(g.gallery)}</div>`;gallery=g.gallery;return `${heading}<button type="button" class="group" data-group="${esc(g.id)}" aria-pressed="${currentGroup===g.id}"><span><strong>${esc(g.label)}</strong><small>${esc(g.collection==='nonfiction'?'Subject gallery':g.collection==='world'?'Country / region':g.collection==='india'?'Language gallery':'Reading section')}</small></span><span class="group-count">${g.books.length}</span></button>`;}).join('')||'<p class="empty">No sections match this name.</p>';
 $('#collection-summary').textContent=`${atlas.report.sourceCounts[currentCollection]} entries · ${atlas.groups.filter(g=>g.collection===currentCollection).length} permanent sections`;
}
function drawLocation(){
 const f=FLOORS[currentFloor],g=atlas.groupById.get(currentGroup);
 $('#floor-title').textContent=overview?'A world of books. A place for each one.':f.name;
 $('#floor-description').textContent=overview?`Six floors. ${atlas.groups.length} classified sections. Explore countries, ideas and reading journeys.`:g?`${g.label} · ${g.books.length} entries`:f.sections.map(k=>names[k]).join(' · ');
 $('#breadcrumb').textContent=overview?'THE READING ATLAS / BUILDING OVERVIEW':`${f.number} · ${f.name}${g?` / ${g.gallery} / ${g.label}`:' / Atrium'}`;
 document.body.classList.toggle('is-overview',overview);
}
function syncFloor(index,groupId=null){
 if(!FLOORS[index])return;currentFloor=index;currentGroup=groupId;overview=false;
 currentCollection=atlas.groupById.get(groupId)?.collection||(FLOORS[index].sections.includes(currentCollection)?currentCollection:FLOORS[index].sections[0]);
 $('#group-query').value='';drawFloors();drawCollections();drawGroups();drawLocation();drawMinimap();
}
function resumeRoute(){if(!pendingRoute||!world)return;const b=atlas.bookById.get(pendingRoute);if(!b)return;const ok=world.focusBook(b.uid,{routeOnly:true});$('#route-status').textContent=ok?`${b.floor===currentFloor?'Follow the path to':'Take the lift to floor '+FLOORS[b.floor].number+' for'} ${b.title}`:'A walking route could not be found. Use Visit shelf from the book details.';}
function enterFloor(index){if(!atlas)return;closeDialogs();syncFloor(index);world?.enterFloor(index);setHash({floor:index});hideDirectory();notify(`Entered ${FLOORS[index].name}. Choose a named section or walk through the galleries.`);resumeRoute();}
function focusGroup(id){
 const g=atlas?.groupById.get(id);if(!g)return;closeDialogs();pendingRoute=null;world?.clearRoute?.();syncFloor(g.floor,id);world?.focusGroup(id);setHash({floor:g.floor,group:id});hideDirectory();
 $('#groups').querySelector('[aria-pressed="true"]')?.scrollIntoView({block:'nearest'});
 $('#floor-description').textContent=g.intro||`${g.label} · ${g.books.length} entries`;notify(`${g.label}: ${g.books.length} entries in permanent shelf positions.`);
}
function buildingView(){if(!atlas)return;closeDialogs();pendingRoute=null;world?.clearRoute?.();overview=true;currentGroup=null;world?.overview();drawFloors();drawGroups();drawLocation();setHash({view:'building'});$('#route-status').textContent='';notify('Select a floor on the building or in the directory.');}
function fieldValues(b,field){const s=b.source||{},g=b.group||{};return(field==='country'?[g.country,s.country,s.region]:field==='kind'?[s.kind,s.genre,s.genres,s.tag]:[s.period,s.era,b.year]).flat().filter(Boolean).map(String);}
function prepareSearch(){
 $('#search-collection').innerHTML='<option value="">All collections</option>'+Object.entries(names).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('');
 for(const [field,label] of [['country','All countries / associations'],['kind','All forms / genres / tags'],['period','All years / periods']]){
  const values=[...new Set(atlas.books.flatMap(b=>fieldValues(b,field)))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  $(`#search-${field}`).innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
 }updateSearchGroups();
}
function updateSearchGroups(){const k=$('#search-collection').value;$('#search-group').innerHTML='<option value="">All sections</option>'+atlas.groups.filter(g=>!k||g.collection===k).map(g=>`<option value="${esc(g.id)}">${esc(g.label)} · ${esc(names[g.collection])}</option>`).join('');}
function searchMatches(){
 const words=$('#global-query').value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean),collection=$('#search-collection').value,group=$('#search-group').value;
 return atlas.books.filter(b=>(!collection||b.collection===collection)&&(!group||b.groupId===group)&&words.every(w=>searchIndex.get(b.uid).includes(w))&&['country','kind','period'].every(f=>!$(`#search-${f}`).value||fieldValues(b,f).includes($(`#search-${f}`).value)));
}
function bookCard(b){return `<article class="result-card"><button type="button" data-book="${esc(b.uid)}"><strong>${esc(b.title)}</strong><span>${esc(b.author||'Author reading path')}</span><small>${esc(b.year)} · ${esc(b.groupLabel)}</small></button><div class="card-actions"><button type="button" data-travel="${esc(b.uid)}">Find on shelf ↗</button><button type="button" data-save="${esc(b.uid)}" aria-label="${desk.includes(b.uid)?'Remove':'Save'} ${esc(b.title)}">${desk.includes(b.uid)?'Saved ✓':'+ Desk'}</button></div></article>`;}
function drawSearch(reset=true){
 if(reset)resultLimit=40;const matches=searchMatches();$('#search-status').textContent=`${matches.length} matching entries · showing ${Math.min(resultLimit,matches.length)}. Every result has a permanent shelf address.`;
 $('#search-results').innerHTML=matches.slice(0,resultLimit).map(bookCard).join('')||'<p class="empty">No matches. Try fewer filters or a different title, author, subject or tag.</p>';
 $('#search-more').hidden=resultLimit>=matches.length;$('#search-more').textContent=`Show ${Math.min(40,Math.max(0,matches.length-resultLimit))} more`;
 world?.setHighlights(matches.length<atlas.books.length?matches.map(b=>b.uid):[]);
}
function openSearch(collection='',group=''){if(!atlas)return;$('#global-query').value='';$('#search-collection').value=collection;updateSearchGroups();$('#search-group').value=group;['country','kind','period'].forEach(f=>{$(`#search-${f}`).value='';});drawSearch();openDialog('#search-dialog');$('#global-query').focus();}
function related(b){
 const tags=fieldValues(b,'kind');return atlas.books.filter(x=>x.uid!==b.uid).map(x=>{
  if(b.author&&x.author===b.author)return{book:x,score:3,reason:'Same author'};
  if(x.groupId===b.groupId)return{book:x,score:2,reason:`Same section: ${b.groupLabel}`};
  const tag=fieldValues(x,'kind').find(t=>tags.includes(t));return tag?{book:x,score:1,reason:`Shared catalogue tag: ${tag}`}:null;
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.book.order-b.book.order).slice(0,4);
}
function drawProgress(b){const p=getProgress(b),input=$('#read-book');input.checked=p.done===true;input.disabled=!p.supported||b.collection==='authors';input.title=p.supported?'Reading progress shared with the original Atlas on this browser.':p.error||'Use the original Atlas for this entry’s reading tools.';}
function showBook(b){
 if(!b)return;closeDialogs();selectedBook=b;selectedAngle=0;const generation=++detailGeneration,s=b.source||{},guide=b.guide||b.authorGuide;
 $('#detail-title').textContent=b.title;$('#detail-author').textContent=b.collection==='authors'?'Author reading path':b.author;$('#detail-meta').textContent=`${names[b.collection]}${b.year?` · ${b.year}`:''}`;
 $('#detail-address').textContent=address(b);$('#detail-note').textContent=b.note||'Explore this entry and its reading tools in the original Atlas.';
 $('#detail-extra').textContent=[...new Set([b.groupLabel,...fieldValues(b,'country'),...fieldValues(b,'kind'),s.award].filter(Boolean))].join(' · ');
 $('#detail-cover').innerHTML=`<span>${esc(b.title)}</span><small>${esc(b.author)}</small>`;$('#detail-cover').style.transform='';
 $('#save-book').textContent=desk.includes(b.uid)?'Remove from reading desk':'+ Add to reading desk';$('#original-link').href=b.originalHref||`../index.html#${b.collection}`;
 $('#author-guide').innerHTML=guide?`<h3>Your reading journey · ${(guide.books||[]).length} works</h3>${guide.approach?`<p>${esc(guide.approach)}</p>`:''}${guide.context?`<p>${esc(guide.context)}</p>`:''}${s.entry?`<p>Begin with: ${esc(s.entry)}</p>`:''}<ol>${(guide.books||[]).map((task,i)=>{const p=getTaskProgress(b,task);return `<li><label><input type="checkbox" data-task="${i}" ${p.done?'checked':''} ${p.supported?'':'disabled'}><span><strong>${esc(task.title)}</strong><small>${esc(task.stage||'')}${task.focus?` · ${esc(task.focus)}`:''}</small></span></label></li>`;}).join('')}</ol>`:'';
 $('#related-books').innerHTML=`<h3>Continue exploring</h3>${related(b).map(x=>`<button type="button" data-book="${esc(x.book.uid)}"><strong>${esc(x.book.title)}</strong><small>${esc(x.reason)}</small></button>`).join('')}`;
 drawProgress(b);showNote(b);bookOpen=false;$('#open-book').textContent='Open book';$('#open-book').setAttribute('aria-pressed','false');$('#detail').showModal();world?.inspectBook?.(b.uid,0);setHash({floor:b.floor,book:b.uid});
 resolveCover(b,b.collection).then(id=>{if(!id||generation!==detailGeneration||!$('#detail').open)return;const img=new Image();img.alt=`${b.title} — matched edition cover`;img.onload=()=>{if(generation===detailGeneration&&$('#detail').open)$('#detail-cover').append(img);};img.onerror=()=>{if(generation===detailGeneration)$('#detail-extra').textContent+=' · Cover image unavailable';};img.src=`https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`;if(getCoverInfo(b,b.collection).status==='matched')$('#detail-extra').textContent+=' · Cover: Open Library; edition may vary.';}).catch(()=>{});
}
function travelBook(uid,routeOnly=false){
 const b=atlas.bookById.get(uid);if(!b)return;
 if(!world){openSearch(b.collection,b.groupId);notify('The 3D view is unavailable. Browse the full section in this catalogue.');return;}
 closeDialogs();pendingRoute=routeOnly?uid:null;if(!routeOnly)syncFloor(b.floor,b.groupId);
 const ok=world.focusBook(uid,{routeOnly});
 if(!ok){pendingRoute=null;$('#route-status').textContent='A walking route could not be found. Use Visit shelf from the book details.';notify('Route unavailable. The book remains accessible in search.');return;}
 if(!routeOnly)setHash({floor:b.floor,group:b.groupId,book:uid});
 $('#route-status').textContent=routeOnly?`Route to ${b.title} · ${address(b)}`:`At the shelf: ${b.title}`;$('#cancel-route').hidden=false;hideDirectory();notify(routeOnly?`Follow the route to ${b.title}.${b.floor!==currentFloor?' Use the lift to floor '+FLOORS[b.floor].number+'.':''}`:`Found ${b.title}. Select its highlighted book to inspect it.`);
}
function persistDesk(next){const r=saveDesk(next);if(!r.ok){notify(r.error||'Your browser could not save the reading desk.');return false;}desk=next;return true;}
function toggleDesk(uid){if(!atlas.bookById.has(uid))return;const saved=desk.includes(uid);if(!persistDesk(saved?desk.filter(x=>x!==uid):[...desk,uid]))return;notify(saved?'Removed from your reading desk.':'Added to your reading desk. Saved on this browser.');if(selectedBook?.uid===uid)$('#save-book').textContent=saved?'+ Add to reading desk':'Remove from reading desk';if($('#search-dialog').open)drawSearch(false);if($('#desk-dialog').open)drawDesk();}
function drawDesk(){
 const memory=loadMemory();$('#desk-memory').textContent=memory.error||`${Object.keys(memory.notes).length} private notes saved in this browser. Export a copy to keep them.`;
 const books=desk.map(uid=>atlas.bookById.get(uid)).filter(Boolean),unknown=desk.length-books.length,stored=getDeskStatus();
 $('#desk-status').textContent=`${books.length} entries · saved on this browser.${unknown?` ${unknown} saved entries are not in the current catalogue.`:''}${stored?.error?` ${stored.error}`:''}`;
 $('#desk-list').innerHTML=books.map((b,i)=>`<article class="desk-item"><span class="desk-number">${String(i+1).padStart(2,'0')}</span><button type="button" data-book="${esc(b.uid)}"><strong>${esc(b.title)}</strong><small>${esc(b.author)} · ${esc(b.groupLabel)}</small></button><div class="card-actions"><button type="button" data-travel="${esc(b.uid)}">Find shelf</button><button type="button" data-desk-move="${esc(b.uid)}" data-direction="-1" aria-label="Move ${esc(b.title)} earlier" ${i===0?'disabled':''}>↑</button><button type="button" data-desk-move="${esc(b.uid)}" data-direction="1" aria-label="Move ${esc(b.title)} later" ${i===books.length-1?'disabled':''}>↓</button><button type="button" data-save="${esc(b.uid)}" aria-label="Remove ${esc(b.title)}">×</button></div></article>`).join('')||'<p class="empty">Your next chapter starts here. Open any book and add it to your reading desk.</p>';
}
function drawMapDirectory(){const q=$('#map-query').value.trim().toLocaleLowerCase(),groups=atlas.groups.filter(g=>!q||`${g.label} ${g.gallery} ${names[g.collection]}`.toLocaleLowerCase().includes(q));$('#map-groups').innerHTML=FLOORS.map(f=>{const list=groups.filter(g=>g.floor===f.id);return list.length?`<section class="map-floor"><h3>${f.number} · ${esc(f.name)}</h3><div>${list.map(g=>`<button type="button" class="map-group" data-group="${esc(g.id)}"><strong>${esc(g.label)}</strong><small>${g.books.length} entries · ${esc(names[g.collection])}</small></button>`).join('')}</div></section>`:'';}).join('')||'<p class="empty">No sections match.</p>';}
async function openMap(){
 if(!atlas)return;drawMapDirectory();openDialog('#map-dialog');
 try{if(!globe)globe=await createAtlasMap({canvas:$('#atlas-globe'),groups:atlas.groups.filter(g=>g.collection==='world'),onSelectGroup:g=>focusGroup(typeof g==='string'?g:g.id),onHover:text=>{$('#globe-label').textContent=text||'Drag to rotate · choose a country marker';}});if($('#map-dialog').open){globe.show?.();globe.resize?.();}else globe.hide?.();}
 catch{$('#globe-label').textContent='Use the complete country and section directory below.';}
}
function drawMinimap(){
 if(!atlas||!world)return;const map=world.getMap?.(currentFloor);if(!map?.groups?.length)return;
 const b=map.bounds||{},minX=b.minX??-50,maxX=b.maxX??50,minZ=b.minZ??-80,maxZ=b.maxZ??15,w=Math.max(1,maxX-minX),d=Math.max(1,maxZ-minZ),scale=Math.min(180/w,140/d),x=v=>10+(v-minX)*scale,z=v=>10+(v-minZ)*scale;
 const mapKey=`${currentFloor}|${currentGroup||''}`;
 if($('#minimap').dataset.mapKey===mapKey){const player=$('#minimap [data-player]');if(player&&map.player){player.setAttribute('cx',x(map.player.x));player.setAttribute('cy',z(map.player.z));}return;}
 $('#minimap').dataset.mapKey=mapKey;
 $('#minimap').setAttribute('viewBox',`0 0 ${w*scale+20} ${d*scale+20}`);
 $('#minimap').innerHTML=`<rect x="2" y="2" width="${w*scale+16}" height="${d*scale+16}" rx="5" fill="#172a25" stroke="#b79b63"/>${map.groups.map(g=>`<g role="button" tabindex="0" data-group="${esc(g.id)}" aria-label="Go to ${esc(atlas.groupById.get(g.id)?.label)}"><title>${esc(atlas.groupById.get(g.id)?.label)}</title><circle cx="${x(g.x)}" cy="${z(g.z)}" r="${g.id===currentGroup?3.2:2.2}" fill="${g.id===currentGroup?'#ffe2a6':'#8b9e87'}"/></g>`).join('')}${map.player?`<circle data-player cx="${x(map.player.x)}" cy="${z(map.player.z)}" r="3.2" fill="#fff" stroke="#c69d50" stroke-width="1.2"/>`:''}`;
}
function restoreHash(){if(!atlas||hashGuard)return;hashGuard=true;try{const p=new URLSearchParams(location.hash.slice(1));if(p.get('book')&&atlas.bookById.has(p.get('book'))){const b=atlas.bookById.get(p.get('book'));syncFloor(b.floor,b.groupId);world?.focusBook(b.uid);showBook(b);}else if(p.get('group')&&atlas.groupById.has(p.get('group')))focusGroup(p.get('group'));else if(p.has('floor')&&FLOORS[Number(p.get('floor'))])enterFloor(Number(p.get('floor')));else buildingView();}finally{hashGuard=false;}}

document.addEventListener('click',e=>{
 const b=e.target.closest('button,[data-group]');if(!b)return;if(b.hasAttribute('data-close')){b.closest('dialog')?.close();return;}if(!atlas)return;
 if(b.dataset.floor!==undefined)enterFloor(Number(b.dataset.floor));else if(b.dataset.group)focusGroup(b.dataset.group);else if(b.dataset.book)showBook(atlas.bookById.get(b.dataset.book));else if(b.dataset.travel)travelBook(b.dataset.travel);else if(b.dataset.save)toggleDesk(b.dataset.save);
 else if(b.dataset.deskMove){const next=[...desk],known=next.filter(uid=>atlas.bookById.has(uid)),i=known.indexOf(b.dataset.deskMove),j=i+Number(b.dataset.direction);if(i>=0&&j>=0&&j<known.length){const a=next.indexOf(known[i]),c=next.indexOf(known[j]);[next[a],next[c]]=[next[c],next[a]];if(persistDesk(next))drawDesk();}}
 else if(b.dataset.walk){if(overview)enterFloor(currentFloor);world?.walk(b.dataset.walk);}
});
$('#minimap').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.group){e.preventDefault();focusGroup(e.target.dataset.group);}});
$('#overview').addEventListener('click',buildingView);$('#enter').addEventListener('click',()=>enterFloor(currentFloor));
$('#collections').addEventListener('change',()=>{currentCollection=$('#collections').value;currentGroup=null;$('#group-query').value='';drawGroups();const g=atlas.groups.find(g=>g.collection===currentCollection);if(g)focusGroup(g.id);});
$('#group-query').addEventListener('input',drawGroups);$('#global-search').addEventListener('click',()=>openSearch());$('#browse').addEventListener('click',()=>openSearch(currentCollection,currentGroup||''));
$('#global-query').addEventListener('input',()=>drawSearch());$('#search-collection').addEventListener('change',()=>{updateSearchGroups();drawSearch();});['group','country','kind','period'].forEach(f=>$(`#search-${f}`).addEventListener('change',()=>drawSearch()));$('#search-more').addEventListener('click',()=>{resultLimit+=40;drawSearch(false);});
$('#map-open').addEventListener('click',openMap);$('#map-query').addEventListener('input',drawMapDirectory);$('#map-dialog').addEventListener('close',()=>{if(!$('#map-dialog').open)globe?.hide?.();});
$('#section-info').addEventListener('click',()=>{const g=atlas?.groupById.get(currentGroup);$('#section-title').textContent=g?g.label:FLOORS[currentFloor].name;$('#section-intro').textContent=g?(g.intro||`${g.books.length} entries in ${names[g.collection]}. Each book has a permanent shelf position.`):`Choose one of the named sections in this floor’s directory to explore its collection. ${FLOORS[currentFloor].sections.map(k=>names[k]).join(' · ')}`;openDialog('#section-dialog');});
$('#section-browse').addEventListener('click',()=>openSearch(currentCollection,currentGroup||''));
$('#desk-open').addEventListener('click',()=>{if(!atlas)return;drawDesk();openDialog('#desk-dialog');});$('#lift-open').addEventListener('click',()=>openDialog('#lift-dialog'));$('#help-open').addEventListener('click',()=>openDialog('#help-dialog'));
$('#directory-toggle').addEventListener('click',()=>{const open=document.body.classList.toggle('directory-open');$('#directory-toggle').setAttribute('aria-expanded',String(open));});
$('#lighting').addEventListener('change',()=>world?.setLighting($('#lighting').value));$('#quality').addEventListener('change',()=>world?.setQuality($('#quality').value));
$('#save-book').addEventListener('click',()=>selectedBook&&toggleDesk(selectedBook.uid));$('#route-book').addEventListener('click',()=>selectedBook&&travelBook(selectedBook.uid,true));$('#travel-book').addEventListener('click',()=>selectedBook&&travelBook(selectedBook.uid));
$('#cancel-route').addEventListener('click',()=>{pendingRoute=null;world?.clearRoute?.();world?.setHighlights([]);$('#route-status').textContent='';$('#cancel-route').hidden=true;});
for(const [id,delta]of[['#rotate-left',-.35],['#rotate-right',.35]])$(id).addEventListener('click',()=>{selectedAngle+=delta;world?.inspectBook?.(selectedBook?.uid,selectedAngle);$('#detail-cover').style.transform=`perspective(600px) rotateY(${Math.sin(selectedAngle)*28}deg)`;});
$('#read-book').addEventListener('change',()=>{if(!selectedBook)return;const r=setProgress(selectedBook,$('#read-book').checked);if(!r.ok)notify(r.error||'Open the original Atlas to update this entry.');drawProgress(selectedBook);});
$('#author-guide').addEventListener('change',e=>{if(e.target.dataset.task===undefined||!selectedBook)return;const task=(selectedBook.guide||selectedBook.authorGuide)?.books[Number(e.target.dataset.task)],r=setTaskProgress(selectedBook,task,e.target.checked);if(!r.ok){e.target.checked=getTaskProgress(selectedBook,task).done===true;notify(r.error||'Reading progress could not be saved.');}drawProgress(selectedBook);});
$('#detail').addEventListener('close',()=>{if($('#detail').open)return;detailGeneration++;world?.releaseBook?.();});
window.addEventListener('hashchange',restoreHash);window.addEventListener('storage',()=>{desk=loadDesk();if(atlas&&$('#desk-dialog').open)drawDesk();if(selectedBook&&$('#detail').open)drawProgress(selectedBook);});
window.addEventListener('pagehide',e=>{if(e.persisted)return;clearInterval(mapTimer);world?.dispose();globe?.dispose();});

// Curated human-scale discovery, backed by the unchanged catalogue.
let journeys=[],activeJourney=null,bookOpen=false,notesDeleteArmed=false;
function openLibrarian(){if(!atlas)return;openDialog('#librarian-dialog');}
function openJourneys(){if(!atlas)return;drawJourneys();openDialog('#journeys-dialog');}
function drawJourneys(){
 $('#journey-list').innerHTML=journeys.map(j=>`<button class="journey-card" data-journey="${esc(j.id)}"><span class="journey-kicker">A READING JOURNEY · ${j.stops.length} STOPS</span><strong>${esc(j.title)}</strong><p>${esc(j.description)}</p><span>Explore this journey ↗</span></button>`).join('')||'<p>These journeys are being revised. All books remain available in the catalogue.</p>';
}
function showJourney(id){const j=journeys.find(x=>x.id===id);if(!j)return;
 $('#journey-detail').innerHTML=`<div class="journey-kicker">CURATED FROM YOUR ATLAS</div><h3>${esc(j.title)}</h3><p>${esc(j.description)}</p><ol class="journey-stops">${j.stops.map((s,i)=>{const b=atlas.bookById.get(s.uid);return `<li><button data-book="${esc(s.uid)}"><strong>${esc(b.title)}</strong><small>${esc(b.author)} · ${esc(b.groupLabel)}</small></button><p>${esc(s.reason)}</p></li>`;}).join('')}</ol><button class="button primary" data-start-journey="${esc(j.id)}">Begin this journey ↗</button>`;
 $('#journey-detail').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
}
function drawJourneyProgress(){const j=journeys.find(x=>x.id===activeJourney?.id);$('#journey-progress').hidden=!j;document.body.classList.toggle('on-journey',!!j);if(!j)return;
 const i=Math.min(Math.max(0,activeJourney.index),j.stops.length-1),b=atlas.bookById.get(j.stops[i].uid);activeJourney.index=i;
 $('#journey-status').textContent=`${j.title} · ${i+1} / ${j.stops.length} · ${b.title}`;$('#journey-next').textContent=i===j.stops.length-1?'Finish journey ✓':'Next stop →';
}
function visitJourneyStop(){const j=journeys.find(x=>x.id===activeJourney?.id);if(!j)return;const s=j.stops[activeJourney.index];travelBook(s.uid);drawJourneyProgress();notify(s.reason);}
function beginJourney(id){const j=journeys.find(x=>x.id===id);if(!j)return;const r=saveJourney({id,index:0});activeJourney={id,index:0};visitJourneyStop();if(!r.ok)notify(r.error+' This journey remains available until you leave.');}
function finishJourney(){const r=saveJourney(null);activeJourney=null;drawJourneyProgress();notify(r.ok?'Journey finished. Your saved books and notes remain at your reading desk.':r.error);}
function showNote(b){const memory=loadMemory();$('#reading-note').value=memory.notes[b.uid]||'';$('#note-status').textContent=memory.error|| (memory.notes[b.uid]?'Your private note · saved in this browser.':'A thought, a question, a reason to return. Notes stay in this browser.');}
function persistNote(){if(!selectedBook)return;const r=saveNote(selectedBook.uid,$('#reading-note').value);$('#note-status').textContent=r.ok?'Saved in this browser. Export your reading desk to keep a copy.':r.error;}
async function openCredits(){openDialog('#credits-dialog');try{const r=await fetch('./asset-manifest.json');if(!r.ok)throw Error();const m=await r.json();$('#asset-credits').innerHTML=(m.assets||[]).map(a=>{const source=typeof a.source==='string'&&/^https:\/\//.test(a.source)?a.source:null;return `<article><strong>${esc(a.name||a.id)}</strong><p>${esc(a.creator||'')} · ${esc(a.license||'See source')}</p>${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">View original asset ↗</a>`:''}${a.modifications?`<p>${esc(a.modifications)}</p>`:''}</article>`;}).join('')+'<p>Library architecture and editorial journeys: Reading Atlas. Covers: Open Library, where verified. Visitor figures are fictional.</p>';}catch{$('#asset-credits').textContent='Asset credits could not load. See 3d/asset-manifest.json in the Reading Atlas repository.';}}
$('#ask-librarian').addEventListener('click',openLibrarian);$('#open-journeys').addEventListener('click',openJourneys);$('#open-credits').addEventListener('click',openCredits);
$('#journey-resume').addEventListener('click',visitJourneyStop);
$('#journey-next').addEventListener('click',()=>{const j=journeys.find(x=>x.id===activeJourney?.id);if(!j)return;if(activeJourney.index+1>=j.stops.length){finishJourney();return;}activeJourney={...activeJourney,index:activeJourney.index+1};const r=saveJourney(activeJourney);visitJourneyStop();if(!r.ok)notify(r.error);});
$('#journey-stop').addEventListener('click',()=>{const r=saveJourney(null);activeJourney=null;drawJourneyProgress();notify(r.ok?'Journey closed. Your reading desk is unchanged.':r.error);});
$('#reading-note').addEventListener('input',()=>{$('#note-status').textContent='Unsaved note — choose Save note before leaving this book.';});$('#save-note').addEventListener('click',persistNote);
$('#open-book').addEventListener('click',()=>{bookOpen=!bookOpen;world?.setBookOpen?.(bookOpen);$('#open-book').textContent=bookOpen?'Close book':'Open book';$('#open-book').setAttribute('aria-pressed',String(bookOpen));});
$('#atmosphere-motion').addEventListener('change',()=>world?.setAtmosphereMotion?.($('#atmosphere-motion').checked));
$('#export-desk').addEventListener('click',()=>{const memory=loadMemory();if(memory.error){$('#desk-memory').textContent=memory.error+' Export stopped to avoid an incomplete backup.';return;}const url=URL.createObjectURL(new Blob([JSON.stringify({...JSON.parse(exportReaderMemory(desk)),books:desk.map(uid=>atlas.bookById.get(uid)).filter(Boolean).map(b=>({uid:b.uid,title:b.title,author:b.author,section:b.groupLabel}))},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='reading-atlas-desk.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#desk-memory').textContent='Exported your saved book IDs, private notes and journey position. Original Atlas reading completion is managed separately.';});
$('#clear-notes').addEventListener('click',()=>{if(!notesDeleteArmed){notesDeleteArmed=true;$('#clear-notes').textContent='Confirm: delete all private notes';$('#desk-memory').textContent='Export first if you want a copy. Click again to delete private notes only.';return;}const r=clearNotes();notesDeleteArmed=false;$('#clear-notes').textContent='Delete private notes';$('#desk-memory').textContent=r.ok?'Private notes deleted. Saved books and reading completion are unchanged.':r.error;});
$('#desk-dialog').addEventListener('close',()=>{notesDeleteArmed=false;$('#clear-notes').textContent='Delete private notes';});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!atlas)return;if(b.dataset.journey)showJourney(b.dataset.journey);else if(b.dataset.startJourney)beginJourney(b.dataset.startJourney);else if(b.dataset.concierge){const choice=b.dataset.concierge;if(choice==='place')openMap();else if(choice==='idea')openJourneys();else if(choice==='short')openSearch('shortforms');else if(choice==='surprise'){const pool=atlas.books.filter(x=>x.collection!=='authors'&&!desk.includes(x.uid)),book=pool[Math.floor(Math.random()*pool.length)]||atlas.books[0];showBook(book);notify('An unexpected shelf from your existing catalogue.');}}});

async function start(){
 try{
  atlas=await buildAtlas(await loadCatalogue());atlas.books.forEach(b=>searchIndex.set(b.uid,`${searchText(b)} ${(b.guide?.books||[]).map(t=>t.title).join(' ')}`.toLocaleLowerCase()));
  if(atlas.report.classifiedTotal!==atlas.report.sourceTotal||atlas.report.duplicateUIDs.length||atlas.report.duplicateSlots?.length)throw Error('Catalogue integrity check failed. Please use the original Atlas.');
  drawFloors();drawCollections();drawGroups();prepareSearch();drawMapDirectory();drawLocation();try{journeys=buildJourneys(atlas)}catch(e){console.warn('Curated journeys unavailable',e);journeys=[];}const saved=loadMemory().journey;activeJourney=saved&&journeys.some(j=>j.id===saved.id)?saved:null;drawJourneyProgress();
 }catch(error){$('#load').hidden=true;$('#failure').hidden=false;$('#failure').innerHTML=`Unable to open the catalogue. ${esc(error.message)} <a href="../index.html">Open the original Atlas ↗</a>`;return;}
 try{
  world=await createLibraryWorld({canvas:$('#scene'),atlas,resolveCover,onBookSelect:showBook,onGroupSelect:focusGroup,
   onFloorChange:(index,options)=>{syncFloor(index);if(!options?.viaStairs&&!options?.guided)world?.enterFloor(index);setHash({floor:index});if(pendingRoute)queueMicrotask(resumeRoute);},
   onLocationChange:({floor,groupId})=>{if(floor!==currentFloor)syncFloor(floor,groupId);else if(groupId!==currentGroup){currentGroup=groupId||null;const g=atlas.groupById.get(groupId);if(g&&g.collection!==currentCollection){currentCollection=g.collection;drawCollections();}drawGroups();drawLocation();}},
   onLibrarian:openLibrarian,onJourney:openJourneys,
   onOverview:()=>{overview=true;drawFloors();drawLocation();},onMapSelect:openMap,onDesk:()=>{drawDesk();openDialog('#desk-dialog');},onLift:()=>openDialog('#lift-dialog'),onHover:text=>{$('#hover-hint').textContent=text||'';}
  });$('#atmosphere-motion').checked=!matchMedia('(prefers-reduced-motion:reduce)').matches;world.setAtmosphereMotion?.($('#atmosphere-motion').checked);mapTimer=setInterval(drawMinimap,500);
 }catch(error){console.error('3D renderer unavailable',error);$('#failure').hidden=false;$('#failure').textContent='The 3D view is unavailable. Every book remains accessible through the directory, search and reading desk.';document.body.classList.add('no-webgl');$('#quality').disabled=true;$('#lighting').disabled=true;}
 $('#load').hidden=true;restoreHash();notify(`${atlas.report.classifiedTotal.toLocaleString()} entries · ${atlas.groups.length} sections · all six floors ready.`);
}
start();
