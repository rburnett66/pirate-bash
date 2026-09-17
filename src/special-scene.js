import {gunnerImage} from './gunner-art.js';
import {stationPosition,rigLayout} from './ballistics.js';
import {shipToWorld} from './ship-pose.js';

const assets=new Map();
const names=['shark','kraken','tentacles','whale','gull','siren','ball','flaming-ball','fireball'];
function load(src){if(!assets.has(src))assets.set(src,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{assets.delete(src);reject(Error('Big attack artwork could not load. Please try again.'));};img.src=src;}));return assets.get(src);}
const sceneArt=move=>move.id===1?['kraken','tentacles']:[names.includes(move.art)?move.art:'fireball'];
export function preloadSpecialArt(move){return Promise.all(sceneArt(move).map(n=>load('/pirate-bash/public/killstreaks/'+n+'.png')));}
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const bounds=new WeakMap();
function artBounds(img){
 if(bounds.has(img))return bounds.get(img);
 const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
 const d=ctx.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
 for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(d[(y*c.width+x)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+2);y1=Math.max(y1,y+2);}
 const r=[x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0)];bounds.set(img,r);return r;
}
function sprite(ctx,img,x,y,width,angle=0,alpha=1){const r=artBounds(img),height=width*r[3]/r[2];ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(img,...r,-width/2,-height,width,height);ctx.restore();}

// A quiet vowel-like melody begins before the siren appears; all oscillators end on cleanup.
export function sirenVoice(enabled,duration,context){
 if(!enabled)return ()=>{};
 let audio;try{audio=context||new AudioContext();audio.resume().catch(()=>{});const gain=audio.createGain();gain.connect(audio.destination);const t=audio.currentTime,voices=[];
 gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.035,t+.6);gain.gain.setValueAtTime(.035,t+duration/1000-1.6);gain.gain.linearRampToValueAtTime(0,t+duration/1000);
 const notes=[293.66,349.23,440,392,349.23,293.66];
 for(let harmonic=1;harmonic<=4;harmonic++){const osc=audio.createOscillator(),volume=audio.createGain();voices.push(osc);osc.type='sine';volume.gain.value=1/(harmonic*harmonic);osc.connect(volume);volume.connect(gain);notes.forEach((n,i)=>osc.frequency.linearRampToValueAtTime(n*harmonic,t+i*(duration/1000-.6)/notes.length));osc.start(t);osc.stop(t+duration/1000+.1);}
 return ()=>{voices.forEach(o=>{try{o.stop();o.disconnect();}catch{}});gain.disconnect();if(!context)audio.close().catch(()=>{});};
 }catch{return ()=>{if(!context)audio?.close().catch(()=>{});};}
}

// Two effect canvases straddle the ship iframes. All world positions are recalculated every frame.
export async function playSpecialScene({field,move,pending,getBattle,getCamera,reduced,onImpact,onAfterImpact,onCelebrate,sound,rigImage}){
 const pictures=Object.fromEntries(await Promise.all(sceneArt(move).map(async n=>[n,await load('/pirate-bash/public/killstreaks/'+n+'.png')])));
 const victim=pending.before.crew.find(g=>g.id===pending.targetCrew);
 const victimImage=victim?await load(gunnerImage(victim.id)):null;
 const reacting= [5,6].includes(move.id)?await Promise.all(pending.before.crew.filter(g=>g.hp>0&&g.slot.startsWith('d')).map(async g=>({g,img:await load(gunnerImage(g.id))}))):[];
 const savedRig=rigImage?await load(rigImage):null;
 const back=field.querySelector('#specialBehind'),front=field.querySelector('#specialFront'),title=field.querySelector('#specialAnnouncement');
 const bg=back.getContext('2d'),fg=front.getContext('2d');back.hidden=front.hidden=title.hidden=false;
 title.querySelector('strong').textContent=move.name.toUpperCase();title.querySelector('span').textContent=move.id===1?'KRAKEN ATTACK!':move.id===6?'Listen… the sea is singing.':'ALL HANDS. BRACE YOURSELVES.';
 field.dataset.special=move.art;field.dataset.specialStage=pending.applied?'aftermath':'anticipation';
 const duration=reduced?1800:move.duration,impactAt=reduced?650:move.impactAt;
 let impacted=pending.applied,elapsed=impacted?impactAt:0,last=null,frame,celebrated=false;
 const stopVoice=sirenVoice(move.id===6&&sound.enabled,duration-elapsed,sound.context);
 let resizeObserver;
 const resize=()=>{for(const c of [back,front]){const w=field.clientWidth,h=field.clientHeight;if(c.width!==w||c.height!==h){c.width=w;c.height=h;}}};resize();resizeObserver=new ResizeObserver(resize);resizeObserver.observe(field);
 function draw(t){
  const b=getBattle(),f=b[pending.side==='enemy'?'player':'enemy'],{ppu,ox,oy}=getCamera(),at=(x,y)=>({x:ox+x*ppu,y:oy-y*ppu}),anchor=at(f.x,-.25+(f.pose?.heave||0));
  const impact=t-impactAt,pre=ease(t/impactAt),after=clamp(impact/(duration-impactAt));
  field.querySelector(pending.side==='enemy'?'#playerShip':'#enemyShip')?.style.setProperty('--special-rock',!reduced&&move.id===2&&impact>0?Math.sin(impact/95)*4*Math.max(0,1-impact/2300)+'deg':'0deg');
  bg.clearRect(0,0,back.width,back.height);fg.clearRect(0,0,front.width,front.height);
  const emergence=ease((t-(move.id===6?850:300))/(impactAt-650)),sink=ease((after-.45)/.55),alpha=Math.min(1,t/350,(duration-t)/500);
  const creature=(name,width,x=0,y=0,angle=0)=>sprite(fg,pictures[name],anchor.x+x*ppu,anchor.y-y*ppu,width*ppu,angle,alpha);
  const krakenBody=(width,rise)=>{
   const x=anchor.x+.55*ppu,waterline=anchor.y+.2*ppu;
   // Reveal the body through the surface, with its lower tentacles still submerged.
   fg.save();fg.beginPath();fg.rect(0,0,front.width,waterline);fg.clip();
   sprite(fg,pictures.kraken,x,waterline+(.12+(1-rise*.75)*1.3)*ppu,width*ppu,0,alpha);fg.restore();
   fg.save();fg.globalAlpha=alpha*rise;fg.strokeStyle='#c9faff';fg.lineWidth=Math.max(2,.018*ppu);fg.beginPath();fg.ellipse(x,waterline,(.34+rise*.26)*ppu,.045*ppu,0,0,Math.PI*2);fg.stroke();fg.restore();
  };
  const whaleBody=(offset,rise,angle,smash=0)=>{
   const x=anchor.x+offset*ppu,waterline=anchor.y+.2*ppu,width=2.2*ppu;
   const rect=artBounds(pictures.whale),height=width*rect[3]/rect[2];
   fg.save();fg.beginPath();fg.moveTo(0,0);fg.lineTo(front.width,0);fg.lineTo(front.width,waterline);
   for(let px=front.width;px>=0;px-=8)fg.lineTo(px,waterline+(reduced?0:Math.sin((px-x)/ppu*8+t/400)*.025*ppu));
   fg.lineTo(0,waterline);fg.closePath();fg.clip();
   sprite(fg,pictures.whale,x,waterline+height*(1-.6*rise)+smash*.35*ppu,width,angle,alpha);fg.restore();
   fg.save();fg.globalAlpha=alpha*rise;fg.strokeStyle='#d2faff';fg.lineWidth=Math.max(2,.025*ppu);
   fg.beginPath();fg.ellipse(x,waterline,.7*ppu,.075*ppu,0,0,Math.PI*2);fg.stroke();fg.restore();
  };
  const sirenBody=rise=>{
   const x=anchor.x-.85*ppu,waterline=anchor.y+.2*ppu,width=1.65*ppu;
   const rect=artBounds(pictures.siren),height=width*rect[3]/rect[2];
   // Keep the lower body submerged; the head and shoulders emerge through the waves.
   const wave=px=>waterline+(reduced?0:Math.sin((px-x)/ppu*9+t/450)*.025*ppu);
   fg.save();fg.beginPath();fg.moveTo(0,0);fg.lineTo(front.width,0);fg.lineTo(front.width,wave(front.width));
   for(let px=front.width;px>=0;px-=8)fg.lineTo(px,wave(px));fg.lineTo(0,wave(0));fg.closePath();fg.clip();
   sprite(fg,pictures.siren,x,waterline+height*(1-.605*rise),width,0,alpha);fg.restore();
   fg.save();fg.globalAlpha=alpha*rise;fg.strokeStyle='#c9faff';fg.lineWidth=Math.max(2,.018*ppu);
   fg.beginPath();fg.ellipse(x,waterline,.45*ppu,.055*ppu,0,0,Math.PI*2);fg.stroke();fg.restore();
  };
  if(reduced){
   const name=names.includes(move.art)?move.art:'fireball';if(move.id===1){sprite(bg,pictures.tentacles,anchor.x,anchor.y+.2*ppu,1.4*ppu,0,alpha);krakenBody(1.176,1);}else if(move.id===2){whaleBody(0,emergence*(1-sink),0);}else if(move.id===6){sirenBody(emergence*(1-sink));}else creature(name,move.id===0?.7:1.4,0,0);if(impacted){fg.strokeStyle='#ffdf8c';fg.lineWidth=4;fg.beginPath();fg.ellipse(anchor.x,anchor.y-.5*ppu,1.2*ppu,.7*ppu,0,0,Math.PI*2);fg.stroke();}
  }else if(move.id===0){
   const leap=impact<0?Math.sin(pre*Math.PI*.65):Math.max(0,1-impact/1600);
   creature('shark',.8,impact<0?1.6*(1-pre):-.5*clamp(impact/1500),-.65+leap*.8,impact<0?-.35+.35*pre:clamp(impact/1800)*-.6);
  }else if(move.id===1){
   const mast=rigLayout().masts[pending.targetMast],tip=shipToWorld(f,pending.side==='enemy'?1:-1,{x:mast.x,y:mast.top}),target=at(tip.x,tip.y);
   const reach=emergence*(1-sink),waterline=anchor.y+.2*ppu;
   bg.save();bg.beginPath();bg.rect(0,0,back.width,waterline);bg.clip();
   sprite(bg,pictures.tentacles,anchor.x,waterline+(1-reach)*.95*ppu,1.4*ppu,0,alpha);
   // A reaching arm approaches the chosen mast from behind the ship.
   bg.save();bg.globalAlpha=alpha*(1-ease(Math.max(0,impact)/1700));
   const arm=bg.createLinearGradient(target.x-.06*ppu,0,target.x+.06*ppu,0);arm.addColorStop(0,'#452459');arm.addColorStop(.45,'#a369bd');arm.addColorStop(.8,'#784493');arm.addColorStop(1,'#47321e');
   bg.strokeStyle=arm;bg.lineWidth=.065*ppu;bg.lineCap='round';bg.lineJoin='round';bg.beginPath();bg.moveTo(anchor.x,waterline);bg.bezierCurveTo(anchor.x+.5*ppu,anchor.y-reach*2*ppu,target.x-.15*ppu,target.y+(1-reach)*1.5*ppu,target.x+.025*ppu,target.y+(1-reach)*1.5*ppu);bg.stroke();
   for(let i=0;i<4;i++){bg.fillStyle='#b0b36b';bg.beginPath();bg.ellipse(target.x+(.0175-i*.0275)*ppu,target.y+((1-reach)*1.5+i*i*.0125)*ppu,.009*ppu,.013*ppu,-.5,0,7);bg.fill();}bg.restore();bg.restore();
   krakenBody(1.47,reach);
  }else if(move.id===2){
   const rise=emergence*(1-sink);const smash=impact<0?0:Math.sin(clamp(impact/850)*Math.PI);
   whaleBody(impact<0?1.2*(1-pre):-.35*smash,rise,impact<0?-.24:-.24+.65*smash,smash);
  }else if(move.id===5){
   creature('gull',1.4,2.7-5.4*t/duration,1.2+.14*Math.sin(t/160));
   for(let i=0;i<6;i++){const fall=clamp((t-(impactAt-650+i*90))/650);if(fall<=0)continue;const x=anchor.x+(2.5-i)*.22*ppu,y=anchor.y-(1.35-1.45*fall)*ppu;fg.fillStyle='#f8f1c9';fg.beginPath();fg.ellipse(x,y,(fall===1?.13:.04)*ppu,(fall===1?.035:.075)*ppu,.3,0,7);fg.fill();}
  }else if(move.id===6){
   sirenBody(emergence*(1-sink));
   fg.save();fg.fillStyle='#a9faff';fg.font=`bold ${Math.max(18,.22*ppu)}px serif`;for(let i=0;i<7;i++){const life=(t/1600+i/7)%1;fg.globalAlpha=alpha*Math.sin(life*Math.PI);fg.fillText(i%2?'♪':'♫',anchor.x+(-.8+life*1.8)*ppu,anchor.y-(.5+life*1.4+i%2*.1)*ppu);}fg.restore();
  }else if(move.id===3){
   if(impact>-150&&impact<1100){fg.strokeStyle='#b6f3ff';fg.lineWidth=7;fg.beginPath();fg.moveTo(anchor.x+.5*ppu,0);fg.lineTo(anchor.x-.1*ppu,anchor.y-1.2*ppu);fg.lineTo(anchor.x+.2*ppu,anchor.y-1.3*ppu);fg.lineTo(anchor.x,anchor.y);fg.stroke();}
  }else{creature('fireball',.85,2.5-5*t/duration,.25);}
  // A pre-impact portrait survives normal sync and HP=0 until its splash.
  if(impacted&&impact<2200)for(const {g,img} of reacting){if(f.crew.find(live=>live.id===g.id)?.hp>0)continue;const q=stationPosition(pending.before,g.slot),v=shipToWorld(f,pending.side==='enemy'?1:-1,{x:q.x,y:q.y}),pos=at(v.x,v.y);sprite(fg,img,pos.x,pos.y+(reduced?0:Math.sin(impact/80)*.045*ppu),q.width*ppu,reduced?0:Math.sin(impact/90)*.09,1-ease((impact-1600)/600));}
  if(impacted&&victimImage){
   const q=stationPosition(pending.before,victim.slot),v=shipToWorld(f,pending.side==='enemy'?1:-1,{x:q.x,y:q.y}),pos=at(v.x,v.y),u=clamp(impact/(reduced?650:2200));
   if(u<1)sprite(fg,victimImage,pos.x-u*1.3*ppu,pos.y-(reduced?0:Math.sin(u*Math.PI)*1.65)*ppu+u*u*.8*ppu,q.width*ppu,reduced?0:u*7,1-ease((u-.85)/.15));
  }
  // The actual pre-impact mast canvas includes its cloth; dead sails cannot erase this copy.
  if(impacted&&savedRig&&impact<(reduced?700:2300)){
   const u=clamp(impact/(reduced?700:2300)),mast=rigLayout().masts[pending.targetMast],foot=shipToWorld(f,pending.side==='enemy'?1:-1,{x:mast.x,y:mast.foot}),pivot=at(foot.x,foot.y);
   fg.save();fg.globalAlpha=1-ease((u-.65)/.35);fg.translate(pivot.x,pivot.y);fg.rotate(-(f.pose?.roll||0)+(reduced?0:-u*u*1.65));fg.translate(0,u*u*.6*ppu);fg.scale(-ppu,ppu);fg.drawImage(savedRig,-810/480-mast.x,-1.44+mast.foot,1792/480,1008/480);fg.restore();
  }
  if(impacted){
   const burst=clamp(impact/1500);if(!reduced&&move.id===2)for(let i=0;i<24;i++){const a=i*2.4;fg.save();fg.translate(anchor.x+Math.cos(a)*burst*1.6*ppu,anchor.y-.25*ppu-Math.sin(Math.PI*burst)*Math.abs(Math.sin(a))*ppu+burst*.4*ppu);fg.rotate(a+burst*5);fg.globalAlpha=1-burst;fg.fillStyle=i%2?'#a77636':'#e8b964';fg.fillRect(0,0,.09*ppu,.025*ppu);fg.restore();}
   const splashAt=move.id===0?1700:move.id===1?1700:0,age=impact-splashAt;
   if(age>=0){const u=clamp(age/(reduced?700:1500)),x=anchor.x+(move.id===0?-1.1:0)*ppu;fg.save();fg.globalAlpha=(1-u)*alpha;fg.strokeStyle='#d2ffff';fg.lineWidth=Math.max(2,.03*ppu);fg.beginPath();fg.ellipse(x,anchor.y+.25*ppu,(.15+u*1.4)*ppu,.12*ppu,0,0,7);fg.stroke();if(!reduced)for(let i=0;i<16;i++){const a=i*2.4;fg.fillStyle='#9fe8f3';fg.beginPath();fg.ellipse(x+Math.cos(a)*u*ppu,anchor.y+.25*ppu-Math.sin(Math.PI*u)*Math.abs(Math.sin(a))*.9*ppu,.025*ppu,.07*ppu,a,0,7);fg.fill();}fg.restore();}
  }
 }
 try{
  await new Promise((resolve,reject)=>{function tick(now){try{
   if(last!==null&&!document.hidden)elapsed+=Math.min(80,now-last);last=now;
   if(!impacted&&elapsed>=impactAt){onImpact();impacted=true;field.dataset.specialStage='impact';title.querySelector('span').textContent=move.id===5?'MIND THE GULL!':move.id===6?'THE SONG CUTS DEEP':'DIRECT HIT!';sound.impact(move.id);onAfterImpact();}
   if(impacted&&elapsed>impactAt+800)field.dataset.specialStage='aftermath';
   if(move.id===5&&impacted&&!celebrated&&elapsed>impactAt+(reduced?400:2200)){celebrated=true;onCelebrate?.();title.querySelector('span').textContent='HA-HA! MIND THE GULL!';}
   draw(Math.min(duration,elapsed));
   if(elapsed>=duration){resolve();return;}frame=requestAnimationFrame(tick);
  }catch(error){reject(error);}}frame=requestAnimationFrame(tick);});
 }finally{cancelAnimationFrame(frame);resizeObserver.disconnect();stopVoice();field.querySelector(pending.side==='enemy'?'#playerShip':'#enemyShip')?.style.setProperty('--special-rock','0deg');for(const c of [back,front]){c.getContext('2d').clearRect(0,0,c.width,c.height);c.hidden=true;}title.hidden=true;delete field.dataset.special;delete field.dataset.specialStage;}
}

