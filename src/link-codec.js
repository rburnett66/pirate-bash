// Versioned binary values + bounded LZSS. No browser compression API or network required.
const MAX_BYTES=16384,MAX_ITEMS=2048,MAX_DEPTH=32;
const utf8=new TextEncoder(),text=new TextDecoder('utf-8',{fatal:true});
function hash(bytes){let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;}
function serialize(value){
 const out=[];let items=0;
 const put=n=>{out.push(n);if(out.length>MAX_BYTES)throw Error('Link payload too large.');};
 const uint=n=>{do{const b=n%128;n=Math.floor(n/128);put(b+(n?128:0));}while(n);};
 // Escape only malformed UTF-16 strings so even lone surrogates round-trip exactly.
 const str=s=>{let b=utf8.encode(s);const escaped=text.decode(b)!==s;if(escaped)b=utf8.encode(JSON.stringify(s));uint(b.length*2+(escaped?1:0));for(const x of b)put(x);};
 function write(v,depth=0){
  if(depth>MAX_DEPTH||++items>MAX_ITEMS)throw Error('Link payload too complex.');
  if(v===null){put(0);return;}if(v===false){put(1);return;}if(v===true){put(2);return;}if(v===undefined){put(9);return;}
  if(typeof v==='number'){
   if(!Number.isFinite(v))throw Error('Invalid link number.');
   if(Number.isSafeInteger(v)&&!Object.is(v,-0)){put(v<0?4:3);uint(Math.abs(v));}
   else{put(5);const a=new Uint8Array(8);new DataView(a.buffer).setFloat64(0,v,true);for(const b of a)put(b);}return;
  }
  if(typeof v==='string'){
   if(/^[a-f0-9]{32}$/.test(v)){put(10);for(let i=0;i<32;i+=2)put(parseInt(v.slice(i,i+2),16));}
   else{put(6);str(v);}return;
  }
  if(v instanceof Uint8Array){put(11);uint(v.length);for(const b of v)put(b);return;}
  if(Array.isArray(v)){put(7);uint(v.length);for(const x of v)write(x,depth+1);return;}
  if(typeof v!=='object')throw Error('Invalid link value.');
  const entries=Object.entries(v);put(8);uint(entries.length);for(const [k,x] of entries){str(k);write(x,depth+1);}
 }
 write(value);return Uint8Array.from(out);
}
function deserialize(bytes){
 let pos=0,items=0;
 const take=()=>{if(pos>=bytes.length)throw Error('Truncated link.');return bytes[pos++];};
 const uint=()=>{let n=0,f=1;for(let i=0;i<8;i++){const b=take();n+=(b&127)*f;if(!Number.isSafeInteger(n))throw Error('Invalid integer.');if(!(b&128))return n;f*=128;}throw Error('Invalid integer.');};
 const str=()=>{const code=uint(),n=Math.floor(code/2);if(n>bytes.length-pos)throw Error('Truncated text.');let s=text.decode(bytes.subarray(pos,pos+n));pos+=n;if(code%2){s=JSON.parse(s);if(typeof s!=='string')throw Error('Invalid escaped text.');}return s;};
 function read(depth=0){
  if(depth>MAX_DEPTH||++items>MAX_ITEMS)throw Error('Link payload too complex.');
  switch(take()){
   case 0:return null;case 1:return false;case 2:return true;case 3:return uint();case 4:return -uint();case 9:return undefined;
   case 5:{if(pos+8>bytes.length)throw Error('Truncated number.');const n=new DataView(bytes.buffer,bytes.byteOffset+pos,8).getFloat64(0,true);pos+=8;if(!Number.isFinite(n))throw Error('Invalid number.');return n;}
   case 6:return str();
   case 11:{const n=uint();if(n>bytes.length-pos)throw Error('Truncated packed data.');const b=bytes.slice(pos,pos+n);pos+=n;return b;}
   case 7:{const n=uint();if(n>MAX_ITEMS)throw Error('Too many values.');return Array.from({length:n},()=>read(depth+1));}
   case 8:{const n=uint(),o={};if(n>MAX_ITEMS)throw Error('Too many fields.');for(let i=0;i<n;i++){const k=str();if(Object.hasOwn(o,k))throw Error('Duplicate field.');Object.defineProperty(o,k,{value:read(depth+1),enumerable:true,writable:true,configurable:true});}return o;}
   case 10:{let s='';for(let i=0;i<16;i++)s+=take().toString(16).padStart(2,'0');return s;}
   default:throw Error('Unknown link value.');
  }
 }
 const value=read();if(pos!==bytes.length)throw Error('Trailing link data.');return value;
}
function compress(bytes){
 const out=[],index=new Map();let pos=0;
 const key=i=>(bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2];
 const remember=i=>{if(i+2>=bytes.length)return;const k=key(i),list=index.get(k)||[];list.push(i);if(list.length>64)list.shift();index.set(k,list);};
 while(pos<bytes.length){const flagAt=out.length;out.push(0);let flags=0;
  for(let bit=0;bit<8&&pos<bytes.length;bit++){
   let length=0,distance=0;
   if(pos+2<bytes.length)for(const candidate of index.get(key(pos))||[]){const d=pos-candidate;if(d>4096)continue;let n=0;while(n<18&&pos+n<bytes.length&&bytes[candidate+n]===bytes[pos+n])n++;if(n>length){length=n;distance=d;}}
   if(length>=3){flags|=1<<bit;const code=((distance-1)<<4)|(length-3);out.push(code>>>8,code&255);for(let i=0;i<length;i++)remember(pos+i);pos+=length;}
   else{out.push(bytes[pos]);remember(pos++);}
  }out[flagAt]=flags;
 }return Uint8Array.from(out);
}
function expand(bytes,size){
 const out=new Uint8Array(size);let pos=0,w=0;
 while(pos<bytes.length&&w<size){const flags=bytes[pos++];for(let bit=0;bit<8&&w<size;bit++){
  if(flags&(1<<bit)){if(pos+2>bytes.length)throw Error('Truncated compressed link.');const code=(bytes[pos++]<<8)|bytes[pos++],d=(code>>>4)+1,n=(code&15)+3;if(d>w||w+n>size)throw Error('Invalid compressed link.');for(let i=0;i<n;i++){out[w]=out[w-d];w++;}}
  else{if(pos>=bytes.length)throw Error('Truncated compressed link.');out[w++]=bytes[pos++];}
  if(w===size&&(flags>>>(bit+1)))throw Error('Invalid final flags.');
 }}if(w!==size||pos!==bytes.length)throw Error('Invalid compressed length.');return out;
}
export function encodeLinkPayload(value){
 const raw=serialize(value),z=compress(raw),compressed=z.length<raw.length,body=compressed?z:raw;
 const bytes=new Uint8Array(7+body.length),view=new DataView(bytes.buffer);bytes[0]=compressed?1:0;view.setUint16(1,raw.length);view.setUint32(3,hash(raw));bytes.set(body,7);
 return 'b3_'+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodeLinkPayload(token){
 if(!/^b3_[A-Za-z0-9_-]+$/.test(token)||token.length>22000)throw Error('Invalid binary link.');
 const bytes=Uint8Array.from(atob(token.slice(3).replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 if(bytes.length<8)throw Error('Truncated binary link.');const view=new DataView(bytes.buffer),size=view.getUint16(1);
 if(size<1||size>MAX_BYTES||bytes[0]>1)throw Error('Invalid binary header.');
 const raw=bytes[0]?expand(bytes.subarray(7),size):bytes.subarray(7);
 if(raw.length!==size||hash(raw)!==view.getUint32(3))throw Error('Damaged link.');return deserialize(raw);
}
