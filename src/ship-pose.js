import {hullStretch} from './ship-config.js';

const PIVOT=-.29;
export function shipToWorld(f,dir,p){
 const {heave=0,roll=0}=f.pose||{},c=Math.cos(roll),s=Math.sin(roll),x=p.x*dir*hullStretch(f.shipLevel),y=p.y-PIVOT;
 return {x:f.x+c*x-s*y,y:PIVOT+heave+s*x+c*y};
}
export function worldToShip(f,dir,p){
 const {heave=0,roll=0}=f.pose||{},c=Math.cos(roll),s=Math.sin(roll),x=p.x-f.x,y=p.y-PIVOT-heave;
 return {x:(c*x+s*y)*dir/hullStretch(f.shipLevel),y:PIVOT-s*x+c*y};
}
export function localParabola(f,dir,origin,vx,vy,g){
 const p=worldToShip(f,dir,origin),r=f.pose?.roll||0,c=Math.cos(r),s=Math.sin(r);
 return {x:[p.x,(c*vx+s*vy)*dir/hullStretch(f.shipLevel),-.5*g*s*dir/hullStretch(f.shipLevel)],y:[p.y,-s*vx+c*vy,-.5*g*c]};
}
