import {BALLISTICS,collisionAt,facing,parabolicPath} from './ballistics.js';
import {maskSampleTimes} from './hull-mask.js';
import {worldToShip} from './ship-pose.js';
export const poseOf=f=>({heave:f.pose?.heave||0,roll:f.pose?.roll||0});
export function seaShot(origin,side,speed,angle){
 const rad=angle*Math.PI/180,vy=speed*Math.sin(rad),duration=(vy+Math.sqrt(vy*vy+2*BALLISTICS.gravity*(origin.y-BALLISTICS.sea)))/BALLISTICS.gravity;
 const end={x:origin.x+facing(side)*speed*Math.cos(rad)*duration,y:BALLISTICS.sea,t:duration};
 return {angle,duration,impact:null,path:parabolicPath(origin,side,speed,angle,duration,end)};
}
// Sweep in ship-local space so moving wood cannot skip over a projectile.
// Tiny time slices bound rotation/arc curvature; exact grid crossings sample every crossed texel.
export function movingContact(f,side,origin,speed,angle,from,to,previousPose,frameFrom=from,frameTo=to){
 if(to<=from)return null;
 const rad=angle*Math.PI/180,vx=facing(side)*speed*Math.cos(rad),vy=speed*Math.sin(rad),current=poseOf(f),body={...f,x:0,pose:null};
 const local=t=>{
  const r=Math.max(0,Math.min(1,(t-frameFrom)/(frameTo-frameFrom||1)));
  const pose={heave:previousPose.heave+(current.heave-previousPose.heave)*r,roll:previousPose.roll+(current.roll-previousPose.roll)*r};
  return worldToShip({...f,pose},-facing(side),{x:origin.x+vx*t,y:origin.y+vy*t-.5*BALLISTICS.gravity*t*t});
 };
 const steps=Math.max(1,Math.ceil((to-from)*360),Math.ceil(Math.abs(current.roll-previousPose.roll)/.001),Math.ceil(Math.abs(current.heave-previousPose.heave)/.002));
 let ta=from,a=local(ta);
 for(let n=1;n<=steps;n++){
  const tb=from+(to-from)*n/steps,b=local(tb),times=maskSampleTimes(body,1,a,b.x-a.x,b.y-a.y,0,0,1);
  let last=ta;
  for(const r of [0,...times]){
   const t=ta+(tb-ta)*r,p=local(t),hit=collisionAt(body,'player',p);
   if(hit){
    let lo=last,hi=t;
    for(let k=0;k<14;k++){const mid=(lo+hi)/2;if(collisionAt(body,'player',local(mid)))hi=mid;else lo=mid;}
    const impact=collisionAt(body,'player',local(hi))||hit;
    return {impact,duration:hi,end:{x:origin.x+vx*hi,y:origin.y+vy*hi-.5*BALLISTICS.gravity*hi*hi,t:hi}};
   }
   last=t;
  }
  ta=tb;a=b;
 }
 return null;
}
