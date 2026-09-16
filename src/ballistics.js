import {SHIP_LADDER,hullConfig,stationAnchors,sailConfig} from './ship-config.js';
export {SHIP_LADDER} from './ship-config.js';
import {shipToWorld,worldToShip} from './ship-pose.js';
import {ensureHullMask,maskSolid,maskSampleTimes,hullInside} from './hull-mask.js';
import {artRig,insidePolygon} from './ship-art-layout.js';
export {hullInside} from './hull-mask.js';
// Combat coordinates follow the supplied ship artwork with a uniform source-pixel scale.
export const BALLISTICS = Object.freeze({speed:4.8, gravity:3.2, minAngle:5, maxAngle:75, step:1/180, sea:-.67});

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const facing=side=>side==='enemy'?-1:1;
export const rigLayout=artRig;
export function ensureGeometry(f,side){
 f.x??=side==='enemy'?8.4:2.8;f.shipLevel??=Math.max(1,Math.min(6,(f.plates?.length||f.crew.length)-2));f.sailLevel??=5;const sections=f.legacySections||hullConfig(f.shipLevel).sections,rig=sailConfig(f.sailLevel);
 f.hullParts??=Array.from({length:sections},()=>({hp:f.hull/sections,maxHp:f.maxHull/sections}));
 f.mastParts??=Array.from({length:3},(_,i)=>({hp:rig.masts.includes(i)?80:0,maxHp:80}));
 f.sailParts??=rigLayout().sails.map(p=>({hp:rig.panels.includes(p.panel)?35*f.sails/100:0,maxHp:35}));
 ensureHullMask(f);return f;
}
export function stationPosition(f,slot){
 return stationAnchors(f.shipLevel).find(p=>p.slot===slot)||{x:0,y:-.52,port:true,width:0,height:0};
}
export function muzzle(f,side,g){
 const st=stationPosition(f,g.slot),dir=facing(side);
 return shipToWorld(f,dir,{x:st.x+.17*1.3,y:st.y+.23*1.3});
}
export function projectileFor(p){
 const mast=[10,16,26].includes(p.id),bonus=mast?'masts':p.primary;
 const type=mast?(p.id===10?'chain':'bolt'):p.id===6||p.id===21?'grape':p.tags.includes('burn')?'fire':bonus==='hull'?'iron':bonus==='sails'?'element':'bullet';
 return {name:p.projectile,type,bonus,icon:p.icon,count:type==='grape'?7:1,color:{iron:'#26343f',grape:'#32323c',fire:'#ff831b',chain:'#bac6cc',bolt:'#dfd4ae',element:'#73dfef',bullet:'#f1c769'}[type],effect:type==='fire'?'fire':type==='grape'?'grape':type==='chain'?'chain':type==='bolt'?'rail':'roundshot'};
}
export function collisionAt(f,side,point){
 const {x,y}=worldToShip(f,facing(side),point);if(x < -1.4 || x > 1.4 || y > 2.4 || y < -.67)return null;const rig=rigLayout(),activeRig=sailConfig(f.sailLevel);
 // Crew are separate sprites. Remaining hull texels occlude port crew; empty texels are open.
 const section=clamp(Math.floor((x+1.08)/2.44*f.hullParts.length),0,f.hullParts.length-1);
 const hull=maskSolid(f,x,y);
 for(const g of f.crew){
  if(g.hp<=0)continue;const q=stationPosition(f,g.slot);
  if(q.port&&(hull||!hullInside(x,y)))continue;
  if(Math.abs(x-q.x)<q.width/2&&y>=q.y&&y<=q.y+q.height)return {kind:'crew',id:g.id,slot:g.slot,x,y};
 }
 // Wood is a different object from the canvas attached to it.
 for(let i=0;i<rig.masts.length;i++){const m=rig.masts[i];if(activeRig.masts.includes(i)&&f.mastParts[i].hp>0&&Math.abs(x-m.x)<.031&&y>=m.foot&&y<=m.top&&!hull)return {kind:'masts',index:i,x,y};}
 // Fore cloth is painted over main cloth, which is painted over aft cloth.
 for(let i=rig.sails.length-1;i>=0;i--){const s=rig.sails[i];if(activeRig.panels.includes(s.panel)&&f.sailParts[i].hp>0&&f.mastParts[s.mast].hp>0&&Math.abs(x-s.x)<=s.halfW&&Math.abs(y-s.y)<=s.halfH&&insidePolygon(x,y,s.polygon))return {kind:'sails',index:i,x,y};}
 if(hull)return {kind:'hull',index:section,x,y};
 return null;
}
export function traceProjectile(f,side,origin,angle,speed=BALLISTICS.speed){
 const rad=angle*Math.PI/180,dir=facing(side),vx=speed*Math.cos(rad)*dir,vy=speed*Math.sin(rad);
 const path=[{...origin,t:0}],foe=side==='player'?'enemy':'player';
 let impact=null,last=path[0];

 outer:for(let t=BALLISTICS.step;t<=5;t+=BALLISTICS.step){
  const times=maskSampleTimes(f,facing(foe),origin,vx,vy,BALLISTICS.gravity,t-BALLISTICS.step,t);
  for(const sample of times){
   let p={x:origin.x+vx*sample,y:origin.y+vy*sample-.5*BALLISTICS.gravity*sample*sample,t:sample};
   const hit=collisionAt(f,foe,p);
   if(hit){
    let lo=last.t,hi=sample;
    for(let k=0;k<18;k++){const mid=(lo+hi)/2,q={x:origin.x+vx*mid,y:origin.y+vy*mid-.5*BALLISTICS.gravity*mid*mid};if(collisionAt(f,foe,q))hi=mid;else lo=mid;}
    p={x:origin.x+vx*hi,y:origin.y+vy*hi-.5*BALLISTICS.gravity*hi*hi,t:hi};impact=collisionAt(f,foe,p)||hit;path.push(p);break outer;
   }
   if(p.y<=BALLISTICS.sea){const ts=(vy+Math.sqrt(vy*vy+2*BALLISTICS.gravity*(origin.y-BALLISTICS.sea)))/BALLISTICS.gravity;p={x:origin.x+vx*ts,y:BALLISTICS.sea,t:ts};path.push(p);break outer;}
   last=p;
  }
  path.push(last);if(Math.abs(last.x)>20)break;
 }
 return {path,impact,duration:path.at(-1).t};
}
export function trajectory(b,side,g,spec,angle){
 const own=ensureGeometry(b[side],side),otherSide=side==='player'?'enemy':'player',foe=ensureGeometry(b[otherSide],otherSide);
 const origin=muzzle(own,side,g),shots=Array.from({length:spec.count},(_,i)=>{const a=angle+(spec.count===1?0:(i-(spec.count-1)/2)*.8);return {...traceProjectile(foe,side,origin,a,spec.speed),angle:a};});
 return {side,gunnerId:g.id,angle,spec,origin,shots,duration:Math.max(...shots.map(s=>s.duration))};
}
export function pointAt(path,t){
 let lo=0,hi=path.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(path[mid].t<t)lo=mid;else hi=mid;}
 const a=path[lo],b=path[hi],r=clamp((t-a.t)/(b.t-a.t||1),0,1);return {x:a.x+(b.x-a.x)*r,y:a.y+(b.y-a.y)*r};
}

export function parabolicPath(origin,side,speed,angle,duration,end){
 const rad=angle*Math.PI/180,vx=speed*Math.cos(rad)*facing(side),vy=speed*Math.sin(rad),path=[{...origin,t:0}];
 for(let t=BALLISTICS.step;t<duration;t+=BALLISTICS.step)path.push({x:origin.x+vx*t,y:origin.y+vy*t-.5*BALLISTICS.gravity*t*t,t});
 path.push({...end});return path;
}
