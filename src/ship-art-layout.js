import {hullConfig} from './ship-config.js';
export {deckFoot} from './ship-config.js';
import {SHIP_ART} from './ship-art-data.js';
export {SHIP_ART};
export const ART_SCALE=1/480,ART_ORIGIN={x:810,y:960},ART_KEEL=-.56;
export const artToWorld=([x,y])=>({x:(x-810)*ART_SCALE,y:(960-y)*ART_SCALE+ART_KEEL});
export const worldToArt=({x,y})=>[810+x/ART_SCALE,960-(y-ART_KEEL)/ART_SCALE];
export const MAST_MOUNTS=SHIP_ART.masts.map(m=>m.pivot);
// Five cloth panels and two flags follow full-ship-template.JPG. Zone counts
// retain the existing eight sail-health entries and their mast ownership.
export const RIG_SAILS=[
 {id:'aft-lower',mast:0,part:0,yard:[[430,293],[663,344]],bottom:558,zones:3},
 {id:'main-lower',mast:1,part:1,yard:[[660,274],[989,333]],bottom:620,zones:2},
 {id:'main-upper',mast:1,part:0,upper:0,yard:[[741,153],[925,193]],bottom:307,zones:1},
 {id:'fore-lower',mast:2,part:2,yard:[[1042,357],[1265,396]],bottom:612,zones:1},
 {id:'fore-upper',mast:2,part:2,upper:1,yard:[[1085,248],[1226,280]],bottom:373,zones:1}
];
export const RIG_FLAGS=[{mast:1,part:0,origin:[810,24],width:126},{mast:2,part:1,origin:[1133,139],width:108}];
export const sailPanels=set=>RIG_SAILS.map(s=>s.upper!==undefined&&set.id==='IMG_7255'?SHIP_ART.upperSails[s.upper]:set.sails[s.part]);
export const SAIL_STYLES=[['IMG_7254','Emerald Roger'],['IMG_7255','Crimson Roger'],['IMG_7256','Royal Blue'],['IMG_7257','White Pearl'],['IMG_7258','Black Flag'],['IMG_7261','Golden Star']];
export function shipAppearance(level=3,cosmetic=null,side='player',plating='bare'){
 const hull=hullConfig(level).hull;
 return {hull:SHIP_ART.hulls.find(h=>h.id===hull),sails:SHIP_ART.sailSets.find(s=>s.id===(SAIL_STYLES[cosmetic]?.[0]||(side==='enemy'?'IMG_7256':'IMG_7255'))),flag:SHIP_ART.flags.find(f=>f.id===7)};
}
export function clothPlacement(index,part){
 const spec=RIG_SAILS[index],[a,b]=part.attachment,[u,v]=spec.yard;
 let scale=Math.hypot(v[0]-u[0],v[1]-u[1])/Math.hypot(b[0]-a[0],b[1]-a[1]);
 const angle=Math.atan2(v[1]-u[1],v[0]-u[0])-Math.atan2(b[1]-a[1],b[0]-a[0]);
 const center=[(a[0]+b[0])/2,(a[1]+b[1])/2],target=[(u[0]+v[0])/2,(u[1]+v[1])/2];
 const height=Math.max(...part.outline.map(([x,y])=>(x-center[0])*Math.sin(angle)+(y-center[1])*Math.cos(angle)));
 scale=Math.min(scale,(spec.bottom-target[1])/height);
 const point=([x,y])=>[target[0]+scale*((x-center[0])*Math.cos(angle)-(y-center[1])*Math.sin(angle)),target[1]+scale*((x-center[0])*Math.sin(angle)+(y-center[1])*Math.cos(angle))];
 return {scale,angle,origin:point([0,0]),point};
}
export function insidePolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
const canonical=SHIP_ART.sailSets.find(s=>s.id==='IMG_7255');
const rig={masts:SHIP_ART.masts.map((m,i)=>{const [dx,dy]=[MAST_MOUNTS[i][0]-m.pivot[0],MAST_MOUNTS[i][1]-m.pivot[1]],foot=artToWorld(MAST_MOUNTS[i]),tip=artToWorld([m.flagAnchor[0]+dx,m.flagAnchor[1]+dy]);return {x:foot.x,foot:foot.y,top:tip.y};}),sails:[]};
sailPanels(canonical).forEach((s,panel)=>{const {mast,zones:n}=RIG_SAILS[panel],place=clothPlacement(panel,s),polygon=s.outline.map(p=>artToWorld(place.point(p))),xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);for(let j=0;j<n;j++)rig.sails.push({mast,panel,x:(left+right)/2,y:bottom+(j+.5)*(top-bottom)/n,halfW:(right-left)/2,halfH:(top-bottom)/(2*n),polygon});});
export const artRig=()=>rig;
// Feet follow the visible deck; the hold crew use the lower interior deck.
