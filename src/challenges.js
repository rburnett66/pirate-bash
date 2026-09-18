import {CHALLENGE_FIELDS,packShipChallenge,unpackShipChallenge} from './challenge-wire.js';
import {encodeLinkPayload,decodeLinkPayload} from './link-codec.js';
import * as M from './model.js';

const fields=CHALLENGE_FIELDS;
export function challengeSnapshot(state,seed=Math.floor(Math.random()*2147483647)){
 const ship=Object.fromEntries(fields.map(k=>[k,structuredClone(state[k])]));
 return validateChallenge({v:1,seed,ship});
}
function validateChallenge(value){
 if(!value||value.v!==1||!Number.isSafeInteger(value.seed)||value.seed<0||value.seed>2147483647||!value.ship||typeof value.ship!=='object')throw Error('This challenge link is invalid.');
 const ship=Object.fromEntries(fields.map(k=>[k,value.ship[k]])),s=Object.assign(M.fresh(),ship);
 M.validate(s);if(!Object.keys(s.slots).length)throw Error('The challenge needs a crew.');
 if(value.id!==undefined&&!/^[a-f0-9]{32}$/.test(value.id))throw Error('This challenge link is invalid.');
 return {v:1,seed:value.seed,ship,...(value.id?{id:value.id}:{})};
}
export function challengeURL(state,base,seed){
 return linkFor(challengeSnapshot(state,seed),base,'challenge');
}
function tokenFrom(source,kind){
 const url=new URL(source,'https://pirate.invalid/');
 const query=url.searchParams,fragment=new URLSearchParams(url.hash.slice(1));
 const values=[...query.getAll(kind),...fragment.getAll(kind)];
 if(values.length>1)throw Error('This link contains duplicate data. Ask for a new link.');
 return values[0]??null;
}
export function hasChallengeLink(source){const url=new URL(source,'https://pirate.invalid/'),fragment=new URLSearchParams(url.hash.slice(1));return ['challenge','challenge-result'].some(kind=>url.searchParams.has(kind)||fragment.has(kind));}
export function clearChallengeLink(source){const url=new URL(source);url.searchParams.delete('challenge');url.searchParams.delete('challenge-result');url.hash='';return url.href;}
function decodeToken(token,max){
 if(token.length>max||!/^[\w-]+$/.test(token))throw Error('Invalid encoded link.');
 if(token.startsWith('b3_'))return decodeLinkPayload(token);
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(token.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));
}
function unpackChallenge(c){
 if(!Array.isArray(c))return c;
 if(c[0]===3)return unpackShipChallenge(c);
 if(c.length!==4||c[0]!==2||!Array.isArray(c[3])||c[3].length!==fields.length)throw Error('Invalid challenge data.');
 const ship=Object.fromEntries(fields.map((k,i)=>[k,c[3][i]]));
 if(!Array.isArray(ship.levels)||ship.levels.length!==M.PIRATES.length)throw Error('Invalid crew levels.');
 ship.levels=Object.fromEntries(M.PIRATES.map((p,i)=>[p.id,ship.levels[i]]));
 return {v:1,seed:c[1],ship,...(c[2]!==null?{id:c[2]}:{})};
}
export function readChallenge(source){
 try{const token=tokenFrom(source,'challenge');return token===null?null:validateChallenge(unpackChallenge(decodeToken(token,12000)));}catch{throw Error('This challenge link is invalid.');}
}
export function practiceGame(challenge,recipient=null,now=Date.now()){
 const {ship,seed}=validateChallenge(challenge),s=recipient?structuredClone(recipient):M.fresh(now);
 let rng=seed;const random=n=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return Math.floor(rng/4294967296*n);};
 if(!recipient){
  const crewCount=Object.keys(ship.slots).length,hulls=[1,2,3,4,5,6].filter(shipLevel=>M.positions({shipLevel}).length>=crewCount);
  s.name='Challenger';s.shipLevel=hulls[random(hulls.length)];s.sailLevel=1+random(5);s.cosmetic=random(6);s.cosmetics=[s.cosmetic];s.flag=1+random(33);s.flags=[s.flag];s.slots={};
  const pool=[...M.PIRATES],maxLevel=Math.max(...Object.values(ship.slots).map(id=>ship.levels[id]));
  for(const slot of M.positions(s).slice(0,crewCount)){const p=pool.splice(random(pool.length),1)[0];s.levels[p.id]=1+random(maxLevel);s.slots[slot]=p.id;}
 }
 s.onboarded=true;s.battle=null;s.lastResult=null;
 // An empty saved deck still receives the bonus gunner before battle creation.
 const pool=M.PIRATES.filter(p=>!Object.values(s.slots).includes(p.id)),p=pool[random(pool.length)];
 const levels=Object.values(s.slots).map(id=>s.levels[id]),level=Math.max(1,Math.round(levels.reduce((n,l)=>n+l,0)/Math.max(1,levels.length)));
 const empty=M.positions(s).find(slot=>!s.slots[slot]),slot=empty||'d'+M.hullConfig(s.shipLevel).deck;
 const baseLevel=s.levels[p.id];
 if(empty){s.slots[slot]=p.id;s.levels[p.id]=level;}
 const b=M.startBattle(s,seed);b.id='practice-'+now;b.practice=true;b.challengeId=challenge.id;b.enemyName=ship.name;
 // The bonus belongs only to this battle, including when it fills a normal station.
 if(empty){delete s.slots[slot];s.levels[p.id]=baseLevel;}
 const opponent=Object.assign(M.fresh(now),structuredClone(ship));b.enemy=M.startBattle(opponent,seed).player;b.enemy.x=8.4;b.enemy.cosmetic=ship.cosmetic??1;b.opponent=structuredClone(b.enemy);
 b.player.practiceBonus=!empty;
 if(!empty)b.player.crew.push({id:p.id,level,slot,hp:M.stats(p,level).hp});
 b.bonusGunner=p.id;
 return s;
}

// Receipts are for browser-local saves, not server-verified multiplayer results.
function ledger(s){return s.friendChallenges??={issued:[],claimed:[],completed:{}};}
function linkFor(value,base,kind){
 const packed=kind==='challenge'?packShipChallenge(value):[3,value.id,value.friend,((value.turns-1)<<1)|(value.won?1:0)];
 const token=encodeLinkPayload(packed);
 const url=new URL(base);url.hash='';url.search='';url.searchParams.set(kind,token);return url.href;
}
export function issueChallenge(s,base){
 const id=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
 const challenge={...challengeSnapshot(s),id};ledger(s).issued.push(id);
 return linkFor(challenge,base,'challenge');
}
export function ownsChallenge(s,c){return !!c.id&&!!s.friendChallenges?.issued.includes(c.id);}
function validateResult(r){
 if(!r||r.v!==1||typeof r.id!=='string'||!/^[a-f0-9]{32}$/.test(r.id)||typeof r.friend!=='string'||r.friend.length>24||typeof r.won!=='boolean'||!Number.isInteger(r.turns)||r.turns<1||r.turns>25)throw Error('This results link is invalid.');
 return {v:1,id:r.id,friend:r.friend,won:r.won,turns:r.turns};
}
export function resultsURL(r,base){return linkFor(validateResult(r),base,'challenge-result');}
export function readChallengeResult(source){
 try{const token=tokenFrom(source,'challenge-result');if(token===null)return null;
  let r=decodeToken(token,2000);
  if(Array.isArray(r)){
   if(r[0]===3){if(r.length!==4||!Number.isInteger(r[3])||r[3]<0||r[3]>49)throw Error('Invalid result bits.');r={v:1,id:r[1],friend:r[2],won:!!(r[3]&1),turns:(r[3]>>1)+1};}
   else{if(r.length!==5||r[0]!==2||![0,1].includes(r[3]))throw Error('Invalid result data.');r={v:1,id:r[1],friend:r[2],won:r[3]===1,turns:r[4]};}
  }
  return validateResult(r);
 }catch{throw Error('This results link is invalid.');}
}
export function completeChallenge(captain,challenge,game){
 const c=validateChallenge(challenge),b=game.battle;
 if(!b?.practice||b.phase!=='result'||b.challengeId!==c.id)throw Error('Finish the challenge before sharing results.');
 if(!c.id)return {result:null,awarded:false}; // Old links remain playable.
 if(ownsChallenge(captain,c))throw Error('Send this challenge to a friend to earn wood.');
 const l=ledger(captain);
 if(l.completed[c.id]){l.lastResult=l.completed[c.id];return {result:l.completed[c.id],awarded:false};}
 const result=validateResult({v:1,id:c.id,friend:game.name,won:b.won,turns:b.turn});
 if(!Number.isSafeInteger(captain.mats.wood+100))throw Error('Your wood inventory is full.');
 captain.mats.wood+=100;l.completed[c.id]=result;l.lastResult=result;
 return {result,awarded:true};
}
export function claimChallengeResult(captain,value){
 const result=validateResult(value),l=ledger(captain);
 if(!l.issued.includes(result.id))throw Error('Open this link in the browser where you created the challenge.');
 if(l.claimed.includes(result.id))return false;
 if(!Number.isSafeInteger(captain.mats.wood+100))throw Error('Your wood inventory is full.');
 captain.mats.wood+=100;l.claimed.push(result.id);return true;
}
