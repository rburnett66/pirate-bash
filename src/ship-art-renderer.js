import {tearSail} from './sail-damage.js';
import {hullConfig,sailConfig,figureConfig} from './ship-config.js';
import {HULL_MASK,maskPixels} from './hull-mask.js';
import {SHIP_ART,shipAppearance,MAST_MOUNTS,RIG_SAILS,RIG_FLAGS,sailPanels,clothPlacement,worldToArt,artRig} from './ship-art-layout.js';

const images=new Map(),image=path=>{if(!images.has(path))images.set(path,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Ship artwork failed to load: '+path));img.src='/pirate-bash/public/ship-art/'+path;}));return images.get(path);};
const surface=(w=1792,h=1008)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const initial=maskPixels({}),C=HULL_MASK,rig=artRig();
function bitmap(pixels){const c=surface(C.width,C.height),ctx=c.getContext('2d'),data=ctx.createImageData(C.width,C.height);for(let y=0;y<C.height;y++)for(let x=0;x<C.width;x++){const i=(y*C.width+x)*4;data.data[i+3]=pixels[(C.height-1-y)*C.width+x];}ctx.putImageData(data,0,0);return c;}
const maskOrigin=worldToArt({x:C.left,y:C.bottom+C.spanY});
const drawMask=(ctx,mask)=>ctx.drawImage(mask,maskOrigin[0],maskOrigin[1],C.spanX*480,C.spanY*480);
function layer(id,z){const c=surface();c.id=id;c.setAttribute('aria-hidden','true');c.style.cssText=`position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:${z}`;document.body.append(c);return c;}

export class ShipArtRenderer{
 constructor(interior){this.interior=interior;this.rig=layer('gameRigArt',0);this.hull=layer('gameHullArt',3);this.canvases=[this.rig,interior,this.hull];this.body=surface();this.inside=surface();this.groups=[];this.ready=false;this.revision=0;this.fallen=[null,null,null];this.cutaway=false;this.hideRig=false;this.motion=true;this.parts=null;}
 async configure(d,side){
  const request=(this.request||0)+1;this.request=request;this.side=side;this.motion=d.motion!==false;this.preview=!!d.preview;this.setView(d);this.config=hullConfig(d.level);this.rigConfig=sailConfig(d.sailLevel??d.parts?.sailLevel);this.figure=figureConfig(d.figure??d.parts?.figure);this.appearance=shipAppearance(d.level,d.cosmetic,side,d.parts?.plating??d.plating);this.setParts(d.parts,true);
  const a=this.appearance,panels=sailPanels(a.sails);
  try{const loaded=await Promise.all([image(a.hull.body.right),image(SHIP_ART.registration.interior.right),...SHIP_ART.masts.map(m=>image(m.images.right)),...panels.map(s=>image(s.cloth)),...RIG_FLAGS.map(()=>image(SHIP_ART.flags.find(f=>f.id===(d.flag??d.parts?.flag??7)).image)),...(this.figure?.asset?[image(this.figure.asset)]:[])]);if(request!==this.request)return;
   [this.skin,this.xray]=loaded;this.alignSkin();this.masts=loaded.slice(2,5);this.cloth=loaded.slice(5,10);this.flags=loaded.slice(10,12);this.figureImage=loaded[12];this.panels=panels;this.ready=true;this.rebuild();document.body.dataset.mastCount=String(this.rigConfig.masts.length);document.body.dataset.portCount=String(this.config.ports);document.body.dataset.figurehead=this.figure?.id||'';document.body.dataset.shipArt='ready';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(request===this.request)parent.postMessage({type:'pirate-art-ready',side,requestId:d.requestId},location.origin);}));document.body.dataset.hullArt=a.hull.id;document.body.dataset.sailArt=a.sails.id;document.body.dataset.sailCount=String(this.rigConfig.panels.length);document.body.dataset.flagCount=String(RIG_FLAGS.filter(f=>this.rigConfig.masts.includes(f.mast)).length);
  }catch(error){document.body.dataset.shipArt='error';console.error(error);}
 }
 alignSkin(){
  const aligned=surface(),ctx=aligned.getContext('2d'),r=SHIP_ART.registration.exterior;
  // Both views use the revised interior's alpha, deck and keel. The generated
  // exterior supplies color only, so toggling cannot change the silhouette.
  ctx.fillStyle='#65411f';ctx.fillRect(0,0,aligned.width,aligned.height);
  ctx.drawImage(this.skin,...r.sourceBounds,...r.targetBounds);
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.xray,0,0);
  this.skin=aligned;
 }
 setView(d){if(Number.isInteger(d.wind)&&Math.abs(d.wind)<=3&&d.wind!==this.wind){this.wind=d.wind;this.revision++;}document.body.dataset.wind=String(this.wind??0);const cutaway=!!d.cutaway,hideRig=!!d.hideRig;document.body.dataset.cutaway=String(cutaway);if(cutaway===this.cutaway&&hideRig===this.hideRig)return;if(cutaway!==this.cutaway){this.cutaway=cutaway;if(this.ready)this.buildBody();}this.hideRig=hideRig;this.revision++;}
 setParts(f,reset=false){
  if(!f){this.parts=null;this.fallen=[null,null,null];return;}
  const key=f.hullMask?.bits+'|'+f.sailParts?.map(p=>p.hp).join(',')+'|'+f.mastParts?.map(p=>p.hp).join(',');
  if(!reset&&key===this.partsKey)return;this.partsKey=key;this.parts=f;
  this.fallen=f.mastParts?.map((p,i)=>p.hp>0?null:reset?-Infinity:this.fallen[i]??performance.now()/1000)||[null,null,null];
  if(this.ready)this.rebuild();
 }
 rebuild(){this.buildBody();this.buildRig();this.revision++;}
 snapshotRig(index,before){
  if(!this.ready||!Number.isInteger(index)||index<0||index>2)return null;
  const current=this.parts;this.setParts(before,true);
  const snapshot=surface(),ctx=snapshot.getContext('2d');ctx.drawImage(this.groups[index],0,0);this.drawFlags(ctx,index,0);const image=snapshot.toDataURL('image/png');this.setParts(current,true);this.specialMast=index;return image;
 }
 buildBody(){
  const ctx=this.body.getContext('2d');ctx.clearRect(0,0,1792,1008);if(!this.cutaway){ctx.drawImage(this.skin,0,0);
   // Port doors are exterior details; the intact material mask still protects crew.
   ctx.save();ctx.globalCompositeOperation='source-atop';
   for(const p of this.config.holdAnchors){const [x,y]=worldToArt({x:p.x,y:p.y+.24});ctx.save();ctx.translate(x,y);ctx.scale(2,2);ctx.fillStyle='#ba8a41';ctx.fillRect(-26,-23,52,46);ctx.fillStyle='#23180f';ctx.fillRect(-21,-18,42,36);ctx.strokeStyle='#6a4823';ctx.lineWidth=4;ctx.strokeRect(-26,-23,52,46);ctx.fillStyle='#79716a';ctx.beginPath();ctx.ellipse(5,3,13,11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#100e0a';ctx.beginPath();ctx.arc(8,3,7,0,Math.PI*2);ctx.fill();ctx.restore();}
   ctx.restore();if(this.figureImage)ctx.drawImage(this.figureImage,1350,730,130,180);
  }
  ctx.globalCompositeOperation='destination-out';
  if(this.parts){const current=maskPixels(this.parts),holes=initial.map((p,i)=>p&&!current[i]?255:0);drawMask(ctx,bitmap(holes));}
  ctx.globalCompositeOperation='source-over';
  const inner=this.inside.getContext('2d');inner.clearRect(0,0,1792,1008);
  inner.drawImage(this.xray,0,0);if(!this.cutaway){inner.globalCompositeOperation='destination-in';inner.drawImage(this.skin,0,0);inner.globalCompositeOperation='source-over';}this.revision++;
 }
 buildRig(){
  this.groups=SHIP_ART.masts.map((m,i)=>{
   const group=surface(),ctx=group.getContext('2d');if(!this.rigConfig.masts.includes(i))return group;const dx=MAST_MOUNTS[i][0]-m.pivot[0],dy=MAST_MOUNTS[i][1]-m.pivot[1];ctx.drawImage(this.masts[i],dx,dy);
   RIG_SAILS.forEach((spec,panel)=>{if(spec.mast!==i||!this.rigConfig.panels.includes(panel))return;
   const cloth=surface(),cc=cloth.getContext('2d'),part=this.panels[panel],place=clothPlacement(panel,part);
   cc.translate(...place.origin);cc.rotate(place.angle);cc.scale(place.scale,place.scale);cc.drawImage(this.cloth[panel],0,0);cc.setTransform(1,0,0,1,0,0);
   const zones=rig.sails.map((s,j)=>s.panel===panel?this.parts?.sailParts?.[j]:null).filter(Boolean);
   const max=zones.reduce((n,p)=>n+p.maxHp,0),health=max?zones.reduce((n,p)=>n+p.hp,0)/max:1;
   tearSail(cc,part.outline.map(p=>place.point(p)),health,panel);
   ctx.drawImage(cloth,0,0);
   });
   return group;
  });this.revision++;
 }
 drawFlags(ctx,mast,time){
  const wind=this.wind??0,strength=Math.abs(wind)/3,dir=(wind<0?-1:1)*(this.side==='enemy'?-1:1);
  for(const f of RIG_FLAGS.filter(f=>f.mast===mast)){
   const flag=this.flags[f.part],width=f.width*(.3+.7*strength),height=flag.height*f.width/flag.width;
   ctx.save();ctx.translate(...f.origin);ctx.scale(dir,1);
   for(let i=0;i<16;i++){
    const u=i/16,v=(i+1)/16,flutter=this.motion&&strength?Math.sin(time*(3+strength*7)-u*8)*height*.12*strength*u:0;
    const drop=u*height*(1-strength)*.7;
    ctx.drawImage(flag,u*flag.width,0,flag.width/16,flag.height,u*width,drop+flutter,(v-u)*width+1,height);
   }ctx.restore();
  }
 }
 paint(cam,canvas,now,ocean,foam,foamLook=1){
  if(!this.ready)return;
  const clock=performance.now()/1000,falling=this.fallen.some(t=>t!==null&&clock-t<1.25),key=[canvas.width,canvas.height,cam.ppu,cam.x,cam.y,this.revision,this.hideRig,this.motion&&this.wind?Math.floor(clock*24):0,falling?Math.floor(clock*30):0].join(':');
  for(const c of this.canvases)if(c.width!==canvas.width||c.height!==canvas.height){c.width=canvas.width;c.height=canvas.height;}
  const transform=ctx=>ctx.setTransform(cam.ppu/480,0,0,cam.ppu/480,canvas.width/2-(cam.x+810/480)*cam.ppu,canvas.height/2+(cam.y-960/480+.56)*cam.ppu);
  const portKey=[canvas.width,canvas.height,cam.ppu,cam.x,cam.y].join(':');
  if(portKey!==this.portKey){this.portKey=portKey;const mask=surface(canvas.width,canvas.height),ctx=mask.getContext('2d');transform(ctx);drawMask(ctx,bitmap(initial));const ports=document.querySelector('#gamePorts');if(ports){ports.style.maskImage=`url(${mask.toDataURL()})`;ports.style.webkitMaskImage=ports.style.maskImage;ports.style.maskSize='100% 100%';ports.style.webkitMaskSize='100% 100%';}}
  if(key!==this.paintKey){this.paintKey=key;
   const ctx=this.rig.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);transform(ctx);
   if(!this.hideRig)this.groups.forEach((g,i)=>{const at=this.fallen[i],age=at===null?0:clock-at;if(at!==null&&(this.specialMast===i||!this.motion||age>=1.25))return;ctx.save();if(at!==null){const [x,y]=MAST_MOUNTS[i],t=age/1.25;ctx.translate(x,y);ctx.rotate((i%2?-1:1)*1.5*t*t);ctx.translate(-x,-y);ctx.globalAlpha=Math.max(0,1-Math.max(0,t-.6)/.4);}ctx.drawImage(g,0,0);this.drawFlags(ctx,i,clock);ctx.restore();});
   const inner=this.interior.getContext('2d');inner.setTransform(1,0,0,1,0,0);inner.clearRect(0,0,canvas.width,canvas.height);transform(inner);inner.drawImage(this.inside,0,0);
  }
  const wetKey=key+':'+Math.floor(now*15);if(wetKey===this.wetKey)return;this.wetKey=wetKey;
  const ctx=this.hull.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);transform(ctx);ctx.drawImage(this.body,0,0);
  if(!this.preview&&!this.cutaway&&ocean?.length===32){
   // Wet only existing exterior pixels: cutaways and breach interiors stay dry.
   const points=Array.from(ocean,(y,i)=>worldToArt({x:-1.35+i*2.7/31,y}));
   const waterline=()=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));};
   const meanY=points.reduce((sum,p)=>sum+p[1],0)/points.length;
   ctx.save();ctx.globalCompositeOperation='source-atop';
   waterline();ctx.lineTo(points.at(-1)[0],1100);ctx.lineTo(points[0][0],1100);ctx.closePath();
   const depth=ctx.createLinearGradient(0,meanY-10,0,meanY+150);
   depth.addColorStop(0,'#287f8a99');depth.addColorStop(1,'#0a435dcc');ctx.fillStyle=depth;ctx.fill();
   waterline();ctx.strokeStyle='#163d46aa';ctx.lineWidth=14;ctx.stroke();
   // Broken, moving foam climbs higher where the water simulation reports foam.
   for(let i=1;i<points.length;i++){
    const amount=Math.max(0,Math.min(1.5,(foam?.[i]||0)))*foamLook;
    if(!amount)continue;
    const [x,y]=points[i],previous=points[i-1],pulse=.65+.35*Math.sin(i*2.3+now*2.6);
    ctx.beginPath();ctx.moveTo(previous[0],previous[1]-2);ctx.lineTo(x,y-2);
    ctx.strokeStyle=`rgba(210,246,240,${Math.min(.85,.3+amount*.4)*pulse})`;
    ctx.lineWidth=3+amount*9*pulse;ctx.lineCap='round';ctx.stroke();
    if(i%2===0){ctx.beginPath();ctx.ellipse(x,y-amount*8*pulse,2+amount*2,1+amount,0,0,Math.PI*2);ctx.fillStyle='#e3fff0bb';ctx.fill();}
   }
   ctx.restore();
  }
 }
}
