import { loadCatalogue, resolveCover, getCoverInfo, COLLECTION_NAMES as names } from './catalogue.js';
import { buildAtlas, FLOORS, searchText } from './classification.js';
import { createLibraryWorld } from './world.js';
import { loadDesk, saveDesk, getDeskStatus, getProgress, setProgress, getTaskProgress, setTaskProgress } from './progress.js';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let atlas, world, currentFloor=0, currentCollection='world', currentGroup=null, overview=true;
let selectedBook=null, selectedAngle=0, resultLimit=40, desk=loadDesk(), detailGeneration=0, mapTimer, hashGuard=false;
const searchIndex=new Map();
function notify(text){$('#status').textContent=text;}
function address(b){const a=world?.getAddress?.(b.uid),slot=b.slot??0;return `${FLOORS[b.floor].number} · ${FLOORS[b.floor].name} / ${b.groupLabel} / Bay ${a?.bay??Math.floor(slot/24)+1} · Book ${slot%24+1}`;}
function setHash(params){const value=new URLSearchParams(params).toString();if(location.hash.slice(1)!==value)history.replaceState(null,'',`#${value}`);}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function openDialog(id){closeDialogs();if(!$(id).open)$(id).showModal();}
function hideDirectory(){if(matchMedia('(max-width:800px)').matches){document.body.classList.remove('directory-open');$('#directory-toggle').setAttribute('aria-expanded','false');}}
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
function enterFloor(index){if(!atlas)return;closeDialogs();syncFloor(index);world?.enterFloor(index);setHash({floor:index});hideDirectory();notify(`Entered ${FLOORS[index].name}. Choose a named section or walk through the galleries.`);}
function focusGroup(id){
 const g=atlas?.groupById.get(id);if(!g)return;closeDialogs();syncFloor(g.floor,id);world?.focusGroup(id);setHash({floor:g.floor,group:id});hideDirectory();
 $('#floor-description').textContent=g.intro||`${g.label} · ${g.books.length} entries`;notify(`${g.label}: ${g.books.length} entries in permanent shelf positions.`);
}
function buildingView(){if(!atlas)return;closeDialogs();overview=true;currentGroup=null;world?.overview();drawFloors();drawGroups();drawLocation();setHash({view:'building'});$('#route-status').textContent='';notify('Select a floor on the building or in the directory.');}
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
 drawProgress(b);$('#detail').showModal();world?.inspectBook?.(b.uid,0);setHash({floor:b.floor,book:b.uid});
 resolveCover(b,b.collection).then(id=>{if(!id||generation!==detailGeneration||!$('#detail').open)return;const img=new Image();img.alt=`${b.title} — matched edition cover`;img.onload=()=>{if(generation===detailGeneration&&$('#detail').open)$('#detail-cover').append(img);};img.onerror=()=>{if(generation===detailGeneration)$('#detail-extra').textContent+=' · Cover image unavailable';};img.src=`https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`;if(getCoverInfo(b,b.collection).status==='matched')$('#detail-extra').textContent+=' · Cover: Open Library; edition may vary.';}).catch(()=>{});
}
function travelBook(uid,routeOnly=false){const b=atlas.bookById.get(uid);if(!b)return;closeDialogs();if(!routeOnly||!world)syncFloor(b.floor,b.groupId);world?.focusBook(uid,{routeOnly});if(!routeOnly)setHash({floor:b.floor,group:b.groupId,book:uid});$('#route-status').textContent=routeOnly?`Route to ${b.title} · ${address(b)}`:`At the shelf: ${b.title}`;$('#cancel-route').hidden=false;hideDirectory();notify(routeOnly?`Follow the route to ${b.title}.${b.floor!==currentFloor?' Use the lift to floor '+FLOORS[b.floor].number+'.':''}`:`Found ${b.title}. Select its highlighted book to inspect it.`);}
function persistDesk(next){const r=saveDesk(next);if(!r.ok){notify(r.error||'Your browser could not save the reading desk.');return false;}desk=next;return true;}
function toggleDesk(uid){if(!atlas.bookById.has(uid))return;const saved=desk.includes(uid);if(!persistDesk(saved?desk.filter(x=>x!==uid):[...desk,uid]))return;notify(saved?'Removed from your reading desk.':'Added to your reading desk. Saved on this browser.');if(selectedBook?.uid===uid)$('#save-book').textContent=saved?'+ Add to reading desk':'Remove from reading desk';if($('#search-dialog').open)drawSearch(false);if($('#desk-dialog').open)drawDesk();}
function drawDesk(){
 const books=desk.map(uid=>atlas.bookById.get(uid)).filter(Boolean),unknown=desk.length-books.length,stored=getDeskStatus();
 $('#desk-status').textContent=`${books.length} entries · saved on this browser.${unknown?` ${unknown} saved entries are not in the current catalogue.`:''}${stored?.error?` ${stored.error}`:''}`;
 $('#desk-list').innerHTML=books.map((b,i)=>`<article class="desk-item"><span class="desk-number">${String(i+1).padStart(2,'0')}</span><button type="button" data-book="${esc(b.uid)}"><strong>${esc(b.title)}</strong><small>${esc(b.author)} · ${esc(b.groupLabel)}</small></button><div class="card-actions"><button type="button" data-travel="${esc(b.uid)}">Find shelf</button><button type="button" data-desk-move="${esc(b.uid)}" data-direction="-1" aria-label="Move ${esc(b.title)} earlier" ${i===0?'disabled':''}>↑</button><button type="button" data-desk-move="${esc(b.uid)}" data-direction="1" aria-label="Move ${esc(b.title)} later" ${i===books.length-1?'disabled':''}>↓</button><button type="button" data-save="${esc(b.uid)}" aria-label="Remove ${esc(b.title)}">×</button></div></article>`).join('')||'<p class="empty">Your next chapter starts here. Open any book and add it to your reading desk.</p>';
}
function drawMapDirectory(){const q=$('#map-query').value.trim().toLocaleLowerCase(),groups=atlas.groups.filter(g=>!q||`${g.label} ${g.gallery} ${names[g.collection]}`.toLocaleLowerCase().includes(q));$('#map-groups').innerHTML=FLOORS.map(f=>{const list=groups.filter(g=>g.floor===f.id);return list.length?`<section class="map-floor"><h3>${f.number} · ${esc(f.name)}</h3><div>${list.map(g=>`<button type="button" class="map-group" data-group="${esc(g.id)}"><strong>${esc(g.label)}</strong><small>${g.books.length} entries · ${esc(names[g.collection])}</small></button>`).join('')}</div></section>`:'';}).join('')||'<p class="empty">No sections match.</p>';}
function drawMinimap(){
 if(!atlas||!world)return;const map=world.getMap?.(currentFloor);if(!map?.groups?.length)return;
 const b=map.bounds||{},minX=b.minX??-50,maxX=b.maxX??50,minZ=b.minZ??-80,maxZ=b.maxZ??15,w=Math.max(1,maxX-minX),d=Math.max(1,maxZ-minZ),scale=Math.min(180/w,140/d),x=v=>10+(v-minX)*scale,z=v=>10+(v-minZ)*scale;
 $('#minimap').setAttribute('viewBox',`0 0 ${w*scale+20} ${d*scale+20}`);
 $('#minimap').innerHTML=`<rect x="2" y="2" width="${w*scale+16}" height="${d*scale+16}" rx="5" fill="#172a25" stroke="#b79b63"/>${map.groups.map(g=>`<g role="button" tabindex="0" data-group="${esc(g.id)}" aria-label="Go to ${esc(atlas.groupById.get(g.id)?.label)}"><title>${esc(atlas.groupById.get(g.id)?.label)}</title><circle cx="${x(g.x)}" cy="${z(g.z)}" r="${g.id===currentGroup?3.2:2.2}" fill="${g.id===currentGroup?'#ffe2a6':'#8b9e87'}"/></g>`).join('')}${map.player?`<circle cx="${x(map.player.x)}" cy="${z(map.player.z)}" r="3.2" fill="#fff" stroke="#c69d50" stroke-width="1.2"/>`:''}`;
}
function restoreHash(){if(!atlas||hashGuard)return;hashGuard=true;try{const p=new URLSearchParams(location.hash.slice(1));if(p.get('book')&&atlas.bookById.has(p.get('book'))){const b=atlas.bookById.get(p.get('book'));syncFloor(b.floor,b.groupId);world?.focusBook(b.uid);showBook(b);}else if(p.get('group')&&atlas.groupById.has(p.get('group')))focusGroup(p.get('group'));else if(p.has('floor')&&FLOORS[Number(p.get('floor'))])enterFloor(Number(p.get('floor')));else buildingView();}finally{hashGuard=false;}}

document.addEventListener('click',e=>{
 const b=e.target.closest('button,[data-group]');if(!b)return;if(b.hasAttribute('data-close')){b.closest('dialog')?.close();return;}if(!atlas)return;
 if(b.dataset.floor!==undefined)enterFloor(Number(b.dataset.floor));else if(b.dataset.group)focusGroup(b.dataset.group);else if(b.dataset.book)showBook(atlas.bookById.get(b.dataset.book));else if(b.dataset.travel)travelBook(b.dataset.travel);else if(b.dataset.save)toggleDesk(b.dataset.save);
 else if(b.dataset.deskMove){const next=[...desk],i=next.indexOf(b.dataset.deskMove),j=i+Number(b.dataset.direction);if(i>=0&&j>=0&&j<next.length){[next[i],next[j]]=[next[j],next[i]];if(persistDesk(next))drawDesk();}}
 else if(b.dataset.walk){if(overview)enterFloor(currentFloor);world?.walk(b.dataset.walk);}
});
$('#minimap').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.group){e.preventDefault();focusGroup(e.target.dataset.group);}});
$('#overview').addEventListener('click',buildingView);$('#enter').addEventListener('click',()=>enterFloor(currentFloor));
$('#collections').addEventListener('change',()=>{currentCollection=$('#collections').value;currentGroup=null;$('#group-query').value='';drawGroups();const g=atlas.groups.find(g=>g.collection===currentCollection);if(g)focusGroup(g.id);});
$('#group-query').addEventListener('input',drawGroups);$('#global-search').addEventListener('click',()=>openSearch());$('#browse').addEventListener('click',()=>openSearch(currentCollection,currentGroup||''));
$('#global-query').addEventListener('input',()=>drawSearch());$('#search-collection').addEventListener('change',()=>{updateSearchGroups();drawSearch();});['group','country','kind','period'].forEach(f=>$(`#search-${f}`).addEventListener('change',()=>drawSearch()));$('#search-more').addEventListener('click',()=>{resultLimit+=40;drawSearch(false);});
$('#map-open').addEventListener('click',()=>{if(!atlas)return;drawMapDirectory();openDialog('#map-dialog');$('#map-query').focus();});$('#map-query').addEventListener('input',drawMapDirectory);
$('#desk-open').addEventListener('click',()=>{if(!atlas)return;drawDesk();openDialog('#desk-dialog');});$('#lift-open').addEventListener('click',()=>openDialog('#lift-dialog'));$('#help-open').addEventListener('click',()=>openDialog('#help-dialog'));
$('#directory-toggle').addEventListener('click',()=>{const open=document.body.classList.toggle('directory-open');$('#directory-toggle').setAttribute('aria-expanded',String(open));});
$('#lighting').addEventListener('change',()=>world?.setLighting($('#lighting').value));$('#quality').addEventListener('change',()=>world?.setQuality($('#quality').value));
$('#save-book').addEventListener('click',()=>selectedBook&&toggleDesk(selectedBook.uid));$('#route-book').addEventListener('click',()=>selectedBook&&travelBook(selectedBook.uid,true));$('#travel-book').addEventListener('click',()=>selectedBook&&travelBook(selectedBook.uid));
$('#cancel-route').addEventListener('click',()=>{world?.clearRoute?.();world?.setHighlights([]);$('#route-status').textContent='';$('#cancel-route').hidden=true;});
for(const [id,delta]of[['#rotate-left',-.35],['#rotate-right',.35]])$(id).addEventListener('click',()=>{selectedAngle+=delta;world?.inspectBook?.(selectedBook?.uid,selectedAngle);$('#detail-cover').style.transform=`perspective(600px) rotateY(${Math.sin(selectedAngle)*28}deg)`;});
$('#read-book').addEventListener('change',()=>{if(!selectedBook)return;const r=setProgress(selectedBook,$('#read-book').checked);if(!r.ok)notify(r.error||'Open the original Atlas to update this entry.');drawProgress(selectedBook);});
$('#author-guide').addEventListener('change',e=>{if(e.target.dataset.task===undefined||!selectedBook)return;const task=(selectedBook.guide||selectedBook.authorGuide)?.books[Number(e.target.dataset.task)],r=setTaskProgress(selectedBook,task,e.target.checked);if(!r.ok){e.target.checked=getTaskProgress(selectedBook,task).done===true;notify(r.error||'Reading progress could not be saved.');}drawProgress(selectedBook);});
$('#detail').addEventListener('close',()=>{if($('#detail').open)return;detailGeneration++;world?.releaseBook?.();});
window.addEventListener('hashchange',restoreHash);window.addEventListener('storage',()=>{desk=loadDesk();if(atlas&&$('#desk-dialog').open)drawDesk();if(selectedBook&&$('#detail').open)drawProgress(selectedBook);});
window.addEventListener('pagehide',()=>{clearInterval(mapTimer);world?.dispose();});

async function start(){
 try{
  atlas=await buildAtlas(await loadCatalogue());atlas.books.forEach(b=>searchIndex.set(b.uid,`${searchText(b)} ${(b.guide?.books||[]).map(t=>t.title).join(' ')}`.toLocaleLowerCase()));
  if(atlas.report.classifiedTotal!==atlas.report.sourceTotal||atlas.report.duplicateUIDs.length||atlas.report.duplicateSlots?.length)throw Error('Catalogue integrity check failed. Please use the original Atlas.');
  drawFloors();drawCollections();drawGroups();prepareSearch();drawMapDirectory();drawLocation();
 }catch(error){$('#load').hidden=true;$('#failure').hidden=false;$('#failure').textContent=`Unable to open the catalogue. ${error.message}`;return;}
 try{
  world=await createLibraryWorld({canvas:$('#scene'),atlas,resolveCover,onBookSelect:showBook,onGroupSelect:focusGroup,
   onFloorChange:(index,options)=>{syncFloor(index);if(!options?.viaStairs&&!options?.guided)world?.enterFloor(index);setHash({floor:index});},
   onLocationChange:({floor,groupId})=>{if(floor!==currentFloor)syncFloor(floor,groupId);else if(groupId!==currentGroup){currentGroup=groupId||null;const g=atlas.groupById.get(groupId);if(g&&g.collection!==currentCollection){currentCollection=g.collection;drawCollections();}drawGroups();drawLocation();}},
   onOverview:()=>{overview=true;drawFloors();drawLocation();},onMapSelect:()=>{drawMapDirectory();openDialog('#map-dialog');},onDesk:()=>{drawDesk();openDialog('#desk-dialog');},onLift:()=>openDialog('#lift-dialog'),onHover:text=>{$('#hover-hint').textContent=text||'';}
  });mapTimer=setInterval(drawMinimap,500);
 }catch(error){console.error('3D renderer unavailable',error);$('#failure').hidden=false;$('#failure').textContent='The 3D view is unavailable. Every book remains accessible through the directory, search and reading desk.';document.body.classList.add('no-webgl');$('#quality').disabled=true;$('#lighting').disabled=true;}
 $('#load').hidden=true;restoreHash();notify(`${atlas.report.classifiedTotal.toLocaleString()} entries · ${atlas.groups.length} sections · all six floors ready.`);
}
start();
