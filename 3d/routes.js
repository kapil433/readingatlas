/**
 * Compute a collision-free x/z route within a floor. Obstacles are axis-aligned
 * rectangles; their edges are padded by `clearance` (default 0.25).
 *
 * Bounds and rectangles use { x1, x2, z1, z2 }. Start and end use { x, z }.
 * Returns waypoints including exact endpoints, or [] if no safe route is found.
 * A bounded cardinal-grid A* is used; the finite grid/search caps keep route
 * finding responsive. Endpoints must lie in clear, navigable space.
 */
export function findRoute({start,end,bounds,obstacles=[],step=1.5,clearance=.25,maxVisited=30000}) {
  const finite=Number.isFinite;
  if(!start||!end||!bounds||![start.x,start.z,end.x,end.z,bounds.x1,bounds.x2,bounds.z1,bounds.z2,step,clearance].every(finite)||step<=0||clearance<0||bounds.x2<=bounds.x1||bounds.z2<=bounds.z1)return [];
  const minX=bounds.x1,maxX=bounds.x2,minZ=bounds.z1,maxZ=bounds.z2;
  const within=p=>p.x>=minX&&p.x<=maxX&&p.z>=minZ&&p.z<=maxZ;
  if(!within(start)||!within(end))return [];
  const rects=obstacles.filter(o=>o&&[o.x1,o.x2,o.z1,o.z2].every(finite)&&o.x2>=o.x1&&o.z2>=o.z1).map(o=>({x1:o.x1-clearance,x2:o.x2+clearance,z1:o.z1-clearance,z2:o.z2+clearance}));
  const blocked=p=>rects.some(r=>p.x>=r.x1&&p.x<=r.x2&&p.z>=r.z1&&p.z<=r.z2);
  if(blocked(start)||blocked(end))return [];
  function intersects(a,b,r){
    // Liang–Barsky segment-vs-rectangle clip; touching is treated as a hit.
    let lo=0,hi=1,dx=b.x-a.x,dz=b.z-a.z;
    for(const [p,q] of [[-dx,a.x-r.x1],[dx,r.x2-a.x],[-dz,a.z-r.z1],[dz,r.z2-a.z]]){
      if(Math.abs(p)<1e-12){if(q<0)return false;continue}
      const v=q/p;if(p<0){if(v>hi)return false;lo=Math.max(lo,v)}else{if(v<lo)return false;hi=Math.min(hi,v)}
    }
    return lo<=hi;
  }
  const clear=(a,b)=>rects.every(r=>!intersects(a,b,r));
  if(clear(start,end))return [{x:start.x,z:start.z},{x:end.x,z:end.z}];
  const nx=Math.floor((maxX-minX)/step)+1,nz=Math.floor((maxZ-minZ)/step)+1,total=nx*nz;
  if(!Number.isSafeInteger(total)||total<=0||total>120000)return [];
  const point=(ix,iz)=>({x:minX+ix*step,z:minZ+iz*step});
  function anchor(p){
    const cx=Math.round((p.x-minX)/step),cz=Math.round((p.z-minZ)/step);let best=null,bestD=Infinity;
    for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){
      let x=cx+dx,z=cz+dz;if(x<0||x>=nx||z<0||z>=nz)continue;
      let q=point(x,z),d=(q.x-p.x)**2+(q.z-p.z)**2;if(d>=bestD||blocked(q)||!clear(p,q))continue;best={x,z};bestD=d;
    }
    return best;
  }
  const a=anchor(start),b=anchor(end);if(!a||!b)return [];
  const sid=a.z*nx+a.x,eid=b.z*nx+b.x;
  const g=new Float64Array(total);g.fill(Infinity);g[sid]=0;
  const parent=new Int32Array(total);parent.fill(-1);const closed=new Uint8Array(total);
  const heap=[];
  function push(item){let i=heap.length;heap.push(item);while(i>0){let p=(i-1)>>1;if(heap[p].f<=item.f)break;heap[i]=heap[p];i=p}heap[i]=item}
  function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let l=i*2+1,r=l+1;if(l>=heap.length)break;let c=r<heap.length&&heap[r].f<heap[l].f?r:l;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c}heap[i]=last}return first}
  const heuristic=(x,z)=>Math.abs(x-b.x)+Math.abs(z-b.z);push({id:sid,f:heuristic(a.x,a.z)});let visited=0,found=false;const cap=Math.max(1,Math.min(total,Number.isFinite(maxVisited)?Math.floor(maxVisited):30000));
  while(heap.length&&visited<cap){const node=pop(),id=node.id;if(closed[id])continue;closed[id]=1;visited++;if(id===eid){found=true;break}const x=id%nx,z=Math.floor(id/nx),from=point(x,z);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const px=x+dx,pz=z+dz;if(px<0||px>=nx||pz<0||pz>=nz)continue;const nid=pz*nx+px;if(closed[nid])continue;const to=point(px,pz);if(blocked(to)||!clear(from,to))continue;const ng=g[id]+1;if(ng>=g[nid])continue;g[nid]=ng;parent[nid]=id;push({id:nid,f:ng+heuristic(px,pz)});}
  }
  if(!found)return [];
  let ids=[],id=eid;while(id!==-1){ids.push(id);if(id===sid)break;id=parent[id]}if(ids.at(-1)!==sid)return [];ids.reverse();
  // Simplify without crossing obstacles: preserve all corners, remove only
  // exactly collinear grid points, then omit duplicate endpoint anchors.
  const raw=[{x:start.x,z:start.z},...ids.map(i=>point(i%nx,Math.floor(i/nx))),{x:end.x,z:end.z}];
  const dedup=[];for(const p of raw){let q=dedup.at(-1);if(!q||Math.abs(q.x-p.x)>1e-9||Math.abs(q.z-p.z)>1e-9)dedup.push(p)}
  const out=[];for(const p of dedup){while(out.length>=2){const a=out[out.length-2],b=out[out.length-1];if(Math.abs((b.x-a.x)*(p.z-b.z)-(b.z-a.z)*(p.x-b.x))>1e-9||!clear(a,p))break;out.pop()}out.push(p)}
  return out;
}
