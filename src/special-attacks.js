import {ECON} from './catalog.js';

// Stable IDs preserve previously purchased/equipped attacks and season unlocks.
export const SPECIAL_TUNING=Object.freeze({chargeAttacks:4,whaleHullDamage:220,swordfishSailFraction:.45,sirenCrewDamage:48,sirenGemCost:270,testUnlockGold:10});
const specs=[
 ['Shark Attack','One living enemy deck gunner; hull gunners are protected','🦈','crew','shark',7200,3100],
 ['Kraken Attack','One standing mast and its sails','🐙','masts','kraken',7600,3500],
 ['Great White Whale','Heavy hull damage','🐋','hull','whale',7400,3400],
 ['Storm Bolt','A mast','⚡','masts','storm',5600,2300],
 ['Swordfish Run','Sails','🐟','sails','swordfish',5600,2300],
 ['Angry Seagull','Deck gunners','🕊','crew','gull',7200,3200],
 ['Siren Song','Enemy crew','♫','crew','siren',8000,3600]
];
export const SPECIAL_ATTACKS=specs.map(([name,hits,icon,target,art,duration,impactAt],id)=>Object.freeze({id,name,hits,icon,target,art,duration,impactAt,cost:Object.freeze({gold:SPECIAL_TUNING.testUnlockGold}),gems:ECON.MOVES[id]?.gems??SPECIAL_TUNING.sirenGemCost}));

export function specialAttackIcon(id){
 const move=SPECIAL_ATTACKS[id]||SPECIAL_ATTACKS[0];
 return ['shark','kraken','whale','gull','siren'].includes(move.art)?`<img class="special-loadout-icon" src="./public/killstreaks/${move.art}.png" alt="${move.name}">`:`<span class="special-loadout-icon" role="img" aria-label="${move.name}">${move.icon}</span>`;
}

