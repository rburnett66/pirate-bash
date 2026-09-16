import {PROTOTYPE_DEFAULTS,CONTROL_RANGES} from './ocean-catalog.js';
export const WATER_DEFAULTS=Object.freeze({...PROTOTYPE_DEFAULTS,swellAmp:.68,swellLen:28,speed:.85,noise:.18,peakK:2.8,pinch:.18,flatten:.65,lineW:2.2,crestLo:.24,crestHi:.85,crestThick:1.6,hullDraft:.30,hullFoam:1.1,rock:.75,rockMax:4,foamLife:1.8,splashSpeed:13,splashSize:.45,splashLife:1.25});
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function waterValues(raw){
 if(!object(raw)||!Object.keys(raw).length)throw Error('Paste a water settings object.');
 const values={...WATER_DEFAULTS};
 for(const [key,value] of Object.entries(raw)){
  if(!Object.hasOwn(WATER_DEFAULTS,key))throw Error('Unknown water control: '+key);
  if(key==='hullOn'){if(typeof value!=='boolean')throw Error('Hull test must be true or false.');}
  else {const [min,max]=CONTROL_RANGES[key];if(!Number.isFinite(value)||value<min||value>max)throw Error(key+' must be between '+min+' and '+max+'.');if(['octaves','nearSpan','farSpan','splashCount','hullRow','sub'].includes(key)&&!Number.isInteger(value))throw Error(key+' must be a whole number.');}
  values[key]=value;
 }
 if(values.crestHi<=values.crestLo)throw Error('Full white height must be above where white starts.');
 if(values.horizon<=values.front)throw Error('Horizon must be above the nearest row.');
 return values;
}
export function waterName(name){if(typeof name!=='string'||!name.trim()||name.trim().length>40)throw Error('Give the look a name of 1–40 characters.');return name.trim();}
export function parseWater(text){
 if(typeof text!=='string'||text.length>30000)throw Error('Water settings must be JSON under 30 KB.');
 let raw;try{raw=JSON.parse(text);}catch{throw Error('Paste valid JSON copied from the water tool.');}
 if(object(raw)&&Object.hasOwn(raw,'format')){
  if(raw.format!=='pirate-clashers-ocean'||raw.version!==1)throw Error('This water settings format is not supported.');
  return {name:waterName(raw.name||'Imported look'),values:waterValues(raw.settings)};
 }
 return {name:'Imported look',values:waterValues(raw)};
}
export function exportWater(name,values){return JSON.stringify({format:'pirate-clashers-ocean',version:1,name:waterName(name),settings:waterValues(values)},null,2);}
export function waterLibrary(library){
 if(library===undefined)return {selected:'default',presets:[]};
 if(!object(library)||!Array.isArray(library.presets)||library.presets.length>24)throw Error('Invalid water look library.');
 const presets=library.presets.map(p=>{if(!object(p)||typeof p.id!=='string'||!/^look-[a-z0-9-]{1,64}$/.test(p.id))throw Error('Invalid water look.');return {id:p.id,name:waterName(p.name),values:waterValues(p.values)};});
 if(new Set(presets.map(p=>p.id)).size!==presets.length||!['default',...presets.map(p=>p.id)].includes(library.selected))throw Error('Invalid selected water look.');
 return {selected:library.selected,presets};
}
export function activeWater(library){const l=waterLibrary(library);return l.presets.find(p=>p.id===l.selected)||{id:'default',name:'Coastal swell',values:{...WATER_DEFAULTS}};}
