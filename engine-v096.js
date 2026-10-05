export * from './engine.js?core=093';
import * as core from './engine.js?core=093';
import {STAT_KEYS} from './config.js?v=093';
import {STATUS_DEFS,CLOTHES,ITEM_DEFS} from './data.js?v=093';

const ALLOWED_STATUSES=new Set([
  'hangover','pigeonHumiliated','suspicious','scared','angry',
  'yebatorium','tipsy','skunk','tired'
]);
const EARLY_CH3=new Set([
  'ch3_intro','ch3_obey','ch3_turn','ch3_call_pigeon','ch3_tell_off','ch3_creature',
  'ch3_vodka','ch3_garlic','ch3_garlic_hit','ch3_ask_pigeon','ch3_run','ch3_pray'
]);

function dayOf(totalMinutes){return Math.floor(Math.max(0,Number(totalMinutes||0))/1440)+1}
function ensureDiscovered(s,id){if(!s.discoveredStatuses.includes(id))s.discoveredStatuses.push(id)}
function cleanStatuses(s){
  s.activeStatuses=(s.activeStatuses||[]).filter(id=>ALLOWED_STATUSES.has(id));
  s.discoveredStatuses=(s.discoveredStatuses||[]).filter(id=>ALLOWED_STATUSES.has(id));
  s.statusTimers={...(s.statusTimers||{})};
  for(const id of Object.keys(s.statusTimers))if(!ALLOWED_STATUSES.has(id))delete s.statusTimers[id];
  return s;
}
function setActive(s,id,on,events=[]){
  const had=s.activeStatuses.includes(id);
  if(on&&!had){s.activeStatuses.push(id);ensureDiscovered(s,id);events.push({type:'statusAdded',id,visible:false})}
  else if(!on&&had){s.activeStatuses=s.activeStatuses.filter(x=>x!==id);delete s.statusTimers[id];events.push({type:'statusRemoved',id,visible:false})}
  return events;
}
function scaledStatusMods(state){
  const out=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
  const level=Math.max(1,Number(state?.heroProgression?.level||1));
  const bonus=Math.floor((level-1)/3);
  for(const id of state?.activeStatuses||[]){
    const d=STATUS_DEFS[id];
    for(const [k,raw] of Object.entries(d?.mods||{})){
      if(!(k in out))continue;const v=Number(raw||0);out[k]+=v>0?v+bonus:v;
    }
  }
  const shield=(state?.activeStatuses||[]).reduce((n,id)=>Math.max(n,Number(STATUS_DEFS[id]?.negativeModShield||0)),0);
  if(shield>0)for(const k of STAT_KEYS)if(out[k]<0)out[k]=Math.min(0,out[k]+shield);
  return out;
}
export function statModifiers(state){
  const out=scaledStatusMods(state);
  for(const id of Object.values(state?.equipment||{})){
    const d=CLOTHES[id];for(const [k,v] of Object.entries(d?.statMods||{}))if(k in out)out[k]+=Number(v||0);
  }
  return out;
}
export function effectiveStat(state,key){return Math.max(0,core.permanentStat(state,key)+Number(statModifiers(state)[key]||0))}

function recordVodka(before,s,action){
  const all=[...(action?.effects||[]),...(action?.hiddenEffects||[])];
  const drank=String(action?.id||'')==='use_vodka'||all.some(e=>e?.type==='statusAdd'&&e.id==='tipsy');
  if(!drank)return;
  s.flags=s.flags||{};s.flags.vodkaDrinkSerial096=Number(before?.flags?.vodkaDrinkSerial096||0)+1;s.flags.lastVodkaDrinkDay096=dayOf(before?.clock?.totalMinutes);
}
function maybeHangover(s,events){
  s.flags=s.flags||{};
  const serial=Number(s.flags.vodkaDrinkSerial096||0),done=Number(s.flags.hangoverProcessedVodkaSerial096||0),drinkDay=Number(s.flags.lastVodkaDrinkDay096||0);
  if(serial<=done||!drinkDay||dayOf(s.clock?.totalMinutes)<=drinkDay)return events;
  if(!s.activeStatuses.includes('hangover')){s.activeStatuses.push('hangover');ensureDiscovered(s,'hangover');events.push({type:'statusAdded',id:'hangover',visible:false})}
  s.flags.hangoverProcessedVodkaSerial096=serial;return events;
}
function reconcileTired(s,beforeHad,events){
  events=events.filter(e=>!(e?.type==='statusAdded'||e?.type==='statusRemoved')||e.id!=='tired');
  const energy=Number(s.needs?.energy||0);
  if(energy<35)setActive(s,'tired',true,events);else if(energy>55)setActive(s,'tired',false,events);else setActive(s,'tired',Boolean(beforeHad),events);
  return events;
}
function applyTestSetup(s){
  if(!s.flags?.testMode)return;
  let cfg={};try{cfg=JSON.parse(localStorage.getItem('dnt-test-v096')||'{}')}catch{}
  const ids=Array.isArray(cfg.statuses)?cfg.statuses:[];
  for(const id of ids){
    if(!ALLOWED_STATUSES.has(id))continue;
    if(id==='tired')s.needs.energy=Math.min(Number(s.needs.energy||100),30);
    if(!s.activeStatuses.includes(id))s.activeStatuses.push(id);ensureDiscovered(s,id);
    const dur=Number(STATUS_DEFS[id]?.durationMinutes||0);if(dur>0)s.statusTimers[id]=Number(s.clock?.totalMinutes||0)+dur;
    if(id==='yebatorium')s.unlocks.yebatorium=true;
  }
  if(cfg.sunset){s.flags.evpapiySaloGivenCount=Math.max(2,Number(s.flags.evpapiySaloGivenCount||0));s.flags.evpapiyEnemyConflict096=true}
}
function syncItemKnowledge(s){
  const unknown=['garlic','onion','onion_angry','onion_smelly','potion_unknown'];
  for(const id of unknown){if(ITEM_DEFS[id]){ITEM_DEFS[id].category='Якась хуйня';ITEM_DEFS[id].description='???'}}
  if(ITEM_DEFS.onion)ITEM_DEFS.onion.name='Дивна цибуля';
  const known={
    garlic:{category:'Зброя',description:'ТРУПОСМЕРДу дуже не подобається.'},
    onion:{category:'Зброя',name:'Дивна цибуля',description:'Після кидка ворог погано бачить 1 хід.'},
    onion_angry:{category:'Зброя',description:'Вгризається й продовжує кусати.'},
    onion_smelly:{category:'Зброя',description:'Від неї можна й вирубитись.'}
  };
  for(const [id,meta] of Object.entries(known))if(s.flags?.[`itemKnown095s_${id}`]&&ITEM_DEFS[id])Object.assign(ITEM_DEFS[id],meta);
}

export function normalizeState(raw){
  const rawHadScared=Boolean(raw?.activeStatuses?.includes?.('scared'));
  const rawScaredMigration=Boolean(raw?.flags?.scaredMigration091);
  let s=core.normalizeState(raw);
  // Old migration used to inject fear merely because chapter 3 started. Do not reveal the consequence before its cause.
  const scene=String(s?.story?.sceneId||s?.scene||'');
  if(EARLY_CH3.has(scene)&&!rawHadScared&&!rawScaredMigration&&s.activeStatuses?.includes('scared')){
    s.activeStatuses=s.activeStatuses.filter(x=>x!=='scared');delete s.statusTimers?.scared;s.flags.scaredMigration091=true;
  }
  s=cleanStatuses(s);
  s.flags=s.flags||{};

  if(s.activeStatuses.includes('suspicious')&&!Number.isFinite(Number(s.statusTimers?.suspicious)))s.statusTimers.suspicious=Number(s.clock?.totalMinutes||0)+30;

  const energy=Number(s.needs?.energy||0);
  if(energy<35){if(!s.activeStatuses.includes('tired'))s.activeStatuses.push('tired');ensureDiscovered(s,'tired')}
  else if(energy>55){s.activeStatuses=s.activeStatuses.filter(x=>x!=='tired');delete s.statusTimers.tired}

  // v095v accidentally put NPCs in companions. Remove only those bad migrations; future real companions remain possible.
  for(const id of ['ryzheHamno','truposmerd','galina','hood','cat'])if(s.companions?.[id])delete s.companions[id];

  applyTestSetup(s);

  // ЗАКАТ ПРЄЗРЄНІЯ: two salo feedings + the explicit quarrel with the cat that tried to eat Євпапій.
  const salo=Number(s.flags.evpapiySaloGivenCount||0);
  s.unlocks.sunsetContempt=Boolean(salo>=2&&s.flags.evpapiyEnemyConflict096);

  syncItemKnowledge(s);
  return cleanStatuses(s);
}

export function executeAction(state,action){
  const before=normalizeState(state),beforeActive=new Set(before.activeStatuses||[]),oldTimers={...(before.statusTimers||{})};
  const r=core.executeAction(before,action);let s=cleanStatuses(r.state);let events=(r.events||[]).filter(e=>{
    if(e?.type!=='statusAdded'&&e?.type!=='statusRemoved')return true;return ALLOWED_STATUSES.has(e.id);
  });

  for(const id of beforeActive){
    if(!s.activeStatuses.includes(id)||!Number.isFinite(Number(oldTimers[id])))continue;
    if(Number(STATUS_DEFS[id]?.durationMinutes)>0)s.statusTimers[id]=Number(oldTimers[id]);
  }

  // If a need reaches zero during this action, damage begins now, not one action later.
  let zeroHits=0;
  for(const k of ['water','satiety','energy'])if(Number(before.needs?.[k]||0)>0&&Number(s.needs?.[k]||0)<=0)zeroHits+=1;
  if(zeroHits&&s.health>0){const b=s.health;s.health=Math.max(0,s.health-zeroHits);const actual=s.health-b;if(actual)events.push({type:'health',actual,visible:true,reason:'exhaustion'});}

  recordVodka(before,s,action);events=reconcileTired(s,beforeActive.has('tired'),events);events=maybeHangover(s,events);syncItemKnowledge(s);
  return{state:cleanStatuses(s),events};
}
export function useItem(state,id){
  const d=ITEM_DEFS[id];if(!d||core.itemCount(state,id)<=0||!d.useEffects?.length)return{state,used:false,events:[]};
  return{...executeAction(state,{id:`use_${id}`,effects:d.useEffects,hiddenEffects:[{type:'itemRemove',id,qty:1}]}),used:true};
}

const HIGH_STORY_DANGER=new Set([
  'ch2_bang','ch2_bang3','ch2_after_bang','ch2_side','ch2_garlic','ch2_salo','ch2_pigeon_scared','ch2_figure','ch2_end',
  'ch3_intro','ch3_obey','ch3_turn','ch3_call_pigeon','ch3_tell_off','ch3_creature','ch3_vodka','ch3_garlic','ch3_garlic_hit','ch3_ask_pigeon','ch3_run','ch3_pray',
  'ch3_pray095_2','ch3_pray095_3','ch3_pray095_4','ch3_survival_bell095w'
]);
export function threatInfo(state){
  const scene=String(state?.story?.sceneId||state?.scene||''),base=core.threatInfo(state);
  if(base.key==='critical')return base;if(HIGH_STORY_DANGER.has(scene))return{key:'high',label:'ВИСОКА',reason:'поруч пряма сюжетна небезпека'};return base;
}
