
// Interior scenery is behind the crew and destructible exterior, not a second collision wall.
// Palette, ribs, deck beams and gun alcoves adapt the supplied hull prototype's fs-inner design.
import {HULL_MASK,maskPixels} from './hull-mask.js';
let outline;
function hullOutline(){
 if(outline)return outline;
 const C=HULL_MASK,pixels=maskPixels({}),top=[],bottom=[],dx=C.spanX/C.width,dy=C.spanY/C.height;
 for(let x=0;x<C.width;x++){
  let low=-1,high=-1;
  for(let y=0;y<C.height;y++)if(pixels[y*C.width+x]){if(low<0)low=y;high=y;}
  if(low<0)continue;
  const left=C.left+x*dx,right=left+dx;
  top.push([left,C.bottom+(high+1)*dy],[right,C.bottom+(high+1)*dy]);
  bottom.push([left,C.bottom+low*dy],[right,C.bottom+low*dy]);
 }
 outline=new Path2D();const points=top.concat(bottom.reverse());
 points.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));outline.closePath();return outline;
}
export function paintShipInterior(canvas,cam,stations){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.save();ctx.setTransform(cam.ppu,0,0,-cam.ppu,canvas.width/2-cam.x*cam.ppu,canvas.height/2+cam.y*cam.ppu);
 ctx.clip(hullOutline());
 const shade=ctx.createLinearGradient(0,-.56,0,.5);shade.addColorStop(0,'#171b1b');shade.addColorStop(.5,'#35261c');shade.addColorStop(1,'#58412b');
 ctx.fillStyle=shade;ctx.fillRect(-1.4,-.8,2.8,1.6);
 // Receding back planks and closely spaced ribs distinguish the inside from the outer skin.
 ctx.lineWidth=.006;ctx.strokeStyle='#201911';
 for(let y=-.5;y<.6;y+=.105){ctx.beginPath();ctx.moveTo(-1.4,y);ctx.lineTo(1.4,y);ctx.stroke();}
 for(let x=-1.15;x<1.4;x+=.25){
  ctx.fillStyle='#231a13';ctx.fillRect(x-.025,-.6,.06,1.2);
  ctx.fillStyle='#65462b';ctx.fillRect(x-.02,-.6,.024,1.2);
  ctx.fillStyle='#8c643d';ctx.fillRect(x-.019,-.6,.005,1.2);
 }
 for(const y of [-.40,-.175,.30]){
  ctx.fillStyle='#1a1713';ctx.fillRect(-1.4,y-.05,2.8,.07);
  ctx.fillStyle='#755133';ctx.fillRect(-1.4,y-.025,2.8,.023);
  ctx.fillStyle='#b08a54';ctx.fillRect(-1.4,y-.005,2.8,.009);
  ctx.strokeStyle='#3a291b';ctx.lineWidth=.005;
  for(let x=-1.3;x<1.4;x+=.22){ctx.beginPath();ctx.moveTo(x,y-.025);ctx.lineTo(x+.035,y+.004);ctx.stroke();}
 }
 // Hold stores behind the lower deck, with iron hoops and stave lines.
 for(const x of [-.76,-.39,.44,.78]){
  ctx.fillStyle='#39261b';ctx.fillRect(x-.064,-.398,.128,.145);
  ctx.fillStyle='#805635';ctx.fillRect(x-.052,-.39,.10,.133);
  ctx.fillStyle='#4b3422';for(let k=0;k<3;k++)ctx.fillRect(x-.04+k*.03,-.39,.007,.133);
  ctx.fillStyle='#252b2c';ctx.fillRect(x-.063,-.37,.125,.017);ctx.fillRect(x-.063,-.28,.125,.017);
  ctx.fillStyle='#aa8150';ctx.fillRect(x-.05,-.257,.10,.009);
 }
 for(const st of stations.filter(s=>s.port)){
  const x=st.x,alcove=ctx.createRadialGradient(x,.04,.02,x,.04,.22);alcove.addColorStop(0,'#100f0e');alcove.addColorStop(1,'#21181000');
  ctx.fillStyle=alcove;ctx.fillRect(x-.24,-.17,.48,.44);
  ctx.fillStyle='#77512e';ctx.fillRect(x+.075,-.16,.12,.055);
  ctx.fillStyle='#242a2c';ctx.fillRect(x+.09,-.085,.15,.038);
  ctx.fillStyle='#738080';ctx.fillRect(x+.1,-.052,.13,.005);
 }
 ctx.restore();
}
