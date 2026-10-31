// Reading Atlas spatial world: persisted groups and book slots are never paged in place.
import { findRoute } from './routes.js';
import { createScenery } from './scenery.js';
export async function createLibraryWorld({canvas,atlas,resolveCover,onBookSelect,onGroupSelect,onFloorChange,onLocationChange,onOverview,onMapSelect,onDesk,onLift,onHover,onLibrarian,onJourney}) {
 const T=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(66,1,.1,450);scene.background=new T.Color(0x202b29);scene.fog=new T.Fog(0x202b29,95,280);scene.add(camera);
 const hemi=new T.HemisphereLight(0xffedcf,0x596557,2.25),ambient=new T.AmbientLight(0xffe2be,.62),sun=new T.DirectionalLight(0xffe0af,1.7);sun.position.set(20,80,45);scene.add(hemi,ambient,sun);
 const H=7.6,ROWS=8,BAYS=4,SLOTS=24,ROWSTEP=12,LANEGAP=16;const floors=atlas.floors,rooms=[],scenery=[],address=new Map(),locByGroup=new Map(),laneAssignments=[];let sceneBounds=null;
 for(const g of atlas.groups)for(const b of g.books)if(Number.isInteger(b.slot)&&(b.slot<0||b.slot>=96))throw Error(`Group ${g.id} requires a layout capacity migration for slot ${b.slot}`);
 const allGroups=atlas.groups.slice().sort((a,b)=>(a.order??0)-(b.order??0)||a.id.localeCompare(b.id));
 // Checked-in coordinates reserve old bays even if a source group disappears.
 const layoutResponse=await fetch(new URL('./layout-manifest.json',import.meta.url));
 if(!layoutResponse.ok)throw Error('The permanent library layout manifest could not be loaded.');
 const layoutManifest=await layoutResponse.json();if(layoutManifest.version!==1||layoutManifest.capacityPerGroup!==96)throw Error('Unsupported permanent library layout manifest.');
 const savedLocations=layoutManifest.groups||{}, actualGroups=new Map(allGroups.map(g=>[g.id,g]));
 const layoutDiagnostics={unplacedGroups:[],missingGroups:[],changedGroups:[]};
 const locations=new Map();
 function laneX(i){return i===0?0:(i%2?Math.ceil(i/2)*LANEGAP:-Math.ceil(i/2)*LANEGAP)}
 for(const floor of floors){
  const laneByX=new Map();
  for(const [id,loc] of Object.entries(savedLocations)){
   if(Number(loc.floor)!==Number(floor.id))continue;
   if(!Number.isInteger(loc.row)||loc.row<0||loc.row>=ROWS||!Number.isFinite(loc.laneX)||!Number.isFinite(loc.baseZ))throw Error(`Invalid permanent shelf location for ${id}`);
   if(!laneByX.has(loc.laneX))laneByX.set(loc.laneX,{x:loc.laneX,gallery:loc.gallery,part:loc.part||1,groups:[]});
   const lane=laneByX.get(loc.laneX);if(lane.gallery!==loc.gallery)throw Error(`Conflicting gallery locations at ${id}`);
   const g=actualGroups.get(id);if(!g){layoutDiagnostics.missingGroups.push(id);continue}
   if(Number(g.floor)!==Number(loc.floor)||g.gallery!==loc.gallery)layoutDiagnostics.changedGroups.push(id);
   lane.groups.push(g);locations.set(id,loc);
  }
  const fresh=allGroups.filter(g=>Number(g.floor)===Number(floor.id)&&!savedLocations[g.id]);
  if(fresh.length){
   let next=0;while(laneByX.has(laneX(next)))next++;
   for(let offset=0;offset<fresh.length;offset+=ROWS){while(laneByX.has(laneX(next)))next++;const batch=fresh.slice(offset,offset+ROWS),x=laneX(next++),lane={x,gallery:'New sections · review layout',part:1,groups:batch};laneByX.set(x,lane);
    batch.forEach((g,row)=>{locations.set(g.id,{floor:floor.id,laneX:x,row,baseZ:-12-row*ROWSTEP,gallery:lane.gallery,part:1});layoutDiagnostics.unplacedGroups.push(g.id)})
   }
  }
  laneAssignments.push([...laneByX.values()].sort((a,b)=>a.x-b.x));
 }
 if(layoutDiagnostics.changedGroups.length)throw Error('Existing classifications changed: review the permanent shelf layout before opening.');
 if(layoutDiagnostics.unplacedGroups.length||layoutDiagnostics.missingGroups.length)console.warn('Library layout needs review',layoutDiagnostics);
 const xs=laneAssignments.flatMap(a=>a.map(x=>x.x));const maxAbs=Math.max(20,...xs.map(Math.abs));const bounds={x1:-maxAbs-11,x2:maxAbs+11,z1:-116,z2:13,minX:-maxAbs-11,maxX:maxAbs+11,minZ:-116,maxZ:13};sceneBounds=bounds;
 const material=(c,rough=1)=>new T.MeshStandardMaterial({color:c,roughness:rough}),stone=material(0xa79980),wood=material(0x654931),dark=material(0x3f3025),brass=material(0xc7a86b,.45),paper=material(0xebdabc),glass=new T.MeshStandardMaterial({color:0x9dbac0,transparent:true,opacity:.32,roughness:.2,side:T.DoubleSide}),ceiling=material(0xcbbba2);
 const lampMat=new T.MeshStandardMaterial({color:0xffe1b1,emissive:0xe0a25c,emissiveIntensity:.45});
 function box(parent,w,h,d,x,y,z,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m}
 function textureLabel(title,subtitle='',bg='#2f4739',aspect=4){
  // Match canvas dimensions to the actual sign proportions: text is never stretched vertically.
  const c=document.createElement('canvas');c.height=112;c.width=Math.max(48,Math.min(2048,Math.round(c.height*aspect)));
  const ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#d4bc88';ctx.lineWidth=2;ctx.strokeRect(4,4,w-8,h-8);ctx.textAlign='center';
  function fit(text,size,weight,color,y){ctx.fillStyle=color;ctx.font=`${weight} ${size}px sans-serif`;const measured=ctx.measureText(String(text)).width;if(measured>w*.92){size=Math.max(8,Math.floor(size*w*.92/measured));ctx.font=`${weight} ${size}px sans-serif`}ctx.fillText(String(text),w/2,y)}
  fit(title,Math.round(h*.45),'600','#f9efd9',h*.53);if(subtitle)fit(String(subtitle).toUpperCase(),Math.round(h*.16),'500','#d9c89f',h*.79);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
 }
 function sign(parent,title,sub,x,y,z,w,h,action,rotation=0){const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:textureLabel(title,sub,undefined,w/h),side:T.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=rotation;if(action)mesh.userData.action=action;parent.add(mesh);return mesh}
 function fallback(book){return textureLabel(book.title||'Untitled',book.author||'Reading Atlas','#584b3c',.76/1.08)}
 const floorTitleMeshes=[];
 // A single continuous multi-storey shell with the facade open in overview.
 const width=bounds.x2-bounds.x1,depth=bounds.z2-bounds.z1,centerZ=(bounds.z1+bounds.z2)/2;
 box(scene,width+2,1,depth+2,0,-.65,centerZ,stone);box(scene,width+2,.7,depth+2,0,H*floors.length+.35,centerZ,stone);
 for(let i=0;i<floors.length;i++){
  const floor=floors[i],room=new T.Group();room.position.y=i*H;scene.add(room);const wall=material(floor.colors?.[1]??0x726e5e),accent=material(floor.colors?.[0]??0x554c3a);
  const blockers=[],pick=[],bookSpecs=[],coverSpecs=[],spineSpecs=[],groups=[],shelfBacks=[],shelfBoards=[],lanes=laneAssignments[i];
  // Large floor plates include a continuous open stairwell on the lobby's right.
  function plate(y,thick,mat){const xL=bounds.x1,xR=bounds.x2,zB=bounds.z1,zF=bounds.z2;box(room,8.2-xL,thick,depth,(xL+8.2)/2,y,centerZ,mat);box(room,xR-10.7,thick,depth,(xR+10.7)/2,y,centerZ,mat);box(room,2.5,thick,(-2-zB),9.45,y,(zB-2)/2,mat);box(room,2.5,thick,(zF-5.7),9.45,y,(zF+5.7)/2,mat)}
  if(i===0)box(room,width,.35,depth,0,0,centerZ,stone);else plate(0,.35,stone);if(i===floors.length-1)box(room,width,.24,depth,0,7.28,centerZ,ceiling);else plate(7.28,.24,ceiling);
  box(room,width,7,.35,0,3.6,bounds.z1,wall);box(room,.35,7,depth,bounds.x1,3.6,centerZ,wall);box(room,.35,7,depth,bounds.x2,3.6,centerZ,wall);
  for(let x=bounds.x1+8;x<bounds.x2;x+=16){box(room,.35,7,.35,x,3.55,12,stone);box(room,.35,.16,depth,x,7.02,centerZ,dark)}
  const facade=sign(scene,`${floor.number} · ${floor.name}`,'SELECT FLOOR',0,i*H+5.65,13.3,22,1.25,()=>onFloorChange?.(i));floorTitleMeshes.push(facade);
  // Billboard overview nameplates remain readable at the scale of the full building.
  const billboard=new T.Sprite(new T.SpriteMaterial({map:textureLabel(`${floor.number} · ${floor.name}`,'SELECT FLOOR',undefined,52/5.5),depthTest:false}));billboard.position.set(-maxAbs*.46,i*H+5.65,17);billboard.scale.set(52,5.5,1);billboard.renderOrder=1000;billboard.userData.action=()=>onFloorChange?.(i);scene.add(billboard);floorTitleMeshes.push(billboard);
  const landing=sign(room,`${floor.number} · ${floor.name}`,'ATRIUM  ·  FLOOR DIRECTORY',0,5.55,-1.1,11,1.05,null);pick.push(landing);
  for(const x of [-4,4])for(const z of [-4,5]){box(room,.08,.45,.08,x,6.8,z,brass);box(room,1,.12,.8,x,6.55,z,lampMat)}
  // Lift doors and physical staircase. Lift UI is accessible from the lobby and the 3D door.
  box(room,2.5,4.4,.55,-7.4,2.32,-.15,dark);box(room,2.15,3.9,.1,-7.4,2.1,.18,glass);const liftSign=sign(room,'GLASS LIFT','CHOOSE A FLOOR',-7.4,4.9,.25,2.7,.65,()=>onLift?.());pick.push(liftSign);const liftPad=box(room,2.1,3.9,.05,-7.4,2.1,.25,glass);liftPad.userData.action=()=>onLift?.();pick.push(liftPad);blockers.push({x1:-8.8,x2:-6,z1:-.6,z2:.2});
  for(let n=0;n<20;n++){const y=(n+1)*H/20;box(room,2,.23,.38,9.45,y,5.15-n*.36,accent)}for(let n=0;n<10;n++){const y=(n*2+1)*H/20;box(room,.09,.7,.09,8.35,y+.5,5.15-n*.72,brass);box(room,.09,.7,.09,10.55,y+.5,5.15-n*.72,brass)}
  const stairs=sign(room,i<floors.length-1?'STAIRS UP':'STAIRS DOWN','WALK OR SELECT',9.45,4,-.6,2.65,.7,()=>onFloorChange?.(i<floors.length-1?i+1:i-1));pick.push(stairs);
  // The reading desk and globe are functional stations, not decorative controls.
  box(room,3.2,.23,1.5,-2.6,1.1,6,wood);for(const x of [-3.9,-1.3])for(const z of [5.5,6.5])box(room,.14,1,.14,x,.55,z,dark);
  const deskSign=sign(room,'READING DESK','YOUR STACK',-2.6,1.9,5.26,2.6,.48,()=>onDesk?.());pick.push(deskSign);blockers.push({x1:-4.4,x2:-.8,z1:5.05,z2:6.95});
  const globe=new T.Mesh(new T.SphereGeometry(.9,24,16),new T.MeshStandardMaterial({color:floor.colors?.[1]??0x789087,roughness:.6,metalness:.15}));globe.position.set(3.1,2,5.4);globe.userData.action=()=>onMapSelect?.();room.add(globe);pick.push(globe);box(room,.18,1.0,.18,3.1,.9,5.4,brass);const globeSign=sign(room,'ATLAS TABLE','OPEN THE MAP',3.1,3.45,5.4,2.5,.52,()=>onMapSelect?.());pick.push(globeSign);blockers.push({x1:1.8,x2:4.4,z1:4.2,z2:6.6});
  // Landmarks differ by floor but serve as wayfinding: orrery, reading stand, gallery plinth and author desk.
  if(i===2){const ring=new T.Mesh(new T.TorusGeometry(1.2,.04,8,40),brass);ring.rotation.x=.9;ring.position.set(0,4,8.3);room.add(ring)}
  if(i===3){box(room,2,.18,.8,5,1.3,8,wood);box(room,.14,1.2,.14,5,.65,8,wood)}
  if(i===4)box(room,2,.9,1.4,5,.6,8,stone);
  if(i===5)sign(room,'AUTHORS’ OBSERVATORY','PATHS THROUGH A LIFETIME OF READING',0,6.4,9.2,8,.8,null);
  for(const lane of lanes){const portal=sign(room,lane.gallery,`GALLERY ${lane.part} · CONTINUE AHEAD`,lane.x,5.9,-3.8,12,1.05,()=>onGroupSelect?.(lane.groups[0]?.id));pick.push(portal);for(const dx of [-6,6])box(room,.26,5.3,.3,lane.x+dx,2.7,-3.9,dark);box(room,12.2,.24,.32,lane.x,5.35,-3.9,dark);
   lane.groups.forEach(g=>{
    const baseZ=locations.get(g.id).baseZ;const center={x:lane.x,z:baseZ};groups.push({id:g.id,x:center.x,z:center.z});locByGroup.set(g.id,{floor:i,x:center.x,z:center.z,laneX:lane.x,group:g});
    for(let bay=0;bay<BAYS;bay++){
     const side=bay%2===0?-1:1,bayRow=Math.floor(bay/2),cx=lane.x+side*3.65,bz=baseZ-bayRow*6;const books=g.books.filter((b,n)=>Math.floor((Number.isInteger(b.slot)?b.slot:n)/SLOTS)===bay);if(!books.length)continue;
     // Every occupied physical bay has its own named sign; reserved adjacent bays keep future growth stable.
     shelfBacks.push({x:cx,y:2.5,z:bz,w:1,h:4.5,d:5.25});for(let r=0;r<2;r++)shelfBoards.push({x:cx,y:.75+r*1.65,z:bz,w:1.15,h:.14,d:5.25});
     const rotation=side<0?Math.PI/2:-Math.PI/2,faceX=cx-side*.56,sg=sign(room,g.label,`${g.books.length} ENTRIES · BAY ${bay+1}`,faceX,5.06,bz,5.15,.7,()=>onGroupSelect?.(g.id),rotation);pick.push(sg);
     blockers.push({x1:cx-.73,x2:cx+.73,z1:bz-2.78,z2:bz+2.78});
     for(const b of books){const slot=Number.isInteger(b.slot)?b.slot:g.books.indexOf(b),local=slot%SLOTS,row=Math.floor(local/12),column=local%12,bookX=cx-side*.62,bookZ=bz+(column-5.5)*.42,bookY=1.45+row*1.65;const location={uid:b.uid,floor:i,groupId:g.id,gallery:lane.gallery,bay:bay+1,row:row+1,slot:column+1,x:bookX,z:bookZ,approachX:lane.x,approachZ:bookZ,side,book:b};address.set(b.uid,location);bookSpecs.push(location)}
     spineSpecs.push({x:cx-side*1.01,z:bz,rotation,side,books,mesh:null});
     const lead=books[0];if(lead){const display=new T.Mesh(new T.PlaneGeometry(.76,1.08),new T.MeshStandardMaterial({color:0xffffff,map:fallback(lead),side:T.DoubleSide}));display.position.set(faceX-side*.5,4.1,bz);display.rotation.y=rotation;display.userData.action=()=>{inspectBook(lead.uid,0);onBookSelect?.(lead)};room.add(display);coverSpecs.push({mesh:display,book:lead,group:g,loaded:false,pending:false,token:0});}
    }
   });
  }
  function instanceShelves(specs,mat){if(!specs.length)return null;const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mat,specs.length),o=new T.Object3D();specs.forEach((v,j)=>{o.position.set(v.x,v.y,v.z);o.scale.set(v.w,v.h,v.d);o.updateMatrix();mesh.setMatrixAt(j,o.matrix)});mesh.instanceMatrix.needsUpdate=true;room.add(mesh);return mesh}
  const backs=instanceShelves(shelfBacks,dark);instanceShelves(shelfBoards,wood);if(backs)pick.push(backs);
  const inst=new T.InstancedMesh(new T.BoxGeometry(.74,1.17,.37),new T.MeshStandardMaterial({color:0xffffff,roughness:.95}),bookSpecs.length);const temp=new T.Object3D();const palette=[0x715342,0x4d6254,0x66484b,0x7b6851,0x495c65,0x6e5a68];bookSpecs.forEach((b,n)=>{temp.position.set(b.x,b.bookY||1.45,b.z);temp.position.y=1.45+(b.row-1)*1.65;temp.updateMatrix();inst.setMatrixAt(n,temp.matrix);inst.setColorAt(n,new T.Color(palette[n%palette.length]));});inst.instanceMatrix.needsUpdate=true;inst.userData.books=bookSpecs;room.add(inst);pick.push(inst);
  scenery.push(createScenery({T,room,index:i,lanes,bounds,box,sign,blockers,onLibrarian,onJourney,onDesk}));
  rooms.push({room,pick,blockers,groups,lanes,inst,bookSpecs,coverSpecs,spineSpecs});
 }
 let current=0,isOverview=true,position=new T.Vector3(0,1.72,8),target=new T.Vector3(),look=new T.Vector3(),yaw=0,pitch=0,stair=null,drag=false,moved=false,lastX=0,lastY=0,orbit=.12,hoverKey='',selected=null,inspection=null,route=null,routeGeometry=null,lighting='day',quality='auto',lastCoverCheck=0,disposed=false;
 const raycaster=new T.Raycaster(),pointer=new T.Vector2(),keys=new Set(),clock={last:performance.now()};const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let atmosphereMotion=!reduced;const textureLoader=new T.TextureLoader();textureLoader.setCrossOrigin('anonymous');
 const colorDefault=new T.Color(0x9a765f),colorSelected=new T.Color(0xffe072);let highlights=new Set();
 function initView(){target.set(width*.34,H*3.7,bounds.z2+Math.max(width*.64,depth*.72));look.set(0,H*2.6,-20);camera.position.copy(target);camera.lookAt(look)}
 function qualitySet(q){quality=q;const constrained=matchMedia('(pointer: coarse)').matches||(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);const ratio=q==='low'?1:q==='high'?Math.min(devicePixelRatio||1,2):Math.min(devicePixelRatio||1,constrained?1:1.35);renderer.setPixelRatio(ratio);resize()}
 function setLighting(mode){lighting=mode==='evening'?'evening':'day';scene.background.setHex(lighting==='day'?0x283b37:0x171e2c);scene.fog.color.copy(scene.background);hemi.intensity=lighting==='day'?2.25:1.2;ambient.intensity=lighting==='day'?.62:.42;sun.intensity=lighting==='day'?1.7:.42;renderer.toneMappingExposure=lighting==='day'?1.22:1.0;scenery.forEach(s=>s.setLighting(lighting))}
 function refreshColors(){for(const r of rooms){r.bookSpecs.forEach((entry,i)=>r.inst.setColorAt(i,new T.Color(highlights.has(entry.uid)?0xf9d778:[0x805f4a,0x547061,0x81545b,0x9c7b5e,0x4f6e79,0x78647e][i%6])));if(r.inst.instanceColor)r.inst.instanceColor.needsUpdate=true}}
 function setHighlights(uids){highlights=new Set(uids||[]);refreshColors()}
 function enterFloor(index){if(index<0||index>=rooms.length)return;clearRoute();current=index;isOverview=false;stair=null;position.set(0,index*H+1.72,10);yaw=0;pitch=0;target.copy(position);camera.position.copy(position);look.set(position.x,position.y,position.z-1);camera.lookAt(look);roomVisibility();reportLocation(null);updateNearby(true)}
 function roomVisibility(){rooms.forEach((r,i)=>r.room.visible=isOverview||Math.abs(i-current)<=1);floorTitleMeshes.forEach(m=>m.visible=isOverview)}
 function overview(){releaseBook();isOverview=true;stair=null;orbit=.12;roomVisibility();initView();onOverview?.()}
 function nearGroup(){let min=Infinity,best=null;for(const g of rooms[current].groups){const d=Math.hypot(position.x-g.x,position.z-g.z);if(d<min){min=d;best=g}}return min<9?best:null}
 let lastLocation='';function reportLocation(groupId){const key=current+'|'+(groupId||'');if(key===lastLocation)return;lastLocation=key;onLocationChange?.({floor:current,groupId:groupId||null})}
 function collide(x,z){if(x<bounds.x1+1||x>bounds.x2-1||z<bounds.z1+1||z>bounds.z2-1)return true;return rooms[current].blockers.some(a=>x>a.x1-.23&&x<a.x2+.23&&z>a.z1-.23&&z<a.z2+.23)}
 function move(forward,side,d){const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*side)*d,dz=(-Math.cos(yaw)*forward+Math.sin(yaw)*side)*d;let x=position.x+dx,z=position.z+dz;if(collide(x,position.z))x=position.x;if(collide(x,z))z=position.z;const within=z>-1.7&&z<5.55;if(!stair&&x>8.18&&x<10.6&&within){if(z>=4.65&&current<floors.length-1)stair={flight:current};else if(z<=-.85&&current>0)stair={flight:current-1};else x=Math.min(position.x,8.15)}if(stair){x=T.MathUtils.clamp(x,8.23,10.35);const p=T.MathUtils.clamp((5.55-z)/7.25,0,1);position.y=stair.flight*H+1.72+p*H;if(z<=-1.7){current=stair.flight+1;stair=null;z=-1.78;position.y=current*H+1.72;roomVisibility();onFloorChange?.(current,{viaStairs:true})}else if(z>=5.55){current=stair.flight;stair=null;z=5.63;position.y=current*H+1.72;roomVisibility();onFloorChange?.(current,{viaStairs:true})}}else position.y=current*H+1.72;position.x=x;position.z=z;target.copy(position);reportLocation(nearGroup()?.id||null)}
 function walk(direction){if(isOverview){enterFloor(current);onFloorChange?.(current)}const map={forward:[1,0],back:[-1,0],left:[0,-1],right:[0,1]};if(map[direction])move(...map[direction],.8);else if(direction==='lookLeft')yaw-=.16;else if(direction==='lookRight')yaw+=.16;else if(direction==='lookUp')pitch=T.MathUtils.clamp(pitch+.14,-1,1);else if(direction==='lookDown')pitch=T.MathUtils.clamp(pitch-.14,-1,1)}
 function focusGroup(groupId){const dest=locByGroup.get(groupId);if(!dest)return false;if(dest.floor!==current||isOverview){enterFloor(dest.floor);onFloorChange?.(dest.floor,{guided:true})}stair=null;position.set(dest.laneX+1.5,current*H+1.72,dest.z);yaw=-Math.PI/2;pitch=.21;target.copy(position);camera.position.copy(position);reportLocation(groupId);updateNearby(true);return true}
 function getAddress(uid){const a=address.get(uid);return a?{floor:a.floor,groupId:a.groupId,gallery:a.gallery,bay:a.bay,row:a.row,slot:a.slot,x:a.x,z:a.z}:null}
 function clearRoute(){if(route){route.parent?.remove(route);route.geometry.dispose();route.material.dispose();route=null}}
 function routeTo(x,z){clearRoute();const destination={x,z};const start={x:position.x,z:position.z};const way=findRoute({start,end:destination,bounds,obstacles:rooms[current].blockers,step:1.3,clearance:.30,maxVisited:50000});if(!way.length)return false;const points=way.map(p=>new T.Vector3(p.x,.32,p.z));const geo=new T.BufferGeometry().setFromPoints(points);route=new T.Line(geo,new T.LineBasicMaterial({color:0xffdd8f,depthTest:false}));rooms[current].room.add(route);return true}
 function focusBook(uid,opts={}){const dest=address.get(uid);if(!dest)return false;setHighlights([uid]);if(opts.routeOnly){if(isOverview){enterFloor(current);onFloorChange?.(current,{guided:true})}if(dest.floor!==current)return routeTo(-5,2);return routeTo(dest.approachX,dest.approachZ)}if(dest.floor!==current||isOverview){enterFloor(dest.floor);onFloorChange?.(dest.floor,{guided:true})}stair=null;position.set(dest.approachX,current*H+1.72,dest.approachZ);yaw=dest.side<0?-Math.PI/2:Math.PI/2;pitch=Math.atan2((1.45+(dest.row-1)*1.65)-1.72,Math.max(1,Math.abs(dest.x-dest.approachX))); target.copy(position);camera.position.copy(position);reportLocation(dest.groupId);clearRoute();updateNearby(true);return true}
 function spineTexture(spec){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='#fff4da';x.textAlign='left';x.font='bold 21px Georgia';
  for(const b of spec.books){const slot=Number.isInteger(b.slot)?b.slot:0,col=slot%12,row=Math.floor((slot%24)/12),displayCol=spec.side<0?11-col:col;const xx=(displayCol+.5)*1024/12,yy=row===1?20:292;x.save();x.translate(xx,yy);x.rotate(Math.PI/2);x.fillText(b.title||'Untitled',0,0,195);x.restore()}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
 }
 function updateNearby(force=false){if(isOverview)return;const now=performance.now();if(!force&&now-lastCoverCheck<900)return;lastCoverCheck=now;const currentRoom=rooms[current];
  const desiredSpines=new Set(currentRoom.spineSpecs.map(s=>({s,d:Math.hypot(position.x-s.x,position.z-s.z)})).filter(x=>x.d<15).sort((a,b)=>a.d-b.d).slice(0,6).map(x=>x.s));
  for(const r of rooms)for(const spec of r.spineSpecs){if(spec.mesh&&!desiredSpines.has(spec)){r.room.remove(spec.mesh);spec.mesh.geometry.dispose();spec.mesh.material.map.dispose();spec.mesh.material.dispose();spec.mesh=null}}
  for(const spec of desiredSpines)if(!spec.mesh){const mesh=new T.Mesh(new T.PlaneGeometry(5.04,2.87),new T.MeshBasicMaterial({map:spineTexture(spec),transparent:true,depthWrite:false,side:T.DoubleSide}));mesh.position.set(spec.x,2.275,spec.z);mesh.rotation.y=spec.rotation;mesh.userData.ignoreRaycast=true;currentRoom.room.add(mesh);spec.mesh=mesh}
  const desiredCovers=new Set(currentRoom.coverSpecs.map(s=>({s,d:Math.hypot(position.x-s.mesh.position.x,position.z-s.mesh.position.z)})).filter(x=>x.d<15).sort((a,b)=>a.d-b.d).slice(0,4).map(x=>x.s));
  for(const r of rooms)for(const s of r.coverSpecs)if(!desiredCovers.has(s)&&(s.loaded||s.pending)){s.token++;s.pending=false;if(s.mesh.material.map){s.mesh.material.map.dispose();s.mesh.material.map=fallback(s.book);s.mesh.material.needsUpdate=true}s.loaded=false}
  if(!resolveCover)return;for(const s of desiredCovers){if(s.loaded||s.pending)continue;s.pending=true;const token=++s.token;Promise.resolve(resolveCover(s.book,s.group.collection)).then(id=>{if(token!==s.token||disposed)return;s.pending=false;if(!id)return;textureLoader.load(`https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`,tex=>{if(token!==s.token||disposed){tex.dispose();return}tex.colorSpace=T.SRGBColorSpace;s.mesh.material.map?.dispose();s.mesh.material.map=tex;s.mesh.material.needsUpdate=true;s.loaded=true},undefined,()=>{})}).catch(()=>{if(token===s.token)s.pending=false})}
 }
 function placeInspection(){
  if(!inspection)return;const rect=canvas.getBoundingClientRect(),dialog=document.querySelector('#detail');
  const depth=1.85,visibleWidth=2*depth*Math.tan(camera.fov*Math.PI/360)*camera.aspect;
  if(!rect.width||!rect.height||!Number.isFinite(visibleWidth)){inspection.group.position.x=-.65;return}
  const free=dialog?.open?T.MathUtils.clamp(dialog.getBoundingClientRect().left-rect.left,0,rect.width):rect.width;
  const bookPixels=rect.width/visibleWidth;inspection.group.visible=free>=bookPixels+24;
  inspection.group.position.x=inspection.group.visible?(free/2/rect.width-.5)*visibleWidth:-.65;
 }
 function bookPage(book){const c=document.createElement('canvas');c.width=512;c.height=740;const x=c.getContext('2d');x.fillStyle='#efe3c7';x.fillRect(0,0,512,740);x.fillStyle='#514636';x.font='18px sans-serif';x.fillText('THE READING ATLAS',42,58);x.fillStyle='#252f29';let y=112;function wrap(text,font,size,maxLines){x.font=`${font} ${size}px Georgia`;let line='',lines=0;for(const word of String(text||'').split(/\s+/)){if(x.measureText(line+word).width>425&&line){x.fillText(line,42,y);y+=size*1.4;line='';if(++lines>=maxLines){x.fillText('…',42,y);return}}line+=word+' '}if(line){x.fillText(line,42,y);y+=size*1.4}}wrap(book.title,'bold',30,4);y+=12;wrap(book.author,'normal',21,2);y+=22;x.fillStyle='#b39460';x.fillRect(42,y,425,2);y+=38;x.fillStyle='#4c5145';wrap(book.note||'Find the original catalogue description and reading tools in the details beside this book.','normal',22,12);x.font='15px sans-serif';x.fillStyle='#8c785a';x.fillText('CATALOGUE NOTE · NOT THE BOOK’S FULL TEXT',42,710);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex}
 function inspectBook(uid,angle=0){const dest=address.get(uid);if(!dest)return false;if(!inspection||inspection.uid!==uid){releaseBook();const group=new T.Group();group.position.set(-.65,-.05,-1.85);camera.add(group);box(group,.96,1.40,.14,0,0,0,paper);box(group,1.02,1.46,.035,0,0,-.09,wood);box(group,.045,1.46,.20,-.5,0,0,wood);const page=new T.Mesh(new T.PlaneGeometry(.94,1.37),new T.MeshStandardMaterial({map:bookPage(dest.book)}));page.position.z=.076;group.add(page);const hinge=new T.Group();hinge.position.set(-.5,0,.10);group.add(hinge);box(hinge,1.02,1.46,.035,.5,0,0,wood);const face=new T.Mesh(new T.PlaneGeometry(.99,1.43),new T.MeshStandardMaterial({map:fallback(dest.book),side:T.DoubleSide}));face.position.set(.5,0,.019);hinge.add(face);inspection={uid,group,face,hinge,open:false,animationStart:reduced?null:performance.now()};if(resolveCover)Promise.resolve(resolveCover(dest.book,dest.book.collection)).then(id=>{if(!id||inspection?.uid!==uid)return;textureLoader.load(`https://covers.openlibrary.org/b/id/${id}-M.jpg?default=false`,tex=>{if(inspection?.uid!==uid){tex.dispose();return}tex.colorSpace=T.SRGBColorSpace;inspection.face.material.map.dispose();inspection.face.material.map=tex;inspection.face.material.needsUpdate=true},undefined,()=>{})}).catch(()=>{})}inspection.group.rotation.y=Number(angle)||0;placeInspection();return true}
 function setBookOpen(open){if(!inspection)return;inspection.open=!!open;if(reduced)inspection.hinge.rotation.y=inspection.open?-2.2:0}
 function setAtmosphereMotion(enabled){atmosphereMotion=!!enabled&&!reduced}
 function releaseBook(){if(!inspection)return;camera.remove(inspection.group);inspection.group.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==wood&&o.material!==paper){o.material.map?.dispose();o.material.dispose()}});inspection=null}
 function getMap(index){const r=rooms[index];return{bounds:{...bounds},groups:r?r.groups.map(g=>({...g})):[],player:{x:position.x,z:position.z},floor:index}}
 function hit(event){const rect=canvas.getBoundingClientRect();pointer.x=(event.clientX-rect.left)/rect.width*2-1;pointer.y=-(event.clientY-rect.top)/rect.height*2+1;raycaster.setFromCamera(pointer,camera);const candidates=isOverview?floorTitleMeshes:rooms[current].room.children;const intersections=raycaster.intersectObjects(candidates,true);const first=intersections.find(h=>{for(let n=h.object;n;n=n.parent)if(n.visible===false||n.userData.ignoreRaycast)return false;return true});if(!first)return;if(first.object.userData.books&&first.instanceId!==undefined)return first;for(let n=first.object;n;n=n.parent)if(typeof n.userData.action==='function')return {...first,action:n.userData.action,label:n.userData.label};return undefined}
 function showHit(hit){if(!hit){onHover?.('');return}if(hit.instanceId!==undefined){const b=hit.object.userData.books?.[hit.instanceId];onHover?.(b?`${b.book.title} · ${b.book.author}`:'')}else onHover?.(hit.label||'Select to explore')}
 function down(e){drag=true;moved=false;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)}
 function pointerMove(e){if(drag){let dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>1)moved=true;if(isOverview){orbit-=dx*.003;const midZ=(bounds.z1+bounds.z2)/2,r=Math.max(width,depth)*1.05;target.set(Math.sin(orbit)*r,H*3.1,midZ+Math.cos(orbit)*r)}else{yaw-=dx*.004;pitch=T.MathUtils.clamp(pitch-dy*.004,-1.05,1.05)}lastX=e.clientX;lastY=e.clientY}else{const h=hit(e);canvas.style.cursor=h?'pointer':'grab';showHit(h)}}
 function up(e){if(!moved){const h=hit(e);if(h){if(h.instanceId!==undefined){const item=h.object.userData.books?.[h.instanceId];if(item){inspectBook(item.uid,0);onBookSelect?.(item.book)}}else (h.action||h.object.userData.action)?.()}}drag=false}
 const listen=(o,k,f,opts)=>{o.addEventListener(k,f,opts);listeners.push([o,k,f,opts])},listeners=[];listen(canvas,'pointerdown',down);listen(canvas,'pointermove',pointerMove);listen(canvas,'pointerup',up);listen(canvas,'pointercancel',()=>drag=false);
 function keyDown(e){if(e.target?.matches?.('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','q','e','i','k'].includes(k)){e.preventDefault();keys.add(k);if(isOverview){enterFloor(current);onFloorChange?.(current)}}}function keyUp(e){keys.delete(e.key.toLowerCase())}listen(window,'keydown',keyDown);listen(window,'keyup',keyUp);listen(window,'blur',()=>keys.clear());
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(inspection)placeInspection()}const ro=new ResizeObserver(resize);ro.observe(canvas);qualitySet('auto');initView();let raf=0;
 function frame(now){if(disposed)return;if(document.hidden){raf=0;keys.clear();return}const dt=Math.min((now-clock.last)/1000,.05);clock.last=now;if(document.querySelector('dialog[open]'))keys.clear();if(!isOverview){const f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);if(f||side)move(f,side,dt*6);yaw-=(keys.has('q')?1:0)*dt*1.5-(keys.has('e')?1:0)*dt*1.5;pitch=T.MathUtils.clamp(pitch+(keys.has('i')?1:0)*dt-(keys.has('k')?1:0)*dt,-1.05,1.05);look.set(position.x+Math.sin(yaw)*Math.cos(pitch),position.y+Math.sin(pitch),position.z-Math.cos(yaw)*Math.cos(pitch));updateNearby()}camera.position.lerp(target,reduced?1:.14);camera.lookAt(look);if(inspection?.animationStart!==null&&inspection?.animationStart!==undefined){const p=Math.min(1,Math.max(0,(now-inspection.animationStart)/240)),ease=1-Math.pow(1-p,3);inspection.group.scale.setScalar(.9+.1*ease);inspection.group.position.z=-2.05+.2*ease;if(p===1)inspection.animationStart=null}if(inspection)inspection.hinge.rotation.y+=(inspection.open?-2.2-inspection.hinge.rotation.y:-inspection.hinge.rotation.y)*(reduced?1:.13);scenery.forEach((s,i)=>{if(rooms[i].room.visible)s.update(now/1000,atmosphereMotion)});renderer.render(scene,camera);raf=requestAnimationFrame(frame)}function visibility(){if(document.hidden){keys.clear();if(raf)cancelAnimationFrame(raf);raf=0}else if(!raf&&!disposed){clock.last=performance.now();raf=requestAnimationFrame(frame)}}listen(document,'visibilitychange',visibility);raf=document.hidden?0:requestAnimationFrame(frame);
 function dispose(){disposed=true;cancelAnimationFrame(raf);clearRoute();releaseBook();ro.disconnect();for(const [o,k,f,opts]of listeners)o.removeEventListener(k,f,opts);scene.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.map?.dispose();m.dispose()}});renderer.dispose()}
 return{enterFloor,overview,focusGroup,focusBook,clearRoute,getLayoutDiagnostics:()=>({...layoutDiagnostics}),setHighlights,setLighting,setQuality:qualitySet,walk,getMap,getAddress,inspectBook,setBookOpen,setAtmosphereMotion,releaseBook,dispose};
}
