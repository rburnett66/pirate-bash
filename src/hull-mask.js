import {localParabola} from './ship-pose.js';
import {ART_HULL_BITS} from './ship-art-mask.js';
import {LEGACY_ART_HULL_BITS} from './legacy-ship-art-mask.js';

// One material bit per texel. Rendering and ballistics consume this same saved mask.
export const HULL_MASK=Object.freeze({width:512,height:320,left:-1.4,bottom:-.8,spanX:2.8,spanY:1.6,version:3});
const C=HULL_MASK,DX=C.spanX/C.width,DY=C.spanY/C.height,N=C.width*C.height,BYTES=N/8;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function legacyHullInside(x,y){
 const deck=.34*(1+.42*x*x),ax=Math.min(Math.abs(x),1),keel=-.56*Math.sqrt(Math.max(0,1-Math.pow(ax,x>0?1.8:3))),up=clamp(y/.34,0,1.6);
 return Math.min(deck-y,y-keel,1+.22*up-x,x+1+.04*up)>=0;
}
export function pixelPoint(col,row){return {x:C.left+(col+.5)*DX,y:C.bottom+(row+.5)*DY};}
export function hullSection(x,count){return clamp(Math.floor((x+1.08)/2.44*count),0,count-1);}
const initial=new Uint8Array(N);
const artBits=atob(ART_HULL_BITS),legacy=new Uint8Array(N);
const previousBits=atob(LEGACY_ART_HULL_BITS),previous=new Uint8Array(N);
for(let i=0;i<N;i++)previous[i]=(previousBits.charCodeAt(i>>3)&(1<<(i&7)))?255:0;
for(let i=0;i<N;i++){initial[i]=(artBits.charCodeAt(i>>3)&(1<<(i&7)))?255:0;const p=pixelPoint(i%C.width,Math.floor(i/C.width));if(legacyHullInside(p.x,p.y))legacy[i]=255;}
export function hullInside(x,y){const col=Math.floor((x-C.left)/DX),row=Math.floor((y-C.bottom)/DY);return col>=0&&col<C.width&&row>=0&&row<C.height&&initial[row*C.width+col]>0;}
const initialCount=initial.reduce((s,p)=>s+(p>0),0),sectionCache=new Map(),cache=new WeakMap();
function sectionCounts(pixels,count){
 const counts=new Array(count).fill(0);
 for(let x=0;x<C.width;x++){let n=0;for(let y=0;y<C.height;y++)if(pixels[y*C.width+x])n++;counts[hullSection(C.left+(x+.5)*DX,count)]+=n;}
 return counts;
}
function startingCounts(count){if(!sectionCache.has(count))sectionCache.set(count,sectionCounts(initial,count));return sectionCache.get(count);}
export function encodeHullPixels(pixels){
 if(pixels.length!==N)throw Error('Invalid hull pixel dimensions');
 const bits=new Uint8Array(BYTES);
 for(let i=0;i<N;i++)if(pixels[i]&&initial[i])bits[i>>3]|=1<<(i&7);
 return btoa(String.fromCharCode(...bits));
}
function decode(bits,basis=initial){
 if(typeof bits!=='string'||bits.length!==Math.ceil(BYTES/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(bits))throw Error('Invalid hull mask');
 const raw=atob(bits);if(raw.length!==BYTES)throw Error('Invalid hull mask length');
 const pixels=new Uint8Array(N);
 for(let i=0;i<N;i++)if(raw.charCodeAt(i>>3)&(1<<(i&7))){if(!basis[i])throw Error('Material outside hull silhouette');pixels[i]=255;}
 return pixels;
}
function install(f,pixels){
 for(let i=0;i<N;i++)pixels[i]=pixels[i]&&initial[i]?255:0;
 const bits=encodeHullPixels(pixels);f.hullMask={version:C.version,bits};
 cache.set(f.hullMask,{bits,pixels});return pixels;
}
export function ensureHullMask(f){
 if(f.hullMask)return maskPixels(f);
 const pixels=initial.slice(),parts=f.hullParts;
 // Legacy saves have section health but no holes. Convert once, preserving each section's material fraction.
 if(parts?.length){
  const counts=startingCounts(parts.length),remove=parts.map((p,i)=>Math.round(counts[i]*(1-clamp(p.hp/p.maxHp,0,1))));
  for(let x=C.width-1;x>=0;x--){const s=hullSection(C.left+(x+.5)*DX,parts.length);for(let y=0;y<C.height&&remove[s]>0;y++){const i=y*C.width+x;if(pixels[i]){pixels[i]=0;remove[s]--;}}}
 }
 install(f,pixels);if(f.hullParts&&f.maxHull)syncHullHealth(f);return pixels;
}
export function maskPixels(f){
 if(!f.hullMask)return ensureHullMask(f);
 if(f.hullMask.version===1||f.hullMask.version===2){
  // Validate the old bitmap before migrating. Preserve each section's saved
  // condition when moving from the prototype silhouette to the supplied art.
  const basis=f.hullMask.version===1?legacy:previous;
  const old=decode(f.hullMask.bits,basis),count=f.hullParts?.length||f.shipLevel||1;
  const full=sectionCounts(basis,count),remaining=sectionCounts(old,count),max=(f.maxHull||1)/count;
  f.hullParts=remaining.map((n,i)=>({maxHp:max,hp:full[i]?max*n/full[i]:0}));
  delete f.hullMask;return ensureHullMask(f);
 }
 if(f.hullMask.version!==C.version)throw Error('Unsupported hull mask');
 const entry=cache.get(f.hullMask);
 if(entry?.bits===f.hullMask.bits)return entry.pixels;
 const pixels=decode(f.hullMask.bits);cache.set(f.hullMask,{bits:f.hullMask.bits,pixels});return pixels;
}
export function maskSolid(f,x,y){
 const col=Math.floor((x-C.left)/DX),row=Math.floor((y-C.bottom)/DY);
 return col>=0&&col<C.width&&row>=0&&row<C.height&&maskPixels(f)[row*C.width+col]>0;
}
export function syncHullHealth(f){
 const count=f.hullParts?.length||f.shipLevel||1,full=startingCounts(count),remaining=sectionCounts(maskPixels(f),count),max=f.maxHull/count;
 f.hullParts=remaining.map((n,i)=>({maxHp:max,hp:full[i]?max*n/full[i]:0}));
 f.hull=Math.min(f.maxHull,f.hullParts.reduce((s,p)=>s+p.hp,0));return f.hull;
}
// Also used to construct deterministic saved battle fixtures.
export function replaceHullPixels(f,pixels){install(f,pixels.slice());syncHullHealth(f);}
const shapes={
 roundshot:{grain:1.5,ragged:.35,spikes:5,spikeDepth:.10},
 grape:{grain:1.2,ragged:.45,spikes:4,spikeDepth:.14},
 chain:{grain:2.6,ragged:.3,spikes:3,spikeDepth:.18},
 fire:{grain:1,ragged:.85,spikes:9,spikeDepth:.30},
 rail:{grain:3.4,ragged:.2,spikes:2,spikeDepth:.12}
};
export function chipHull(f,x,y,damage,effect='roundshot'){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(damage)||damage<=0)return 0;
 const pixels=maskPixels(f).slice(),shape=shapes[effect]||shapes.roundshot,before=f.hull;
 // The original prototype's grain, ragged rim and splinter spikes now carve real material.
 const area=initialCount*DX*DY*damage/f.maxHull;
 const radius=Math.max(DX*1.5,Math.sqrt(area*shape.grain/Math.PI)*1.3),reach=radius*1.5;
 const seed=x*17.3+y*11.9;
 const x0=clamp(Math.floor((x-reach-C.left)/DX),0,C.width-1),x1=clamp(Math.ceil((x+reach-C.left)/DX),0,C.width-1);
 const y0=clamp(Math.floor((y-reach/shape.grain-C.bottom)/DY),0,C.height-1),y1=clamp(Math.ceil((y+reach/shape.grain-C.bottom)/DY),0,C.height-1);
 let removed=0;
 for(let row=y0;row<=y1;row++)for(let col=x0;col<=x1;col++){
  const i=row*C.width+col;if(!pixels[i])continue;
  const p=pixelPoint(col,row),dx=p.x-x,dy=(p.y-y)*shape.grain,a=Math.atan2(dy,dx);
  const wob=.25*Math.sin(a*3+seed)+.12*Math.sin(a*7-seed);
  const edge=radius*(1+shape.ragged*wob+shape.spikeDepth*Math.max(0,Math.sin(a*shape.spikes+seed)));
  if(dx*dx+dy*dy<=edge*edge){pixels[i]=0;removed++;}
 }
 if(!removed)return 0;install(f,pixels);syncHullHealth(f);return before-f.hull;
}
// A creature crushes remaining wood, including the edges of an existing breach.
export function crushHull(f,x,y,damage){
 if(!Number.isFinite(damage)||damage<=0)return 0;
 const pixels=maskPixels(f).slice(),before=f.hull,target=Math.min(before,damage);
 const count=f.hullParts.length,full=startingCounts(count),candidates=[];
 for(let i=0;i<pixels.length;i++)if(pixels[i]){
  const p=pixelPoint(i%C.width,Math.floor(i/C.width)),dx=p.x-x,dy=(p.y-y)*1.5;
  candidates.push({i,score:(dx*dx+dy*dy)*(1+.08*Math.sin(i*.37)),hp:f.maxHull/count/full[hullSection(p.x,count)]});
 }
 candidates.sort((a,b)=>a.score-b.score||a.i-b.i);let removed=0;
 for(const p of candidates){if(removed>=target)break;pixels[p.i]=0;removed+=p.hp;}
 install(f,pixels);syncHullHealth(f);return before-f.hull;
}
// Exact parabola crossings of mask grid lines. Sampling every crossed cell prevents pixel tunnelling.

export function maskSampleTimes(f,dir,origin,vx,vy,gravity,t0,t1){
 const q=localParabola(f,dir,origin,vx,vy,gravity),at=(v,t)=>v[0]+v[1]*t+v[2]*t*t;
 const extent=v=>{const a=at(v,t0),b=at(v,t1),t=-v[1]/(2*v[2]);return t>t0&&t<t1?[Math.min(a,b,at(v,t)),Math.max(a,b,at(v,t))]:[Math.min(a,b),Math.max(a,b)];};
 const [xmin,xmax]=extent(q.x),[ymin,ymax]=extent(q.y);
 if(xmax<C.left||xmin>C.left+C.spanX||ymin>C.bottom+C.spanY||ymax<C.bottom)return [t1];
 const times=[t0,t1],add=t=>{if(t>t0+1e-12&&t<t1-1e-12)times.push(t);};
 for(const [v,lo,hi,base,step,count] of [[q.x,xmin,xmax,C.left,DX,C.width],[q.y,ymin,ymax,C.bottom,DY,C.height]]){
  for(let i=Math.max(0,Math.ceil((lo-base)/step));i<=Math.min(count,Math.floor((hi-base)/step));i++){
   const z=v[0]-base-i*step;
   if(Math.abs(v[2])<1e-12){if(Math.abs(v[1])>1e-12)add(-z/v[1]);}
   else{const d=v[1]*v[1]-4*v[2]*z;if(d>=0){add((-v[1]-Math.sqrt(d))/(2*v[2]));add((-v[1]+Math.sqrt(d))/(2*v[2]));}}
  }
 }
 times.sort((a,b)=>a-b);
 return times.slice(1).map((t,i)=>(times[i]+t)/2).concat(t1);
}
