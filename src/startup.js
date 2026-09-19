const $=id=>document.getElementById(id);
const screen=$('startup'),video=$('introVideo'),bar=$('startupProgress'),status=$('startupStatus');
let done=false,blobURL=null,gamePromise=null;
const pictures=['./public/intro/title-screen.JPG','./public/menu-art/ports/IMG_7373.JPG','./public/menu-art/battle__8f2f3bff.png','./public/menu-art/crew-frame__819ba7b5.png',...['fight-icon__fa59e280','crew-icon__4f92ad33','map-icon__454c9d84','chest-icon__4d65463e','gift-icon__4186e173','options-icon__fb0e7125'].map(x=>'./public/menu-art/'+x+'.png'),...[1,2,5,10].map(id=>'./public/gunners/gunner-'+id+'.png')];
let imagesDone=0,videoFraction=0,failedImages=0;
function progress(){const n=Math.min(99,Math.floor(30*imagesDone/pictures.length+70*videoFraction));bar.value=n;$('startupPercent').textContent=n+'%';}
function loadImage(url){return new Promise(resolve=>{const im=new Image();let settled=false;const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(!ok)failedImages++;imagesDone++;progress();resolve();};const timer=setTimeout(()=>finish(false),15000);im.onload=()=>finish(true);im.onerror=()=>finish(false);im.src=url;});}
function prompt(message,label,action){$('introMessage').textContent=message;$('introPlay').textContent=label;$('introPlay').onclick=action;$('introPrompt').hidden=false;$('introPlay').focus();}
async function enterGame(){
 if(gamePromise)return gamePromise;
 done=true;video.pause();$('introPrompt').hidden=true;$('trailerActions').hidden=true;
 $('loadingPanel').hidden=false;status.textContent='Opening your port…';
 gamePromise=import('./app.js').then(()=>{screen.remove();document.body.classList.remove('starting');$('app').inert=false;if(blobURL)URL.revokeObjectURL(blobURL);if(!$('sheet').open)$('rail').querySelector('button')?.focus();}).catch(()=>{gamePromise=null;prompt('The game could not load. Reload to try again.','Reload game',()=>location.reload());});
 return gamePromise;
}
async function playTrailer(){
 if(done)return;
 $('loadingPanel').hidden=true;$('titleArt').hidden=true;video.hidden=false;$('trailerActions').hidden=false;$('introPrompt').hidden=true;
 try{await video.play();}
 catch(error){
  if(done)return;
  if(error.name==='NotAllowedError'){
   video.muted=true;
   try{await video.play();$('introSound').hidden=false;}
   catch{if(!done)prompt('Your voyage is ready.','Play trailer',()=>{video.muted=false;playTrailer();});}
  }else prompt('The trailer could not play. Your game is ready.','Enter game',enterGame);
 }
}
$('introSkip').onclick=enterGame;
$('introSound').onclick=()=>{video.muted=false;$('introSound').hidden=true;};
video.addEventListener('ended',enterGame);
video.addEventListener('error',()=>{if(!done)prompt('The trailer could not play. Your game is ready.','Enter game',enterGame);});
$('titleArt').onerror=()=>{$('fallbackTitle').hidden=false;};
async function loadTrailer(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 try{
  const response=await fetch('./public/intro/mini-trailer.mp4',{signal:controller.signal});
  if(!response.ok)throw Error('Trailer unavailable');
  const total=Number(response.headers.get('Content-Length'))||13867964;
  const reader=response.body.getReader(),chunks=[];let loaded=0;
  while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.length;videoFraction=Math.min(.99,loaded/total);progress();}
  blobURL=URL.createObjectURL(new Blob(chunks,{type:'video/mp4'}));video.src=blobURL;videoFraction=1;progress();
 }finally{clearTimeout(timer);}
}
async function start(){
 const results=await Promise.allSettled([Promise.all(pictures.map(loadImage)),loadTrailer()]);
 bar.value=100;$('startupPercent').textContent='100%';
 if(results[1].status==='rejected'){status.textContent='Trailer unavailable.';prompt('The trailer could not load. You can still enter the game.','Enter game',enterGame);return;}
 status.textContent=failedImages?'Ready. Some artwork will retry in game.':'Ready to set sail.';
 // Keep the completed bar visible for one brief beat before the video.
 await new Promise(resolve=>setTimeout(resolve,350));await playTrailer();
}
start().catch(()=>prompt('Startup was interrupted.','Enter game',enterGame));
