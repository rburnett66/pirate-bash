// Tune the six-game introduction here. Multipliers affect incoming ordinary shots only.
export const TUTORIAL_STAGES=[
 {damage:.25,heading:'Congratulations!',message:'For playing your first game, what shall we call you Sir?',prompt:'name',gunners:4,materials:{wood:100,metal:100,cloth:100},destination:'ship',button:'Visit your ship'},
 {damage:.50,heading:'Congratulations!',message:'For playing your second game, here is a new flag for your ship.',flag:1,destination:'flags',button:'Equip your new flag'},
 {damage:.50,heading:'Congratulations!',message:'For playing your third game, here are new sails for your ship.',sails:4,destination:'sails',button:'Equip your new sails'},
 {damage:.75,heading:'Congratulations!',message:'For playing your fourth game, here are some new gunners for your ship.',gunners:4,destination:'gunners',button:'Equip your gunners'},
 {damage:.75,heading:'Congratulations!',message:'For playing your fifth game, here are some materials for your ship.',materials:{wood:100,metal:100,cloth:100},destination:'ship',button:'Visit your ship'},
 {damage:1,heading:'Thank you!',message:'Are you enjoying the game?',prompt:'rating',materials:{wood:100,metal:100,cloth:100},destination:'menu',button:'Back to menu'}
];
export function initTutorial(s){
 s.tutorial??={version:1,completed:0,pending:null,claimed:[],rating:null};
 return s.tutorial;
}
export function validateTutorial(s){
 const t=s.tutorial;
 if(!t||t.version!==1||!Number.isInteger(t.completed)||t.completed<0||t.completed>TUTORIAL_STAGES.length||!Array.isArray(t.claimed)||new Set(t.claimed).size!==t.claimed.length||t.claimed.some(n=>!Number.isInteger(n)||n<1||n>t.completed)||(t.rating!==null&&(!Number.isInteger(t.rating)||t.rating<1||t.rating>5)))throw Error('Tutorial save is invalid');
 const p=t.pending;
 if(p!==null&&(!p||p.stage!==t.completed||!TUTORIAL_STAGES[p.stage-1]||typeof p.matchId!=='string'||typeof p.granted!=='boolean'||typeof p.presented!=='boolean'||!Array.isArray(p.items)||p.items.some(i=>!i||!['gunner','wood','metal','cloth','flag','sails'].includes(i.kind)||!Number.isInteger(i.count)||i.count<1||(i.kind==='gunner'&&(!Number.isInteger(i.id)||i.id<1||i.id>36))||(i.kind==='flag'&&(!Number.isInteger(i.id)||i.id<1||i.id>33))||(i.kind==='sails'&&(!Number.isInteger(i.id)||i.id<0||i.id>5)))||p.granted!==t.claimed.includes(p.stage)))throw Error('Tutorial reward save is invalid');
}
export function tutorialDamage(s,side){return side==='enemy'&&!s.battle?.practice?(s.battle?.tutorialDamage??1):1;}
export function tutorialBattle(s,b){
 const t=initTutorial(s);b.tutorialStage=t.completed<TUTORIAL_STAGES.length?t.completed+1:null;
 b.tutorialDamage=TUTORIAL_STAGES[t.completed]?.damage??1;
}
export function tutorialSettle(s,b){
 const t=initTutorial(s);
 if(b.practice||t.pending||!b.tutorialStage||b.tutorialStage!==t.completed+1)return;
 const stage=b.tutorialStage,config=TUTORIAL_STAGES[stage-1],items=[];
 let seed=b.seed>>>0;
 for(let n=0;n<(config.gunners||0);n++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;items.push({kind:'gunner',id:seed%36+1,count:1});}
 for(const [kind,count]of Object.entries(config.materials||{}))items.push({kind,count});
 if(config.flag!==undefined)items.push({kind:'flag',id:config.flag,count:1});
 if(config.sails!==undefined)items.push({kind:'sails',id:config.sails,count:1});
 t.completed=stage;t.pending={stage,matchId:b.id,items,granted:false,presented:false};
}
export function tutorialGrant(s,input){
 const t=initTutorial(s),p=t.pending;if(!p)return null;
 const config=TUTORIAL_STAGES[p.stage-1];
 if(p.granted)return p;
 if(config.prompt==='name'){const name=String(input??'').trim();if(!name||name.length>24)throw Error('Enter a name between 1 and 24 characters.');s.name=name;}
 if(config.prompt==='rating'){if(!Number.isInteger(input)||input<1||input>5)throw Error('Choose a rating from 1 to 5 stars.');t.rating=input;}
 for(const i of p.items){
  if(i.kind==='gunner'){s.levels[i.id]=Math.max(1,s.levels[i.id]);s.cards[i.id]+=i.count;}
  else if(i.kind==='flag'){if(!s.flags.includes(i.id))s.flags.push(i.id);}
  else if(i.kind==='sails'){if(!s.cosmetics.includes(i.id))s.cosmetics.push(i.id);}
  else s.mats[i.kind]+=i.count;
 }
 p.granted=true;p.presented=true;t.claimed.push(p.stage);return p;
}
export function tutorialDismiss(s){const p=s.tutorial?.pending;if(!p?.granted)return false;s.tutorial.pending=null;return true;}
