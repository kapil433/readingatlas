import { loadCatalogue, resolveCover, getCoverInfo } from './catalogue.js';
import { createLibraryWorld } from './world.js';

const FLOORS=[
 {id:0,number:'G',name:'The World Library',tag:'GROUND FLOOR',sections:['world','india'],colors:[0x473b30,0x8b6b4c,0xc2ab7b]},
 {id:1,number:'01',name:'The Ideas Library',tag:'FIRST FLOOR',sections:['nonfiction'],colors:[0x33483d,0x688b71,0xbab69a]},
 {id:2,number:'02',name:'Worlds Beyond',tag:'SECOND FLOOR',sections:['science','forgotten'],colors:[0x263a4b,0x526f84,0xaaa798]},
 {id:3,number:'03',name:'The Short-Form Rooms',tag:'THIRD FLOOR',sections:['novellas','shortforms'],colors:[0x5b3c35,0x9c7362,0xcdb6a2]},
 {id:4,number:'04',name:'The Contemporary Gallery',tag:'FOURTH FLOOR',sections:['contemporary'],colors:[0x50442e,0x897852,0xcdb994]},
 {id:5,number:'05',name:'The Authors’ Gallery',tag:'FIFTH FLOOR',sections:['authors'],colors:[0x413e52,0x716e8a,0xbeb0a4]}
];
const names={world:'World fiction',india:'India in fiction',nonfiction:'Nonfiction',science:'Science fiction',forgotten:'Rediscovered',novellas:'Short novels',shortforms:'Essays, poems & stories',contemporary:'Contemporary 2000–2026',authors:'Author reading paths'};
const $=s=>document.querySelector(s),escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pageSize=12;let collections={},currentFloor=0,currentCollection='world',currentPage=0,results=[],isOverview=true,world=null,renderAvailable=false;
function textOf(record){const source=record.source||{};return [record.title,record.author,record.year,record.note,source.country,source.region,source.lang,source.genre,source.genres,source.group].flat().filter(Boolean).join(' ').toLocaleLowerCase()}
function getResults(key,query=''){const q=query.trim().toLocaleLowerCase();return(collections[key]||[]).filter(record=>!q||textOf(record).includes(q))}
function getShelfEntries(index,key){const active=index===currentFloor&&key===currentCollection;const list=active?results:getResults(key);const page=active?currentPage:0;return list.slice(page*pageSize,(page+1)*pageSize)}
function drawNav(){
 const focused=document.activeElement?.closest?.('[data-floor]')?.dataset.floor;
 $('#floors').innerHTML=FLOORS.map(f=>`<button class="floor" type="button" data-floor="${f.id}" aria-current="${!isOverview&&f.id===currentFloor}"><span class="floor-num">${f.number}</span><span><strong>${escapeHTML(f.name)}</strong><small>${f.sections.map(x=>escapeHTML(names[x])).join(' · ')}</small></span></button>`).join('');
 $('#floors').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>enterFloor(Number(b.dataset.floor))));
 if(focused!==undefined)$('#floors').querySelector(`[data-floor="${focused}"]`)?.focus();
}
function drawControls(){
 const f=FLOORS[currentFloor];const focused=document.activeElement?.closest?.('[data-key]')?.dataset.key;
 if(!isOverview){$('#floor-kicker').textContent='THE READING ATLAS · '+f.tag;$('#floor-title').textContent=f.name;$('#floor-description').textContent=f.sections.map(k=>names[k]).join(' · ');$('#mode-hint').textContent=f.tag+' / '+f.name.toUpperCase()}
 $('#sections').innerHTML=f.sections.map(k=>`<button class="section" type="button" data-key="${k}" aria-pressed="${k===currentCollection}">${escapeHTML(names[k])} · ${(collections[k]||[]).length}</button>`).join('');
 $('#sections').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectSection(b.dataset.key)));if(focused)$('#sections').querySelector(`[data-key="${focused}"]`)?.focus();
 results=getResults(currentCollection,$('#search').value);const max=Math.max(1,Math.ceil(results.length/pageSize));currentPage=Math.max(0,Math.min(currentPage,max-1));
 $('#result').textContent=`${results.length} entries · shelf ${currentPage+1} of ${max}`;$('#prev').disabled=currentPage===0;$('#next').disabled=currentPage>=max-1;world?.updateFloor(currentFloor);
}
function setFloor(i,keepSection=false){currentFloor=i;if(!keepSection||!FLOORS[i].sections.includes(currentCollection))currentCollection=FLOORS[i].sections[0];currentPage=0;$('#search').value='';isOverview=false;drawNav();drawControls()}
function enterFloor(i){setFloor(i);world?.enterFloor(i)}
function selectSection(key){if(!FLOORS[currentFloor].sections.includes(key))return;currentCollection=key;currentPage=0;$('#search').value='';if(isOverview){isOverview=false;world?.enterFloor(currentFloor);drawNav()}drawControls();world?.focusSection(key)}
function buildingView(){isOverview=true;drawNav();$('#floor-kicker').textContent='THE READING ATLAS · SIX FLOORS';$('#floor-title').innerHTML='A library to<br><em>explore.</em>';$('#floor-description').textContent='Choose a floor and step inside. Stories, ideas and other worlds are waiting.';$('#mode-hint').textContent='SIX-STOREY BUILDING';world?.overview()}
function showBook(b,key){
 if(!b)return;const dialog=$('#detail');if(dialog.open)dialog.close();
 $('#detail-meta').textContent=names[key]+(b.year?' · '+b.year:'');$('#detail-title').textContent=b.title;$('#detail-author').textContent=key==='authors'?'Author reading path':b.author;
 $('#detail-note').textContent=b.note||'Explore the complete entry in the original collection.';
 const source=b.source||{};const meta=[source.country,source.region,source.lang,source.genre,source.kind,source.format].filter(x=>typeof x==='string'&&x.trim());$('#detail-extra').textContent=meta.length?meta.join(' · '):'';
 const guide=b.guide||b.authorGuide;const tasks=guide?.books||[];$('#author-guide').innerHTML=key==='authors'&&tasks.length?`<h3>READING PATH · ${tasks.length} WORKS</h3><p>${escapeHTML(source.entry?'Begin with: '+source.entry:'')}</p><ul>${tasks.map(t=>`<li>${escapeHTML(t.title)}${t.stage==='optional'?' (optional)':''}${t.focus?' — '+escapeHTML(t.focus):''}</li>`).join('')}</ul>`:'';
 $('#original-link').href='../index.html#'+key;$('#original-link').textContent=key==='authors'?'Open original author guides & checklists ↗':'Open original collection & reading tools ↗';
 $('#detail-cover').innerHTML=`<span>${escapeHTML(b.title)}</span><small>${escapeHTML(b.author)}</small>`;dialog.showModal();
 resolveCover(b,key).then(id=>{if(!id||!dialog.open||$('#detail-title').textContent!==b.title)return;const img=document.createElement('img');img.alt='';img.src=`https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`;img.onerror=()=>img.remove();$('#detail-cover').append(img);const info=getCoverInfo(b,key);if(info&&info.status==='matched')$('#detail-extra').textContent=($('#detail-extra').textContent?$('#detail-extra').textContent+' · ':'')+'Cover: Open Library; edition may vary';}).catch(()=>{});
}
function showList(){const list=results.slice(currentPage*pageSize,(currentPage+1)*pageSize);$('#list-title').textContent=names[currentCollection]+' · shelf '+(currentPage+1);$('#list-grid').innerHTML=list.length?list.map((b,i)=>`<button type="button" data-index="${i}">${escapeHTML(b.title)}<small>${escapeHTML(b.author)}${b.year?' · '+escapeHTML(b.year):''}</small></button>`).join(''):'No books match this search.';$('#list-grid').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('#list').close();showBook(list[Number(b.dataset.index)],currentCollection)}));$('#list').showModal()}
function globalSearch(){const q=$('#global-query').value.trim().toLocaleLowerCase();if(!q){$('#search-status').textContent='Enter a title or author.';$('#search-results').innerHTML='';return}const matches=[];for(const key of Object.keys(names)){const records=collections[key]||[];records.forEach((b,i)=>{if(textOf(b).includes(q))matches.push({book:b,key,index:i})})}const limit=80;$('#search-status').textContent=`${matches.length} matching entries${matches.length>limit?' · showing the first '+limit:''}. Select one to travel to its floor.`;$('#search-results').innerHTML=matches.slice(0,limit).map((m,i)=>`<button type="button" data-result="${i}">${escapeHTML(m.book.title)}<small>${escapeHTML(m.book.author)} · ${escapeHTML(names[m.key])}</small></button>`).join('');$('#search-results').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const match=matches[Number(b.dataset.result)],index=FLOORS.findIndex(f=>f.sections.includes(match.key));$('#search-dialog').close();setFloor(index);currentCollection=match.key;currentPage=Math.floor(match.index/pageSize);results=getResults(match.key);drawControls();world?.enterFloor(index);world?.focusSection(match.key);showBook(match.book,match.key)}))}
$('#overview').addEventListener('click',buildingView);$('#enter').addEventListener('click',()=>enterFloor(currentFloor));$('#global-search').addEventListener('click',()=>{$('#search-dialog').showModal();$('#global-query').focus()});$('#global-query').addEventListener('input',globalSearch);
$('#search').addEventListener('input',()=>{currentPage=0;if(isOverview){isOverview=false;world?.enterFloor(currentFloor);drawNav()}drawControls()});
$('#prev').addEventListener('click',()=>{currentPage--;drawControls()});$('#next').addEventListener('click',()=>{currentPage++;drawControls()});$('#browse').addEventListener('click',showList);
document.querySelectorAll('dialog .close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));document.querySelectorAll('[data-walk]').forEach(b=>b.addEventListener('click',()=>{if(isOverview)enterFloor(currentFloor);world?.walk(b.dataset.walk)}));
new ResizeObserver(entries=>{const height=entries[0]?.contentRect?.height;if(height)document.querySelector('.viewport').style.setProperty('--panel-height',`${Math.ceil(height+30)}px`)}).observe(document.querySelector('.panel'));
(async()=>{
 drawNav();
 try{const loaded=await loadCatalogue();collections=loaded.collections;drawControls()}catch(error){console.error('Catalogue error',error);$('#load').hidden=true;$('#failure').hidden=false;$('#failure').innerHTML='The catalogue could not load. <a href="../index.html">Open the original Reading Atlas</a>.';return}
 try{world=await createLibraryWorld({canvas:$('#scene'),floors:FLOORS,names,getShelfEntries,resolveCover,onBookSelect:(b,key)=>showBook(b,key),onFloorChange:(i,options)=>{if(options?.viaStairs)setFloor(i);else enterFloor(i)},onSectionSelect:key=>selectSection(key)});renderAvailable=true;for(let i=0;i<FLOORS.length;i++)world.updateFloor(i);buildingView()}
 catch(error){console.error('3D library unavailable',error);$('#failure').hidden=false;$('#failure').innerHTML='The 3D view is unavailable in this browser. Use the section controls and accessible book list, or <a href="../index.html">open the original Atlas</a>.';$('.controls-touch').hidden=true;$('#overview').disabled=true;$('#enter').disabled=true;isOverview=false;drawNav();drawControls()}
 $('#load').hidden=true;
})();
