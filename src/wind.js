export const WIND_TUNING=Object.freeze({maxStrength:3,driftPerStrength:.18});
export const windSpeed=(wind=0)=>wind*WIND_TUNING.driftPerStrength;
export function battleWind(seed){return ((Math.imul(seed,1664525)+1013904223)>>>0)%7-3;}
export function windLabel(wind=0){return wind===0?'Wind · Calm':`${wind<0?'←':'→'} Wind · ${['','Light','Moderate','Strong'][Math.abs(wind)]}`;}
