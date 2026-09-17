export const WOOD_TUNING=Object.freeze({bundleWood:100,bundleGold:500,passWood:20,milestoneWood:100,captainMultiplier:3});
export const passWood=(level,premium)=>(level%5===0?WOOD_TUNING.milestoneWood:WOOD_TUNING.passWood)*(premium?WOOD_TUNING.captainMultiplier:1);
