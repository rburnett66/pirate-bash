import {PROGRESSION_VERSION,SHIP_LADDER,hullConfig,hullSections,sailConfig,SAIL_LEVELS,figureConfig,figureBonus,FIGUREHEADS,FLAGS,SHIP_TUNING} from './ship-config.js';
export {hullConfig,hullSections,sailConfig,SAIL_LEVELS,FIGUREHEADS,FLAGS};
import {poseOf,seaShot,movingContact} from './moving-shot.js';
import {waterLibrary} from './ocean-settings.js';
import {chipHull,maskPixels} from './hull-mask.js';
import {ensureGeometry,trajectory,projectileFor,rigLayout,traceProjectile,muzzle,parabolicPath} from './ballistics.js';
export {projectileFor} from './ballistics.js';
import {ROSTER,ECON as E} from './catalog.js';
import {SPECIAL_ATTACKS,SPECIAL_TUNING} from './special-attacks.js';
export {SPECIAL_TUNING};
export {E};
export const PORT_REGIONS=[{name:'Europe',towns:['London','Calais','Lisbon']},{name:'Americas',towns:['Bermuda','Puerto Rico','Caracas','Seattle']},{name:'Africa / India',towns:['Mombasa','Madagascar','Mumbai']},{name:'Asia',towns:['Singapore','Manila','Hong Kong','Shanghai']},{name:'Pacific',towns:['Hawaii']}];
export const PORTS=PORT_REGIONS.flatMap(r=>r.towns);
export const LADDER=SHIP_LADDER;
export const BASE={hull:{hp:120,range:62,damage:46},sails:{hp:100,range:74,damage:30},crew:{hp:90,range:86,damage:22}};
export const PIRATES=ROSTER.map(([id,name,icon,projectile,tags])=>({id,name,icon,projectile,tags,primary:tags[0],rarity:id%12===0?'legendary':tags.length>1&&id%3===0?'epic':tags.length>1||id%4===0?'rare':'common'}));
export const FINISHERS=SPECIAL_ATTACKS;
const clone=x=>JSON.parse(JSON.stringify(x));
export function weekKey(t){const d=new Date(t);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
export const dayKey=t=>new Date(t).toISOString().slice(0,10);
export const seasonKey=t=>Math.floor(t/(28*86400000));
export function fresh(t=Date.now()){return migrate({version:1,progressionVersion:PROGRESSION_VERSION,sailLevel:1,flags:[7],flag:7,portLayout:2,name:'Captain',gold:1800,gems:40,mats:{wood:160,metal:80,cloth:100},shipLevel:1,levels:Object.fromEntries(PIRATES.map(p=>[p.id,[1,2,5,10].includes(p.id)?1:0])),cards:Object.fromEntries(PIRATES.map(p=>[p.id,0])),slots:{d0:1,d1:2,h0:5},moves:[0],move:0,xp:0,claims:[],premium:false,season:seasonKey(t),history:[],chests:[],chestRun:0,dailyChests:0,day:dayKey(t),week:weekKey(t),weeklyWins:0,trophies:0,lastWin:0,port:0,visited:[0],stock:{...E.SHOP_STOCK},settlements:[],bench:null,plating:'bare',canvas:'plain',durability:100,enh:{},figureheads:{},figurehead:null,cosmetics:[],cosmetic:null,quests:{matches:0,wins:0,dailyClaim:false,weeklyClaim:false},settings:{sound:true,motion:true},onboarded:false,battle:null,lastResult:null,deals:{},declined:{}},t);}
export function validate(s){
const bad=()=>{throw Error('Save is invalid')},obj=x=>x&&typeof x==='object'&&!Array.isArray(x),num=(x,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(x)&&x>=0&&x<=max,int=(x,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&num(x,max),bool=x=>typeof x==='boolean';
if(!obj(s)||s.version!==1||typeof s.name!=='string'||s.name.length>24||!LADDER[s.shipLevel]||s.progressionVersion!==PROGRESSION_VERSION||!Number.isInteger(s.sailLevel)||s.sailLevel<1||s.sailLevel>5||!Array.isArray(s.flags)||!s.flags.every(id=>FLAGS.some(f=>f.id===id))||!s.flags.includes(s.flag)||!obj(s.mats)||!obj(s.stock)||!obj(s.levels)||!obj(s.cards)||!obj(s.slots))bad();
for(const k of ['gold','gems','xp','chestRun','dailyChests','weeklyWins','trophies','lastWin','season'])if(!int(s[k]))bad();
for(const k of ['wood','metal','cloth'])if(!int(s.mats[k])||!int(s.stock[k]))bad();
if(s.friendChallenges!==undefined){const l=s.friendChallenges,id=x=>typeof x==='string'&&/^[a-f0-9]{32}$/.test(x),receipt=r=>obj(r)&&r.v===1&&id(r.id)&&typeof r.friend==='string'&&r.friend.length<=24&&bool(r.won)&&int(r.turns,25)&&r.turns>=1;if(!obj(l)||!Array.isArray(l.issued)||!l.issued.every(id)||!Array.isArray(l.claimed)||!l.claimed.every(x=>id(x)&&l.issued.includes(x))||!obj(l.completed)||Object.entries(l.completed).some(([k,r])=>!id(k)||!receipt(r)||k!==r.id)||(l.lastResult!==undefined&&!receipt(l.lastResult)))bad();}
for(const p of PIRATES)if(!int(s.levels[p.id],12)||!int(s.cards[p.id]))bad();
if(Object.entries(s.slots).some(([k,id])=>!positions(s).includes(k)||!PIRATES.some(p=>p.id===id)||!s.levels[id])||new Set(Object.values(s.slots)).size!==Object.values(s.slots).length)bad();
for(const k of ['moves','claims','history','chests','visited','settlements','cosmetics'])if(!Array.isArray(s[k]))bad();
if(!int(s.port,14)||!s.visited.every(n=>int(n,14))||!s.moves.every(n=>int(n,FINISHERS.length-1))||!s.moves.includes(s.move)||!s.cosmetics.every(n=>int(n,5))||(s.cosmetic!==null&&!s.cosmetics.includes(s.cosmetic)))bad();
if(s.chests.length>5||new Set(s.chests.map(c=>c.id)).size!==s.chests.length||s.chests.some(c=>!obj(c)||typeof c.id!=='string'||!E.CHESTS[c.kind]||!int(c.seed,4294967295)))bad();
if(s.claims.some(k=>typeof k!=='string'||!/^([1-9]|[1-4][0-9]|50):(true|false)$/.test(k)))bad();
if(!bool(s.premium)||!bool(s.onboarded)||!obj(s.quests)||!obj(s.settings)||!bool(s.settings.sound)||!bool(s.settings.motion)||!int(s.quests.matches)||!int(s.quests.wins)||!bool(s.quests.dailyClaim)||!bool(s.quests.weeklyClaim))bad();
s.settings.water=waterLibrary(s.settings.water);
if(!['bare','hardwood','iron'].includes(s.plating)||!['plain','heavy','storm'].includes(s.canvas)||!num(s.durability,100)||!obj(s.enh)||!obj(s.figureheads)||!obj(s.deals)||!obj(s.declined))bad();
if(Object.entries(s.enh).some(([k,v])=>!E.ENHANCEMENTS[k]||!int(v,5))||Object.entries(s.figureheads).some(([k,v])=>!figureConfig(k)||!int(v,4))||(s.figurehead!==null&&!s.figureheads[s.figurehead]))bad();
for(const k of ['week','day'])if(typeof s[k]!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s[k]))bad();
if(s.bench!==null&&(!obj(s.bench)||!s.levels[s.bench.id]||s.levels[s.bench.id]>=12||!int(s.bench.ends)))bad();
const partsOK=(parts,n)=>Array.isArray(parts)&&parts.length===n&&parts.every(p=>obj(p)&&num(p.hp)&&num(p.maxHp)&&p.maxHp>0&&p.hp<=p.maxHp);
const maskOK=f=>{try{return !f.hullMask||!!maskPixels(f);}catch{return false;}};
const fighterOK=f=>obj(f)&&(!f.pose||(obj(f.pose)&&Number.isFinite(f.pose.heave)&&Math.abs(f.pose.heave)<=.4&&Number.isFinite(f.pose.roll)&&Math.abs(f.pose.roll)<=.27))&&maskOK(f)&&(!f.hullParts||(num(f.x,12)&&LADDER[f.shipLevel]&&partsOK(f.hullParts,f.legacySections||hullConfig(f.shipLevel).sections)&&partsOK(f.mastParts,3)&&partsOK(f.sailParts,8)))&&num(f.hull)&&num(f.maxHull)&&f.maxHull>0&&f.hull<=f.maxHull&&num(f.sails,100)&&num(f.durability,100)&&Array.isArray(f.crew)&&f.crew.length<=8&&f.crew.every(g=>obj(g)&&PIRATES.some(p=>p.id===g.id)&&num(g.hp)&&int(g.level,12)&&g.level>0&&/^[dh][0-3]$/.test(g.slot))&&obj(f.enh);
if(s.battle!==null){const b=s.battle;if(!obj(b)||!['player','enemy','flight','special','result'].includes(b.phase)||!fighterOK(b.player)||!fighterOK(b.enemy)||!int(b.rng,4294967295)||!int(b.turn,25)||!int(b.shots,2)||!Array.isArray(b.events)||!Array.isArray(b.log)||!bool(b.rewarded)||!bool(b.charged)||!bool(b.used))bad();}
if(s.battle?.special){const p=s.battle.special;if(s.battle.phase!=='special'||!obj(p)||!int(p.id,FINISHERS.length-1)||!int(p.sequence)||p.sequence<1||!bool(p.applied)||!fighterOK(p.before)||([1,3].includes(p.id)&&!int(p.targetMast,2))||(p.id===0&&!p.before.crew.some(g=>g.id===p.targetCrew&&g.hp>0)))bad();}
if(s.battle?.phase==='special'&&!s.battle.special)bad();
if(s.battle?.phase==='flight'&&(!s.battle.pending||!['player','enemy'].includes(s.battle.pending.side)||!num(s.battle.pending.angle,75)||s.battle.pending.angle<5||!s.battle[s.battle.pending.side]?.crew.some(g=>g.id===s.battle.pending.gunner&&g.hp>0)))bad();

if(s.battle?.pending?.plan){
 const p=s.battle.pending;
 if(p.origin&&(!obj(p.origin)||!Number.isFinite(p.origin.x)||Math.abs(p.origin.x)>20||!Number.isFinite(p.origin.y)||Math.abs(p.origin.y)>5))bad();
 if(p.live!==undefined&&(!bool(p.live)||!obj(p.previousPose)||!Number.isFinite(p.previousPose.heave)||Math.abs(p.previousPose.heave)>.4||!Number.isFinite(p.previousPose.roll)||Math.abs(p.previousPose.roll)>.27||!p.origin))bad();
 const impactOK=i=>i===null||(obj(i)&&['hull','crew','sails','masts'].includes(i.kind)&&Number.isFinite(i.x)&&Math.abs(i.x)<=1.5&&Number.isFinite(i.y)&&Math.abs(i.y)<=2.5&&(i.kind==='crew'?int(i.id,36)&&/^[dh][0-3]$/.test(i.slot):int(i.index,7)));
 if(!Array.isArray(p.plan)||![1,7].includes(p.plan.length)||!p.plan.every(q=>obj(q)&&num(q.angle,80)&&num(q.duration,5)&&impactOK(q.impact)&&obj(q.end)&&Number.isFinite(q.end.x)&&Number.isFinite(q.end.y)&&num(q.end.t,5))||!Array.isArray(p.resolved)||new Set(p.resolved).size!==p.resolved.length||!p.resolved.every(i=>int(i,p.plan.length-1))||!Array.isArray(p.impacts)||!p.impacts.every(i=>impactOK(i)&&num(i.damage))||!num(p.elapsed,5))bad();
}

if(s.lastResult!==null&&(!obj(s.lastResult)||typeof s.lastResult.enemyName!=='string'||!bool(s.lastResult.won)||!Array.isArray(s.lastResult.log)||(s.lastResult.opponent&&!fighterOK(s.lastResult.opponent))))bad();
if(!Array.isArray(s.plates)||s.plates.length!==8||s.plates.some(p=>!obj(p)||!['bare','hardwood','iron'].includes(p.kind)||!num(p.durability,100))||!num(s.canvasDurability,100)||!Array.isArray(s.offerQueue)||!Array.isArray(s.offerEvents)||!int(s.created))bad();return s;
}
export function restore(raw,t=Date.now()){if(!raw)return fresh(t);const s=validate(migrate(JSON.parse(raw),t));advance(s,t);return s;}
export function positions(s){const [d,h]=LADDER[s.shipLevel];return [...Array(d)].map((_,i)=>'d'+i).concat([...Array(h)].map((_,i)=>'h'+i));}
export function assign(s,id,slot){if(!s.levels[id]||!positions(s).includes(slot))return false;for(const k of Object.keys(s.slots))if(s.slots[k]===id)delete s.slots[k];s.slots[slot]=id;return true;}
export function stats(p,level=1){const b=BASE[p.primary],m={common:1,rare:1.12,epic:1.26,legendary:1.44}[p.rarity],g=1+(level-1)*.09;return {hp:Math.round(b.hp*m*g),range:Math.round(b.range*(1+(level-1)*.02)),damage:Math.round(b.damage*m*g)};}
export function pay(s,cost){for(const [k,v]of Object.entries(cost))if(!Number.isFinite(v)||v<0||((k in s.mats?s.mats[k]:s[k])??0)<v)return false;for(const[k,v]of Object.entries(cost)){if(k in s.mats)s.mats[k]-=v;else s[k]-=v;}return true;}
export function grant(s,reward){for(const[k,v]of Object.entries(reward)){if(k in s.mats)s.mats[k]+=v;else s[k]=(s[k]||0)+v;}}
export function advance(s,t){if(s.day!==dayKey(t)){s.day=dayKey(t);s.dailyChests=0;s.quests.matches=0;s.quests.dailyClaim=false;}if(s.bench&&t>=s.bench.ends){s.levels[s.bench.id]++;s.bench=null;}if(s.week!==weekKey(t)){const old=s.week;const rank=board(s).findIndex(p=>p.self)+1;if(!s.settlements.includes(old)){const before=s.port;s.port=Math.max(0,Math.min(14,s.port+(rank<=10?1:rank>90?-1:0)));grant(s,before!==s.port?E.TRAVEL_HAUL:E.LOCAL_HAUL);if(!s.visited.includes(s.port)){s.visited.push(s.port);s.gems+=E.GEMS.newPort;queueOffer(s,'port-'+s.port,2,t);}s.stock={...E.SHOP_STOCK};s.settlements.push(old);}s.week=weekKey(t);s.weeklyWins=0;s.quests.wins=0;s.quests.weeklyClaim=false;}if(s.season!==seasonKey(t)){for(let l=1;l<=seasonLevel(s);l++){claim(s,l,false);if(s.premium)claim(s,l,true);}s.history.push({season:s.season,level:seasonLevel(s),claimed:s.claims.length});s.season=seasonKey(t);queueOffer(s,'season-'+s.season,3,t);s.xp=0;s.claims=[];s.premium=false;}return s;}
export function upgradeCost(s,id){const p=PIRATES.find(p=>p.id===id),l=s.levels[id];return !p||l<1||l>=12?null:{gold:E.GOLD[l-1],cards:E.CARDS[p.rarity][l-1],hours:E.HOURS[l-1]};}
export function upgrade(s,id,t=Date.now()){const c=upgradeCost(s,id);if(!c||s.bench||s.cards[id]<c.cards||!pay(s,{gold:c.gold}))return false;s.cards[id]-=c.cards;s.bench={id,ends:t+c.hours*3600000};return true;}
export function skip(s,t=Date.now()){if(!s.bench)return false;const cost=Math.max(0,Math.ceil((s.bench.ends-t)/360000));if(!pay(s,{gems:cost}))return false;s.levels[s.bench.id]++;s.bench=null;return true;}
export function shipUpgrade(s,expectedLevel=s.shipLevel){if(s.shipLevel!==expectedLevel||s.shipLevel>=6||s.battle&&s.battle.phase!=='result')return false;const c=hullConfig(s.shipLevel).cost;if(!pay(s,c))return false;s.shipLevel++;queueOffer(s,'ship-'+s.shipLevel,0,Date.now());return true;}
export function exchange(s,from,to,n=10){if(from===to||!E.RATES[from]?.[to]||!Number.isInteger(n)||n<1||s.stock[to]<n)return false;const c={[from]:Math.ceil(n*E.RATES[from][to]),gold:n*E.SHOP.fee};if(!pay(s,c))return false;s.mats[to]+=n;s.stock[to]-=n;return true;}
export function seeded(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function roll(r,odds){let n=r();for(const[k,v]of Object.entries(odds)){n-=v;if(n<0)return k;}return Object.keys(odds).at(-1);}
export function openChest(s,id){const c=s.chests.find(c=>c.id===id);if(!c)return null;const r=seeded(c.seed),spec=E.CHESTS[c.kind],gains={},draws=[];s.gold+=spec.gold;for(let i=0;i<4;i++){const rarity=roll(r,spec.odds),pool=PIRATES.filter(p=>p.rarity===rarity),p=pool[Math.floor(r()*pool.length)];draws.push(p.id);gains[p.id]=(gains[p.id]||0)+1;if(!s.levels[p.id])s.levels[p.id]=1;else if(s.levels[p.id]===12)s.gold+=10;else s.cards[p.id]++;}s.chests=s.chests.filter(x=>x.id!==id);return {gold:spec.gold,cards:gains,draws};}
export function seasonLevel(s){return Math.min(50,1+Math.floor(s.xp/100));}
export function rewardAt(level,premium){if(premium&&[6,14,22,30,38,46].includes(level))return{move:[6,14,22,30,38,46].indexOf(level)};if(level%5===0)return{gems:premium?8:3};return premium?{gold:180+level*10}:{gold:70+level*5};}
export function claim(s,level,premium){const key=level+':'+premium;if(!Number.isInteger(level)||typeof premium!=='boolean'||level<1||level>seasonLevel(s)||(premium&&!s.premium)||s.claims.includes(key))return false;const r=rewardAt(level,premium);if('move'in r){if(!s.moves.includes(r.move))s.moves.push(r.move);}else grant(s,r);s.claims.push(key);return true;}
export function questClaim(s,type){if(!['daily','weekly'].includes(type))return false;const daily=type==='daily',key=daily?'dailyClaim':'weeklyClaim';if(s.quests[key]||(daily?s.quests.matches<3:s.quests.wins<5))return false;s.quests[key]=true;s.xp+=daily?100:300;return true;}
export function buyMove(s,id){const m=FINISHERS[id];if(!m||s.moves.includes(id)||!pay(s,m.cost))return false;s.moves.push(id);return true;}
export function equip(s,type,value,section=0){if(type==='plating'){if(!Number.isInteger(section)||section<0||section>=hullSections(s))return false;const c=value==='hardwood'?{wood:220,gold:1800}:value==='iron'?{metal:140,gold:3000,gems:25}:null;if(!c||s.plates[section].kind===value||!pay(s,c))return false;s.plates[section]={kind:value,durability:100};s.plating=value;}else if(type==='canvas'){const c=value==='heavy'?{cloth:180,gold:1200}:value==='storm'?{cloth:240,gold:2400,gems:20}:null;if(!c||s.canvas===value||!pay(s,c))return false;s.canvas=value;s.canvasDurability=100;}else return false;return true;}
export function repair(s){const c=repairCost(s);if(!Object.keys(c).length||!pay(s,c))return false;for(const p of s.plates)p.durability=100;s.canvasDurability=100;s.durability=100;return true;}
export function enhance(s,name){if(!E.ENHANCEMENTS[name])return false;const l=s.enh[name]||0;if(l>=5||!pay(s,{gold:E.ENH_GOLD[l],gems:E.ENH_GEMS[l]}))return false;s.enh[name]=l+1;return true;}
export function figure(s,id){const f=figureConfig(id);if(!f)return false;if(s.figureheads[id]){s.figurehead=id;return true;}if(!pay(s,{gold:f.gold,gems:f.gems}))return false;s.figureheads[id]=1;s.figurehead=id;return true;}
// Retain paid grades and source upgrade prices on the new named figureheads.
export function upgradeFigure(s,id){const grade=s.figureheads[id]||0;if(!figureConfig(id)||!grade||grade>=4||!pay(s,{gold:E.FIG_UPGRADE.gold[grade-1],gems:E.FIG_UPGRADE.gems[grade-1]}))return false;s.figureheads[id]=grade+1;return true;}
export function sailUpgrade(s,expectedLevel=s.sailLevel){const c=sailConfig(s.sailLevel).cost;if(s.sailLevel!==expectedLevel||!c||s.battle&&s.battle.phase!=='result'||!pay(s,c))return false;s.sailLevel++;return true;}
export function flag(s,id){const f=FLAGS.find(f=>f.id===id);if(!f)return false;if(!s.flags.includes(id)){if(!pay(s,f.cost))return false;s.flags.push(id);}s.flag=id;return true;}
export function cosmetic(s,i){if(!Number.isInteger(i)||i<0||i>=E.SAILS.length)return false;if(!s.cosmetics.includes(i)){if(!pay(s,{gold:E.SAILS[i]}))return false;s.cosmetics.push(i);}s.cosmetic=i;return true;}
export function board(s,port=s.port){const r=seeded(871+port*937),rows=Array.from({length:port===s.port?99:100},(_,i)=>({id:i,name:['Black','Salty','Crimson','Lucky','Old','Mad','Silver','Dread'][i%8]+' '+['Morgan','Bonny','Flint','Hook','Marrow','Reed','Drake','Tide'][Math.floor(i/8)%8]+' '+(i+1),wins:Math.floor(r()*19),trophies:Math.floor(r()*900),lastWin:Math.floor(r()*1e6),level:1+Math.floor(r()*Math.min(6,1+port)),self:false}));if(port===s.port)rows.push({id:'self',name:s.name,wins:s.weeklyWins,trophies:s.trophies,lastWin:s.lastWin,level:s.shipLevel,self:true});return rows.sort((a,b)=>b.wins-a.wins||b.trophies-a.trophies||b.lastWin-a.lastWin||String(a.id).localeCompare(String(b.id)));}
function fighter(s,enemy,r){let roster=positions(s).filter(k=>s.slots[k]).map(k=>({id:s.slots[k],slot:k,hp:stats(PIRATES.find(p=>p.id===s.slots[k]),s.levels[s.slots[k]]).hp,level:s.levels[s.slots[k]]}));if(enemy){const pool=[...PIRATES];roster=roster.map((g,i)=>{const p=pool.splice(Math.floor(r()*pool.length),1)[0];return {...g,id:p.id,hp:stats(p,g.level).hp};});}return {move:enemy?0:s.move,shipLevel:s.shipLevel,sailLevel:s.sailLevel,cosmetic:enemy?null:s.cosmetic,flag:enemy?7:s.flag,hull:hullConfig(s.shipLevel).hp,maxHull:hullConfig(s.shipLevel).hp,sails:100,crew:roster,plating:enemy?'bare':s.plating,canvas:enemy?'plain':s.canvas,durability:enemy?100:s.durability,enh:enemy?{}:clone(s.enh),figure:enemy?null:s.figurehead,figureGrade:enemy?0:(s.figureheads[s.figurehead]||0),plates:enemy?Array.from({length:hullSections(s)},()=>({kind:'bare',durability:100})):clone(s.plates.slice(0,hullSections(s))),canvasDurability:enemy?100:s.canvasDurability};}
export function startBattle(s,t=Date.now(),rematch=false){if(!Object.values(s.slots).length)return false;const old=s.lastResult;if(rematch&&(!old||old.won||old.rematch||old.rematchAsked))return false;const seed=rematch?old.seed:Math.floor(t)%2147483647,r=seeded(seed);const b={id:String(t),seed,rng:seed,turn:1,shots:2,seconds:30,dualHits:0,streak:0,streakVersion:2,charged:false,used:false,phase:'player',log:[],events:[],rematch,enemyName:rematch?old.enemyName:board(s).filter(p=>!p.self)[Math.floor(r()*99)].name,temperament:['supportive','angry','fun','playful','competitive','rager','silly'][Math.floor(r()*7)],player:fighter(s,false,r),enemy:fighter(s,true,r),started:t,rewarded:false};if(rematch&&old.opponent){b.enemy=clone(old.opponent);b.temperament=old.temperament;}prepareBattle(b);b.opponent=clone(b.enemy);s.battle=b;return b;}
function random(b){b.rng=(Math.imul(b.rng,1664525)+1013904223)>>>0;return b.rng/4294967296;}
export function active(f){return f.crew.filter(g=>g.hp>0);}
// Movement is tied to sail power: two full sail-equivalents grant one move.
// `sails` is stored as a percentage, so a healthy rig grants two moves.
export function sailMoves(f){return Math.max(0,Math.ceil(Math.max(0,f?.sails??100)/50));}
export function outcome(b){if((b.enemy.hull<=0&&b.enemy.sails<=0)||!active(b.enemy).length)return true;if((b.player.hull<=0&&b.player.sails<=0)||!active(b.player).length)return false;if(b.turn>24)return b.player.hull/b.player.maxHull>=b.enemy.hull/b.enemy.maxHull;return null;}

export function prepareBattle(b){
 if(!b)return b;
 ensureGeometry(b.player,'player');ensureGeometry(b.enemy,'enemy');
 if(b.streakVersion!==2){b.streak=b.charged?4:0;b.streakVersion=2;}
 b.movesLeft??=sailMoves(b.player);b.movesLeft=Math.min(b.movesLeft,sailMoves(b.player));b.enemyShots??=2;b.enemyMoves??=1;b.pending??=null;
 if(b.opponent)ensureGeometry(b.opponent,'enemy');
 return b;
}
export function moveShip(s,direction,side='player'){
 const b=prepareBattle(s.battle);if(!b||b.phase!==side||b.pending||![-1,1].includes(direction))return false;
 const key=side==='player'?'movesLeft':'enemyMoves';if(b[key]<=0)return false;
 const f=b[side],next=Math.max(side==='player'?1.9:7.5,Math.min(side==='player'?3.7:9.3,f.x+direction*SHIP_TUNING.baseMove*hullConfig(f.shipLevel).movement*(1+figureBonus(f,'movement'))*(side==='player'?1:-1)));
 if(Math.abs(next-f.x)<.001)return false;f.x=next;b[key]--;return true;
}
export function steerShip(s,{originX,targetX,side='player',commit=false}={}){
 const b=prepareBattle(s.battle);if(!b||b.phase!==side||b.pending||!Number.isFinite(originX)||!Number.isFinite(targetX))return null;
 const key=side==='player'?'movesLeft':'enemyMoves',available=b[key];if(available<=0)return null;
 const f=b[side],step=SHIP_TUNING.baseMove*hullConfig(f.shipLevel).movement*(1+figureBonus(f,'movement'));
 const min=side==='player'?1.9:7.5,max=side==='player'?3.7:9.3,limit=step*available;
 const x=Math.max(min,Math.min(max,originX+Math.max(-limit,Math.min(limit,targetX-originX))));
 const spent=Math.min(available,Math.ceil(Math.abs(x-originX)/step-1e-9));
 if(commit){f.x=x;b[key]-=spent;}
 return {x,moves:spent};
}
export function previewShot(s,{side='player',gunner=null,angle=35}={}){
 const b=prepareBattle(s.battle);if(!b||!['player','enemy'].includes(side)||!Number.isFinite(angle)||angle<5||angle>75)return null;
 const g=active(b[side]).find(g=>g.id===gunner)||(!gunner?active(b[side])[0]:null);if(!g)return null;
 const p=PIRATES.find(p=>p.id===g.id),spec={...projectileFor(p),speed:Math.sqrt(stats(p,g.level).range/10*3.2)};return forecastVolley(b,trajectory(b,side,g,spec,angle),g,p);
}
export function launchShot(s,{side='player',gunner=null,angle=35,live=false}={}){
 const b=prepareBattle(s.battle);if(!b||b.phase!==side||b.pending||(side==='player'?b.shots:b.enemyShots)<=0)return null;
 const flight=previewShot(s,{side,gunner,angle});if(!flight)return null;
 if(live){flight.shots=flight.shots.map(q=>seaShot(flight.origin,side,flight.spec.speed,q.angle));flight.duration=Math.max(...flight.shots.map(q=>q.duration));}
 b.pending={side,gunner:flight.gunnerId,angle,...(live?{live:true,previousPose:poseOf(b[side==='player'?'enemy':'player'])}:{})};rememberFlight(b.pending,flight);b.phase='flight';return flight;
}
function totalDamage(f){
 f.hull=Math.min(f.maxHull,f.hullParts.reduce((a,p)=>a+p.hp,0));
 f.sails=100*f.sailParts.reduce((a,p)=>a+p.hp,0)/f.sailParts.reduce((a,p,i)=>a+(sailConfig(f.sailLevel).panels.includes(rigLayout().sails[i].panel)?p.maxHp:0),0);
 f.durability=Math.min(f.canvasDurability??100,...(f.plates||[]).map(p=>p.durability));
}
export function impactDamage(f,impact,base,spec,fraction=1){
 if(!impact)return 0;const matched=impact.kind===spec.bonus;
 const cannon=spec.type==='iron',fire=spec.type==='fire';let damage=base*(matched?1.6:.65)*fraction*(1-(fire?figureBonus(f,'fireResistance'):cannon?figureBonus(f,'cannonResistance'):0))*(1-(impact.kind==='crew'?figureBonus(f,'crewProtection'):0)),part;
 if(impact.kind==='hull'){
  part=f.hullParts[impact.index];const plate=f.plates?.[impact.index],armor=({hardwood:.2,iron:.3}[plate?.kind]||0)*(plate?.durability??100)/100;
  damage*= (1-armor)*(1-(f.enh['Hull plating']||0)*.025);
  const removed=chipHull(f,impact.x,impact.y,damage,spec.effect);if(plate&&plate.kind!=='bare')plate.durability=Math.max(0,plate.durability-removed*.12);totalDamage(f);return removed;
 }else if(impact.kind==='sails'){
  part=f.sailParts[impact.index];damage*=1-({heavy:.2,storm:.3}[f.canvas]||0)*(f.canvasDurability??100)/100;
  if(f.canvas!=='plain')f.canvasDurability=Math.max(0,f.canvasDurability-damage*.3);
 }else if(impact.kind==='masts')part=f.mastParts[impact.index];
 else part=f.crew.find(g=>g.id===impact.id&&g.slot===impact.slot);
 if(!part||part.hp<=0)return 0;damage=Math.min(part.hp,Math.max(1,Math.round(damage)));part.hp=Math.max(0,part.hp-damage);
 if(impact.kind==='masts'&&part.hp===0)rigLayout().sails.forEach((s,i)=>{if(s.mast===impact.index)f.sailParts[i].hp=0;});
 totalDamage(f);return damage;
}

const flightCache=new WeakMap();
function shotPower(own,p,g){const enh=(own.enh['Gun mounts']||0)+(own.enh['Powder store']||0);return stats(p,g.level).damage*(1+enh*.035+figureBonus(own,projectileFor(p).type==='fire'?'fireAttack':projectileFor(p).type==='iron'?'cannonAttack':p.primary==='crew'?'crewAttack':'none'));}
function forecastVolley(b,flight,g,p){
 if(flight.shots.length===1)return flight;
 const foe=clone(b[flight.side==='player'?'enemy':'player']),base=shotPower(b[flight.side],p,g),remaining=new Set(flight.shots.map((_,i)=>i));
 while(remaining.size){
  const i=[...remaining].sort((a,b)=>flight.shots[a].duration-flight.shots[b].duration||a-b)[0],shot=flight.shots[i];
  if(shot.impact)impactDamage(foe,shot.impact,base,flight.spec,1/flight.spec.count);
  remaining.delete(i);
  for(const j of remaining){const angle=flight.shots[j].angle;flight.shots[j]={...traceProjectile(foe,flight.side,flight.origin,angle,flight.spec.speed),angle};}
 }
 flight.duration=Math.max(...flight.shots.map(s=>s.duration));return flight;
}
function rememberFlight(pending,flight){
 pending.origin={...flight.origin};
 pending.plan=flight.shots.map(s=>({angle:s.angle,duration:s.duration,impact:s.impact,end:s.path.at(-1)}));
 pending.resolved=[];pending.impacts=[];pending.elapsed=0;flightCache.set(pending,flight);return flight;
}
export function pendingFlight(s){
 const b=s.battle,pending=b?.pending;if(!pending)return null;
 if(flightCache.has(pending))return flightCache.get(pending);
 if(!pending.plan){const flight=previewShot(s,pending);return flight?rememberFlight(pending,flight):null;}
 const {side,gunner,angle}=pending,g=b[side].crew.find(g=>g.id===gunner);if(!g)return null;
 const p=PIRATES.find(p=>p.id===gunner),spec={...projectileFor(p),speed:Math.sqrt(stats(p,g.level).range/10*3.2)},origin=pending.origin||muzzle(b[side],side,g);
 const shots=pending.plan.map(({end,...q})=>({...q,path:parabolicPath(origin,side,spec.speed,q.angle,q.duration,end)}));
 const flight={side,gunnerId:gunner,angle,spec,origin,shots,duration:Math.max(...shots.map(s=>s.duration))};flightCache.set(pending,flight);return flight;
}

function refreshMovingFlight(b,pending,flight,elapsed){
 const from=pending.elapsed||0,to=Math.min(elapsed,flight.duration),target=b[flight.side==='player'?'enemy':'player'];
 if(to<=from)return;
 const foe=clone(target),previous=pending.previousPose||poseOf(target),own=b[flight.side],g=own.crew.find(g=>g.id===flight.gunnerId),pirate=PIRATES.find(p=>p.id===g.id);
 const base=shotPower(own,pirate,g),remaining=new Set(flight.shots.map((_,i)=>i).filter(i=>!pending.resolved.includes(i)));
 let cursor=from;
 while(remaining.size){
  const candidates=[];
  for(const i of remaining){
   const shot=flight.shots[i],hit=movingContact(foe,flight.side,flight.origin,flight.spec.speed,shot.angle,cursor,Math.min(to,shot.duration),previous,from,to);
   if(hit)candidates.push({i,...hit});
   else if(shot.duration<=to)candidates.push({i,duration:shot.duration,impact:null,end:shot.path.at(-1)});
  }
  if(!candidates.length)break;
  candidates.sort((a,b)=>a.duration-b.duration||a.i-b.i);
  const {i,duration,impact,end}=candidates[0],shot=flight.shots[i];
  Object.assign(shot,{duration,impact,path:parabolicPath(flight.origin,flight.side,flight.spec.speed,shot.angle,duration,end)});
  pending.plan[i]={angle:shot.angle,duration,impact,end};
  if(impact)impactDamage(foe,impact,base,flight.spec,1/flight.spec.count);
  remaining.delete(i);cursor=duration;
 }
 pending.previousPose=poseOf(target);
 flight.duration=Math.max(...flight.shots.map(s=>s.duration));
}

export function advanceShot(s,elapsed){
 const b=prepareBattle(s.battle);if(!b||b.phase!=='flight'||!b.pending)return null;
 const pending=b.pending,flight=pendingFlight(s);if(!flight)return null;
 if(pending.live)refreshMovingFlight(b,pending,flight,elapsed);
 const side=pending.side,own=b[side],foe=b[side==='player'?'enemy':'player'],g=own.crew.find(g=>g.id===flight.gunnerId),p=PIRATES.find(p=>p.id===g.id);
 const base=shotPower(own,p,g),fresh=[];pending.elapsed=Math.min(flight.duration,Math.max(pending.elapsed||0,elapsed));
 const order=flight.shots.map((shot,i)=>({shot,i})).sort((a,b)=>a.shot.duration-b.shot.duration||a.i-b.i);
 for(const {shot,i} of order){
  if(shot.duration>pending.elapsed+1e-10||pending.resolved.includes(i))continue;
  pending.resolved.push(i);
  if(shot.impact){const damage=impactDamage(foe,shot.impact,base,flight.spec,1/flight.spec.count),hit={...shot.impact,damage,bonus:shot.impact.kind===flight.spec.bonus};pending.impacts.push(hit);fresh.push(hit);}
 }
 if(pending.elapsed+1e-10<flight.duration)return {impacts:fresh,event:null};
 const impacts=pending.impacts,damage=impacts.reduce((a,i)=>a+i.damage,0),first=impacts[0],hit=impacts.length>0;
 const e={side,gunnerId:g.id,angle:flight.angle,target:first?.kind||'sea',hit,damage,x:first?.x||0,y:first?.y||0,impacts,pirate:p.name,weapon:flight.spec.effect,projectile:flight.spec.name,bonus:flight.spec.bonus,n:b.events.length};
 b.events.push(e);b.log.push(p.name+(hit?' hits '+[...new Set(impacts.map(i=>i.kind))].join(' / ')+' for '+Math.round(damage)+(impacts.some(i=>i.bonus)?' · specialty bonus!':''):' splashes into the sea.'));
 b.pending=null;b.phase=side;
 if(side==='player'){
  b.shots--;if(hit)b.dualHits++;
  if(!b.charged){b.streak=damage>0?Math.min(SPECIAL_TUNING.chargeAttacks,b.streak+1):0;if(b.streak===SPECIAL_TUNING.chargeAttacks)b.charged=true;}
  if(b.shots===0){b.phase='enemy';b.enemyShots=2;b.enemyMoves=1;}
 }else{
  b.enemyShots--;
  if(b.enemyShots<=0){b.turn++;b.phase='player';b.shots=2;b.seconds=30;b.dualHits=0;b.movesLeft=sailMoves(b.player);b.log.push(b.enemyName+': '+EMOTES[b.temperament]);}
 }
 const won=outcome(b);if(won!==null){b.phase='result';b.won=won;}
 return {impacts:fresh,event:e};
}
export function resolveShot(s){return advanceShot(s,Infinity)?.event||null;}

// Synchronous helper for simulation/tests; the browser uses launch/animate/resolve.
export function attack(s,options={}){return launchShot(s,options)?resolveShot(s):null;}
export const EMOTES={supportive:'Good shot, captain!',angry:'You will pay for that!',fun:'Now this is a party!',playful:'Catch this broadside!',competitive:'Keep up, captain.',rager:'All guns! Fire!',silly:'Mind the seagulls!'};
export function planEnemyShot(s){
 const b=prepareBattle(s.battle);if(!b||b.phase!=='enemy')return null;
 const guns=active(b.enemy),g=guns[(2-b.enemyShots)%guns.length];if(!g)return null;
 let best=35,bestScore=-1;
 for(let a=8;a<=70;a+=2){
  const t=previewShot(s,{side:'enemy',gunner:g.id,angle:a});
  const score=t.shots.reduce((sum,x)=>sum+(x.impact?(x.impact.kind===t.spec.bonus?2:1)+(x.impact.kind==='hull'?.15:0):0),0);
  if(score>bestScore){best=a;bestScore=score;}
 }
 const accuracy=({competitive:.9,angry:.75,supportive:.8,fun:.7,playful:.75,rager:.65,silly:.6}[b.temperament]??.75)*(b.rematch?.8:1);
 const spread=(1-accuracy)*10+(100-b.enemy.sails)*.015;
 return {side:'enemy',gunner:g.id,angle:Math.max(5,Math.min(75,best+(random(b)-.5)*2*spread))};
}
export function enemyTurn(s){
 const b=prepareBattle(s.battle);if(!b||b.phase!=='enemy')return [];
 const events=[];if(b.enemyMoves)moveShip(s,random(b)<.5?1:-1,'enemy');
 for(let i=0;i<2&&b.phase==='enemy';i++){const plan=planEnemyShot(s);if(!plan)break;events.push(attack(s,plan));}
 return events.filter(Boolean);
}

export function specialUnavailable(s){
 const b=s.battle,m=FINISHERS[s.move];
 if(!b||!m||!s.moves.includes(s.move))return 'Equip an unlocked big attack first.';
 if(b.phase!=='player'||b.pending||b.special)return 'Wait until your attack sequence finishes.';
 if(!b.charged)return 'Land four successful attacks to charge.';
 const f=ensureGeometry(b.enemy,'enemy');
 if(m.id===0&&!active(f).some(g=>g.slot.startsWith('d')))return 'No enemy deck gunners remain. Hull gunners are protected from the shark. Your charge is kept.';
 if([1,3].includes(m.id)&&!f.mastParts.some(p=>p.hp>0))return 'No standing mast remains. Your charge is kept.';
 return '';
}
// Begin, impact, and completion are separate persistent transitions. No clock runs in this phase.
export function finishMove(s){
 const b=prepareBattle(s.battle);if(specialUnavailable(s))return false;
 const move=FINISHERS[s.move],f=b.enemy;
 const target=move.id===0?active(f).find(g=>g.slot.startsWith('d')).id:null;
 b.specialSequence=(b.specialSequence||0)+1;
 b.special={id:move.id,sequence:b.specialSequence,applied:false,targetCrew:target,targetMast:[1,3].includes(move.id)?f.mastParts.findIndex(p=>p.hp>0):null,before:clone(f)};
 b.charged=false;b.streak=0;b.used=false;b.phase='special';return b.special;
}
export function resolveFinishMove(s){
 const b=s.battle,p=b?.special;if(!p||b.phase!=='special'||p.applied)return false;
 const f=ensureGeometry(b.enemy,'enemy'),m=FINISHERS[p.id];
 if(p.id===0){const g=f.crew.find(g=>g.id===p.targetCrew);if(g)g.hp=0;}
 if(p.id===5)f.crew.filter(g=>g.slot.startsWith('d')).forEach(g=>g.hp=0);
 if(p.id===2)chipHull(f,.6,-.15,SPECIAL_TUNING.whaleHullDamage,'roundshot');
 if([1,3].includes(p.id)){f.mastParts[p.targetMast].hp=0;rigLayout().sails.forEach((r,j)=>{if(r.mast===p.targetMast)f.sailParts[j].hp=0;});}
 if(p.id===4)f.sailParts.forEach(part=>part.hp=Math.max(0,part.hp-part.maxHp*SPECIAL_TUNING.swordfishSailFraction));
 if(p.id===6)f.crew.forEach(g=>g.hp=Math.max(0,g.hp-SPECIAL_TUNING.sirenCrewDamage));
 totalDamage(f);p.applied=true;b.log.push(m.name+' unleashed');return p;
}
export function completeFinishMove(s){
 const b=s.battle,p=b?.special;if(!p?.applied||b.phase!=='special')return false;
 b.special=null;b.phase='player';const won=outcome(b);if(won!==null){b.phase='result';b.won=won;}return true;
}

export function settle(s,t=Date.now()){const b=s.battle;if(!b||b.phase!=='result'||b.rewarded)return null;b.rewarded=true;const looted=b.won&&!active(b.enemy).length&&!(b.enemy.hull<=0&&b.enemy.sails<=0),baseGold=Math.floor(E.MATCH.gold*(b.won?1:E.MATCH.lossShare)),lootBonus=looted?Math.floor(baseGold*.1):0,gold=baseGold+lootBonus;s.gold+=gold;s.xp+=b.won?50:20;s.quests.matches++;if(b.won){s.weeklyWins++;s.trophies++;s.lastWin=t;s.quests.wins++;}let chest=null;if(b.won&&s.chests.length<5&&s.dailyChests<5){chest={id:b.id,kind:roll(()=>random(b),E.BONUS_ODDS),seed:b.rng};s.chests.push(chest);s.dailyChests++;s.chestRun++;if(s.chestRun%5===0){s.gems+=E.GEMS.fifthChest;queueOffer(s,'chests-'+s.chestRun,1,t);}}s.durability=b.player.durability;if(b.player.plates)b.player.plates.forEach((p,i)=>s.plates[i]=clone(p));s.canvasDurability=b.player.canvasDurability??100;const result={id:b.id,won:b.won,gold,gems:chest&&s.chestRun%5===0?E.GEMS.fifthChest:0,xp:b.won?50:20,honor:b.won?1:0,lootBonus,looted,chest,seed:b.seed,enemyName:b.enemyName,rematch:b.rematch,rematchAsked:false,opponent:clone(b.opponent||b.enemy),temperament:b.temperament,log:b.log.slice(-8),turns:b.turn};s.lastResult=result;return result;}
export function requestRematch(s,r=Math.random){const q=s.lastResult;if(!q||q.won||q.rematch||q.rematchAsked)return null;const accept=r()<.65;if(accept){const b=startBattle(s,Date.now(),true);q.rematchAsked=true;return !!b;}q.rematchAsked=true;return false;}

export function migrate(s,t){
if(!s||s.version!==1)return s;
if(s.progressionVersion===undefined){
 const old=s.shipLevel;if(!Number.isInteger(old)||old<1||old>8)return s;
 s.shipLevel=Math.max(1,old-2);s.sailLevel=5;s.flags=[7];s.flag=7;
 const ids=['dolphin','endowed-female','unicorn','dolphin','shark','asian-dragon'];
 s.legacyFigureheads=clone(s.figureheads||{});s.figureheads={};
 for(const [id,grade]of Object.entries(s.legacyFigureheads)){const key=ids[id];if(key)s.figureheads[key]=Math.max(s.figureheads[key]||0,grade);}
 s.figurehead=s.figurehead===null?null:ids[s.figurehead]??null;
 for(const f of [s.battle?.player,s.battle?.enemy,s.battle?.opponent,s.lastResult?.opponent].filter(Boolean)){
  const level=f.shipLevel||f.plates?.length||Math.max(1,f.crew.length);f.shipLevel=Math.max(1,level-2);f.sailLevel=5;f.legacySections=f.hullParts?.length||level;f.flag=7;
  f.figure=f.figure===null?null:ids[f.figure]??null;
 }
 s.progressionVersion=PROGRESSION_VERSION;
}
if(s.battle){s.battle.seconds??=30;prepareBattle(s.battle);}if(s.portLayout!==2){const old=['London','Calais','Lisbon','Bermuda','Puerto Rico','Caracas','Seattle','Hawaii','Manila','Singapore','Hong Kong','Shanghai','Mumbai','Mombasa','Madagascar'];s.port=PORTS.indexOf(old[s.port]);if(Array.isArray(s.visited))s.visited=s.visited.map(i=>PORTS.indexOf(old[i]));s.portLayout=2;}
s.plates??=Array.from({length:8},()=>({kind:s.plating||'bare',durability:s.durability??100}));
s.canvasDurability??=s.durability??100;s.created??=t;s.offerQueue??=[];s.offerEvents??=[];
return s;
}
export function repairCost(s){const c={};for(const p of s.plates.slice(0,hullSections(s))){if(p.kind==='bare')continue;const key=p.kind==='iron'?'metal':'wood';c[key]=(c[key]||0)+Math.ceil((100-p.durability)/2);}if(s.canvas!=='plain')c.cloth=Math.ceil((100-s.canvasDurability)/2);return Object.fromEntries(Object.entries(c).filter(([,v])=>v>0));}
function queueOffer(s,key,bundle,t){if(s.offerEvents.includes(key))return;s.offerEvents.push(key);s.offerQueue.push({key,bundle,category:'bundle-'+bundle,created:t});}
export function offers(s,t=Date.now()){
migrate(s,t);
for(const [key,o]of Object.entries(s.deals)){if(o.ends<=t){s.declined[o.category]=o.ends+7*86400000;delete s.deals[key];}}
for(const o of s.offerQueue){if(Object.keys(s.deals).length>=3)break;if(o.shown||(s.declined[o.category]||0)>t||Object.values(s.deals).some(d=>d.category===o.category))continue;o.shown=true;s.deals[o.key]={...o,ends:t+2*3600000};}
return Object.values(s.deals).sort((a,b)=>a.created-b.created).slice(0,3);
}
export function declineOffer(s,key,t=Date.now()){const o=s.deals[key];if(!o)return false;s.declined[o.category]=t+7*86400000;delete s.deals[key];return true;}
export function aimedTarget(x,y){
if(!Number.isFinite(x)||!Number.isFinite(y))return null;
if(Math.abs(x)<=1.26&&y>=-.56&&y<=.34*(1+.42*x*x))return 'hull';
if(Math.abs(x)<=.9&&y>.32&&y<.62)return 'crew';
if(Math.abs(x)<=.99&&y>=.62&&y<=2.38)return 'sails';
return null;
}

export function elapse(s,seconds=1){const b=s.battle;if(!b||b.phase!=='player'||!Number.isFinite(seconds)||seconds<=0)return false;b.seconds=Math.max(0,(b.seconds??30)-seconds);if(b.seconds>0)return false;b.shots=0;b.dualHits=0;b.phase='enemy';b.enemyShots=2;b.enemyMoves=1;b.log.push('Time is up. The rival takes their turn.');return true;}
