// Wire v3 defaults are fixed protocol values, independent of future new-game defaults.
export const CHALLENGE_FIELDS=['name','shipLevel','sailLevel','slots','levels','cosmetic','cosmetics','flag','flags','figurehead','figureheads','plating','canvas','durability','plates','canvasDurability','enh','move','moves'];
const defaults=['Captain',1,1,{d0:1,d1:2,h0:5},Object.fromEntries(Array.from({length:36},(_,i)=>[i+1,[1,2,5,10].includes(i+1)?1:0])),null,[],7,[7],null,{},'bare','plain',100,Array.from({length:8},()=>({kind:'bare',durability:100})),100,{},0,[0]];
function same(a,b){if(Object.is(a,b))return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));}
function bits(values,width){
 if(values.length>255||!values.every(v=>Number.isInteger(v)&&!Object.is(v,-0)&&v>=0&&v<2**width))return null;
 const out=new Uint8Array(1+Math.ceil(values.length*width/8));out[0]=values.length;
 values.forEach((v,i)=>{for(let b=0;b<width;b++)if(v&(1<<b)){const at=i*width+b;out[1+(at>>3)]|=1<<(at&7);}});return out;
}
function unbits(bytes,width){
 const count=bytes[0];if(bytes.length!==1+Math.ceil(count*width/8))throw Error('Invalid packed fields.');
 const used=count*width%8;if(used&&bytes.at(-1)>>>used)throw Error('Invalid padding.');
 return Array.from({length:count},(_,i)=>{let v=0;for(let b=0;b<width;b++){const at=i*width+b;v|=((bytes[1+(at>>3)]>>(at&7))&1)<<b;}return v;});
}
function packField(k,v){
 if(k==='levels'&&v&&Object.keys(v).length===36){const a=Array.from({length:36},(_,i)=>v[i+1]);return bits(a,4)||v;}
 if(k==='slots'&&v){const entries=Object.entries(v);if(entries.every(([s,id])=>/^[dh][0-7]$/.test(s)&&Number.isInteger(id)&&id>=1&&id<=36))return bits(entries.map(([s,id])=>((s[0]==='h'?8:0)+Number(s[1]))|(id<<4)),10);}
 const width={cosmetics:3,flags:6,moves:3}[k];if(width&&Array.isArray(v))return bits(v,width)||v;
 return v;
}
function unpackField(k,v){
 if(!(v instanceof Uint8Array))return v;
 if(k==='levels'){const levels=unbits(v,4);if(levels.length!==36)throw Error('Invalid crew levels.');return Object.fromEntries(levels.map((n,i)=>[i+1,n]));}
 if(k==='slots'){const entries=unbits(v,10).map(n=>[(n&8?'h':'d')+(n&7),n>>4]);if(new Set(entries.map(e=>e[0])).size!==entries.length)throw Error('Duplicate station.');return Object.fromEntries(entries);}
 const width={cosmetics:3,flags:6,moves:3}[k];if(!width)throw Error('Unexpected packed field.');return unbits(v,width);
}
export function packShipChallenge(c){
 let mask=0;const values=[];
 CHALLENGE_FIELDS.forEach((k,i)=>{const v=c.ship[k];if(!same(v,defaults[i])){mask|=1<<i;values.push(packField(k,v));}});
 return [3,c.seed,c.id??null,mask,values];
}
export function unpackShipChallenge(c){
 if(c.length!==5||!Number.isInteger(c[3])||c[3]<0||c[3]>=2**CHALLENGE_FIELDS.length||!Array.isArray(c[4]))throw Error('Invalid packed ship.');
 let at=0;const ship=Object.fromEntries(CHALLENGE_FIELDS.map((k,i)=>[k,c[3]&(1<<i)?unpackField(k,c[4][at++]):structuredClone(defaults[i])]));
 if(at!==c[4].length)throw Error('Invalid field count.');
 return {v:1,seed:c[1],ship,...(c[2]!==null?{id:c[2]}:{})};
}
