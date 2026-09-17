// Decorative scenery follows the ocean camera; it never receives game input.
export const CLOUD_LAYERS = Object.freeze([
  {scale:.32, altitude:.87, opacity:.38, duration:240, parallax:.025},
  {scale:.50, altitude:.66, opacity:.55, duration:180, parallax:.05},
  {scale:.74, altitude:.40, opacity:.76, duration:130, parallax:.09},
  {scale:1, altitude:.13, opacity:.95, duration:95, parallax:.14}
]);

export function createSkyScenery(){
  const root=document.createElement('div');
  root.id='skyScenery';root.setAttribute('aria-hidden','true');
  const layers=CLOUD_LAYERS.map((spec,layer)=>{
    const node=document.createElement('div');node.className='sky-cloud-layer';
    node.dataset.scale=String(spec.scale);node.style.opacity=spec.opacity;
    for(let i=0;i<4;i++){
      const cloud=document.createElement('span');cloud.className='sky-cloud';
      const tile=(i+layer)%4;
      cloud.style.backgroundPosition=`${tile%2*100}% ${Math.floor(tile/2)*100}%`;
      cloud.style.left=`${i*31-12+layer*7}%`;
      cloud.style.top=`${i%2*18}px`;
      cloud.style.animationDuration=spec.duration+'s';
      cloud.style.animationDelay=-(i*29+layer*13)+'s';
      node.append(cloud);
    }
    root.append(node);return node;
  });
  const city=document.createElement('img');city.className='sky-city';
  city.src='/pirate-bash/public/sky-art/horizon-city.png';city.alt='';city.draggable=false;
  root.append(city);document.body.prepend(root);
  return {update({horizon,width,height,center=0,wind=0,motion=true}){
    const waterline=Math.max(0,Math.min(height,horizon));
    root.style.height=waterline+'px';root.classList.toggle('still',!motion);root.style.setProperty('--wind-dir',wind<0?-1:1);
    layers.forEach((node,i)=>{
      const spec=CLOUD_LAYERS[i],size=Math.min(360,Math.max(220,width*.28),Math.max(130,waterline*1.5))*spec.scale;
      node.style.setProperty('--cloud-width',size+'px');
      node.style.top=Math.max(-size*.18,waterline*spec.altitude-size*.4)+'px';
      node.style.transform=`translateX(${-center*spec.parallax}px)`;
    });
    city.style.width=Math.min(520,Math.max(260,width*.4),waterline*1.7)+'px';
    city.style.transform=`translateX(calc(-50% - ${center*.015}px)) translateY(24%)`;
  }};
}
