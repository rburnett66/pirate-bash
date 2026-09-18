// Pixel anchors measured on the supplied 1792 × 1008 map.JPG.
// The illustration is stylized, so geographic projection would misplace cities.
export const PORT_POINTS={London:[875,312],Calais:[930,367],Lisbon:[834,412],Bermuda:[727,296],'Puerto Rico':[682,520],Caracas:[536,662],Seattle:[254,363],Hawaii:[220,525],Manila:[1524,553],Singapore:[1393,645],'Hong Kong':[1444,482],Shanghai:[1543,413],Mumbai:[1252,505],Mombasa:[1066,618],Madagascar:[1184,741]};
export const continent=name=>['London','Calais','Lisbon'].includes(name)?'EUROPE':['Bermuda','Puerto Rico','Seattle'].includes(name)?'NORTH AMERICA':name==='Caracas'?'SOUTH AMERICA':['Mombasa','Madagascar'].includes(name)?'AFRICA':name==='Hawaii'?'PACIFIC':'ASIA';
export function chartMarkup(names){
 return `<div class="port-map-window" id="portMap" tabindex="0" aria-label="Port map. Use left and right arrow keys or swipe to explore cities."><div class="map-plane" id="mapPlane"><img class="world-map-art" src="./public/menu-art/world-map.jpg" alt="Illustrated world trade ports" draggable="false">${names.map((name,i)=>{const [x,y]=PORT_POINTS[name];return `<span class="city-pin" data-port="${i}" style="left:${x/1792*100}%;top:${y/1008*100}%"><i></i><span>${name}</span></span>`;}).join('')}</div><div class="map-continent" id="mapContinent"></div><span class="map-hint">← Explore the ports →</span></div>`;
}
let resizeObserver;
export function mountPortMap(names,index,onStep,reduced){
 resizeObserver?.disconnect();
 const viewport=document.getElementById('portMap'),plane=document.getElementById('mapPlane');
 if(!viewport)return;
 let selected=index,ready=false;
 const focus=(next,animate=true)=>{
  selected=next;
  if(!viewport.isConnected)return;
  const width=Math.max(viewport.clientWidth*1.8,viewport.clientHeight*1792/750*1.15),height=width*1008/1792;
  const [px,py]=PORT_POINTS[names[selected]],x=px/1792,y=py/1008;
  const duration=animate&&ready&&!reduced()&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'750ms':'0ms';
  const tx=Math.min(0,Math.max(viewport.clientWidth-width,viewport.clientWidth/2-x*width));
  // Keep the supplied title/footer outside the moving city window.
  const ty=Math.min(-200/1008*height,Math.max(viewport.clientHeight-950/1008*height,viewport.clientHeight/2-y*height));
  plane.style.width=width+'px';plane.style.height=height+'px';plane.style.transitionDuration=duration;
  plane.style.transform=`translate(${tx}px,${ty}px)`;
  ready=true;
  for(const pin of plane.querySelectorAll('.city-pin'))pin.classList.toggle('selected',Number(pin.dataset.port)===selected);
  document.getElementById('mapContinent').textContent=continent(names[selected]);
  viewport.dataset.port=String(selected);
 };
 viewport.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();onStep(event.key==='ArrowLeft'?-1:1);}});
 let start;
 viewport.addEventListener('pointerdown',e=>{if(e.isPrimary)start={x:e.clientX,y:e.clientY};});
 viewport.addEventListener('pointercancel',()=>start=null);
 viewport.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)onStep(dx<0?1:-1);});
 resizeObserver=new ResizeObserver(()=>focus(selected,false));resizeObserver.observe(viewport);
 focus(selected,false);return focus;
}
