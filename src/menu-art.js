import {gunnerImage} from './gunner-art.js';
// Processed supplied art stays byte-for-byte intact in public/menu-art.
export const ART = {
  battle:'battle__8f2f3bff', crew:'crew__c937254a', booty:'booty-pass__395cc0eb', store:'store__69204157',
  fight:'fight-icon__fa59e280', crewIcon:'crew-icon__4f92ad33', map:'map-icon__454c9d84',
  chest:'chest-icon__4d65463e', gift:'gift-icon__4186e173', settings:'options-icon__fb0e7125',
  frame:'crew-frame__819ba7b5', header:'header__08e28e4c', find:'find-match-shadow-v2',
  open:'open-chest__5a0cb1a0', rematch:'rematch__e48b14f8', victory:'victory__1eedb918', lost:'lost__3d56a169',
  hawaii:'ports/IMG_7373.JPG', bombay:'ports/IMG_7370.JPG', madagascar:'ports/IMG_7371.JPG',
  locker:'ports/IMG_7386.JPG', fog:'ports/IMG_7382.JPG',
  stoneHarbor:'ports/IMG_7365.JPG', bermuda:'ports/IMG_7366.JPG', tortuga:'ports/IMG_7367.JPG',
  castleHarbor:'ports/IMG_7368.JPG', hongKong:'ports/IMG_7369.JPG', seattle:'ports/IMG_7372.JPG',
  rainbowQuay:'ports/IMG_7374.JPG', grandCanal:'ports/IMG_7375.JPG', mountainCoast:'ports/IMG_7376.JPG',
  sunlitPromenade:'ports/IMG_7377.JPG', caracas:'ports/IMG_7378.JPG', fortressBay:'ports/IMG_7379.JPG',
  festivalHarbor:'ports/IMG_7380.JPG', sunsetCove:'ports/IMG_7381.JPG', skullIsland:'ports/IMG_7383.JPG',
  coralKingdom:'ports/IMG_7384.JPG'
};
export const imageURL = key => './public/menu-art/'+ART[key]+(ART[key]?.includes('/')?'':'.png');
export const artImage = (key,cls='',alt='',loading='eager') => '<img class="'+cls+'" src="'+imageURL(key)+'" alt="'+alt+'" draggable="false" loading="'+loading+'">';
export const HARBORS = [
  {id:'hawaii',name:'Hawaii',mood:'A fair wind and open water'},
  {id:'bombay',name:'Bombay',mood:'Fortune waits at the docks'},
  {id:'madagascar',name:'Madagascar',mood:'One more voyage before sunset'},
  {id:'fog',name:'Dead Man’s Wharf',mood:'Some waters keep their secrets'},
  {id:'locker',name:'Davy’s Locker',mood:'Riches beyond the surface'},
  {id:'stoneHarbor',name:'Old Stone Harbor',mood:'Old walls shelter new adventures'},
  {id:'bermuda',name:'Bermuda',mood:'Bright shores beyond the reef'},
  {id:'tortuga',name:'Tortuga',mood:'A haven for every free captain'},
  {id:'castleHarbor',name:'Castle Harbor',mood:'Watchtowers guard the quiet water'},
  {id:'hongKong',name:'Hong Kong',mood:'Mountain winds fill the sails'},
  {id:'seattle',name:'Seattle',mood:'Pine forests rise through the mist'},
  {id:'rainbowQuay',name:'Rainbow Quay',mood:'Colorful quays welcome the fleet'},
  {id:'grandCanal',name:'Grand Canal',mood:'Golden towers above the tide'},
  {id:'mountainCoast',name:'Mountain Coast',mood:'Rocky shores and rolling seas'},
  {id:'sunlitPromenade',name:'Sunlit Promenade',mood:'Palm shadows along the waterfront'},
  {id:'caracas',name:'Caracas',mood:'Green hills beyond the harbor'},
  {id:'fortressBay',name:'Fortress Bay',mood:'Stone ramparts watch the horizon'},
  {id:'festivalHarbor',name:'Festival Harbor',mood:'Bright banners welcome the trade winds'},
  {id:'sunsetCove',name:'Sunset Cove',mood:'One last sail in the golden light'},
  {id:'skullIsland',name:'Skull Island',mood:'Hidden treasure beneath a watchful skull'},
  {id:'coralKingdom',name:'Coral Kingdom',mood:'A hidden harbor beneath the waves'}
];
export const harbor = id => HARBORS.find(h=>h.id===id)||HARBORS[0];
// Individual composition controls keep faces centered without altering source PNGs.
const crops = {1:[150,50,2],2:[145,50,1],3:[142,48,1],4:[150,51,0],5:[140,50,1],
  6:[145,49,0],7:[142,51,1],8:[145,50,1],9:[148,50,0],10:[140,49,0]};
export function portrait(p,cls='') {
  const [scale,x,y]=crops[p.id]||[145,50,0];
  return '<span class="framed-portrait '+cls+'" style="--portrait-scale:'+scale+'%;--portrait-x:'+x+'%;--portrait-y:'+y+'%"><span class="portrait-window"><img src="'+gunnerImage(p.id)+'" alt="" draggable="false" loading="lazy" decoding="async"></span>'+artImage('frame','portrait-frame')+'</span>';
}
