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
  const request=(this.request||0)+1;this.request=request;this.motion=d.motion!==false;this.preview=!!d.preview;this.setView(d);this.config=hullConfig(d.level);this.rigConfig=sailConfig(d.sailLevel??d.parts?.sailLevel);this.figure=figureConfig(d.figure??d.parts?.figure);this.appearance=shipAppearance(d.level,d.cosmetic,side,d.parts?.plating??d.plating);this.setParts(d.parts,true);
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
 setView(d){const cutaway=!!d.cutaway,hideRig=!!d.hideRig;document.body.dataset.cutaway=String(cutaway);if(cutaway===this.cutaway&&hideRig===this.hideRig)return;if(cutaway!==this.cutaway){this.cutaway=cutaway;if(this.ready)this.buildBody();}this.hideRig=hideRig;this.revision++;}
 setParts(f,reset=false){
  if(!f){this.parts=null;this.fallen=[null,null,null];return;}
  const key=f.hullMask?.bits+'|'+f.sailParts?.map(p=>p.hp).join(',')+'|'+f.mastParts?.map(p=>p.hp).join(',');
  if(!reset&&key===this.partsKey)return;this.partsKey=key;this.parts=f;
  this.fallen=f.mastParts?.map((p,i)=>p.hp>0?null:reset?-Infinity:this.fallen[i]??performance.now()/1000)||[null,null,null];
  if(this.ready)this.rebuild();
 }
 rebuild(){this.buildBody();this.buildRig();this.revision++;}
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
   rig.sails.forEach((s,j)=>{if(s.panel!==panel)return;const health=this.parts?.sailParts?.[j],damage=health?1-health.hp/health.maxHp:0;if(damage<=0)return;
    const [x,y]=worldToArt({x:s.x-s.halfW,y:s.y+s.halfH}),w=s.halfW*960,h=s.halfH*960;
    cc.save();cc.beginPath();cc.rect(x,y,w,h);cc.clip();
    if(damage>=.999){cc.clearRect(x-2,y-2,w+4,h+4);}else{
     for(let k=0;k<3;k++){const cx=x+w*(.2+.3*k),cy=y+h*(.25+((j+k)%3)*.23),r=Math.sqrt(w*h*damage/(3*Math.PI))*.9;cc.globalCompositeOperation='source-atop';cc.fillStyle='#27180be6';cc.beginPath();cc.ellipse(cx,cy,r+4,(r+4)*.7,k*.8,0,Math.PI*2);cc.fill();cc.globalCompositeOperation='destination-out';cc.beginPath();cc.ellipse(cx,cy,r,r*.7,k*.8,0,Math.PI*2);cc.fill();}
    }cc.restore();cc.globalCompositeOperation='source-over';
   });ctx.drawImage(cloth,0,0);
   });
   RIG_FLAGS.filter(f=>f.mast===i).forEach(f=>{const flag=this.flags[f.part];ctx.drawImage(flag,...f.origin,f.width,flag.height*f.width/flag.width);});return group;
  });this.revision++;
 }
 paint(cam,canvas,now,ocean,foam){
  if(!this.ready)return;
  const clock=performance.now()/1000,falling=this.fallen.some(t=>t!==null&&clock-t<1.25),key=[canvas.width,canvas.height,cam.ppu,cam.x,cam.y,this.revision,this.hideRig,falling?Math.floor(clock*30):0].join(':');
  for(const c of this.canvases)if(c.width!==canvas.width||c.height!==canvas.height){c.width=canvas.width;c.height=canvas.height;}
  const transform=ctx=>ctx.setTransform(cam.ppu/480,0,0,cam.ppu/480,canvas.width/2-(cam.x+810/480)*cam.ppu,canvas.height/2+(cam.y-960/480+.56)*cam.ppu);
  const portKey=[canvas.width,canvas.height,cam.ppu,cam.x,cam.y].join(':');
  if(portKey!==this.portKey){this.portKey=portKey;const mask=surface(canvas.width,canvas.height),ctx=mask.getContext('2d');transform(ctx);drawMask(ctx,bitmap(initial));const ports=document.querySelector('#gamePorts');if(ports){ports.style.maskImage=`url(${mask.toDataURL()})`;ports.style.webkitMaskImage=ports.style.maskImage;ports.style.maskSize='100% 100%';ports.style.webkitMaskSize='100% 100%';}}
  if(key!==this.paintKey){this.paintKey=key;
   const ctx=this.rig.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);transform(ctx);
   if(!this.hideRig)this.groups.forEach((g,i)=>{const at=this.fallen[i],age=at===null?0:clock-at;if(at!==null&&(!this.motion||age>=1.25))return;ctx.save();if(at!==null){const [x,y]=MAST_MOUNTS[i],t=age/1.25;ctx.translate(x,y);ctx.rotate((i%2?-1:1)*1.5*t*t);ctx.translate(-x,-y);ctx.globalAlpha=Math.max(0,1-Math.max(0,t-.6)/.4);}ctx.drawImage(g,0,0);ctx.restore();});
   const inner=this.interior.getContext('2d');inner.setTransform(1,0,0,1,0,0);inner.clearRect(0,0,canvas.width,canvas.height);transform(inner);inner.drawImage(this.inside,0,0);
  }
  const wetKey=key+':'+Math.floor(now*15);if(wetKey===this.wetKey)return;this.wetKey=wetKey;
  const ctx=this.hull.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);transform(ctx);ctx.drawImage(this.body,0,0);
  if(!this.preview&&ocean?.length===32){ctx.save();ctx.globalCompositeOperation='source-atop';ctx.beginPath();for(let i=0;i<32;i++){const p=worldToArt({x:-1.35+i*2.7/31,y:ocean[i]});i?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.lineTo(1500,1100);ctx.lineTo(0,1100);ctx.closePath();ctx.fillStyle='#12607444';ctx.fill();ctx.beginPath();for(let i=0;i<32;i++){const p=worldToArt({x:-1.35+i*2.7/31,y:ocean[i]});i?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.strokeStyle='#c7f2e9bb';ctx.lineWidth=3+Math.max(0,...foam)*5;ctx.stroke();ctx.restore();}
 }
}
