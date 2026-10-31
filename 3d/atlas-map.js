/**
 * A schematic, interactive World Fiction globe. Points are approximate region
 * centres used solely as navigation anchors. They are not borders, territorial
 * claims, or authoritative coordinates; composite source labels remain intact.
 */
const LOCATIONS={
 'world:usa':[38,-98],'world:uk':[54,-2],'world:rus':[60,95],
 'world:fra':[46,2],'world:ger':[51,10],'world:chn':[35,104],
 'world:jpn':[37,138],'world:ind':[22,79],'world:bra':[-10,-53],
 'world:col':[4,-74],'world:zaf':[-29,24],'world:nga':[9,8],
 'world:irn':[32,54],'world:tur':[39,35],'world:arg':[-38,-64],
 'world:mex':[23,-102],'world:ita':[42,13],'world:esp':[40,-4],
 'world:egy':[27,30],'world:pak':[30,69],'world:idn':[-3,118],
 'world:ken':[0,38],'world:gre':[39,23],'world:pol':[52,19],
 'world:can':[57,-105],'world:aus':[-25,134],'world:scan':[64,18],
 'world:cze':[49.7,15.5],'world:por':[39,-8],'world:hun':[47,19],
 'world:cub':[22,-79],'world:chl':[-33,-71],'world:eth':[9,40],
 'world:mar':[32,-6],'world:ukr':[49,31],'world:afg':[34,66],
 'world:pal-isr':[31.5,35.2],'world:syr':[35,39],'world:mmr':[22,96],
 'world:sdn':[15,30],'world:irq':[33,44],'world:yem':[15,48],
 'world:lby':[27,17],'world:som':[6,46],'world:ven':[8,-66],
 'world:drc':[-3,24],'world:hti':[19,-72],'world:bih':[44,18],
 'world:rwa':[-2,30],'world:prk':[40,127]
};
// Painterly, deliberately coarse continent silhouettes: no national borders.
const CONTINENTS=[
 [[72,-166],[70,-143],[63,-135],[57,-130],[49,-125],[46,-123],[40,-124],[33,-117],[24,-110],[22,-106],[18,-104],[17,-98],[22,-97],[29,-90],[30,-83],[25,-81],[31,-80],[38,-75],[45,-67],[50,-57],[55,-60],[61,-67],[65,-85],[72,-95],[73,-120]],
 [[13,-82],[9,-75],[2,-78],[-5,-81],[-18,-76],[-30,-72],[-43,-73],[-55,-68],[-52,-62],[-38,-58],[-23,-44],[-8,-35],[1,-50],[9,-61]],
 [[72,-12],[69,15],[72,35],[70,55],[72,80],[72,110],[67,140],[60,165],[53,155],[48,142],[42,132],[38,128],[32,122],[25,120],[20,110],[10,105],[6,99],[8,98],[20,93],[22,89],[20,80],[9,78],[7,73],[21,68],[24,58],[30,48],[37,44],[41,36],[46,30],[49,20],[55,14],[57,5],[51,-2],[45,-5],[43,-10],[50,-10],[59,-6]],
 [[35,-7],[34,10],[31,25],[31,34],[22,37],[13,43],[9,51],[1,44],[-12,40],[-25,34],[-35,20],[-34,15],[-20,11],[-8,12],[5,2],[6,-10],[15,-17],[28,-13]],
 [[-11,113],[-15,123],[-13,132],[-12,137],[-17,146],[-25,153],[-35,151],[-39,144],[-36,136],[-34,128],[-32,115],[-23,114]],
 [[60,-52],[68,-52],[77,-64],[83,-42],[78,-22],[70,-24],[64,-38]]
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/**
 * `onSelectGroup(group)` receives the original source group.
 * `onHover(text)` receives a human-readable label or an empty string.
 * Use `.hide()` while the dialog is closed and `.show()` after opening it.
 */
export async function createAtlasMap({canvas,groups,onSelectGroup=()=>{},onHover=()=>{}}){
 if(!canvas)throw Error('An atlas globe canvas is required');
 const T=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,30);camera.position.set(0,0,5.3);
 scene.add(new T.HemisphereLight(0xffeed0,0x375d55,2));const light=new T.DirectionalLight(0xffdb96,2.1);light.position.set(-3,4,5);scene.add(light);
 const globe=new T.Group();scene.add(globe);const radius=1.3;
 function position(lat,lon,r=radius){let p=lat*Math.PI/180,l=lon*Math.PI/180;return new T.Vector3(r*Math.cos(p)*Math.sin(l),r*Math.sin(p),r*Math.cos(p)*Math.cos(l));}
 // Paint coarse illustrative land directly on a UV globe: polygons projected to
 // the sphere surface remain visible, unlike flat chords hidden inside it.
 // With this SphereGeometry orientation longitude 0 is at u=.25. Wrap each
 // coastline at the UV seam so regions crossing the Pacific stay continuous.
 const textureCanvas=document.createElement('canvas');textureCanvas.width=2048;textureCanvas.height=1024;
 const ctx=textureCanvas.getContext('2d'),W=textureCanvas.width,H=textureCanvas.height;
 ctx.fillStyle='#325d59';ctx.fillRect(0,0,W,H);ctx.fillStyle='#c1ac7c';ctx.strokeStyle='#dbc899';ctx.lineWidth=2;
 for(const outline of CONTINENTS){const points=[];let previous=null;for(const [lat,lon] of outline){let x=((lon+90)/360)*W;while(x<0)x+=W;while(x>=W)x-=W;if(previous!==null){while(x-previous>W/2)x-=W;while(x-previous<-W/2)x+=W}previous=x;points.push([x,(90-lat)/180*H])}for(const shift of [-W,0,W]){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x+shift,y):ctx.moveTo(x+shift,y));ctx.closePath();ctx.fill();ctx.stroke()}}
 const globeTexture=new T.CanvasTexture(textureCanvas);globeTexture.colorSpace=T.SRGBColorSpace;
 const sphere=new T.Mesh(new T.SphereGeometry(radius,56,40),new T.MeshStandardMaterial({map:globeTexture,roughness:.8,metalness:.05}));globe.add(sphere);
 const gridMaterial=new T.LineBasicMaterial({color:0xe2cf9b,transparent:true,opacity:.22});
 for(const lat of [-60,-30,0,30,60]){let points=[];for(let lon=-180;lon<=180;lon+=4)points.push(position(lat,lon,radius+.012));globe.add(new T.Line(new T.BufferGeometry().setFromPoints(points),gridMaterial))}
 for(let lon=-150;lon<=180;lon+=30){let points=[];for(let lat=-90;lat<=90;lat+=3)points.push(position(lat,lon,radius+.012));globe.add(new T.Line(new T.BufferGeometry().setFromPoints(points),gridMaterial))}
 const markerGeo=new T.SphereGeometry(.033,12,8),hitGeo=new T.SphereGeometry(.055,10,8),markerMat=new T.MeshBasicMaterial({color:0xffd27f}),activeMat=new T.MeshBasicMaterial({color:0xfff9d5});
 const hitMat=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});const markers=[],unmapped=[];
 for(const group of groups){if(group.collection!=='world')continue;const coords=LOCATIONS[group.id];if(!coords){unmapped.push({id:group.id,label:group.label});continue}const anchor=new T.Group();anchor.position.copy(position(coords[0],coords[1],radius+.045));anchor.userData.group=group;globe.add(anchor);const dot=new T.Mesh(markerGeo,markerMat);anchor.add(dot);const hit=new T.Mesh(hitGeo,hitMat);hit.userData.anchor=anchor;anchor.add(hit);markers.push({anchor,dot,hit})}
 const raycaster=new T.Raycaster(),pointer=new T.Vector2();let raf=0,shown=true,disposed=false,dragging=false,moved=false,down=null,selected=null,lastX=0,lastY=0,lastClick=null,cycle=0;
 // Rotate Africa/Europe into the arrival view; controls permit full rotation.
 globe.rotation.y=-.25;globe.rotation.x=.12;
 function visible(anchor){const point=anchor.getWorldPosition(new T.Vector3()),outward=point.clone().normalize(),toCamera=camera.position.clone().sub(point).normalize();return outward.dot(toCamera)>0.08}
 function hits(e){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return[];pointer.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(markers.map(m=>m.hit),false).filter(h=>visible(h.object.userData.anchor))}
 function hover(e){const list=hits(e);let text='';if(list.length){text=list[0].object.userData.anchor.userData.group.label;if(list.length>1)text+=` · ${list.length} nearby; click again to cycle`;canvas.style.cursor='pointer'}else canvas.style.cursor='grab';onHover(text)}
 function downHandler(e){if(e.button!==undefined&&e.button!==0)return;dragging=true;moved=false;down={x:e.clientX,y:e.clientY};lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId)}
 function moveHandler(e){if(dragging){const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(e.clientX-down.x)+Math.abs(e.clientY-down.y)>5)moved=true;globe.rotation.y+=dx*.009;globe.rotation.x=clamp(globe.rotation.x+dy*.009,-Math.PI/2,Math.PI/2);lastX=e.clientX;lastY=e.clientY;onHover('')}else hover(e)}
 function upHandler(e){if(dragging&&!moved){const list=hits(e);if(list.length){const same=lastClick&&Math.hypot(e.clientX-lastClick.x,e.clientY-lastClick.y)<8&&Date.now()-lastClick.time<2500;cycle=same?(cycle+1)%list.length:0;lastClick={x:e.clientX,y:e.clientY,time:Date.now()};const anchor=list[cycle].object.userData.anchor;if(selected)selected.dot.material=markerMat;selected=markers.find(m=>m.anchor===anchor);if(selected)selected.dot.material=activeMat;onHover(anchor.userData.group.label);onSelectGroup(anchor.userData.group)}}dragging=false}
 function cancelHandler(){dragging=false}
 function leaveHandler(){if(!dragging)onHover('')}
 function wheelHandler(e){e.preventDefault();camera.position.z=clamp(camera.position.z+e.deltaY*.003,2.35,7)}
 canvas.style.touchAction='none';canvas.addEventListener('pointerdown',downHandler);canvas.addEventListener('pointermove',moveHandler);canvas.addEventListener('pointerup',upHandler);canvas.addEventListener('pointercancel',cancelHandler);canvas.addEventListener('pointerleave',leaveHandler);canvas.addEventListener('wheel',wheelHandler,{passive:false});
 function resize(){if(disposed)return;const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 function render(){if(!shown||disposed||document.visibilityState==='hidden'){raf=0;return}renderer.render(scene,camera);raf=requestAnimationFrame(render)}
 function show(){if(disposed)return;shown=true;resize();if(document.visibilityState!=='hidden'&&!raf)raf=requestAnimationFrame(render)}
 function hide(){shown=false;if(raf)cancelAnimationFrame(raf);raf=0;onHover('')}
 function visibilityHandler(){if(document.visibilityState==='hidden'){if(raf)cancelAnimationFrame(raf);raf=0}else if(shown&&!disposed&&!raf){resize();raf=requestAnimationFrame(render)}}
 document.addEventListener('visibilitychange',visibilityHandler);
 function dispose(){if(disposed)return;hide();disposed=true;document.removeEventListener('visibilitychange',visibilityHandler);observer.disconnect();canvas.removeEventListener('pointerdown',downHandler);canvas.removeEventListener('pointermove',moveHandler);canvas.removeEventListener('pointerup',upHandler);canvas.removeEventListener('pointercancel',cancelHandler);canvas.removeEventListener('pointerleave',leaveHandler);canvas.removeEventListener('wheel',wheelHandler);scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()}});globeTexture.dispose();renderer.dispose()}
 resize();show();
 return {resize,show,hide,dispose,unmapped};
}
