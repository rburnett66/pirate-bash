export const UPGRADE_MEDIA={construction:'/pirate-bash/public/upgrade-audio/construction.m4a',reveal:null};
export const UPGRADE_TIMING={cover:1000,construction:3000,reveal:1500};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function celebrateUpgrade({stage,sound,motion,swap,status}){
 const playing=[],play=src=>{if(!sound||!src)return;const a=new Audio(src);playing.push(a);a.play().catch(()=>{});};
 const cloud=document.createElement('div');cloud.className='construction-cloud';cloud.innerHTML='<div class="construction-veil"></div>'+Array.from({length:30},(_,i)=>`<i style="--x:${8+(i*37)%86}%;--y:${40+(i*23)%48}%;--delay:${i%5*70}ms"></i>`).join('');
 const rays=document.createElement('div');rays.className='upgrade-rays';
 try{
  stage.append(cloud);status.textContent='Purchase complete. All hands to work!';play(UPGRADE_MEDIA.construction);
  await sleep(motion?UPGRADE_TIMING.cover:80);
  // Keep the ship invisible until all new artwork and crew have arrived.
  const frame=stage.querySelector('iframe');frame.style.visibility='hidden';
  await Promise.all([swap(),sleep(motion?UPGRADE_TIMING.construction-UPGRADE_TIMING.cover:80)]);
  frame.style.visibility='';stage.prepend(rays);if(motion)await cloud.animate([{opacity:1},{opacity:0}],{duration:350,fill:'forwards'}).finished;cloud.remove();status.textContent='Your upgraded ship is ready.';play(UPGRADE_MEDIA.reveal);
  await sleep(motion?UPGRADE_TIMING.reveal:120);
 }finally{cloud.remove();rays.remove();const frame=stage.querySelector('iframe');if(frame)frame.style.visibility='';playing.forEach(a=>{a.pause();a.currentTime=0;});}
}
