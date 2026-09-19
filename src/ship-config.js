import {ECON} from './catalog.js';

// Shared by progression, combat geometry and the ship renderer.
export const PROGRESSION_VERSION=2;
export const SHIP_LADDER={1:[2,1],2:[2,2],3:[3,2],4:[3,3],5:[4,3],6:[4,4]};
export const SHIP_TUNING={baseMove:.3,moveGain:.05,figureBonus:.05,figureGradeGain:.025};
const deckSurface=[[-1,.28],[-.63,.14],[-.38,.096],[0,.04],[.25,.059],[.65,.128],[1,.16]];
export function deckFoot(x){for(let i=1;i<deckSurface.length;i++){const a=deckSurface[i-1],b=deckSurface[i];if(x<=b[0]){const t=Math.max(0,(x-a[0])/(b[0]-a[0]));return a[1]+(b[1]-a[1])*t;}}return .1;}
// Port widths and clear gaps include equal margins at both ends of the gun deck.
export const PORT_LAYOUT={left:-.95,right:.95,width:{1:.22,2:.17,3:.20,4:.20}};
export const hullStretch=level=>{const n=SHIP_LADDER[level]?.[1]||1;return n===4?1.24:n===3?1.12:1;};
const anchors=(n,port)=>Array.from({length:n},(_,i)=>{
 const portWidth=PORT_LAYOUT.width[n],gap=(PORT_LAYOUT.right-PORT_LAYOUT.left-n*portWidth)/(n+1);
 const x=port?PORT_LAYOUT.left+gap+portWidth/2+i*(portWidth+gap):n===1?0:(i/(n-1)-.5)*1.45;
 return {slot:(port?'h':'d')+i,x,y:port?-.54:deckFoot(x),port,portWidth,width:.32*1.3,height:.44*1.3};
});
export const HULLS=Object.entries(SHIP_LADDER).map(([key,[deck,hold]],i)=>({
 level:+key,hull:'revised-hull',
 inner:'bodies/xray-hull-nomast-right.png',hp:540+i*40,movement:1+i*SHIP_TUNING.moveGain,
 deck,hold,capacity:deck+hold,sections:deck+hold,ports:hold,
 deckAnchors:anchors(deck,false),holdAnchors:anchors(hold,true),
 cost:i<5?{...ECON.SHIP[i+2]}:null
}));
export const hullConfig=level=>HULLS.find(h=>h.level===level)||HULLS[0];
export const stationAnchors=level=>{const h=hullConfig(level);return [...h.deckAnchors,...h.holdAnchors];};
export const SAIL_LEVELS=[
 {level:1,masts:[1],panels:[1],cost:{wood:80,cloth:100}},
 {level:2,masts:[1,2],panels:[1,3],cost:{wood:150,cloth:180}},
 {level:3,masts:[1,2],panels:[1,2,3],cost:{wood:250,cloth:280}},
 {level:4,masts:[0,1,2],panels:[0,1,2,3],cost:{wood:400,cloth:400}},
 {level:5,masts:[0,1,2],panels:[0,1,2,3,4],cost:null},
 {level:6,masts:[0,1,2],panels:[0,1,2,3,4,5],future:true,attachment:'front-jib',cost:null},
 {level:7,masts:[0,1,2],panels:[0,1,2,3,4,5,6],future:true,attachment:'rear-spanker',cost:null}
];
export const sailConfig=(level=5)=>SAIL_LEVELS.find(s=>s.level===level)||SAIL_LEVELS[4];
export const FIGUREHEADS=[
 ['siren','Siren','fireResistance','Fire resistance',4000,110],
 ['unicorn','Unicorn','cannonResistance','Cannon resistance',4000,110],
 ['skull','Skull','crewProtection','Crew protection',4000,110],
 ['dolphin','Dolphin','movement','Movement',2500,60],
 ['endowed-female','Endowed Female','cannonAttack','Cannon attack',4000,110],
 ['shark','Shark','crewAttack','Crew attack',12000,380],
 ['asian-dragon','Asian Dragon','fireAttack','Fire attack',20000,650]
].map(([id,name,bonusType,label,gold,gems])=>({id,name,bonusType,label,gold,gems,asset:null}));
export const figureConfig=id=>FIGUREHEADS.find(f=>f.id===id);
export function figureBonus(f,type){return figureConfig(f.figure??f.figurehead)?.bonusType===type?SHIP_TUNING.figureBonus+Math.max(0,(f.figureGrade??f.figureheads?.[f.figurehead]??1)-1)*SHIP_TUNING.figureGradeGain:0;}
export const FLAGS=Array.from({length:33},(_,i)=>({id:i+1,name:'Pirate flag '+(i+1),image:'flags/parts/flag-'+String(i+1).padStart(2,'0')+'.png',cost:{gold:250+(i%6)*100}}));
export const hullSections=s=>hullConfig(s.shipLevel).sections;
