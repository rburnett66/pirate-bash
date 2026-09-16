const standalone=()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
const active=()=>!!document.fullscreenElement;
function label(){return active()?'Exit full screen':standalone()?'Screen options':'Full screen';}
export function fullscreenButton(){
  return `<button class="fullscreen-control ghost small" data-action="fullscreen" aria-label="${label()}" title="${label()}" aria-pressed="${active()}"><span aria-hidden="true">⛶</span><span class="fullscreen-label">${label()}</span></button>`;
}
function syncControls(){
  for(const button of document.querySelectorAll('[data-action=fullscreen]')){
    button.setAttribute('aria-label',label());button.title=label();button.setAttribute('aria-pressed',String(active()));
    button.querySelector('.fullscreen-label').textContent=label();
  }
}
export function screenHelp(){
  if(standalone()&&!active())return '<h2>You’re playing without browser bars.</h2><p class="spaced">Turn your phone sideways for a wider view. If it stays upright, turn off Portrait Orientation Lock in Control Center.</p>';
  const apple=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  return '<h2>More room for your voyage.</h2>'+ (apple?
    '<p class="spaced">On iPhone, launch the game from your Home Screen to play without the browser’s top and bottom bars.</p><ol class="screen-steps"><li>Open this page in <strong>Safari</strong> and tap <strong>Share</strong> (in the menu on some versions).</li><li>Choose <strong>Add to Home Screen</strong>. Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</li><li>Launch <strong>PIRATE BASH</strong> from its new icon and turn your phone sideways.</li></ol>':
    '<p class="spaced">This browser could not enter full screen. Try the Full screen button in Chrome, or use your browser’s Install app / Add to Home Screen option when available and launch the game from its icon.</p>')+
    '<p class="spaced">To carry your captain over, first use <strong>Settings → Export captain</strong>. If the Home Screen game starts fresh, use <strong>Import backup</strong> there.</p><p class="footer-note spaced">For this preview, keep the computer running and stay on the same Wi-Fi.</p>';
}
// Invoke directly from a click: fullscreen requires a live user gesture.
// Changing display mode never rebuilds the battle or its renderers.
export async function toggleFullscreen(showHelp,showMessage){
  try{
    if(active())await document.exitFullscreen();
    else if(standalone()||!document.documentElement.requestFullscreen||document.fullscreenEnabled===false){showHelp(screenHelp());return;}
    else await document.documentElement.requestFullscreen({navigationUI:'hide'});
  }catch{
    if(active())showMessage('Use your browser’s exit full screen control to return.');
    else showHelp(screenHelp());
  }
  syncControls();
}
document.addEventListener('fullscreenchange',syncControls);
for(const mode of ['standalone','fullscreen'])matchMedia(`(display-mode: ${mode})`).addEventListener('change',syncControls);
