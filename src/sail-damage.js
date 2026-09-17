// Stable frayed edges: health is the height of cloth remaining from its top.
export function sailTearEdge(outline,health,seed=0){
 const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]);
 const left=Math.min(...xs)-2,right=Math.max(...xs)+2,top=Math.min(...ys),bottom=Math.max(...ys);
 const ratio=Math.max(0,Math.min(1,health)),height=bottom-top;
 const amplitude=Math.min(ratio,1-ratio,.15)*height*.7;
 return Array.from({length:49},(_,i)=>{
  const noise=(Math.sin((i+seed*19)*127.1)*43758.5453)%1;
  return [left+(right-left)*i/48,top+height*ratio+noise*amplitude];
 });
}
export function tearSail(ctx,outline,health,seed=0){
 if(health>=1)return;
 if(health<=0){ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);return;}
 const edge=sailTearEdge(outline,health,seed);
 ctx.save();
 const trace=()=>{ctx.beginPath();edge.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));};
 // Scorch and frayed fibres stay clipped to the original cloth alpha.
 ctx.globalCompositeOperation='source-atop';ctx.lineJoin='round';trace();
 ctx.strokeStyle='#28170eed';ctx.lineWidth=7;ctx.stroke();
 ctx.strokeStyle='#795029cc';ctx.lineWidth=2;ctx.stroke();
 ctx.globalCompositeOperation='destination-out';trace();
 ctx.lineTo(edge.at(-1)[0],ctx.canvas.height);ctx.lineTo(edge[0][0],ctx.canvas.height);ctx.closePath();ctx.fill();
 ctx.restore();
}
