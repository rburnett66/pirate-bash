// Presentation math: no collision forecasts or changes to the combat simulation.
export const COMBAT_TIMING=Object.freeze({hitHoldMs:3000,finalExplosionHoldMs:5000});
export function cutawaySide({phase,pending},busy,attacker,view,focus){
 if(view==='celebrate')return focus;
 if(phase==='result')return null;
 if(pending?.side)return pending.side==='player'?'player':null;
 // Keep the defender intact while the resolved shot is still being watched.
 if(busy)return attacker==='player'?'player':null;
 return phase==='player'?'player':null;
}
export function battleCamera(width,height,playerX,enemyX,mode='crew',targetX=enemyX){
 const close=mode==='crew',span=close?4.5:Math.max(7.5,enemyX-playerX+3.5);
 const usable=Math.max(80,height-55),ppu=Math.min(width/span,usable/(close?2.1:2.6));
 const wanted=close?playerX:mode==='impact'?(playerX+enemyX)/2+(targetX-(playerX+enemyX)/2)*.13:(playerX+enemyX)/2;
 const center=close?wanted:Math.max(enemyX+1.4-width/(2*ppu),Math.min(playerX-1.4+width/(2*ppu),wanted));
 return {ppu,ox:width/2-center*ppu,oy:close?usable*.63:usable-.8*ppu};
}
export function aimDots(origin,speed,angle,distance,count=9){
 const a=angle*Math.PI/180,vx=speed*Math.cos(a),vy=speed*Math.sin(a);
 // A short hint, never a forecast of the collision or landing point.
 const duration=Math.min(.45,Math.abs(distance)*.15/speed);
 return Array.from({length:count},(_,i)=>{const t=duration*i/(count-1);return {x:origin.x+vx*t,y:origin.y+vy*t-1.6*t*t,r:4.8-3.1*i/(count-1)};});
}
export function dragAim(start,pointer){
 const x=pointer.x-start.x,y=start.y-pointer.y,length=Math.hypot(x,y),angle=Math.atan2(y,x)*180/Math.PI;
 return {moved:length>=10,cancel:x<=0||angle>=82||angle<0,angle:Math.max(5,Math.min(75,Math.round(angle)))};
}
export function crewReaction(event,maxHull,kills=0){
 if(!event?.hit)return {level:0,text:'Ahh…',notes:[180,125]};
 if(kills>0)return {level:4,text:'YO-HO-HO!',notes:[330,440,550,660]};
 const ratio=event.damage/maxHull;
 if(ratio>=.12)return {level:3,text:'Give ’em another!',notes:[300,400,500]};
 if(ratio>=.045)return {level:2,text:'Aye! A direct hit!',notes:[280,360,440]};
 return {level:1,text:'That’s a hit!',notes:[250,320]};
}
