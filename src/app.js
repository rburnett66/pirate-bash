import {preloadSpecialArt,playSpecialScene} from './special-scene.js';
import {specialAttackIcon} from './special-attacks.js';
import {readChallenge,hasChallengeLink,clearChallengeLink,practiceGame,issueChallenge,ownsChallenge,completeChallenge,resultsURL,readChallengeResult,claimChallengeResult} from './challenges.js';
import {shipScreen,inventory,upgradeComparison} from './ship-screen.js';
import {celebrateUpgrade} from './upgrade-celebration.js';
import {resultScreen,preloadResult} from './result-screen.js';
import {chartMarkup,mountPortMap} from './port-map.js';
import {fullscreenButton,toggleFullscreen,screenHelp} from './fullscreen.js';
import {syncUIScale} from './ui-scale.js';
import {artImage, HARBORS, harbor, portrait} from './menu-art.js';
import {COMBAT_TIMING,cutawaySide,battleCamera,aimDots,dragAim,crewReaction} from './combat-view.js';
import {waterValues,waterName,waterLibrary,activeWater,parseWater,exportWater} from './ocean-settings.js';
import {worldToShip,shipToWorld} from './ship-pose.js';
import {pointAt,muzzle,stationPosition} from './ballistics.js';
import {SAIL_STYLES} from './ship-art-layout.js';
import * as M from './model.js';
const {$=null}= {};
const el=id=>document.getElementById(id),fmt=n=>Math.floor(n).toLocaleString(),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let regularState=null,incomingChallenge=null;
const KEY='pirate-clashers-v1';let state,saveError='',page='battle',tab='ship',selected=null,gunner=null,port=0,busy=false,scope=false,telescope=false,toastTimer,lastFocus;let inventoryTab='sails',upgradeBusy=false;const artWaiters=new Map();
try{state=M.restore(localStorage.getItem(KEY));}catch(e){state=M.fresh();saveError='Your previous save could not be read. It has been preserved; use Settings to export it before starting a new save.';}
port=state.port;
function save(){if(regularState)return true;if(saveError)return false;try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){saveError='Progress could not be saved on this browser. Export your captain in Settings.';toast(saveError);return false;}}
function toast(s){el('toast').textContent=s;el('toast').classList.add('toast-show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el('toast').classList.remove('toast-show'),3500);}
function button(label,action,id='',cls='',disabled=false){return '<button class="'+cls+'" data-action="'+action+'" data-id="'+esc(id)+'" '+(disabled?'disabled':'')+'>'+label+'</button>';}
const SCREENS={battle:['BATTLE','Your next adventure awaits.','battle'],crew:['CREW','The right crew. The wrong crowd.','crew'],ports:['LEADERS','Make your name across the seven seas.'],booty:['BOOTY PASS','The sea rewards the bold.','booty'],store:['STORE','A little edge. A lot of character.','store'],settings:['SETTINGS','Make yourself at home.'],water:['WATER WORKSHOP','Build your favorite seas.'],arena:['BATTLE','Ready, aim, plunder.']};
function screenHeader(){const [name,tagline,banner]=SCREENS[page]||SCREENS.battle;return '<div class="screen-heading '+(banner?'has-banner':'')+'">'+(banner?artImage(banner,'screen-title-art'):'')+'<div><span class="game-wordmark">PIRATE BASH</span><h1>'+name+'</h1><p class="screen-tagline">'+tagline+'</p></div></div>';}


function modal(html){el('sheet').className='';lastFocus=document.activeElement;el('sheet').innerHTML='<button type="button" class="close" data-action="close" aria-label="Close"><span aria-hidden="true">X</span></button>'+html;if(!el('sheet').open)el('sheet').showModal();}
function close(){el('sheet').close();lastFocus?.focus?.();}
el('sheet').addEventListener('close',()=>{if(el('sheet').open)return;if(el('sheet').classList.contains('match-intro'))el('sheet').querySelectorAll('iframe').forEach(f=>f.remove());lastFocus?.focus?.();});
function pirate(id){return M.PIRATES.find(p=>p.id===Number(id));}
function art(p,cls='pirate-art'){if(p.id>=1&&p.id<=36)return '<img class="'+cls+'" src="/pirate-bash/Pirate%20Art/pirate_segments/zombie-pirate/zombie-pirate-'+p.id+'.png" alt="'+esc(p.name)+'">';return '<div class="pirate-icon">'+p.icon+'</div>';}
function cost(c){return Object.entries(c).map(([k,v])=>({gold:'🪙',gems:'💎',wood:'🪵',metal:'⚙',cloth:'▱'}[k]||'')+' '+fmt(v)+' '+k).join(' · ');}
function materials(){return '<div class="materials">'+Object.entries(state.mats).map(([k,v])=>'<div class="material">'+cost({[k]:v})+'</div>').join('')+'</div>';}
function shell(){
 document.body.classList.toggle('reduce-motion',!state.settings.motion);document.body.classList.toggle('battle-mode',page==='arena');document.body.dataset.page=page;syncUIScale();
 const nav=[['battle','fight','Battle'],['crew','crewIcon','Ship'],['ports','map','Leaders'],['booty','chest','Booty'],['store','gift','Store'],['settings','settings','Settings']];
 el('rail').innerHTML='<div class="brand"><span>☠</span><small>PIRATE<br>BASH</small></div>'+nav.map(([k,i,n])=>'<button class="nav-btn '+(page===k?'active':'')+'" data-action="nav" data-id="'+k+'" aria-label="'+n+'" '+(page===k?'aria-current="page"':'')+'><span class="nav-art-slot">'+artImage(i,'nav-art')+'</span><span>'+n+'</span></button>').join('')+'<div class="version">LOCAL VOYAGE</div>';
 el('topbar').innerHTML=screenHeader()+'<div class="wallet-plaque">'+artImage('header','header-art')+'<div class="wallet"><span class="wallet-label">YOUR TREASURE</span><span class="currency" aria-label="'+fmt(state.gold)+' gold"><small>GOLD</small><strong>'+fmt(state.gold)+'</strong></span><button class="wallet-add" data-action="nav" data-id="store" aria-label="Open gold and gem store">+</button><span class="gem" aria-label="'+fmt(state.gems)+' gems"><small>GEMS</small><strong>'+fmt(state.gems)+'</strong></span></div></div>'+fullscreenButton();
}

function render(){M.advance(state,Date.now());save();shell();const views={battle:home,crew:crew,ports:ports,booty:booty,store:store,settings:settings,water:waterWorkshop,arena:arena};el('main').innerHTML=(saveError?'<div class="error-note">'+saveError+'</div>':'')+(views[page]||home)();if(page==='arena')updateArena();if(page==='ports')focusMap=mountPortMap(M.PORTS,port,stepPort,()=>!state.settings.motion);for(const f of document.querySelectorAll('iframe'))f.addEventListener('load',()=>{let ready=false;try{ready=!!f.contentDocument?.querySelector('canvas')?.getContext('webgl2');}catch{}if(!ready){f.style.visibility='hidden';const note=document.createElement('div');note.className='render-note';note.textContent=f.id==='enemyShip'?'Ship renderer unavailable. Select a gunner, adjust the angle and use Fire.':f.id==='playerShip'?'Your ship renderer is unavailable.':'Ocean renderer unavailable.';f.after(note);}});if(page==='booty'){const track=el('track');track.scrollLeft=Math.max(0,(M.seasonLevel(state)-2)*144);track.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();track.scrollLeft+=e.deltaY;}},{passive:false});track.addEventListener('keydown',e=>{let d={'ArrowRight':144,'ArrowLeft':-144,'PageDown':500,'PageUp':-500}[e.key];if(d){e.preventDefault();track.scrollLeft+=d;}if(e.key==='Home')track.scrollLeft=0;if(e.key==='End')track.scrollLeft=track.scrollWidth;});}}
function home(){
 const roster=Object.values(state.slots).map(pirate),view=harbor(state.settings.harbor);

 const chests=Array.from({length:5},(_,i)=>{const c=state.chests[i];return c?button(artImage('chest','chest-art')+'<strong>'+c.kind+'</strong><small>Open chest</small>','chest',c.id,'chest'):`<div class="chest empty-chest">${artImage('chest','chest-art')}<small>Win a battle</small></div>`;}).join('');
 const recent=state.lastResult&&(!state.battle||state.battle.phase==='result')?`<div class="last-battle row between"><span>Last battle · ${state.lastResult.won?'Victory':'Defeat'}</span>${button('View battle results','last-result','','small')}</div>`:'';
 return `
 <div class="harbor-layout">
  <section class="harbor-main"><div class="harbor-scene brass-panel">
   ${artImage(view.id,'harbor-image',view.name+' harbor artwork')}${button('Scenery','scenery','','scenery-toggle small')}
   <div class="harbor-caption"><span class="eyebrow">${esc(view.mood)}</span><h2>${view.name}</h2><span class="pill">⚓ Your port: ${M.PORTS[state.port]}</span></div>
   <div class="sail-action">${button(state.battle&&state.battle.phase!=='result'?'Resume battle →':artImage('find','','Find match'),'start','','art-button')}<small>Local battles · seeded rivals</small></div>
  </div></section>
  <aside class="harbor-aside">
   <section class="card crew-overview"><div class="row between"><h3>Your fighting crew</h3>${button('Manage →','nav','crew','ghost small')}</div>
    <div class="crew-dots">${roster.map(p=>`<button class="crew-preview" data-action="detail" data-id="${p.id}" aria-label="View ${esc(p.name)}">${portrait(p)}<span>${esc(p.name)}</span></button>`).join('')}</div>
    <p class="footer-note">${roster.length} gunners aboard · Ship level ${state.shipLevel}</p>
    ${recent}<div class="challenge-action">${button('Text a challenge','challenge','','small')}${state.friendChallenges?.lastResult?button('Copy battle results','challenge-results','','small'):''}</div>
   </section>
   <section class="card orders-card">
    <div class="daily-orders"><div class="row between"><h3>Captain’s orders</h3><span class="pill">DAILY</span></div><div class="quest"><div class="row between"><span>Finish 3 battles</span><span>${Math.min(3,state.quests.matches)}/3</span></div><progress max="3" value="${state.quests.matches}"></progress>${button(state.quests.dailyClaim?'Collected ✓':'Claim 100 season XP','quest','daily','small',state.quests.dailyClaim||state.quests.matches<3)}</div></div>
    <div class="season-orders"><div class="row between"><div><span class="eyebrow">PIRATE’S BOOTY</span><h3>Level ${M.seasonLevel(state)}</h3></div>${button('Rewards →','nav','booty','ghost small')}</div><progress class="spaced" max="100" value="${state.xp%100}"></progress><small>${state.xp%100} / 100 XP to next level</small></div>
   </section>
  </aside>
 </div>
 <section class="card hold-panel spaced"><div class="row between"><div class="row">${artImage('open','hold-title','Open booty chest')}<div><span class="eyebrow">THE HOLD</span><h3>Your hard-earned haul</h3></div></div><small>${state.dailyChests} / 5 chest drops today</small></div><div class="chests spaced">${chests}</div></section>`;
}

function card(p){const owned=state.levels[p.id]>0,posted=Object.values(state.slots).includes(p.id),held=state.cards[p.id]||0,upgrade=M.upgradeCost(state,p.id),ready=owned&&!!upgrade&&!state.bench&&held>=upgrade.cards&&state.gold>=upgrade.gold;return '<button class="pirate-card '+(selected===p.id?'selected ':'')+(!owned?'locked':'')+'" style="--rarity:var(--'+p.rarity+')" data-action="'+(tab==='gunners'&&owned?'select':'detail')+'" data-id="'+p.id+'">'+(posted?'<span class="posted">ON SHIP</span>':'')+(ready?'<span class="upgrade-ready" aria-label="Upgrade available">↑</span>':'')+portrait(p)+'<span class="rarity">'+p.rarity+'</span><strong class="name">'+p.name+'</strong><small>'+(owned?'Lv. '+state.levels[p.id]+' · '+p.primary:'Found in chests')+'</small><small class="card-count">'+held+' cards</small></button>';}
function crew(){return '<div class="tabs">'+[['ship','Ship'],['gunners','Gunners'],['collection','Collection'],['yard','Shipyard'],['equipment','Equipment']].map(([k,n])=>button(n,'tab',k,tab===k?'active':'')).join('')+'</div>'+(tab==='ship'?shipScreen(state,inventoryTab,{button,cost,diagram,materials}):tab==='gunners'?'<div class="split"><section class="card"><div class="row between"><h3>The Blackwake</h3><span class="pill">LEVEL '+state.shipLevel+'</span></div>'+diagram()+'<p style="font-size:12px">'+(selected?'Posting '+pirate(selected).name+'. Choose an open station.':'Select a pirate, then a station. Tap a filled station to stand them down.')+'</p><div class="row spaced">'+button('Cancel selection','unselect','','ghost small',!selected)+(selected?button('View pirate','detail',selected,'small'):'')+'</div><p class="footer-note">● Deck: exposed, clear line of fire<br>● Gun ports: protected by the hull</p></section><section><div class="row between" style="margin-bottom:14px"><h3>Your crew</h3><small>'+M.PIRATES.filter(p=>state.levels[p.id]).length+' / 36 recruited</small></div><div class="roster scroll-panel">'+M.PIRATES.filter(p=>state.levels[p.id]).map(card).join('')+'</div></section></div>':tab==='collection'?'<div class="roster">'+M.PIRATES.map(card).join('')+'</div>':tab==='yard'?yard():equipment());}
function diagram(){const assigning=tab==='gunners';return '<div class="ship-diagram upgrade-stage '+(assigning?'assigning':'')+'"><iframe id="homeShip" src="/pirate-bash/public/ship.html?side=home" title="Your ship artwork" tabindex="-1"></iframe>'+M.positions(state).map(key=>button(state.slots[key]?'●':'+','slot',key,'slot '+(state.slots[key]?'occupied ':''))).join('')+'</div>';}

function yard(){const c=M.hullConfig(state.shipLevel).cost;return '<div class="split"><section class="card"><div class="eyebrow">SHIPWRIGHT’S YARD</div><h2 class="spaced">Room for one more troublemaker.</h2>'+diagram()+materials()+'<div class="rule"></div><p>Each ship level opens one new gun station. Your current crew stays aboard.</p><div class="row spaced">'+button(c?'Upgrade to level '+(state.shipLevel+1):'Fully upgraded','ship-up',state.shipLevel,'primary',!c)+'</div><p class="footer-note">'+(c?cost(c):'Eight stations. A formidable ship.')+'</p></section><section class="card"><h3>The gunsmith</h3><p class="spaced">Cards buy experience. Gold pays the gunsmith. Great weapons take a little time.</p>'+bench()+'<div class="rule"></div><h3>The position ladder</h3>'+Object.entries(M.LADDER).map(([l,[d,h]])=>'<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line)"><span>Level '+l+'</span><small>'+d+' deck · '+h+' hull</small><strong>'+(+l<=state.shipLevel?'✓':'⌑')+'</strong></div>').join('')+'</section></div>';}
function bench(){if(!state.bench)return '<div class="empty spaced">Your bench is free.<br><small>Open a crew card to start an upgrade.</small></div>';const b=state.bench,left=Math.max(0,b.ends-Date.now()),gems=Math.ceil(left/360000);return '<div class="card spaced"><h3>'+pirate(b.id).name+'</h3><p data-timer="'+b.ends+'">'+duration(left)+' remaining</p>'+button('Finish now · 💎 '+gems,'skip','','primary small')+'</div>';}
function equipment(){
const rc=M.repairCost(state);
return materials()+'<div class="row between spaced"><h3>Protection that earns its scars.</h3>'+button('Repair · '+(Object.keys(rc).length?cost(rc):'Ready'),'repair','','small',!Object.keys(rc).length)+'</div><p class="footer-note">Each hull section has its own plating and condition. Worn equipment never blocks battle.</p><div class="gear-grid spaced">'+state.plates.slice(0,M.hullSections(state)).map((p,i)=>'<section class="card"><div class="eyebrow">HULL SECTION '+(i+1)+'</div><h3>'+p.kind+'</h3><p>'+Math.round(p.durability)+'% condition</p>'+button('Hardwood · 220 wood + 1,800 gold','equip','plating:hardwood:'+i,'small',p.kind==='hardwood')+button('Iron · 140 metal + 3,000 gold + 25 gems','equip','plating:iron:'+i,'small spaced',p.kind==='iron')+'</section>').join('')+'</div><h3 class="spaced">Canvas · '+Math.round(state.canvasDurability)+'% condition</h3><div class="gear-grid spaced">'+[['heavy','Heavy canvas','20% protection','180 cloth · 1,200 gold'],['storm','Storm canvas','30% protection','240 cloth · 2,400 gold · 20 gems']].map(([v,n,desc,c])=>'<section class="card"><h3>'+n+'</h3><p>'+desc+'</p><small>'+c+'</small>'+button(state.canvas===v?'Fitted ✓':'Fit canvas','equip','canvas:'+v,'small spaced',state.canvas===v)+'</section>').join('')+'</div><h3 class="spaced">Permanent enhancements</h3><div class="gear-grid spaced">'+Object.entries(M.E.ENHANCEMENTS).map(([n,v])=>{const l=state.enh[n]||0;return '<div class="card"><h3>'+n+'</h3><p>'+v.effect+' · Grade '+l+'/5</p>'+button(l===5?'Maxed':'Improve · '+cost({gold:M.E.ENH_GOLD[l],gems:M.E.ENH_GEMS[l]}),'enhance',n,'small',l===5)+'</div>';}).join('')+'</div><h3 class="spaced">Figureheads</h3><div class="gear-grid spaced">'+inventory(state,'figureheads',{button,cost})+'</div><h3 class="spaced">Sails</h3><div class="gear-grid spaced">'+inventory(state,'sails',{button,cost})+'</div>';
}
function detail(id){const p=pirate(id),l=state.levels[id],st=M.stats(p,l||1),c=M.upgradeCost(state,id);modal('<div class="eyebrow">'+p.rarity+' · '+(l?'LEVEL '+l:'UNRECRUITED')+'</div>'+portrait(p,'detail-portrait')+'<h2>'+p.name+'</h2><p>'+p.projectile+'</p><div class="badge-row">'+p.tags.map(t=>'<span class="pill">'+t+'</span>').join('')+'</div><div class="stats">'+Object.entries(st).map(([k,v])=>'<div class="stat"><small>'+k.toUpperCase()+'</small><strong>'+v+'</strong></div>').join('')+'</div><p>'+(!l?'Win chests to recruit this pirate. Each card belongs to a specific crew member.':c?'Next upgrade: '+c.cards+' cards and '+fmt(c.gold)+' gold. Bench time '+duration(c.hours*3600000)+'.':'This pirate has reached level 12.')+'</p><p class="spaced">Cards held: <strong>'+state.cards[id]+'</strong></p><div class="row spaced">'+button('Start upgrade','upgrade',id,'primary',!c||!!state.bench||state.cards[id]<c.cards||state.gold<c.gold)+(l?button('Select for ship','select-detail',id,'ghost'):'')+'</div>'+bench());}
let focusMap;
function portStandings(){return '<div class="board-row board-head"><span>#</span><span>CAPTAIN</span><span>WINS</span><span>🏆</span></div>'+M.board(state,port).map((p,i)=>'<button class="board-row '+(p.self?'self ':i<10?'promote ':i>89?'demote ':'')+'" data-action="captain" data-id="'+i+'"><strong>'+(i+1)+'</strong><span>'+esc(p.name)+(p.self?' · YOU':'')+'</span><strong>'+p.wins+'</strong><span>'+p.trophies+'</span></button>').join('');}
function ports(){return '<div class="ports-layout"><section class="port-explorer"><div class="city-switcher"><div class="port-cycle"><button data-action="port-step" data-id="-1" aria-label="Previous city">←</button><span id="portCounter">PORT '+(port+1)+' / '+M.PORTS.length+'</span><button data-action="port-step" data-id="1" aria-label="Next city">→</button></div><h2 id="portName" aria-live="polite">'+M.PORTS[port]+'</h2></div><div class="brass-panel map-frame">'+chartMarkup(M.PORTS)+'</div><p class="port-rules">Top 10 advance · Bottom 10 return · Settles Monday, 00:00 UTC</p></section><section class="card standings"><div class="row between"><h3>Port standings</h3><small>100 captains</small></div><div class="board" id="portBoard" tabindex="0" aria-label="Port standings, scroll for all captains">'+portStandings()+'</div><p class="footer-note">Weekly wins · trophies break ties. Seeded rivals · local standings.</p></section></div>';}
function setPort(next){port=(next+M.PORTS.length)%M.PORTS.length;if(page!=='ports')return;el('portCounter').textContent='PORT '+(port+1)+' / '+M.PORTS.length;el('portName').textContent=M.PORTS[port];el('portBoard').innerHTML=portStandings();el('portBoard').scrollTop=0;focusMap?.(port);}
function stepPort(direction){setPort(port+direction);}
function scenery(){modal('<h2>Choose your harbor scenery</h2><div class="harbor-picker scenery-dialog">'+HARBORS.map(h=>'<button data-action="harbor" data-id="'+h.id+'" class="harbor-choice '+(state.settings.harbor===h.id?'active':'')+'" aria-pressed="'+(state.settings.harbor===h.id)+'">'+artImage(h.id,'',h.name)+'<span>'+h.name+'</span></button>').join('')+'</div>');}
function booty(){return '<div class="season-intro"><div class="row"><span class="mini-number gold">'+M.seasonLevel(state)+'</span><div><h3>Season of the Drowned Crown</h3><p>'+Math.max(1,Math.ceil(((state.season+1)*28*86400000-Date.now())/86400000))+' days remaining · '+state.xp+' season XP</p></div></div><div class="row">'+button('Claim all available','claim-all','','primary')+button('Finishing moves','moves','','ghost')+button('Weekly orders','weekly','','ghost')+'</div></div><p style="font-size:11px">'+(state.premium?'CAPTAIN’S SHARE · LOCAL PREVIEW':'CAPTAIN’S SHARE · Preview available in Settings; real purchases not connected')+'</p><div class="season-track" id="track" tabindex="0" aria-label="Season rewards; use arrow keys to scroll">'+Array.from({length:50},(_,i)=>{const l=i+1;return '<div class="reward-column '+([6,14,22,30,38,46].includes(l)?'wide':'')+'">'+reward(l,true)+'<div class="waypoint '+(l===M.seasonLevel(state)?'current':'')+'"><span>'+l+'</span></div>'+reward(l,false)+'</div>';}).join('')+'</div><p style="font-size:11px" class="foam">CREW’S SHARE · FREE FOR EVERY CAPTAIN</p>';}
function reward(l,prem){const r=M.rewardAt(l,prem),claimed=state.claims.includes(l+':'+prem),ready=l<=M.seasonLevel(state)&&(!prem||state.premium)&&!claimed;const move='move'in r?M.FINISHERS[r.move]:null;return '<button class="reward '+(prem?'premium ':'')+(ready?'ready ':'')+(claimed?'claimed':'')+'" data-action="claim" data-id="'+l+':'+prem+'" '+(!ready?'disabled':'')+'><span class="reward-art">'+(move?move.icon:'<img class="currency-art" src="/pirate-bash/public/menu-art/'+(r.gems?'gems':'gold')+'.svg" alt="">')+'</span><strong class="label">'+(move?move.name:r.gems?r.gems+' gems':r.gold+' gold')+'</strong><small>'+(claimed?'CLAIMED ✓':ready?'CLAIM REWARD':prem&&!state.premium?'CAPTAIN’S SHARE ⌑':'LEVEL '+l)+'</small></button>';}
function moves(){modal('<div class="eyebrow">THE DEEP ANSWERS YOUR CALL</div><h2>Make it a spectacle.</h2><p>Land four successful attacks in a row to charge. Misses reset incomplete progress. Charge again after every big attack.</p><div class="gear-grid spaced">'+M.FINISHERS.map(m=>'<div class="card"><div class="gear-icon">'+specialAttackIcon(m.id)+'</div><h3>'+m.name+'</h3><p>'+m.hits+'</p>'+button(state.move===m.id?'Equipped ✓':state.moves.includes(m.id)?'Equip':m.cost.gold+' gold','move',m.id,'small',state.move===m.id)+'</div>').join('')+'</div>');}
function store(){const deals=M.offers(state);save();return '<div class="store-layout"><aside class="deals"><div class="eyebrow" style="margin-bottom:12px">FOR YOUR VOYAGE</div>'+deals.map(o=>{const b=M.E.BUNDLES[o.bundle];return '<section class="card" data-offer="'+o.key+'"><h3>'+b.name+'</h3><p>'+fmt(b.gems)+' gems · '+fmt(b.gold)+' gold</p><small>'+b.mats+' materials · '+b.cards+' cards · '+Math.round(b.discount*100)+'% catalog saving</small><p data-timer="'+o.ends+'">'+duration(o.ends-Date.now())+' remaining</p>'+button('$'+b.price.toFixed(2)+' · Not connected','purchase','','small',true)+button('No thanks','decline',o.key,'ghost small')+'</section>';}).join('')+'<section class="card">'+artImage('map','shop-art')+'<h3>A ship worth fearing.</h3><p>Put your spoils to work. Upgrade the hull, fit a figurehead, or fly your own colors.</p>'+button('Visit the shipyard →','yard','','small')+'</section><section class="card"><h3>The deep is listening.</h3><p>Testing price: unlock any special attack for 10 gold.</p>'+button('Choose a finishing move','moves','','small')+'</section><p class="footer-note">Real-money purchases are not connected in this local voyage. No payment is taken.</p></aside><div><section class="card"><div class="row between"><div><div class="eyebrow">TRADE SHOP</div><h3>Someone else’s surplus. Your next upgrade.</h3></div></div><div class="spaced">'+materials()+'</div><div class="row wrap spaced"><label>Give <select id="tradeFrom"><option>wood</option><option>metal</option><option>cloth</option></select></label><label>Receive <select id="tradeTo"><option>metal</option><option>wood</option><option>cloth</option></select></label>'+button('Exchange 10 units','trade','','primary small')+'</div><p class="footer-note">12 gold per received unit, plus materials at the port rate. Available stock: '+Object.entries(state.stock).map(([k,v])=>v+' '+k).join(' · ')+'</p></section><h3 class="spaced">Gem packs</h3><div class="pack-grid spaced">'+M.E.PACKS.map((p,i)=>'<section class="card"><div class="gear-icon"><img class="currency-art" src="/pirate-bash/public/menu-art/gems.svg" alt=""></div><h3>'+p.name+'</h3><div class="mini-number foam">'+fmt(p.gems)+'</div><small>gems</small>'+button('$'+p.price.toFixed(2)+' · Not connected','purchase',i,'ghost',true)+'</section>').join('')+'</div><h3 class="spaced">A captain’s provisions</h3><div class="pack-grid spaced">'+M.E.BUNDLES.map((p,i)=>'<section class="card">'+artImage('gift','shop-art')+'<h3>'+p.name+'</h3><p>'+fmt(p.gems)+' gems · '+fmt(p.gold)+' gold</p><small>'+p.mats+' materials · '+p.cards+' cards</small>'+button('$'+p.price.toFixed(2)+' · Not connected','purchase',i,'ghost',true)+'</section>').join('')+'</div></div></div>';}

let waterDraft=null,waterDraftError='',waterReady=false;
function waterCard(){
 const library=waterLibrary(state.settings.water),look=activeWater(library);
 return '<section class="card water-card"><div class="eyebrow">OCEAN LOOKS</div><h3>Find your sea.</h3><p>Tune waves, whitecaps, foam, ship rocking and splashes. Save your favorites for battle.</p><label class="water-select">Battle look <select id="waterLook"><option value="default">Coastal swell · built in</option>'+library.presets.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===look.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label><div class="row wrap spaced">'+button('Open Water Workshop','water-open','','primary small')+button('Copy settings','water-copy','','small')+button('Paste settings','water-paste','','ghost small')+'</div><p class="footer-note">'+library.presets.length+' / 24 saved looks. Included in your captain backup. Random selection per game is planned.</p></section>';
}
function openWater(look=activeWater(state.settings.water)){waterDraft={...look,values:{...look.values}};waterDraftError='';waterReady=false;page='water';render();}
function waterWorkshop(){
 return '<section class="card water-toolbar"><label>Look name <input id="waterName" maxlength="40" value="'+esc(waterDraft.name)+'"></label><div class="row wrap">'+button('Save & use look','water-save','','primary',!waterReady)+button('Copy settings','water-copy','','small',!waterReady)+button('Paste settings','water-paste','','ghost small')+button('Back to Settings','nav','settings','ghost small')+'</div><p id="waterStatus" role="status">Loading water preview…</p></section><iframe id="waterTuner" class="water-tuner" title="Live water tuning tool" src="/pirate-bash/public/water-tuner.html"></iframe><p class="footer-note">All prototype controls are in Tune. Boat placement and test cannonballs affect this preview. Battles keep their ship positions and gunner projectiles. Your changes stay in this draft until you save.</p>';
}
function postWaterDraft(){el('waterTuner')?.contentWindow?.postMessage({type:'pirate-water-load',settings:waterDraft.values},location.origin);}
function waterStatus(text){if(el('waterStatus'))el('waterStatus').textContent=text;}
async function copyWater(){
 try{
  if(page==='water'&&waterDraftError)throw Error(waterDraftError);
  const look=page==='water'?{name:el('waterName').value,values:waterDraft.values}:activeWater(state.settings.water),text=exportWater(look.name,look.values);
  try{await navigator.clipboard.writeText(text);toast('Water settings copied.');}
  catch{modal('<h2>Copy water settings</h2><p>Select and copy this text.</p><textarea id="waterJson" class="water-json" aria-label="Water settings JSON" readonly>'+esc(text)+'</textarea>');el('waterJson').select();}
 }catch(err){toast(err.message);waterStatus(err.message);}
}
function pasteWater(){modal('<h2>Paste water settings</h2><p>Paste a copied look or a JSON object from the water tool. It opens as a draft so you can preview it before saving.</p><textarea id="waterJson" class="water-json" aria-label="Water settings JSON" maxlength="30000" placeholder="Paste settings here"></textarea><p id="waterImportError" class="error-note" role="alert" hidden></p>'+button('Preview settings','water-import','','primary'));el('waterJson').focus();}
function saveWaterLook(){
 try{
  if(!waterReady||waterDraftError)throw Error(waterDraftError||'Wait for the water preview to load.');
  const name=waterName(el('waterName').value),values=waterValues(waterDraft.values),library=waterLibrary(state.settings.water);
  const existing=library.presets.find(p=>p.id===waterDraft.id&&p.name===name);
  if(!existing&&library.presets.length>=24)throw Error('Your library has 24 looks. Update an existing look with its current name.');
  // LAN phone previews use HTTP, where randomUUID is not exposed. Preset IDs
  // only identify local saves; getRandomValues also works in that context.
  const localId=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const look={id:existing?.id||'look-'+localId(),name,values};
  if(existing)library.presets[library.presets.indexOf(existing)]=look;else library.presets.push(look);
  library.selected=look.id;state.settings.water=waterLibrary(library);save();waterDraft={...look,values:{...values}};
  waterStatus('Saved “'+name+'”. This is now your battle look.');toast('Water look saved and selected.');
 }catch(err){waterStatus(err.message);toast(err.message);}
}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==el('waterTuner')?.contentWindow||page!=='water')return;
 if(e.data?.type==='pirate-water-tuner-ready'){postWaterDraft();return;}
 if(e.data?.type==='pirate-water-error'){waterStatus(e.data.message);return;}
 if(e.data?.type!=='pirate-water-draft')return;
 try{waterDraft.values=waterValues(e.data.settings);waterDraftError='';waterReady=true;waterStatus('Live preview · Save & use look applies your changes.');}
 catch(err){waterDraftError=err.message;waterStatus(err.message);}
 for(const action of ['water-save','water-copy']){const b=document.querySelector('[data-action="'+action+'"]');if(b)b.disabled=!waterReady||!!waterDraftError;}
});

function settings(){return '<div class="settings-grid"><section class="card setting"><div><h3>Full screen</h3><p>Give your voyage more room.</p></div><div class="row wrap">'+fullscreenButton()+button('Phone setup','screen-help','','small')+'</div></section>'+waterCard()+'<section class="card setting"><div><h3>Captain’s name</h3><p>How you appear on your port board.</p></div><input id="captainName" maxlength="24" aria-label="Captain name" value="'+esc(state.name)+'"></section><section class="card setting"><div><h3>Sound</h3><p>Cannon fire and victory cues.</p></div>'+button(state.settings.sound?'On':'Off','setting','sound','small')+'</section><section class="card setting"><div><h3>Motion and effects</h3><p>Reduce screen shake and transitions.</p></div>'+button(state.settings.motion?'Full motion':'Reduced','setting','motion','small')+'</section><section class="card setting"><div><h3>Captain’s share preview</h3><p>Try the paid reward track locally. This is a preview, not a purchase.</p></div>'+button(state.premium?'Preview on':'Enable preview','preview','','small')+'</section><section class="card"><h3>Keep your captain close.</h3><p class="spaced">Export a backup before changing browsers. Import restores a valid exported captain; this does not connect a shared account.</p><div class="row wrap spaced">'+button('Export captain','export','','small')+'<label class="pill" style="min-height:44px;cursor:pointer">Import backup<input type="file" id="importSave" accept=".json" style="max-width:160px"></label>'+button('How to play','help','','ghost small')+'</div></section><p class="footer-note">Starting supplies: 1,800 gold, 40 gems, three ship stations and four recruited pirates. Seeded rivals and all progress are local. Weekly settlement uses UTC; season length is 28 days. Source prototypes preserved in Code Prototypes.</p></div>';}

function arena(){
 const b=M.prepareBattle(state.battle);if(!b){page='battle';return home();}
 cameraReady=false;viewMode='crew';scope=false;telescope=false;
 return `<section class="arena combat-arena polished-battle">
  <div class="battle-top">${['player','enemy'].map(side=>`<div class="health-card ${side}"><h3>${esc(side==='player'?state.name:b.enemyName)}</h3><div class="health-line"><progress id="${side}Health" max="${b[side].maxHull}" aria-label="${side==='player'?'Your':'Enemy'} hull health"></progress><strong id="${side}Percent"></strong></div><div class="health-meta" id="${side}Meta"></div></div>`).join('')}<div class="battle-tools">${button('🔭','scope','','telescope')}${fullscreenButton()}</div></div>
  <div class="turn-banner" id="turnBanner" role="status"><strong id="phaseLabel"></strong><span id="turnLabel"></span><span id="shots"></span><span id="turnClock"></span><span id="battleLog"></span></div>
  <div id="combatField"><div id="battleWorld"><iframe class="arena-water" id="battleOcean" src="/pirate-bash/public/water.html" title="Battle ocean" tabindex="-1"></iframe><canvas id="specialBehind" class="special-effects" aria-hidden="true" hidden></canvas><iframe class="combat-ship" id="playerShip" src="/pirate-bash/public/ship.html?side=player" title="Your crew and ship" tabindex="-1"></iframe><iframe class="combat-ship" id="enemyShip" src="/pirate-bash/public/ship.html?side=enemy" title="Enemy crew and ship" tabindex="-1"></iframe><canvas id="specialFront" class="special-effects" aria-hidden="true" hidden></canvas><svg id="shotLayer" aria-label="Pull back and release to fire. Aim upward or backward to cancel."><g id="aimArc"></g><g id="flyingShots"></g></svg><div id="crewTargets"></div><div id="powderBlast" hidden></div></div><div id="waterMovement"><span id="movementLabel"></span><div>${button('←','sail','-1','water-arrow')}${button('→','sail','1','water-arrow')}</div></div><div id="specialAnnouncement" role="status" hidden><strong></strong><span></span></div><div id="finisherCharge"><div id="chargeBalls" role="img" aria-label="0 of 4 successful attacks">${[0,1,2,3].map(i=>'<i class="charge-ball" style="--i:'+i+'"></i>').join('')}</div><span id="chargeLabel"><img id="chargeAttackIcon" alt=""><span id="chargeAttackText"></span>${button('ATTACK','finisher','','finisher')}</span></div><div id="crewCheer" role="status"></div><div id="shotReadout" aria-live="polite"></div>
   <div class="battle-bottom"><div class="crew-stack"><div class="weapon-panel" id="weaponInfo"></div><div class="gun-panel"><div class="eyebrow">CHOOSE YOUR GUNNER</div><div class="gun-selection" id="guns"></div></div></div><button type="button" class="ship-wheel-control" id="shipWheel" aria-label="Drag the ship wheel to steer" title="Drag left or right to steer"><img src="/pirate-bash/public/menu-art/ship-wheel-cutout.png" alt="" draggable="false"></button><div class="aim-panel"><label for="aimAngle">AIM <output id="angleValue">35°</output></label><input type="range" id="aimAngle" min="5" max="75" step="1" value="${b.aimAngle??35}" aria-label="Aim angle"><div class="aim-actions">${button('FIRE','fire','','primary')}<small>Pull back & release<br>or set angle & Fire</small></div></div><div class="move-panel">${button('Retreat','retreat','','ghost small')}</div></div>
  </div></section>`;
}
async function matchSearch(){
 const b=state.battle;if(!b)return;
 const messages=['Looking for a fight ..','There\'s a ship hiding somewhere ..','Let\'s check the next cove ..'];
 modal('<div class="match-search-water"><iframe id="matchSearchWater" src="/pirate-bash/public/water.html" title="Open water"></iframe><iframe id="matchSearchShip" src="/pirate-bash/public/ship.html?side=player" title="Your ship sailing" tabindex="-1"></iframe><div class="match-search-copy"><small>SCANNING THE HORIZON</small><strong>'+messages[Math.floor(Math.random()*messages.length)]+'</strong></div></div>');
 el('sheet').classList.add('match-search');
 const frame=el('matchSearchShip'),configure=()=>{const f=b.player;frame.contentWindow?.postMessage({type:'pirate-render',action:'configure',preview:true,level:f.shipLevel,crew:visualCrew(f),parts:f,cosmetic:f.cosmetic??state.cosmetic,sailLevel:f.sailLevel,flag:f.flag,figure:f.figure,motion:state.settings.motion},location.origin);};
 frame.addEventListener('load',configure,{once:true});setTimeout(configure,120);
 await sleep(5000);if(el('sheet').open)close();
}
function matchIntro(){
 const b=state.battle;if(!b)return;
 const team=side=>{const f=b[side];return `<section class="match-team ${side}"><div class="match-captain"><small>${side==='player'?'YOUR CAPTAIN':'LOCAL RIVAL'}</small><h2>${esc(side==='player'?state.name:b.enemyName)}</h2><strong>🏆 ${side==='player'?state.trophies:M.board(state).find(r=>r.name===b.enemyName)?.trophies??'—'}</strong><div class="match-special">${specialAttackIcon(side==='player'?state.move:f.move??0)}<span>${esc(M.FINISHERS[side==='player'?state.move:f.move??0].name)}</span></div></div><div class="match-ship">${side==='player'&&b.bonusGunner?`<div class="bonus-gunner" role="status"><strong>Bonus Gunner</strong><span>${esc(pirate(b.bonusGunner).name)} joins your ship!</span></div>`:''}<iframe src="/pirate-bash/public/ship.html?side=${side}" title="${side==='player'?'Your':'Rival'} ship and sails" tabindex="-1" data-preview="${side}"></iframe></div></section>`;};
 const crew=side=>`<aside class="match-crew ${side}-crew" aria-label="${side==='player'?'Your':'Rival'} crew">${b[side].crew.map(g=>`<div class="match-crew-icon" role="img" aria-label="${esc(pirate(g.id).name)}">${portrait(pirate(g.id))}</div>`).join('')}</aside>`;
 modal(`<div class="match-background">${artImage(harbor(state.settings.harbor).id)}</div><div class="match-heading"><small>PIRATE BASH</small><h1>ALL HANDS ON DECK</h1><p>${esc(M.PORTS[state.port])} · Prepare for a broadside.</p></div><div class="match-teams">${crew('player')}${team('player')}<span class="match-vs">VS</span>${team('enemy')}${crew('enemy')}</div><div class="match-begin">${button(artImage('battle','','Battle'),'begin-battle','','art-button match-battle-button')}</div>`);
 el('sheet').classList.add('match-intro');
 const previewConfig=side=>{const frame=document.querySelector('[data-preview="'+side+'"]'),f=b[side];if(!frame||!f)return;frame.style.visibility='visible';frame.contentWindow?.postMessage({type:'pirate-render',action:'configure',preview:true,level:f.shipLevel,crew:visualCrew(f),parts:f,cosmetic:f.cosmetic??(side==='player'?state.cosmetic:null),sailLevel:f.sailLevel,flag:f.flag,figure:f.figure,motion:state.settings.motion},location.origin);};
 document.querySelectorAll('[data-preview]').forEach(frame=>{const side=frame.dataset.preview;frame.addEventListener('load',()=>{previewConfig(side);const enter=()=>frame.classList.add('match-entered');if(side==='enemy')setTimeout(enter,850);else enter();},{once:true});});
 setTimeout(()=>['player','enemy'].forEach(previewConfig),120);
}

function send(side,data){el(side+'Ship')?.contentWindow?.postMessage({type:'pirate-render',...data},location.origin);}
function sendOcean(data){el('battleOcean')?.contentWindow?.postMessage({type:'pirate-ocean',...data},location.origin);}
function syncOcean(){if(!el('battleOcean')||!state.battle)return;sendOcean({action:'scene',...camera,motion:state.settings.motion,settings:activeWater(state.settings.water).values,ships:['player','enemy'].map(side=>({side,x:state.battle[side].x,dir:side==='player'?1:-1}))});}
function visualCrew(f){return f.crew.map(g=>({...g,name:pirate(g.id).name,range:M.stats(pirate(g.id),g.level).range,type:{hull:0,crew:1,sails:2}[pirate(g.id).primary]}));}
function configure(side){
 if(side==='home'){send(side,homeConfiguration());return;}
 const b=state.battle;if(!b)return;const f=b[side];send(side,{action:'configure',level:f.shipLevel,crew:visualCrew(f),parts:f,selected:side==='player'?gunner:null,cosmetic:f.cosmetic??(side==='player'?state.cosmetic:null),sailLevel:f.sailLevel,flag:f.flag,figure:f.figure,motion:state.settings.motion,...shipView(side)});
 layoutCombat();
}
let camera={ppu:1,ox:0,oy:0},flying=false,cameraReady=false,viewMode='crew',cameraAnimation=0,cameraTarget=null,flightTarget='enemy',attackSide='player';
function shipView(side){return {cutaway:side===cutawaySide(state.battle,busy,attackSide,viewMode,flightTarget),hideRig:viewMode==='crew'||viewMode==='celebrate'};}
const screenPoint=p=>({x:camera.ox+p.x*camera.ppu,y:camera.oy-p.y*camera.ppu});
 function desiredCamera(){const field=el('combatField'),b=state.battle;if(!field||!b)return null;if(viewMode==='scope')return battleCamera(field.clientWidth,field.clientHeight,b.enemy.x,b.enemy.x,'crew',b.enemy.x);if(viewMode==='special'){const ppu=Math.min(field.clientWidth/4.2,Math.max(90,field.clientHeight-130)/2.8);return {ppu,ox:field.clientWidth/2-b.enemy.x*ppu,oy:(field.clientHeight-130)*.78};}return viewMode==='celebrate'?battleCamera(field.clientWidth,field.clientHeight,b[flightTarget].x,b[flightTarget==='player'?'enemy':'player'].x,'crew'):battleCamera(field.clientWidth,Math.max(150,field.clientHeight-110),b.player.x,b.enemy.x,viewMode,b[flightTarget].x);}
function setBattleView(mode){
 viewMode=mode;const target=desiredCamera();if(!target)return;
 for(const side of ['player','enemy'])send(side,{action:'view',...shipView(side)});
 cancelAnimationFrame(cameraAnimation);cameraTarget=target;
 const from={...camera},start=performance.now(),duration=state.settings.motion?460:0;
 function tick(now){const t=duration?Math.min(1,(now-start)/duration):1,e=t*t*(3-2*t);camera=Object.fromEntries(Object.keys(target).map(k=>[k,from[k]+(target[k]-from[k])*e]));paintCombat();if(t<1)cameraAnimation=requestAnimationFrame(tick);else{cameraAnimation=0;cameraTarget=null;}}
 cameraAnimation=requestAnimationFrame(tick);
}
function layoutCombat(){
 const target=desiredCamera();if(!target)return;
 if(!cameraReady){camera=target;cameraReady=true;}else if(!cameraAnimation)camera=target;
 paintCombat();
}
function paintCombat(){
 const field=el('combatField'),b=state.battle;if(!field||!b)return;const {ppu}=camera,w=field.clientWidth,h=field.clientHeight;
 field.dataset.view=viewMode;
 for(const side of ['player','enemy']){const f=el(side+'Ship'),p=screenPoint({x:b[side].x,y:.85});if(f)Object.assign(f.style,{width:'700px',height:'660px',left:p.x-1.75*ppu+'px',top:p.y-1.65*ppu+'px',transformOrigin:'0 0',transform:`scale(${ppu/200}) translateY(${-(b[side].pose?.heave||0)*200}px) translate(350px,558px) rotate(calc(${-(b[side].pose?.roll||0)*180/Math.PI}deg + var(--special-rock,0deg))) scaleX(${side==='enemy'?-1:1}) translate(-350px,-558px)`});}
 el('shotLayer').setAttribute('viewBox','0 0 '+w+' '+h);
 const move=el('waterMovement'),pos=screenPoint({x:b.player.x,y:-.7});
 move.style.left=Math.max(58,Math.min(w-58,pos.x))+'px';move.style.top=Math.min(h-53,pos.y)+'px';move.hidden=busy||b.phase!=='player';
 document.querySelectorAll('#crewTargets button').forEach(n=>{const g=b.player.crew.find(g=>g.id===Number(n.dataset.id));if(!g)return;const q=stationPosition(b.player,g.slot),p=screenPoint(shipToWorld(b.player,1,{x:q.x,y:q.y+q.height/2}));Object.assign(n.style,{left:p.x+'px',top:p.y+'px',width:Math.max(44,q.width*ppu)+'px',height:Math.max(44,q.height*ppu)+'px'});});
 drawAim();syncOcean();
}
function currentAim(){const b=state.battle,g=b&&M.active(b.player).find(g=>g.id===gunner);if(!g)return null;return {origin:muzzle(b.player,'player',g),speed:Math.sqrt(M.stats(pirate(g.id),g.level).range/10*3.2)};}
function drawAim(){
 const b=state.battle,arc=el('aimArc');if(!arc||!b)return;const aim=currentAim();
 if(!aim||busy||b.phase!=='player'){arc.innerHTML='';return;}
 const points=aimDots(aim.origin,aim.speed,b.aimAngle??35,b.enemy.x-aim.origin.x);
 arc.innerHTML=points.map(q=>{const p=screenPoint(q);return `<circle cx="${p.x}" cy="${p.y}" r="${q.r}" fill="#ff4548" stroke="#fff3cd" stroke-width=".6"/>`;}).join('');
}
function shakeBattle(damage){
 if(!state.settings.motion)return;const world=el('battleWorld'),amount=Math.min(12,2+damage*.08);world?.getAnimations().forEach(a=>a.cancel());
 world?.animate([{transform:'translate(0,0)'},{transform:`translate(${-amount}px,${amount*.5}px)`},{transform:`translate(${amount*.7}px,${-amount*.3}px)`},{transform:`translate(${-amount*.35}px,${amount*.2}px)`},{transform:'translate(0,0)'}],{duration:330,easing:'ease-out'});
}
let cheerTimer;
function reactCrew(event,side,kills=0){
 const cue=crewReaction(event,state.battle[side==='player'?'enemy':'player'].maxHull,kills),node=el('crewCheer');
 if(node){node.textContent=(side==='player'?'YOUR CREW: ':'RIVAL CREW: ')+cue.text;node.dataset.level=cue.level;node.hidden=false;clearTimeout(cheerTimer);cheerTimer=setTimeout(()=>node.hidden=true,1800);}
 send(side,{action:'reaction',level:cue.level});cue.notes.forEach((note,i)=>setTimeout(()=>sound(note,.14),i*100));
}

function updateArena(){
 const b=M.prepareBattle(state.battle);if(!b||!el('playerHealth'))return;
 if(gunner!==null&&!M.active(b.player).some(g=>g.id===gunner))gunner=null;
 const activeCrew=M.active(b.player);
 let autoSelected=false;
 if(b.phase==='player'&&!busy&&activeCrew.length===1&&gunner!==activeCrew[0].id){gunner=activeCrew[0].id;scope=true;autoSelected=true;}
 const locked=busy||b.phase!=='player';
 for(const side of ['player','enemy']){
  const f=b[side];send(side,{action:'sync',crew:visualCrew(f),parts:f,selected:side==='player'?gunner:null,...shipView(side)});
  el(side+'Health').value=f.hull;el(side+'Percent').textContent=Math.ceil(f.hull/f.maxHull*100)+'%';
  el(side+'Meta').innerHTML='<span>'+Math.round(f.sails)+'% SAILS</span><span>'+M.active(f).length+' CREW</span>';
  el(side+'Meta').title='Hull sections: '+f.hullParts.map(p=>Math.ceil(p.hp)).join(' / ')+' · Masts: '+f.mastParts.map(p=>Math.ceil(p.hp)).join(' / ');
 }
 const own=b.phase==='player',shotSide=b.pending?.side;
 el('turnBanner').dataset.phase=own?'player':b.phase==='result'?'result':'enemy';
 el('phaseLabel').textContent=own?'Choose Your Gunner':b.phase==='result'?'BATTLE OVER':b.phase==='special'?'BIG ATTACK':b.phase==='flight'?(shotSide==='player'?'YOUR SHOT IN FLIGHT':'Incoming Fire'):'Incoming Fire';
 el('turnLabel').textContent='TURN '+b.turn;
 el('turnClock').textContent=own?Math.ceil(b.seconds??30)+'s':'';
 el('shots').textContent=(own?b.shots:b.phase==='flight'&&shotSide==='player'?b.shots:b.enemyShots)+' shots left';
 const roster=M.active(b.player),gunHTML=roster.map(g=>'<button data-action="gun" data-id="'+g.id+'" aria-label="Select '+esc(pirate(g.id).name)+'" '+(locked?'disabled':'')+'>'+portrait(pirate(g.id))+'</button>').join('');
 if(el('guns').renderedMarkup!==gunHTML){el('guns').innerHTML=gunHTML;el('guns').renderedMarkup=gunHTML;}
 el('guns').parentElement.hidden=gunner!==null;
 const targets=!locked&&!telescope?roster.map(g=>{const p=pirate(g.id);return `<button data-action="gun" data-id="${g.id}" aria-label="Select ${esc(p.name)}" title="${esc(p.projectile)}"></button>`;}).join(''):'';
 if(el('crewTargets').renderedMarkup!==targets){el('crewTargets').innerHTML=targets;el('crewTargets').renderedMarkup=targets;}
 const g=roster.find(g=>g.id===gunner),p=g&&pirate(g.id),spec=p&&M.projectileFor(p),stats=p&&M.stats(p,g.level);
 el('weaponInfo').innerHTML=p?'<strong>'+esc(p.name)+'</strong><span>'+esc(p.projectile)+' · Lv. '+g.level+'</span><small>'+stats.range+' m · '+stats.damage+' damage · +60% vs '+spec.bonus+'</small>':'';
 el('weaponInfo').hidden=!p;
 el('combatField').dataset.selected=gunner??'';
 el('combatField').dataset.scope=telescope?'on':'off';const telescopeButton=document.querySelector('[data-action=scope]');telescopeButton.disabled=locked;telescopeButton.setAttribute('aria-label',telescope?'Return to crew view':'Telescope: inspect opposing ship');telescopeButton.setAttribute('aria-pressed',String(telescope));

 el('aimAngle').disabled=locked||gunner===null;el('aimAngle').value=b.aimAngle??35;el('angleValue').textContent=(b.aimAngle??35)+'°';
 document.querySelector('[data-action=fire]').disabled=locked||gunner===null;
 document.querySelector('[data-action=retreat]').disabled=locked;
 document.querySelectorAll('[data-action=sail]').forEach(e=>{const unavailable=locked||b.movesLeft<=0;e.disabled=unavailable;e.hidden=b.movesLeft<=0;e.setAttribute('aria-label',e.dataset.id==='1'?'Move forward':'Move backward');});
 el('shipWheel').disabled=locked||b.movesLeft<=0;
 el('movementLabel').textContent=b.movesLeft+' MOVES';
 const fin=document.querySelector('[data-action=finisher]');fin.disabled=locked||!b.charged;fin.hidden=!b.charged;fin.classList.toggle('charged',b.charged);fin.textContent='ATTACK';fin.title=M.FINISHERS[state.move].name;
 const count=b.charged?4:b.streak;el('chargeBalls').setAttribute('aria-label',count+' of 4 successful attacks'+(b.charged?' — big attack ready':''));el('chargeBalls').classList.toggle('ready',b.charged);const equipped=M.FINISHERS[state.move],hasArt=['shark','kraken','gull','whale','siren'].includes(equipped.art),attackIcon=el('chargeAttackIcon');attackIcon.hidden=!hasArt;if(hasArt){const art='/pirate-bash/public/killstreaks/'+equipped.art+'.png';if(attackIcon.getAttribute('src')!==art)attackIcon.src=art;attackIcon.alt=equipped.name;}el('chargeAttackText').textContent=(hasArt?'':equipped.icon+' ')+equipped.name;el('chargeAttackText').hidden=b.charged;el('chargeBalls').querySelectorAll('i').forEach((n,i)=>n.classList.toggle('lit',i<count));
 el('battleLog').textContent=b.log.at(-1)||'';
 layoutCombat();save();if(autoSelected)setBattleView('wide');
}
function sound(freq=120,length=.15){if(!state.settings.sound)return;try{const a=audioContext||(audioContext=new AudioContext()),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type='triangle';o.frequency.setValueAtTime(freq,a.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq/4),a.currentTime+length);g.gain.setValueAtTime(.1,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+length);o.start();o.stop(a.currentTime+length);}catch{}}
let audioContext;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));


async function animateShot(flight){
 if(!flight)return;flying=true;attackSide=flight.side;flightTarget=flight.side==='player'?'enemy':'player';setBattleView('wide');send(flight.side,{action:'fire',gunner:flight.gunnerId});sound(120,.25);
 const layer=el('flyingShots'),readout=el('shotReadout'),spec=flight.spec,offset=state.battle.pending?.elapsed||0;
 if(readout)readout.textContent=(flight.side==='player'?'YOUR':'ENEMY')+' '+spec.name.toUpperCase()+' · '+flight.angle.toFixed(1)+'°';
 const crewBefore=M.active(state.battle[flightTarget]).length;
 if(layer)layer.innerHTML=flight.shots.map(()=>'<g><polyline fill="none" stroke="'+spec.color+'" stroke-opacity=".5" stroke-width="3"/><circle r="'+(spec.count>1?3:5)+'" fill="'+spec.color+'" stroke="#fff1ba" stroke-width="1.3"/></g>').join('');
 const shotNodes=layer?[...layer.children]:[];let drifting=false;
 const timeScale=1500,missed=new Set(flight.shots.map((q,i)=>q.duration<=offset?i:-1));let event=null;
 await new Promise(resolve=>{let start;function tick(now){
  start??=now;const t=offset+(now-start)/timeScale,step=M.advanceShot(state,t);
  if(step?.impacts.length){
   for(const hit of step.impacts)send(flight.side==='player'?'enemy':'player',{action:'hit',x:hit.x,y:hit.y,kind:hit.kind,weapon:spec.effect});
   sound(75,.2);shakeBattle(step.impacts.reduce((n,i)=>n+(i.damage||12),0));updateArena();
  }
  if(step?.event)event=step.event;
  flight.shots.forEach((shot,i)=>{if(!shot.impact&&t>=shot.duration&&!missed.has(i)){missed.add(i);const end=shot.path.at(-1);if(end.y<=-.66)sendOcean({action:'splash',id:state.battle.id+':'+state.battle.events.length+':'+i,x:end.x,y:end.y,energy:spec.count>1?.45:1});}});
  if(!drifting&&t>flight.duration*.3){drifting=true;setBattleView('impact');}
  flight.shots.forEach((shot,i)=>{const node=shotNodes[i];if(!node)return;node.style.display=t>=shot.duration?'none':'';if(t>=shot.duration)return;
   const p=screenPoint(pointAt(shot.path,t)),trail=Array.from({length:7},(_,j)=>screenPoint(pointAt(shot.path,Math.max(0,t-.16+j*.16/6))));
   node.firstChild.setAttribute('points',trail.map(q=>q.x+','+q.y).join(' '));node.lastChild.setAttribute('cx',p.x);node.lastChild.setAttribute('cy',p.y);
  });

  if(t<flight.duration)requestAnimationFrame(tick);else{if(layer)layer.innerHTML='';resolve();}
 }requestAnimationFrame(tick);});
 flying=false;const e=event;reactCrew(e,flight.side,crewBefore-M.active(state.battle[flightTarget]).length);scope=true;
 if(readout)readout.textContent=e?.hit?Math.round(e.damage)+' DAMAGE · '+e.impacts.map(i=>i.kind+(i.bonus?' BONUS':'')).filter((v,i,a)=>a.indexOf(v)===i).join(' + '):'SPLASH — SHOT FELL SHORT OR PASSED THE SHIP';
 if(e?.hit&&state.battle.phase!=='result'){
  setBattleView('impact');updateArena();
  // The hit has resolved and the player may already have another shot.
  // Keep the destruction hold on screen, but release the input lock so the
  // next shot can be selected while the opposing ship is still burning.
  if(flight.side==='player'&&state.battle.phase==='player'&&busy){busy=false;updateArena();}
  await sleep(COMBAT_TIMING.hitHoldMs);
 }
 updateArena();
}
async function runEnemyTurn(){
 const b=state.battle;if(!b||b.phase!=='enemy')return;
 busy=true;attackSide='enemy';setBattleView('wide');updateArena();await sleep(650);
 if(b.enemyMoves>0){M.moveShip(state,b.enemy.x>8.4?1:-1,'enemy');updateArena();await sleep(250);}
 while(b.phase==='enemy'){const shot=M.planEnemyShot(state);if(!shot)break;const flight=M.launchShot(state,{...shot,live:true});if(!flight)break;updateArena();await animateShot(flight);if(b.phase==='enemy')await sleep(400);}
 busy=false;updateArena();if(b.phase==='result')finish();
}
async function resumeCombat(){
 if(busy)return;
 if(state.battle?.phase==='special'){await finisher(true);return;}
 if(state.battle?.phase==='flight'){busy=true;updateArena();await animateShot(M.pendingFlight(state));busy=false;}
 if(state.battle?.phase==='enemy')await runEnemyTurn();else {updateArena();if(state.battle?.phase==='result')finish();}
}
async function fire(){
 if(busy||gunner===null||state.battle?.phase!=='player')return;
 const flight=M.launchShot(state,{live:true,gunner,angle:state.battle.aimAngle??35});if(!flight)return;
 busy=true;updateArena();await animateShot(flight);busy=false;
 if(state.battle.phase==='enemy')await runEnemyTurn();else{updateArena();if(state.battle.phase==='result')finish();}
}
function changeAngle(value){
 if(busy||state.battle?.phase!=='player')return;
 state.battle.aimAngle=Math.max(5,Math.min(75,Math.round(value)));el('aimAngle').value=state.battle.aimAngle;el('angleValue').textContent=state.battle.aimAngle+'°';drawAim();save();
}
document.addEventListener('input',e=>{if(e.target.id==='aimAngle'){if(viewMode==='crew')setBattleView('wide');changeAngle(Number(e.target.value));}});
let draggingAim=null,draggingWheel=null,wheelFrame=0;
function wheelMove(e){
 if(!draggingWheel)return;
 const desired=draggingWheel.originX+(e.clientX-draggingWheel.clientX)/draggingWheel.ppu;
 const preview=M.steerShip(state,{originX:draggingWheel.originX,targetX:desired});if(!preview)return;
 draggingWheel.targetX=preview.x;state.battle.player.x=preview.x;
 el('shipWheel').style.setProperty('--steer-turn',((preview.x-draggingWheel.originX)*360)+'deg');
 if(!wheelFrame)wheelFrame=requestAnimationFrame(()=>{wheelFrame=0;paintCombat();});
}
document.addEventListener('pointerdown',e=>{const wheel=e.target.closest('#shipWheel');if(!wheel||wheel.disabled||!e.isPrimary||busy||state.battle?.phase!=='player')return;draggingWheel={id:e.pointerId,clientX:e.clientX,originX:state.battle.player.x,targetX:state.battle.player.x,ppu:camera.ppu};wheel.setPointerCapture(e.pointerId);e.preventDefault();});
document.addEventListener('pointermove',e=>{if(draggingWheel?.id===e.pointerId)wheelMove(e);});
function cancelWheel(){if(!draggingWheel)return;cancelAnimationFrame(wheelFrame);wheelFrame=0;state.battle.player.x=draggingWheel.originX;draggingWheel=null;el('shipWheel').style.setProperty('--steer-turn','0deg');paintCombat();}
document.addEventListener('pointerup',e=>{if(!draggingWheel||draggingWheel.id!==e.pointerId)return;wheelMove(e);cancelAnimationFrame(wheelFrame);wheelFrame=0;const drag=draggingWheel;draggingWheel=null;el('shipWheel').style.setProperty('--steer-turn','0deg');M.steerShip(state,{originX:drag.originX,targetX:drag.targetX,commit:true});updateArena();});
document.addEventListener('pointercancel',e=>{if(draggingWheel?.id===e.pointerId)cancelWheel();});
function pointerAim(e){if(!draggingAim)return;const aim=dragAim(draggingAim,{x:e.clientX,y:e.clientY});draggingAim.result=aim;
 if(aim.moved){if(aim.cancel){el('shotReadout').textContent='RELEASE TO CHOOSE ANOTHER GUNNER';el('aimArc').style.opacity='.25';}else{el('aimArc').style.opacity='1';el('shotReadout').textContent='RELEASE TO FIRE · '+aim.angle+'°';changeAngle(aim.angle);}}
}
document.addEventListener('pointerdown',e=>{const field=e.target.closest('#combatField');const control=e.target.closest('button,input,#guns,#weaponInfo,.aim-panel,.move-panel,#shipWheel');if(field&&!control&&gunner!==null&&!busy&&state.battle?.phase==='player'&&e.isPrimary){const box=field.getBoundingClientRect(),crew=document.querySelector('.crew-stack')?.getBoundingClientRect(),streak=document.querySelector('.move-panel')?.getBoundingClientRect(),wheel=el('shipWheel')?.getBoundingClientRect(),enemy=el('enemyShip')?.getBoundingClientRect();const left=crew?.right??box.left,right=enemy?.left??box.right,top=Math.max(box.top,streak?.bottom??box.top),bottom=Math.min(box.bottom,wheel?.top??box.bottom);if(e.clientX<left||e.clientX>right||e.clientY<top||e.clientY>bottom)return;draggingAim={x:e.clientX,y:e.clientY,id:e.pointerId};field.setPointerCapture?.(e.pointerId);setBattleView('wide');e.preventDefault();}});
document.addEventListener('pointermove',e=>{if(draggingAim?.id===e.pointerId)pointerAim(e);});
function cancelAim(){draggingAim=null;scope=false;if(el('aimArc'))el('aimArc').style.opacity='1';updateArena();setBattleView('crew');}
document.addEventListener('pointerup',e=>{if(!draggingAim||draggingAim.id!==e.pointerId)return;pointerAim(e);const result=draggingAim.result;draggingAim=null;el('aimArc').style.opacity='1';if(result?.moved){if(result.cancel)cancelAim();else fire();}});
document.addEventListener('pointercancel',()=>{if(draggingAim)cancelAim();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&page==='arena'&&!busy&&!el('sheet').open)cancelAim();});

window.addEventListener('resize',layoutCombat);
document.addEventListener('fullscreenchange',()=>requestAnimationFrame(()=>{syncUIScale();layoutCombat();}));
let finishingId=null;
async function finish(){
 const b=state.battle;
 if(b?.phase==='result'&&!b.rewarded){
  if(finishingId===b.id)return;finishingId=b.id;
  const loser=b[b.won?'enemy':'player'];
  if(loser.hull<=0&&loser.sails<=0){
   busy=true;flightTarget=b.won?'enemy':'player';setBattleView('wide');updateArena();
   await sleep(state.settings.motion?480:20);
   const blast=el('powderBlast');if(blast){const p=screenPoint({x:loser.x,y:.2});blast.style.left=p.x+'px';blast.style.top=p.y+'px';blast.hidden=false;blast.innerHTML=Array.from({length:20},(_,i)=>`<i style="--a:${i*137.5}deg;--d:${70+(i%5)*28}px;--delay:${i%4*35}ms"></i>`).join('');}
   sound(65,.8);shakeBattle(140);send(flightTarget,{action:'reaction',kind:'defeat'});sendOcean({action:'splash',id:b.id+':magazine',x:loser.x,y:-.29,energy:1});
   await sleep(COMBAT_TIMING.finalExplosionHoldMs);if(blast)blast.hidden=true;
  }
  const winner=b.won?'player':'enemy';flightTarget=winner;setBattleView('celebrate');send(winner,{action:'reaction',kind:'victory',level:4});
  clearTimeout(cheerTimer);if(el('crewCheer')){el('crewCheer').hidden=false;el('crewCheer').textContent=(b.won?'YOUR CREW':'RIVAL CREW')+': VICTORY!';}
  await sleep(state.settings.motion?2100:120);busy=false;
 }
 if(state.battle?.practice){showCompletedChallenge();return;}
 M.settle(state);save();const r=state.lastResult;if(!r)return;await preloadResult(r.won);if(state.lastResult?.id!==r.id)return;sound(r.won?640:160,.5);modal(resultScreen(r));el('sheet').className='battle-result-sheet';}

const rigRequests=new Map();
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==el('enemyShip')?.contentWindow||e.data?.type!=='pirate-special-rig')return;rigRequests.get(e.data.requestId)?.(e.data.image);});
function specialRig(pending){
 if(pending.targetMast===null)return Promise.resolve(null);
 return new Promise((resolve,reject)=>{const requestId='special-'+pending.sequence+'-'+Date.now(),timer=setTimeout(()=>{rigRequests.delete(requestId);reject(Error('Ship artwork is still loading. Try the attack again.'));},6500);rigRequests.set(requestId,image=>{clearTimeout(timer);rigRequests.delete(requestId);if(image)resolve(image);else reject(Error('Ship artwork is still loading. Try the attack again.'));});send('enemy',{action:'special-prepare',requestId,mast:pending.targetMast,before:pending.before});});
}
async function finisher(resuming=false){
 if(busy)return;
 if(!resuming){const reason=M.specialUnavailable(state);if(reason){toast(reason);return;}}
 if(state.settings.sound)try{audioContext??=new AudioContext();audioContext.resume().catch(()=>{});}catch{}
 busy=true;telescope=false;gunner=null;attackSide='player';flightTarget='enemy';setBattleView('special');updateArena();
 try{
  await preloadSpecialArt(M.FINISHERS[state.battle.special?.id??state.move]);
  if(!resuming){const previous=structuredClone(state.battle);if(!M.finishMove(state))throw Error('This big attack is not available.');if(!save()){state.battle=previous;throw Error('Could not save the attack. Your charge is kept.');}}
  const pending=state.battle.special,move=M.FINISHERS[pending.id],rigImage=await specialRig(pending);
  updateArena();
  const reduced=!state.settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  await playSpecialScene({field:el('combatField'),move,pending,rigImage,reduced,getBattle:()=>state.battle,getCamera:()=>camera,
   sound:{enabled:state.settings.sound,context:audioContext,impact:id=>{if(id!==6)sound(id===5?380:65,.7);}},
   onImpact:()=>{const previous=structuredClone(state.battle);M.resolveFinishMove(state);if(!save()){state.battle=previous;throw Error('Could not save the impact. Retry to continue safely.');}updateArena();},
   onAfterImpact:()=>{send('enemy',{action:'reaction',kind:'cringe'});if(move.id!==5&&move.id!==6)sendOcean({action:'splash',id:'special-'+pending.sequence,x:state.battle.enemy.x,y:-.29,energy:move.id===2?1:.7});},
   onCelebrate:()=>{flightTarget='player';setBattleView('celebrate');send('player',{action:'reaction',kind:'dance'});}
  });
  M.completeFinishMove(state);save();send('enemy',{action:'special-end'});el('crewCheer').hidden=true;busy=false;updateArena();
  if(state.battle.phase==='result')await finish();else setBattleView('crew');
 }catch(error){busy=false;updateArena();if(state.battle?.special)modal('<h2>Continue your big attack</h2><p>'+esc(error.message)+'</p>'+button('Continue attack','resume-special','','primary'));else{setBattleView('crew');toast(error.message);}}
}

function help(){modal('<div class="eyebrow">WELCOME ABOARD</div><h2>Your ship. Your shots. Your spoils.</h2><p><strong>1. Post your crew.</strong> Select a pirate and tap an open station. Deck gunners are exposed; hull gunners get cover.</p><p class="spaced"><strong>2. Pick your shots.</strong> Your turn is highlighted in gold. Move ahead or back up to twice, choose a gunner, then pull back and release to fire. Aim straight up or backward to cancel; the angle slider and Fire button also work. Each weapon has fixed power and a shown range. Every slow, arcing projectile damages the first intact part it hits; its specialty gets bonus damage. You have two shots per turn.</p><p class="spaced"><strong>3. Make a scene.</strong> Land four successful attacks in a row to charge your equipped big attack. A miss resets incomplete progress; enemy turns do not.</p><p class="spaced"><strong>4. Bring home the booty.</strong> Wins earn chests. Cards and gold upgrade your crew. Weekly wins move you through ports.</p><div class="row spaced">'+button('Aye, captain →','onboard','','primary')+'</div>');}
function rewardFireworks(){
 const layer=document.createElement('div');layer.className='reward-fireworks';layer.setAttribute('aria-hidden','true');
 const reduced=!state.settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(let burst=0;burst<5;burst++)for(let i=0;i<(reduced?6:20);i++){const spark=document.createElement('i'),a=i*Math.PI*2/(reduced?6:20),r=65+(i%4)*24;spark.style.cssText=`--x:${Math.cos(a)*r}px;--y:${Math.sin(a)*r}px;--delay:${burst*180}ms;--color:${['#ffce43','#ff6e7a','#65eaff','#c091ff','#fff4be'][burst]};left:${15+burst*17}%;top:${28+(burst%2)*24}%`;layer.append(spark);}
 if(reduced)layer.classList.add('reduced');(el('sheet').open?el('sheet'):document.body).append(layer);setTimeout(()=>layer.remove(),2200);
}
function showChallenge(){
 let link;try{updateChallengeCaptain(s=>{link=issueChallenge(s,location.href);});}catch(error){toast(error.message);return;}
 modal('<div class="eyebrow">FRIEND CHALLENGE</div><h2>Challenge a friend</h2><p>They battle a copy of your ship, using their own ship or a new ship to keep. They get one bonus gunner and 100 wood after the battle. Open their results link to collect your 100 wood.</p><div class="row spaced">'+button('Share challenge','share-challenge','','primary')+button('Copy link','copy-challenge')+'</div><label class="challenge-link-label">Challenge link<input id="challengeLink" readonly value="'+esc(link)+'"></label>'+(/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname)?'<p class="footer-note">For phone testing, create this link from the phone preview address. Both phones must be on the same Wi-Fi while the server is running.</p>':''));
}
function updateChallengeCaptain(change){
 if(saveError)throw Error(saveError);
 const raw=localStorage.getItem(KEY),next=raw?M.restore(raw):structuredClone(regularState||state);
 const result=change(next);M.validate(next);
 try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw Error('Could not save your challenge reward. Free browser storage and try again.');}
 if(regularState)regularState=next;else state=next;return result;
}
function resultsShare(result){
 if(!result)return '<p>This older challenge has no return link. Ask your friend for a new challenge to earn wood.</p>';
 const link=resultsURL(result,location.href);
 return '<div class="row spaced">'+button('Copy results link','copy-results','','primary')+button('Share results','share-results')+'</div><label class="challenge-link-label">Results link<input id="resultsLink" readonly value="'+esc(link)+'"></label>';
}
function showCompletedChallenge(){
 const b=state.battle;let receipt;
 try{receipt=updateChallengeCaptain(s=>completeChallenge(s,incomingChallenge,state));}catch(error){modal('<h2>Save your result</h2><p>'+esc(error.message)+'</p>'+button('Try again','retry-challenge-result','','primary'));return;}
 b.rewarded=true;
 modal('<div class="eyebrow">FRIEND CHALLENGE</div><h2>'+(b.won?'Victory!':'Defeat')+'</h2><p>Against '+esc(b.enemyName)+' · '+b.turn+' turns</p>'+(receipt.result?'<p><strong>'+(receipt.awarded?'+100 wood added to your inventory.':'Your 100 wood for this challenge is already collected.')+'</strong></p><p>Send your results to '+esc(b.enemyName)+' so they can collect 100 wood too. Each captain earns once per challenge link.</p>':'')+resultsShare(receipt.result)+'<div class="row spaced">'+button('Play again','practice-again')+button('Return to port','return')+'</div>');
}
function acceptChallenge(){
 try{
  const captain=regularState||state;if(ownsChallenge(captain,incomingChallenge))throw Error('This is your challenge. Send the link to a friend to battle your ship.');
  const game=practiceGame(incomingChallenge,captain.onboarded?captain:null);
  if(!captain.onboarded){const kept=structuredClone(game);kept.battle=null;M.validate(kept);if(saveError)throw Error(saveError);localStorage.setItem(KEY,JSON.stringify(kept));regularState=kept;}else regularState=captain;
  state=game;page='arena';gunner=null;close();render();matchIntro();
 }catch(error){toast(error.message);}
}
async function copyShareLink(inputId){
 const input=el(inputId);
 try{await navigator.clipboard.writeText(input.value);toast('Link copied. Paste it into your message.');}
 catch{input.focus();input.select();input.setSelectionRange(0,input.value.length);if(document.execCommand('copy'))toast('Link copied. Paste it into your message.');else toast('Press and hold the selected link, then choose Copy.');}
}
async function sharePreparedLink(inputId){
 const url=el(inputId).value;
 if(navigator.share){try{await navigator.share({url});return;}catch(error){if(error.name==='AbortError')return;}}
 await copyShareLink(inputId);
}
function homeConfiguration(){return {action:'configure',level:state.shipLevel,sailLevel:state.sailLevel,flag:state.flag,figure:state.figurehead,crew:Object.entries(state.slots).map(([slot,id])=>({id,slot,hp:M.stats(pirate(id),state.levels[id]).hp,name:pirate(id).name,type:{hull:0,crew:1,sails:2}[pirate(id).primary]})),cosmetic:state.cosmetic,plating:state.plating,motion:state.settings.motion,preview:true,cutaway:tab==='gunners'||tab==='ship',hideRig:tab==='gunners'};}
async function purchaseHull(expected){
 if(upgradeBusy||saveError)return;const previous=structuredClone(state),before=M.hullConfig(state.shipLevel);if(!M.shipUpgrade(state,expected)){toast('Not enough supplies, or finish your current battle first.');return;}
 if(!save()){state=previous;render();return;}upgradeBusy=true;el('app').inert=true;const after=M.hullConfig(state.shipLevel),stage=el('homeShip')?.parentElement;
 try{if(stage)await celebrateUpgrade({stage,sound:state.settings.sound,motion:state.settings.motion,status:document.querySelector('.upgrade-status')||document.createElement('div'),swap:()=>new Promise((resolve,reject)=>{const requestId='upgrade-'+Date.now();const timer=setTimeout(()=>{artWaiters.delete(requestId);reject(Error('Ship art is still loading. Your purchased upgrade is saved.'));},15000);artWaiters.set(requestId,()=>{clearTimeout(timer);resolve();});send('home',{...homeConfiguration(),requestId});})});
  page='crew';tab='ship';render();modal(upgradeComparison(before,after));
 }catch(error){page='crew';tab='ship';render();toast(error.message);}finally{upgradeBusy=false;el('app').inert=false;}
}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==el('homeShip')?.contentWindow)return;const d=e.data;if(d?.type==='pirate-art-ready'){artWaiters.get(d.requestId)?.();artWaiters.delete(d.requestId);}if(d?.type==='pirate-stations')for(const p of d.anchors){const button=document.querySelector('.ship-diagram [data-id="'+p.slot+'"]');if(button){button.style.left=p.left+'%';button.style.top=p.top+'%';button.setAttribute('aria-label',(state.slots[p.slot]?pirate(state.slots[p.slot]).name:'Empty')+' '+(p.port?'gun port':'deck')+' station '+(Number(p.slot[1])+1));}}});
function actionResult(ok,msg){if(!ok)toast('Not enough supplies, or this action is not available yet.');else{save();toast(msg);render();}}
document.addEventListener('click',async ev=>{const b=ev.target.closest('[data-action]');if(!b||b.disabled||upgradeBusy)return;const {action:a,id}=b.dataset;if(page==='arena'&&state.battle?.phase==='special'&&!['resume-special','fullscreen'].includes(a))return;switch(a){
case 'nav':page=id;render();window.scrollTo({top:0,left:0,behavior:'instant'});el('main').scrollTo({top:0,left:0,behavior:'instant'});break;
case 'challenge':showChallenge();break;
case 'copy-challenge':case 'copy-results':await copyShareLink(a==='copy-results'?'resultsLink':'challengeLink');break;
case 'share-challenge':case 'share-results':await sharePreparedLink(a==='share-results'?'resultsLink':'challengeLink');break;
case 'accept-challenge':case 'practice-again':acceptChallenge();break;
case 'retry-challenge-result':showCompletedChallenge();break;
case 'challenge-results':modal('<h2>Your battle results</h2><p>Your 100 wood is already collected. Send this link to your friend for their reward.</p>'+resultsShare(state.friendChallenges.lastResult));break;
case 'last-result':finish();break;
case 'harbor':if(HARBORS.some(h=>h.id===id)){state.settings.harbor=id;save();close();render();}break;
case 'close':close();if(page==='arena'&&state.battle?.phase==='result'){page='battle';if(regularState){state=regularState;regularState=null;history.replaceState(null,'',clearChallengeLink(location.href));}else state.battle=null;save();render();}break;
case 'tab':tab=id;render();break;
case 'yard':page='crew';tab='yard';render();break;
case 'select':selected=Number(id);render();break;
case 'select-detail':selected=Number(id);close();page='crew';tab='gunners';render();break;
case 'unselect':selected=null;render();break;
case 'slot':if(selected){M.assign(state,selected,id);selected=null;}else delete state.slots[id];save();render();break;
case 'detail':detail(Number(id));break;
case 'upgrade':if(M.upgrade(state,Number(id))){save();close();toast('The gunsmith is on the job.');render();}else toast('Check your cards, gold, and bench.');break;
case 'skip':actionResult(M.skip(state),'Upgrade complete.');close();break;
case 'ship-up':await purchaseHull(Number(id));break;
case 'sail-up':actionResult(M.sailUpgrade(state,Number(id)),'New rigging is ready.');break;
case 'inventory-tab':if(['sails','flags','figureheads'].includes(id)){inventoryTab=id;tab='ship';render();}break;
case 'flag':actionResult(M.flag(state,Number(id)),'Flag equipped.');break;
case 'equip':{const[k,v,i]=id.split(':');actionResult(M.equip(state,k,v,Number(i||0)),'Fitted and ready.');break;}
case 'repair':actionResult(M.repair(state),'Ready for another broadside.');break;
case 'enhance':actionResult(M.enhance(state,id),'Enhancement installed.');break;
case 'figure-up':actionResult(M.upgradeFigure(state,id),'Figurehead upgraded.');break;
case 'figure':actionResult(M.figure(state,id),'Figurehead fitted.');break;
case 'cosmetic':actionResult(M.cosmetic(state,Number(id)),'Flying your colors.');break;
case 'weekly':modal('<h2>Weekly orders</h2><p class="spaced">Win 5 battles · '+Math.min(5,state.quests.wins)+'/5</p><div class="spaced">'+button(state.quests.weeklyClaim?'Claimed ✓':'Claim 300 XP','quest','weekly','primary',state.quests.weeklyClaim||state.quests.wins<5)+'</div>');break;
case 'quest':if(id==='weekly'&&el('sheet').open)close();actionResult(M.questClaim(state,id),'Season XP claimed.');break;
case 'chest':{const r=M.openChest(state,id);if(!r)break;save();render();modal('<div class="eyebrow">A FAIR SHARE OF THE SPOILS</div>'+artImage('open','dialog-banner','Open booty chest')+'<h2>Look what the tide brought in.</h2><p class="gold">+'+r.gold+' gold</p><div class="chest-card-reveal" id="chestCardReveal" role="list" aria-label="Four cards revealed one at a time" aria-live="polite"></div><p class="footer-note">'+r.draws.length+' new cards found</p>');el('sheet').classList.add('chest-reveal-modal');rewardFireworks();const reveal=el('chestCardReveal'),revealNext=index=>{if(!reveal.isConnected||index>=r.draws.length)return;const p=pirate(r.draws[index]),card=document.createElement('article');card.className='chest-reward-card';card.dataset.revealIndex=String(index);card.dataset.revealedAt=String(performance.now());card.setAttribute('role','listitem');card.innerHTML=portrait(p)+'<strong>'+esc(p.name)+'</strong><small>+1 CARD</small>';reveal.append(card);setTimeout(()=>revealNext(index+1),500);};revealNext(0);break;}
case 'port':setPort(Number(id));break;
case 'port-step':stepPort(Number(id));break;
case 'scenery':scenery();break;
case 'captain':{const p=M.board(state,port)[Number(id)];modal('<div class="eyebrow">'+M.PORTS[port]+' · CAPTAIN’S RECORD</div><h2>'+esc(p.name)+'</h2><div class="stats"><div class="stat"><small>SHIP LEVEL</small><strong>'+p.level+'</strong></div><div class="stat"><small>WEEKLY WINS</small><strong>'+p.wins+'</strong></div><div class="stat"><small>TROPHIES</small><strong>'+p.trophies+'</strong></div></div><p>'+(p.self?'Your place in these waters.':'A seeded rival captain. Scout the enemy deck during battle to identify their gunners.')+'</p>');break;}
case 'claim':{const[l,p]=id.split(':');const claimed=M.claim(state,Number(l),p==='true');actionResult(claimed,'Reward claimed.');if(claimed)rewardFireworks();break;}
case 'claim-all':{let n=0;for(let l=1;l<=M.seasonLevel(state);l++)for(const p of[false,true])if(M.claim(state,l,p))n++;save();render();toast(n?n+' rewards claimed.':'All available rewards already claimed.');if(n)rewardFireworks();break;}
case 'moves':moves();break;
case 'move':{const n=Number(id);if(state.moves.includes(n)||M.buyMove(state,n)){state.move=n;save();if(page==='crew')render();moves();}else toast('You need 10 gold to unlock this special attack.');break;}
case 'decline':M.declineOffer(state,id);save();render();break;
case 'trade':actionResult(M.exchange(state,el('tradeFrom').value,el('tradeTo').value),'Trade complete.');break;
case 'water-open':openWater();break;
case 'water-copy':await copyWater();break;
case 'water-paste':pasteWater();break;
case 'water-save':saveWaterLook();break;
case 'water-import':try{const look=parseWater(el('waterJson').value);close();openWater({id:null,...look});}catch(err){el('waterImportError').hidden=false;el('waterImportError').textContent=err.message;}break;
case 'setting':state.settings[id]=!state.settings[id];save();render();break;
case 'preview':state.premium=!state.premium;save();render();toast('Local reward-track preview '+(state.premium?'enabled.':'disabled.'));break;
case 'export':{const blob=new Blob([saveError?localStorage.getItem(KEY)||JSON.stringify(state):JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pirate-captain.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);break;}
case 'fullscreen':await toggleFullscreen(modal,toast);break;
case 'screen-help':modal(screenHelp());break;
case 'help':help();break;
case 'onboard':state.onboarded=true;save();close();break;
case 'start':if(state.battle&&state.battle.phase!=='result'){page='arena';render();await resumeCombat();break;}if(M.startBattle(state)){page='arena';gunner=null;save();render();await matchSearch();if(state.battle?.phase==='player')matchIntro();}else toast('Post at least one pirate to your ship first.');break;
case 'begin-battle':close();setBattleView('crew');break;
case 'gun':if(!busy&&state.battle?.phase==='player'){gunner=Number(id);scope=true;telescope=false;updateArena();setBattleView('wide');}break;
case 'sail':if(!busy&&M.moveShip(state,Number(id)))updateArena();break;
case 'fire':await fire();break;
case 'resume-special':close();await finisher(true);break;
case 'finisher':await finisher();break;
case 'scope':telescope=!telescope;setBattleView(telescope?'scope':'crew');updateArena();break;
case 'retreat':modal('<h2>Strike your colors?</h2><p>Retreat counts as a loss.</p><div class="row spaced">'+button('Retreat','confirm-retreat','','danger')+button('Keep fighting','close','','primary')+'</div>');break;
case 'confirm-retreat':close();state.battle.won=false;state.battle.phase='result';finish();break;
case 'return':close();if(regularState){state=regularState;regularState=null;history.replaceState(null,'',clearChallengeLink(location.href));}else state.battle=null;history.replaceState(null,'',clearChallengeLink(location.href));page='battle';save();render();break;
case 'rematch':{b.disabled=true;b.textContent='Waiting for their answer…';await sleep(1500);const r=M.requestRematch(state);save();if(r){close();page='arena';gunner=null;render();matchIntro();toast('Challenge accepted. Their accuracy is reduced 20%.');}else{modal('<div class="rematch-scene">'+artImage('fog')+'</div><h2>RUNNING SCARED.</h2><p>'+esc(state.lastResult.enemyName)+' has decided the open sea looks safer. No rematch, no reward. Their pride is another matter.</p><div class="spaced">'+button('Back to port','return','','primary')+'</div>');}break;}
}});
document.addEventListener('change',async e=>{if(e.target.id==='waterLook'){const library=waterLibrary(state.settings.water);library.selected=e.target.value;state.settings.water=waterLibrary(library);save();toast('Battle water look selected.');}if(e.target.id==='captainName'){state.name=e.target.value.trim().slice(0,24)||'Captain';save();}if(e.target.id==='importSave'){const file=e.target.files[0];if(!file)return;try{const next=M.restore(await file.text());state=next;saveError='';save();render();toast('Captain restored.');}catch{toast('That file is not a valid captain backup. Nothing changed.');}}});
window.addEventListener('message',e=>{if(e.origin!==location.origin||!e.data)return;const d=e.data;if(d.type==='pirate-ready'){const preview=[...document.querySelectorAll('[data-preview]')].find(f=>f.contentWindow===e.source);if(preview&&state.battle){const side=preview.dataset.preview,f=state.battle[side];e.source.postMessage({type:'pirate-render',action:'configure',preview:true,level:f.shipLevel,crew:visualCrew(f),parts:f,cosmetic:f.cosmetic??(side==='player'?state.cosmetic:null),sailLevel:f.sailLevel,flag:f.flag,figure:f.figure,motion:state.settings.motion},location.origin);return;}}if(d.type==='pirate-ready'&&['home','player','enemy'].includes(d.side)&&e.source===el(d.side+'Ship')?.contentWindow)configure(d.side);});

window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==el('battleOcean')?.contentWindow)return;
 if(e.data?.type==='pirate-ocean-ready'){syncOcean();return;}
 const b=state.battle,rows=e.data?.contacts;
 if(e.data?.type!=='pirate-ocean-frame'||!b||!Array.isArray(rows))return;
 for(const row of rows){
  if(!['player','enemy'].includes(row.side)||!row.pose||!Number.isFinite(row.pose.heave)||!Number.isFinite(row.pose.roll)||!Array.isArray(row.samples)||row.samples.length!==32)continue;
  const f=b[row.side],dir=row.side==='player'?1:-1;
  f.pose={heave:Math.max(-.2,Math.min(.2,row.pose.heave)),roll:Math.max(-Math.PI/12,Math.min(Math.PI/12,row.pose.roll))};
  const samples=row.samples.map(p=>({y:worldToShip(f,dir,p).y,foam:p.foam}));
  if(samples.every(p=>Number.isFinite(p.y)&&Number.isFinite(p.foam)))send(row.side,{action:'ocean',look:row.foamLook,surface:samples.map(p=>p.y),foam:samples.map(p=>p.foam)});
 }
 layoutCombat();
});

document.addEventListener('keydown',e=>{if(page==='arena'&&!el('sheet').open&&e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();fire();}});
setInterval(async()=>{if(page==='arena'&&!busy&&!document.hidden&&!el('sheet').open&&state.battle?.phase==='player'){const expired=M.elapse(state);updateArena();if(expired){await runEnemyTurn();}}const old=state.bench?.id,stamp=state.day+state.week+state.season,dealKeys=Object.keys(state.deals).join();M.offers(state);if(page==='store'&&dealKeys!==Object.keys(state.deals).join())render();M.advance(state,Date.now());if(stamp!==state.day+state.week+state.season){save();if(page!=='arena')render();}if(old&&!state.bench){save();if(page!=='arena')render();toast('Your gunner’s upgrade is complete.');}document.querySelectorAll('[data-timer]').forEach(n=>n.textContent=duration(Number(n.dataset.timer)-Date.now())+' remaining');},1000);
function duration(ms){const m=Math.max(0,Math.ceil(ms/60000));return m>=60?Math.floor(m/60)+'h '+m%60+'m':m+'m';}
function openIncomingChallenge(){
 try{
  if(!hasChallengeLink(location.href))return;
  if(regularState)throw Error('Return to port before opening another challenge or result.');
  const result=readChallengeResult(location.href);
  if(result){const awarded=updateChallengeCaptain(s=>claimChallengeResult(s,result));render();modal('<div class="eyebrow">CHALLENGE RESULTS</div><h2>'+esc(result.friend)+(result.won?' beat your ship!':' battled your ship!')+'</h2><p>'+result.turns+' turns</p><p><strong>'+(awarded?'+100 wood added to your inventory.':'You already collected 100 wood for this challenge.')+'</strong></p>'+button('Return to port','return','','primary'));return;}
  incomingChallenge=readChallenge(location.href);
  if(incomingChallenge)modal('<div class="eyebrow">FRIEND CHALLENGE</div><h2>'+esc(incomingChallenge.ship.name)+' challenges you!</h2><p>Battle a copy of their ship with your own ship, or get a new ship to keep. A bonus gunner joins you for this battle.</p><p>'+(incomingChallenge.id?'Finish the battle for 100 wood, then send your results so your friend can collect 100 wood too.':'This older practice link has no wood reward.')+'</p>'+button('Accept challenge','accept-challenge','','primary'));
 }catch(error){modal('<h2>Cannot open link</h2><p>'+esc(error.message)+'</p>');}
}
window.addEventListener('hashchange',openIncomingChallenge);
window.addEventListener('popstate',openIncomingChallenge);
render();openIncomingChallenge();if(!state.onboarded)setTimeout(()=>{if(!state.onboarded&&!el('sheet').open&&!hasChallengeLink(location.href))help();},500);
