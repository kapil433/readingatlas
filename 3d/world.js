// Six-storey Reading Atlas world. UI, catalogue state and cover lookup live outside this module.
// createLibraryWorld({canvas,floors,names,getShelfEntries,resolveCover,onBookSelect,onFloorChange,onSectionSelect})
// -> {enterFloor(index),overview(),updateFloor(index),focusSection(key),walk(direction),dispose()}
export async function createLibraryWorld({canvas,floors,names,getShelfEntries,resolveCover,onBookSelect,onFloorChange,onSectionSelect}) {
  const T=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5)); renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.2;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(63,1,.1,240);
  scene.background=new T.Color(0x1f2b28); scene.fog=new T.Fog(0x1f2b28,85,190);
  const h=7.6, rooms=[],gen=Array(floors.length).fill(0),texLoader=new T.TextureLoader();
  texLoader.setCrossOrigin('anonymous');
  scene.add(new T.HemisphereLight(0xfaf1d8,0x3c453a,2.2));
  // Gentle ambient fill keeps downward-facing ceiling surfaces readable indoors.
  scene.add(new T.AmbientLight(0xffe5c2,.65));
  const sun=new T.DirectionalLight(0xffdfad,2.1); sun.position.set(17,55,24);scene.add(sun);
  const material=(color,roughness=1)=>new T.MeshStandardMaterial({color,roughness});
  const walnut=material(0x59412d), darkWood=material(0x342820), paleStone=material(0xa69a80), ceilingMaterial=material(0xc5b69d), lampMaterial=new T.MeshStandardMaterial({color:0xffe2b2,emissive:0xe6ac62,emissiveIntensity:.5}), brass=material(0xb89e67,.45), paper=material(0xe2d6bc), glass=new T.MeshStandardMaterial({color:0x86aca9,transparent:true,opacity:.20,roughness:.25});
  const sharedBookGeo=new T.BoxGeometry(1.02,1.25,.18),sharedFaceGeo=new T.PlaneGeometry(.985,1.22);
  function box(parent,w,height,d,x,y,z,mat){const m=new T.Mesh(new T.BoxGeometry(w,height,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
  function label(text,sub='',bg='#233b31',w=1024,height=256){const c=document.createElement('canvas');c.width=w;c.height=height;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,height);x.strokeStyle='#ceb786';x.lineWidth=4;x.strokeRect(8,8,w-16,height-16);x.fillStyle='#f2e8d4';x.textAlign='center';x.font=`${Math.round(height*.29)}px Georgia`;x.fillText(text,w/2,height*.48,w*.91);if(sub){x.fillStyle='#dcc69a';x.font=`600 ${Math.round(height*.12)}px sans-serif`;x.fillText(sub.toUpperCase(),w/2,height*.72,w*.9)}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
  function sign(parent,text,sub,x,y,z,w,height,click){const m=new T.Mesh(new T.PlaneGeometry(w,height),new T.MeshStandardMaterial({map:label(text,sub),side:T.DoubleSide}));m.position.set(x,y,z);if(click)m.userData.action=click;parent.add(m);return m;}
  function bookFallback(b){const c=document.createElement('canvas');c.width=256;c.height=384;let x=c.getContext('2d');x.fillStyle=['#554b46','#4f6055','#644840','#4a5664','#746047'][(b.title.length||0)%5];x.fillRect(0,0,256,384);x.strokeStyle='#d8c5a0';x.lineWidth=3;x.strokeRect(12,12,232,360);x.fillStyle='#e8dbc1';x.font='12px sans-serif';x.fillText('THE READING ATLAS',25,43);x.font='25px Georgia';let line='',y=105;for(const word of (b.title||'Untitled').split(' ')){const next=line?line+' '+word:word;if(x.measureText(next).width>205&&line){x.fillText(line,25,y);y+=29;line=word;if(y>255)break}else line=next}if(y<=255)x.fillText(line,25,y);x.font='15px sans-serif';x.fillText((b.author||'').slice(0,27),25,333);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;}
  function setMap(face,texture){if(face.material.map)face.material.map.dispose();face.material.map=texture;face.material.needsUpdate=true;}
  // An open frontage makes all six stacked storeys visible in the exterior building view.
  box(scene,27,1,23,0,-.5,0,paleStone); box(scene,24,.65,21,0,h*floors.length+.25,0,paleStone);
  for(const x of [-11.5,11.5]){box(scene,.8,h*floors.length+.5,.8,x,h*floors.length/2,9.4,paleStone);box(scene,.8,h*floors.length+.5,.8,x,h*floors.length/2,-9.4,paleStone)}
  sign(scene,'THE READING ATLAS','A SIX STOREY LIBRARY',0,h*floors.length+1.25,9.7,14,1.4);
  for(let i=0;i<floors.length;i++){
    const f=floors[i],room=new T.Group();room.position.y=i*h;scene.add(room);
    const wood=material(f.colors?.[0]??0x514133),wall=material(f.colors?.[1]??0x626553),rug=material(f.colors?.[2]??0x978467);
    // Each floor is an independent walkable space, physically stacked in the same scene.
    // Leave a stairwell opening through each storey so the stair flights actually connect the stacked levels.
    function splitSlab(y,depth,mat){box(room,19.7,depth,19.5,-1.65,y,0,mat);box(room,.8,depth,19.5,11.1,y,0,mat);box(room,2.5,depth,7.75,9.45,y,-5.875,mat);box(room,2.5,depth,4.05,9.45,y,7.725,mat)}
    if(i===0)box(room,23,.4,19.5,0,0,0,paleStone);else splitSlab(0,.4,paleStone);
    if(i===floors.length-1)box(room,23,.28,19.5,0,7.25,0,ceilingMaterial);else splitSlab(7.25,.28,ceilingMaterial);
    box(room,22.7,7,.38,0,3.6,-9.5,wall);box(room,.38,7,19.5,-11.3,3.6,0,wall);box(room,.38,7,19.5,11.3,3.6,0,wall);
    // Ceiling beams and pendant fixtures make the upper interior legible as architecture.
    for(const z of [-5,0,5])box(room,20.2,.18,.22,-1.3,7.03,z,walnut);
    for(const x of [-5,4])for(const z of [-4,4]){box(room,.08,.42,.08,x,6.82,z,brass);box(room,.95,.13,.95,x,6.57,z,lampMaterial)}
    box(room,10,.08,9,0,.23,3.4,rug);
    for(const x of [-10.8,0,10.8])box(room,.48,7,.48,x,3.65,9.2,paleStone);
    box(room,22,.25,.5,0,7.05,9.2,walnut);
    // Shallow side windows and columns make the rooms legible as rooms, not a flat background.
    for(const x of [-11.08,11.08])for(const z of [-5.7,0,5.7]){box(room,.08,3.6,3,x,4.1,z,glass);box(room,.16,.13,3.25,x,5.95,z,brass);box(room,.16,.13,3.25,x,2.25,z,brass)}
    box(room,3.3,.20,1.5,0,1.1,3.2,walnut);for(const x of [-1.35,1.35])for(const z of [2.65,3.75])box(room,.14,1,.14,x,.57,z,darkWood);
    box(room,.14,1.2,.14,0,1.8,3.2,brass);box(room,.75,.18,.75,0,2.4,3.2,brass);box(room,.9,.1,.7,-.8,1.26,3.15,paper);
    const colliders=[{x1:-2.05,x2:2.05,z1:2.1,z2:4.25}];
    // A traversable staircase and clearly marked lift/landing portals connect the floors.
    box(room,2.1,4.15,.22,-9.55,2.2,-8.9,darkWood);box(room,1.75,3.8,.22,-9.55,2.05,-8.75,brass);
    const interactive=[];
    const lift=sign(room,'LIFT','SELECT FLOOR IN DIRECTORY',-9.55,4.55,-8.58,2.1,.45,()=>onFloorChange?.((i+1)%floors.length));interactive.push(lift);
    for(let step=0;step<20;step++){const ascending=(step+1)*h/20;box(room,2,.24,.38,9.45,ascending,5.15-step*.36,wood);}
    for(let step=0;step<10;step++){const y=(step*2+1)*h/20;box(room,.10,.8,.10,8.4,y+.5,5.15-step*.72,brass);box(room,.10,.8,.10,10.5,y+.5,5.15-step*.72,brass)}
    // The rail is handled by walking logic; the stairwell is traversable at either landing.
    const stairUp=sign(room,i<floors.length-1?'↑  NEXT FLOOR':'←  GROUND FLOOR','USE STAIRS / LIFT',9.55,3.65,-.30,2.45,.7,()=>onFloorChange?.(i<floors.length-1?i+1:0));interactive.push(stairUp);
    if(i>0){const stairDown=sign(room,'↓  FLOOR BELOW','CHANGE STOREY',9.55,2.75,-.29,2.45,.52,()=>onFloorChange?.(i-1));interactive.push(stairDown)}
    const slots=[],sectionPositions={};
    if(f.sections.length===2){
      // Two real reading bays: a low physical divider and named entrances.
      box(room,.22,1.18,6.6,0,.82,-3.6,wood);
      box(room,.32,.12,6.7,0,1.47,-3.6,brass);
      colliders.push({x1:-.33,x2:.33,z1:-7,z2:-.2});
      for(let section=0;section<2;section++){
        const cx=section===0?-5.3:5.3,key=f.sections[section];
        for(const side of [-1,1]){
          const x=cx+side*4.1;box(room,.22,4.5,.24,x,2.47,-2.85,walnut);
          colliders.push({x1:x-.18,x2:x+.18,z1:-3.07,z2:-2.63});
        }
        box(room,8.4,.20,.28,cx,4.72,-2.85,walnut);
        const entrance=sign(room,names[key]||key,'ENTER THIS SECTION',cx,5.18,-2.70,6.5,.65,()=>onSectionSelect?.(key));interactive.push(entrance);
      }
    }
    const width=f.sections.length===1?13:8.3;
    for(let section=0;section<f.sections.length;section++){
      const key=f.sections[section],cx=f.sections.length===1?0:(section===0?-5.3:5.3),shelf=new T.Group();shelf.position.set(cx,0,-7.9);room.add(shelf);
      box(shelf,width,5.7,.45,0,2.95,0,darkWood);box(shelf,.22,5.9,1.2,-width/2,3,.35,walnut);box(shelf,.22,5.9,1.2,width/2,3,.35,walnut);
      for(let row=0;row<3;row++)box(shelf,width,.15,1.2,0,.72+row*1.60,.45,walnut);
      const sectionSign=sign(shelf,names[key]||key,'12 BOOKS PER SHELF PAGE',0,6.35,.6,width-.5,.7,()=>onSectionSelect?.(key));interactive.push(sectionSign);
      const display=[];
      for(let n=0;n<12;n++){
        const row=Math.floor(n/4),col=n%4,x=(col-1.5)*Math.min(1.55,(width-1.1)/4),y=1.43+row*1.6,book=new T.Group();book.position.set(x,y,.82);shelf.add(book);
        const body=new T.Mesh(sharedBookGeo,wood);book.add(body);
        const face=new T.Mesh(sharedFaceGeo,new T.MeshStandardMaterial({color:0xffffff,roughness:1}));face.position.z=.10;book.add(face);
        display.push({book,body,face}); interactive.push(face,body);
      }
      slots.push({key,display});sectionPositions[key]={x:cx,z:-3.0};
      colliders.push({x1:cx-width/2-.3,x2:cx+width/2+.3,z1:-8.8,z2:-6.75});
    }
    rooms.push({room,slots,interactive,colliders,sectionPositions});
  }
  let current=0,isOverview=true,yaw=0,pitch=0,stair=null,position=new T.Vector3(0,1.72,7.9),targetCamera=new T.Vector3(37,27,43),lookAt=new T.Vector3(0,h*floors.length*.49,0),dragging=false,moved=false,lastX=0,lastY=0,orbitAngle=.68;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,raycaster=new T.Raycaster(),pointer=new T.Vector2(),keys=new Set();let raf=0,disposed=false;
  function updateFloor(index){if(index<0||index>=rooms.length)return;const stamp=++gen[index],r=rooms[index];for(const slot of r.slots){const books=getShelfEntries(index,slot.key)||[];slot.display.forEach(({book,face,body},n)=>{const b=books[n];book.visible=!!b;const action=b?()=>onBookSelect?.(b,slot.key):null;face.userData.action=body.userData.action=action;if(!b)return;setMap(face,bookFallback(b));if(index!==current||isOverview||!resolveCover)return;Promise.resolve(resolveCover(b,slot.key)).then(value=>{if(!value||stamp!==gen[index]||disposed)return;const url=typeof value==='object'?value.url:(typeof value==='number'||/^\d+$/.test(String(value))?`https://covers.openlibrary.org/b/id/${value}-M.jpg?default=false`:value);if(!url)return;texLoader.load(url,tex=>{if(stamp!==gen[index]||disposed){tex.dispose();return}tex.colorSpace=T.SRGBColorSpace;setMap(face,tex)},undefined,()=>{})}).catch(()=>{});});}}
  function enterFloor(index){if(index<0||index>=rooms.length)return;current=index;isOverview=false;stair=null;yaw=0;pitch=.04;position.set(0,index*h+1.72,8);targetCamera.copy(position);camera.position.copy(position);camera.lookAt(position.x,position.y+.04,position.z-1);updateFloor(index);canvas.style.cursor='grab'}
  function overview(){isOverview=true;targetCamera.set(37,27,43);lookAt.set(0,h*floors.length*.49,0);orbitAngle=.68;canvas.style.cursor='grab'}
  function focusSection(key){if(isOverview)enterFloor(current);const p=rooms[current].sectionPositions[key];if(!p)return;stair=null;position.set(T.MathUtils.clamp(p.x,-8,8),current*h+1.72,Math.max(-4.4,p.z+2.0));yaw=0;pitch=.15;targetCamera.copy(position)}
  function hit(event){
    const rect=canvas.getBoundingClientRect();pointer.x=(event.clientX-rect.left)/rect.width*2-1;pointer.y=-(event.clientY-rect.top)/rect.height*2+1;raycaster.setFromCamera(pointer,camera);
    // Respect foreground geometry: do not pick a book through a wall or table.
    const hits=raycaster.intersectObjects(scene.children,true);
    const first=hits.find(hit=>{for(let node=hit.object;node;node=node.parent)if(node.visible===false)return false;return true});
    return first&&typeof first.object.userData.action==='function'?first:undefined;
  }
  function down(e){dragging=true;moved=false;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)}
  function movePointer(e){if(dragging){let dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>1)moved=true;if(isOverview){orbitAngle-=dx*.005;targetCamera.set(Math.sin(orbitAngle)*56,27,Math.cos(orbitAngle)*56)}else{yaw-=dx*.004;pitch=T.MathUtils.clamp(pitch-dy*.004,-1.05,1.05)}lastX=e.clientX;lastY=e.clientY}else if(!isOverview)canvas.style.cursor=hit(e)?'pointer':'grab'}
  function up(e){if(!moved&&!isOverview)hit(e)?.object.userData.action?.();dragging=false}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',movePointer);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',()=>dragging=false);
  function collide(x,z){if(x < -10.45||x>10.45||z < -8.8||z>8.45)return true;return rooms[current].colliders.some(r=>x>r.x1&&x<r.x2&&z>r.z1&&z<r.z2)}
  function translate(forward,side,distance){
    const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*side)*distance,dz=(-Math.cos(yaw)*forward+Math.sin(yaw)*side)*distance;
    let nx=position.x+dx,nz=position.z+dz;
    if(collide(nx,position.z))nx=position.x;if(collide(nx,nz))nz=position.z;
    // Rail along the inner edge of the shaft has openings at the two landings.
    const withinFlight=nz>-1.7&&nz<5.55;
    if(!stair&&nx>8.18&&withinFlight){
      const enteringBottom=nz>=4.65&&current<floors.length-1;
      const enteringTop=nz<=-.85&&current>0;
      if(enteringBottom)stair={flight:current};
      else if(enteringTop)stair={flight:current-1};
      else { nx=Math.min(position.x,8.15); }
    }
    if(stair){
      // On the flight, keep the visitor between the handrails and follow its slope.
      nx=T.MathUtils.clamp(nx,8.23,10.35);
      const progress=T.MathUtils.clamp((5.55-nz)/7.25,0,1);
      position.y=stair.flight*h+1.72+progress*h;
      if(nz<=-1.70){
        current=stair.flight+1;stair=null;nz=-1.78;position.y=current*h+1.72;
        onFloorChange?.(current,{viaStairs:true});
      }else if(nz>=5.55){
        current=stair.flight;stair=null;nz=5.63;position.y=current*h+1.72;
        onFloorChange?.(current,{viaStairs:true});
      }
    }else position.y=current*h+1.72;
    position.x=nx;position.z=nz;targetCamera.copy(position);
  }
  function walk(direction){if(isOverview){onFloorChange?.(current);if(isOverview)enterFloor(current)}const map={forward:[1,0],back:[-1,0],left:[0,-1],right:[0,1]};if(map[direction])translate(...map[direction],.8);else if(direction==='lookLeft')yaw-=.18;else if(direction==='lookRight')yaw+=.18;else if(direction==='lookUp')pitch=T.MathUtils.clamp(pitch+.16,-1.05,1.05);else if(direction==='lookDown')pitch=T.MathUtils.clamp(pitch-.16,-1.05,1.05)}
  function keydown(e){if(e.target?.matches?.('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','q','e','i','k'].includes(k)){e.preventDefault();keys.add(k);if(isOverview){onFloorChange?.(current);if(isOverview)enterFloor(current)}}}
  function keyup(e){keys.delete(e.key.toLowerCase())}function blur(){keys.clear()};window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  const resize=()=>{const w=canvas.clientWidth,ht=canvas.clientHeight;if(!w||!ht)return;renderer.setSize(w,ht,false);camera.aspect=w/ht;camera.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  camera.position.copy(targetCamera);camera.lookAt(lookAt);let last=performance.now();function frame(now){if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;if(document.querySelector('dialog[open]'))keys.clear();if(!isOverview){const f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);translate(f,side,dt*3.6);yaw-=(keys.has('q')?1:0)*dt*1.5-(keys.has('e')?1:0)*dt*1.5;pitch=T.MathUtils.clamp(pitch+(keys.has('i')?1:0)*dt-(keys.has('k')?1:0)*dt,-1.05,1.05);lookAt.set(position.x+Math.sin(yaw)*Math.cos(pitch),position.y+Math.sin(pitch),position.z-Math.cos(yaw)*Math.cos(pitch))}camera.position.lerp(targetCamera,reduced?1:.14);camera.lookAt(lookAt);renderer.render(scene,camera);raf=requestAnimationFrame(frame)}raf=requestAnimationFrame(frame);
  function dispose(){disposed=true;cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',movePointer);canvas.removeEventListener('pointerup',up);scene.traverse(o=>{if(o.geometry)o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.map?.dispose();m.dispose()}});renderer.dispose()}
  return{enterFloor,overview,updateFloor,focusSection,walk,dispose};
}
