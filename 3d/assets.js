// Licensed, commit-pinned external figures. Static room geometry remains usable if the CDN fails.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const CHARACTER = 'https://cdn.jsdelivr.net/gh/KenneyNL/Starter-Kit-3D-Platformer@3fa8a04b1c01ab23db43123d4ce814a34c3fc7f0/models/character.glb';
let characterPromise;
const FURNITURE_BASE='https://cdn.jsdelivr.net/gh/yadneshSalvi/hearth-webmcp@617d6073a557cbc2f0f2ac917916e01b9c4b631b/public/assets/glb/';
const furniturePromises=new Map(),loadedRoles=new Set();
function markLoaded(role){loadedRoles.add(role);const canvas=document.querySelector('#scene');if(canvas)canvas.dataset.loadedAssets=[...loadedRoles].join(' ');}
async function loadModel(url){
 const raw=url.replace('https://cdn.jsdelivr.net/gh/','https://raw.githubusercontent.com/').replace('@','/');let failure;
 for(const source of [url,raw]){try{const response=await fetch(source,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`Model request ${response.status}`);return await new GLTFLoader().parseAsync(await response.arrayBuffer(),source.slice(0,source.lastIndexOf('/')+1));}catch(error){failure=error;}}
 throw failure;
}
function furniture(file){if(!furniturePromises.has(file))furniturePromises.set(file,loadModel(FURNITURE_BASE+file));return furniturePromises.get(file);}
function source() {
 if (!characterPromise) characterPromise = loadModel(CHARACTER);
 return characterPromise;
}

// Call only after all gallery instances have been disposed. Pending loads are also reclaimed.
export function disposeGalleryAssetCache(){
 const pending=[characterPromise,...furniturePromises.values()].filter(Boolean);characterPromise=null;furniturePromises.clear();loadedRoles.clear();
 for(const promise of pending)promise.then(gltf=>{const geometries=new Set(),materials=new Set(),textures=new Set();gltf.scene.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of(Array.isArray(n.material)?n.material:n.material?[n.material]:[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>{x.dispose();x.source?.data?.close?.();});}).catch(()=>{});
}

export function loadGalleryAssets({ THREE:T, parent, floor=0, hostPlaceholder, readerPlaceholder, furniturePlaceholder, onLibrarian }) {
 const figures = new T.Group(); figures.name='Licensed gallery figures'; parent.add(figures);
 const mixers=[]; let disposed=false, elapsed=0;
 // This group owns cloned materials, but geometry/textures are shared with the cached model.
 function addFigure(gltf,x,z,height,turn=0,interactive=false) {
  const model=clone(gltf.scene); const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const scale=height/Math.max(size.y,.01);model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  const wrapper=new T.Group();wrapper.add(model);wrapper.position.set(x,.22,z);wrapper.rotation.y=turn;figures.add(wrapper);
  model.traverse(n=>{if(n.isMesh){n.frustumCulled=false; n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();n.castShadow=false;}});
  const idle=gltf.animations.find(a=>/idle/i.test(a.name));
  if(idle){const mixer=new T.AnimationMixer(model);mixer.clipAction(idle).play();mixers.push(mixer);}
  wrapper.name=interactive?'Kenney librarian':'Kenney library visitor';wrapper.userData.assetRole=interactive?'librarian':'visitor';
  if(interactive){wrapper.userData.action=onLibrarian;wrapper.userData.label='Ask the librarian';model.traverse(n=>{if(n.isMesh){n.userData.action=onLibrarian;n.userData.label='Ask the librarian';}});}
  return wrapper;
 }
 const ready=source().then(gltf=>{
  if(disposed)return false;
  addFigure(gltf,-2.6,4.4,1.8,0,true);
  // An additional visitor gives the reading island scale and a quietly inhabited atmosphere.
  addFigure(gltf,18.3,6,1.65,-Math.PI/2,false);
  if(hostPlaceholder)hostPlaceholder.visible=false;
  if(readerPlaceholder)readerPlaceholder.visible=false;
  markLoaded('librarian');markLoaded('visitor');
  figures.userData.loaded=true;return true;
 }).catch(()=>false);
 // Furniture appears only as a complete set, keeping the procedural fallback intact on partial failure.
 const furnitureReady=Promise.all(['desk-aalto.glb','chair-olve.glb','floor-lamp-arc.glb'].map(furniture)).then(models=>{
  if(disposed||!furniturePlaceholder)return false;
  const specs=[{x:16,z:6,height:1.18,role:'writing-desk'},{x:16,z:7.5,height:1.45,role:'desk-chair'},{x:19.6,z:8.7,height:2.4,role:'floor-lamp'}];
  models.forEach((gltf,i)=>{const s=specs[i],model=clone(gltf.scene),b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3()),scale=s.height/Math.max(size.y,.01);model.scale.setScalar(scale);model.position.set(s.x-center.x*scale,.22-b.min.y*scale,s.z-center.z*scale);model.name='Kenney '+s.role;model.userData.assetRole=s.role;model.traverse(n=>{if(n.isMesh)n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();});figures.add(model);markLoaded(s.role);});
  furniturePlaceholder.visible=false;return true;
 }).catch(error=>{const canvas=document.querySelector('#scene');if(canvas)canvas.dataset.furnitureError=String(error.message||error);return false;});
 return {ready,furnitureReady,group:figures,update(delta=0,motion=true){if(disposed||!motion)return;elapsed+=Math.min(Math.max(delta,0),.05);for(const mixer of mixers)mixer.update(Math.min(Math.max(delta,0),.05));},dispose(){disposed=true;for(const mixer of mixers){mixer.stopAllAction();mixer.uncacheRoot(mixer.getRoot());}figures.traverse(n=>{if(n.isMesh){for(const m of(Array.isArray(n.material)?n.material:[n.material]))m.dispose();}});figures.removeFromParent();}};
}
