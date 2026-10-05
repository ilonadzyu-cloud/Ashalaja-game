export * from './engine.js?core=093';
import * as core from './engine.js?core=093';
import {STAT_KEYS} from './config.js?v=093';
import {STATUS_DEFS,CLOTHES,ITEM_DEFS} from './data.js?v=093';

const ALLOWED_STATUSES=new Set([
  'hangover','pigeonHumiliated','suspicious','scared','angry',
  'yebatorium','tipsy','skunk','tired'
]);

function scaledStatusMods(state){
  const out=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
  const level=Math.max(1,Number(state?.heroProgression?.level||1));
  const bonus=Math.floor((level-1)/3);
  for(const id of state?.activeStatuses||[]){
    const d=STATUS_DEFS[id];
    for(const [k,raw] of Object.entries(d?.mods||{})){
      if(!(k in out))continue;
      const v=Number(raw||0);
      out[k]+=v>0?v+bonus:v;
    }
  }
  const shield=(state?.activeStatuses||[]).reduce((n,id)=>Math.max(n,Number(STATUS_DEFS[id]?.negativeModShield||0)),0);
  if(shield>0)for(const k of STAT_KEYS)if(out[k]<0)out[k]=Math.min(0,out[k]+shield);
  return out;
}

export function statModifiers(state){
  const out=scaledStatusMods(state);
  for(const id of Object.values(state?.equipment||{})){
    const d=CLOTHES[id];
    for(const [k,v] of Object.entries(d?.statMods||{}))if(k in out)out[k]+=Number(v||0);
  }
  return out;
}

export function effectiveStat(state,key){
  return Math.max(0,core.permanentStat(state,key)+Number(statModifiers(state)[key]||0));
}

function dayOf(totalMinutes){
  return Math.floor(Math.max(0,Number(totalMinutes||0))/1440)+1;
}

function cleanStatuses(s){
  s.activeStatuses=(s.activeStatuses||[]).filter(id=>ALLOWED_STATUSES.has(id));
  s.discoveredStatuses=(s.discoveredStatuses||[]).filter(id=>ALLOWED_STATUSES.has(id));
  s.statusTimers={...(s.statusTimers||{})};
  for(const id of Object.keys(s.statusTimers))if(!ALLOWED_STATUSES.has(id))delete s.statusTimers[id];
  return s;
}

function ensureDiscovered(s,id){
  if(!s.discoveredStatuses.includes(id))s.discoveredStatuses.push(id);
}

function setActive(s,id,on,events){
  const had=s.activeStatuses.includes(id);
  if(on&&!had){
    s.activeStatuses.push(id);
    ensureDiscovered(s,id);
    events.push({type:'statusAdded',id,visible:false});
  }else if(!on&&had){
    s.activeStatuses=s.activeStatuses.filter(x=>x!==id);
    delete s.statusTimers[id];
    events.push({type:'statusRemoved',id,visible:false});
  }
}

function reconcileTired095u(s,beforeHad,events){
  events=events.filter(e=>!(e?.type==='statusAdded'||e?.type==='statusRemoved')||e.id!=='tired');
  const energy=Number(s.needs?.energy||0);
  if(energy<35)setActive(s,'tired',true,events);
  else if(energy>55)setActive(s,'tired',false,events);
  else{
    // Hysteresis: between 35% and 55% keep the previous state.
    setActive(s,'tired',Boolean(beforeHad),events);
  }
  return events;
}

function recordVodka095u(before,s,action){
  const all=[...(action?.effects||[]),...(action?.hiddenEffects||[])];
  const drank=String(action?.id||'')==='use_vodka'||all.some(e=>e?.type==='statusAdd'&&e.id==='tipsy');
  if(!drank)return;
  s.flags=s.flags||{};
  s.flags.vodkaDrinkSerial095u=Number(before?.flags?.vodkaDrinkSerial095u||0)+1;
  s.flags.lastVodkaDrinkDay095u=dayOf(before?.clock?.totalMinutes);
}

function maybeAddNextDayHangover095u(s,events){
  s.flags=s.flags||{};
  const serial=Number(s.flags.vodkaDrinkSerial095u||0);
  const processed=Number(s.flags.hangoverProcessedVodkaSerial095u||0);
  const drinkDay=Number(s.flags.lastVodkaDrinkDay095u||0);
  if(serial<=processed||!drinkDay||dayOf(s.clock?.totalMinutes)<=drinkDay)return events;
  const had=s.activeStatuses.includes('hangover');
  if(!had){
    s.activeStatuses.push('hangover');
    ensureDiscovered(s,'hangover');
    events.push({type:'statusAdded',id:'hangover',visible:false});
  }
  s.flags.hangoverProcessedVodkaSerial095u=serial;
  return events;
}

export function normalizeState(raw){
  const s=cleanStatuses(core.normalizeState(raw));

  // Old saves can contain this state without a timer.
  if(s.activeStatuses.includes('suspicious')&&!Number.isFinite(Number(s.statusTimers?.suspicious))){
    s.statusTimers.suspicious=Number(s.clock?.totalMinutes||0)+30;
  }

  // ЗАЄБАВСЯ: appears below 35%, disappears only after recovery above 55%.
  const energy=Number(s.needs?.energy||0);
  if(energy<35){
    if(!s.activeStatuses.includes('tired'))s.activeStatuses.push('tired');
    ensureDiscovered(s,'tired');
  }else if(energy>55){
    s.activeStatuses=s.activeStatuses.filter(x=>x!=='tired');
    delete s.statusTimers.tired;
  }

  // Characters tab: only show people/creatures after the player has actually met them.
  const entered095v=new Set(s.story?.entered||[]);
  const catSeen095v=Boolean(
    s.flags?.catMet ||
    [...entered095v].some(id=>String(id).startsWith('ch3_cat_'))
  );
  if(catSeen095v){
    s.companions.ryzheHamno={
      ...(s.companions.ryzheHamno||{}),
      name:'Риже гамно',
      known:true,
      active:false,
      portrait:'./cat_base_095m.png',
      state:'У баби Галі',
      facts:['Лежить де хоче.']
    };
  }

  const truposmerdSeen095v=Boolean(
    s.flags?.creatureGarlicUsed ||
    s.flags?.creatureVodkaFriend ||
    s.flags?.shedBattleKnockout ||
    entered095v.has('ch3_creature') ||
    [...entered095v].some(id=>/^ch3_(vodka|garlic|run|ask_pigeon|pray)/.test(String(id)))
  );
  if(truposmerdSeen095v){
    const facts=['Виліз із сараю. Воняє. Живучий.'];
    if(s.flags?.itemKnown095s_garlic)facts.push('Часник йому дуже не подобається.');
    if(s.flags?.creaturePrayerReactionKnown095w)facts.push('На молитву реагує дуже дивно.');
    if(s.flags?.creatureVodkaFriend)facts.push('Горілку любить.');
    s.companions.truposmerd={
      ...(s.companions.truposmerd||{}),
      name:'ТРУПОСМЕРД',
      known:true,
      active:false,
      portrait:'./creature_normal_095f.webp',
      state:'Десь зʼїбався',
      facts
    };
  }

  return s;
}

export function executeAction(state,action){
  const before=normalizeState(state);
  const beforeActive=new Set(before.activeStatuses||[]);
  const oldTimers={...(before.statusTimers||{})};

  const r=core.executeAction(before,action);
  const s=cleanStatuses(r.state);
  let events=(r.events||[]).filter(e=>{
    if(e?.type!=='statusAdded'&&e?.type!=='statusRemoved')return true;
    return ALLOWED_STATUSES.has(e.id);
  });

  // Re-adding the same timed state must not quietly restart its timer.
  for(const id of beforeActive){
    if(!s.activeStatuses.includes(id))continue;
    if(!Number.isFinite(Number(oldTimers[id])))continue;
    if(Number(STATUS_DEFS[id]?.durationMinutes)>0)s.statusTimers[id]=Number(oldTimers[id]);
  }

  recordVodka095u(before,s,action);
  events=reconcileTired095u(s,beforeActive.has('tired'),events);
  events=maybeAddNextDayHangover095u(s,events);

  return{state:cleanStatuses(s),events};
}

export function useItem(state,id){
  const d=ITEM_DEFS[id];
  if(!d||core.itemCount(state,id)<=0||!d.useEffects?.length)return{state,used:false,events:[]};
  const r=executeAction(state,{id:`use_${id}`,effects:d.useEffects,hiddenEffects:[{type:'itemRemove',id,qty:1}]});
  return{...r,used:true};
}

const HIGH_STORY_DANGER=new Set([
  'ch2_bang','ch2_bang3','ch2_after_bang','ch2_side','ch2_garlic','ch2_salo','ch2_pigeon_scared','ch2_figure','ch2_end',
  'ch3_intro','ch3_obey','ch3_turn','ch3_call_pigeon','ch3_tell_off','ch3_creature','ch3_vodka','ch3_garlic','ch3_garlic_hit','ch3_ask_pigeon','ch3_run','ch3_pray',
  'ch3_pray095_2','ch3_pray095_3','ch3_pray095_4'
]);
export function threatInfo(state){
  const scene=String(state?.story?.sceneId||state?.scene||'');
  const base=core.threatInfo(state);
  if(base.key==='critical')return base;
  if(HIGH_STORY_DANGER.has(scene))return{key:'high',label:'ВИСОКА',reason:'поруч пряма сюжетна небезпека'};
  return base;
}
