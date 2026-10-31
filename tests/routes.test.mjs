import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findRoute} from '../3d/routes.js';
const bounds={x1:0,x2:20,z1:0,z2:20};
function avoids(route,box,padding){const r={x1:box.x1-padding,x2:box.x2+padding,z1:box.z1-padding,z2:box.z2+padding};for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i];for(let k=0;k<=200;k++){let t=k/200,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;assert.ok(!(x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2),`segment ${i} intersects obstacle at ${x},${z}`)}}}
test('direct routes preserve exact endpoints',()=>{const start={x:2,z:2},end={x:18,z:18};assert.deepEqual(findRoute({start,end,bounds}),[start,end])});
test('routes detour around padded obstacles without crossing them',()=>{const obstacle={x1:8,x2:12,z1:3,z2:17},start={x:3,z:10},end={x:17,z:10},clearance=.25;const route=findRoute({start,end,bounds,obstacles:[obstacle],step:1,clearance});assert.ok(route.length>=3);assert.deepEqual(route[0],start);assert.deepEqual(route.at(-1),end);avoids(route,obstacle,clearance)});
test('blocked or outside endpoints and unreachable partitions return no route',()=>{const wall={x1:9,x2:11,z1:0,z2:20};assert.deepEqual(findRoute({start:{x:3,z:3},end:{x:10,z:10},bounds,obstacles:[wall]}),[]);assert.deepEqual(findRoute({start:{x:-1,z:1},end:{x:10,z:10},bounds}),[]);assert.deepEqual(findRoute({start:{x:3,z:3},end:{x:17,z:3},bounds,obstacles:[wall],step:1}),[])});
test('invalid geometry or excessive search grids fail safely',()=>{const start={x:1,z:1},end={x:19,z:19};assert.deepEqual(findRoute({start,end,bounds,step:0}),[]);assert.deepEqual(findRoute({start,end,bounds,clearance:-1}),[]);assert.deepEqual(findRoute({start,end,bounds,step:.001,obstacles:[{x1:8,x2:12,z1:0,z2:19}]}),[])});
