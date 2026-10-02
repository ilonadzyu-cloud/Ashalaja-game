import {STAT_KEYS,STAT_LABELS,NEED_LABELS} from './config.js?v=052';
import {STATUS_DEFS,CLOTHES,ITEM_DEFS} from './data.js?v=052';

export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const clone=x=>JSON.parse(JSON.stringify(x));

export function createInitialState(runId=1){
  const stats={};
  for(const key of STAT_KEYS)stats[key]={level:1,progress:0};
  return {
    schemaVersion:5,runId,createdAt:Date.now(),updatedAt:Date.now(),lastAutosaveAt:null,
    chapter:'ui-shell',scene:'waiting-for-chapter-1',clock:{totalMinutes:420},
    health:100,needs:{satiety:80,water:75,energy:78},wetness:0,
    stats,activeStatuses:['hangover'],discoveredStatuses:['hangover'],unlocks:{yebatorium:false},
    inventory:[{id:'water',qty:1},{id:'salo',qty:1}],
    importantItems:[],
    quickSlots:[null,null,null],
    ownedClothes:['local_shirt','local_jacket','boots','sheepskin','leather_vest'],
    equipment:{body:'local_shirt',outer:'local_jacket',feet:'boots'},
    relationships:{
      evpapiy:{name:'Євпапій',known:true,values:{trust:2,offense:0,greed:5,bullshit:7},discoveredParams:[]}
    },
    money:0,flags:{mapUnlocked:false,shopUnlocked:false},hazards:{dynamic:{}},audit:[],
    world:{weather:{label:'Хмарно',icon:'☁️',tempC:16,wind:1,rain:0},location:'test-yard',environment:'outdoors'}
  };
}

export function normalizeState(raw){
  const base=createInitialState(Number(raw?.runId||1));
  const s={...base,...clone(raw||{})};

  s.schemaVersion=5;
  s.clock={...base.clock,...(s.clock||{})};
  s.needs={...base.needs,...(s.needs||{})};
  s.stats={...base.stats,...(s.stats||{})};
  s.unlocks={...base.unlocks,...(s.unlocks||{})};
  s.equipment={...base.equipment,...(s.equipment||{})};
  s.flags={...base.flags,...(s.flags||{})};
  s.hazards={...base.hazards,...(s.hazards||{}),dynamic:{...(s.hazards?.dynamic||{})}};
  s.world={...base.world,...(s.world||{}),weather:{...base.world.weather,...(s.world?.weather||{})}};
  s.relationships={...base.relationships,...(s.relationships||{})};
  s.inventory=Array.isArray(s.inventory)?s.inventory:[];
  s.importantItems=Array.isArray(s.importantItems)?s.importantItems:[];
  s.quickSlots=Array.isArray(s.quickSlots)?s.quickSlots.slice(0,3):[null,null,null];
  while(s.quickSlots.length<3)s.quickSlots.push(null);
  s.activeStatuses=Array.isArray(s.activeStatuses)?s.activeStatuses:[];
  s.discoveredStatuses=Array.isArray(s.discoveredStatuses)?s.discoveredStatuses:[];
  s.ownedClothes=Array.isArray(s.ownedClothes)?s.ownedClothes:base.ownedClothes;
  s.audit=Array.isArray(s.audit)?s.audit:[];

  for(const key of STAT_KEYS){
    s.stats[key]={...base.stats[key],...(s.stats[key]||{})};
  }
  for(const [id,relBase] of Object.entries(base.relationships)){
    const rel=s.relationships[id]||relBase;
    s.relationships[id]={
      ...relBase,...rel,
      values:{...relBase.values,...(rel.values||{})},
      discoveredParams:Array.isArray(rel.discoveredParams)?rel.discoveredParams:[]
    };
  }
  return s;
}

export function formatTime(total){
  const day=Math.floor(total/1440)+1,m=total%1440,h=Math.floor(m/60);
  return {day,time:String(h).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
}

export function equipmentTotals(state){
  const out={armor:0,warmth:0,heatBurden:0,rainProtection:0};
  for(const id of Object.values(state.equipment||{})){
    const d=CLOTHES[id];if(!d)continue;
    for(const k of Object.keys(out))out[k]+=Number(d[k]||0);
  }
  return out;
}

export function equip(state,id){
  const d=CLOTHES[id];
  if(!d||!state.ownedClothes.includes(id))return false;
  state.equipment[d.slot]=id;
  return true;
}

export function statModifiers(state){
  const out=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
  for(const id of state.activeStatuses||[]){
    const d=STATUS_DEFS[id];
    if(d?.mods)for(const [k,v] of Object.entries(d.mods))if(k in out)out[k]+=Number(v||0);
  }
  for(const id of Object.values(state.equipment||{})){
    const d=CLOTHES[id];
    if(d?.statMods)for(const [k,v] of Object.entries(d.statMods))if(k in out)out[k]+=Number(v||0);
  }
  return out;
}

export function effectiveStat(state,key){
  const base=Number(state.stats?.[key]?.level||0);
  const mod=Number(statModifiers(state)[key]||0);
  return clamp(base+mod,0,10);
}

export function addStatProgress(state,key,value){
  if(!STAT_KEYS.includes(key))return[];
  const events=[],s=state.stats[key];
  s.progress=Math.max(0,s.progress+value);
  while(s.progress>=10){
    s.progress-=10;s.level++;
    events.push({type:'levelUp',key,level:s.level,visible:false});
  }
  return events;
}

export function addStatus(state,id){
  const d=STATUS_DEFS[id];if(!d)return[];
  const events=[];
  if(!state.activeStatuses.includes(id)){
    state.activeStatuses.push(id);
    events.push({type:'statusAdded',id,visible:false});
  }
  if(!state.discoveredStatuses.includes(id))state.discoveredStatuses.push(id);
  if(d.persistentUnlock)state.unlocks[d.persistentUnlock]=true;
  return events;
}

export function removeStatus(state,id){
  const had=state.activeStatuses.includes(id);
  state.activeStatuses=state.activeStatuses.filter(x=>x!==id);
  return had?[{type:'statusRemoved',id,visible:false}]:[];
}

export function itemCount(state,id){
  return (state.inventory||[]).filter(x=>x.id===id).reduce((n,x)=>n+Number(x.qty||0),0);
}

export function removeItem(state,id,qty=1){
  let left=qty;
  for(let i=(state.inventory||[]).length-1;i>=0&&left>0;i--){
    const slot=state.inventory[i];
    if(slot.id!==id)continue;
    const take=Math.min(left,slot.qty);
    slot.qty-=take;left-=take;
    if(slot.qty<=0)state.inventory.splice(i,1);
  }
  clearInvalidQuickSlots(state);
  return left===0;
}

export function addItem(state,id,qty=1){
  const def=ITEM_DEFS[id];
  if(!def||qty<=0)return false;

  let left=qty;
  for(const slot of state.inventory){
    if(slot.id!==id||slot.qty>=def.stack)continue;
    const room=def.stack-slot.qty;
    const add=Math.min(room,left);
    slot.qty+=add;left-=add;
    if(left<=0)return true;
  }

  while(left>0){
    if(state.inventory.length>=16)return false;
    const add=Math.min(def.stack,left);
    state.inventory.push({id,qty:add});
    left-=add;
  }
  return true;
}

export function clearInvalidQuickSlots(state){
  state.quickSlots=(state.quickSlots||[null,null,null]).map(id=>id&&itemCount(state,id)>0?id:null);
}

export function assignQuickSlot(state,slotIndex,itemId){
  if(slotIndex<0||slotIndex>2)return false;
  if(itemId!==null&&itemCount(state,itemId)<=0)return false;
  state.quickSlots[slotIndex]=itemId;
  return true;
}

export function useItem(state,id){
  const def=ITEM_DEFS[id];
  if(!def||itemCount(state,id)<=0||!Array.isArray(def.useEffects)||def.useEffects.length===0)return {state,used:false,events:[]};

  const result=executeAction(state,{
    id:`use_item_${id}`,
    minutes:0,
    effects:def.useEffects,
    hiddenEffects:[{type:'itemRemove',id,qty:1}]
  });
  clearInvalidQuickSlots(result.state);
  return {...result,used:true};
}

export function thermal(state){
  const w=state.world.weather,eq=equipmentTotals(state);
  const coldRaw=Math.max(0,18-w.tempC+(w.wind||0)*1.4+state.wetness*.075-eq.warmth*3);
  const heatRaw=Math.max(0,w.tempC-24+eq.heatBurden*2);
  const coldLevel=coldRaw>=12?3:coldRaw>=7?2:coldRaw>=3?1:0;
  const heatLevel=heatRaw>=10?3:heatRaw>=6?2:heatRaw>=2?1:0;
  let feel='нормально';
  if(coldLevel===1)feel='прохолодно';
  if(coldLevel===2)feel='холодно';
  if(coldLevel===3)feel='дуже холодно';
  if(heatLevel===1)feel='тепло';
  if(heatLevel===2)feel='жарко';
  if(heatLevel===3)feel='пиздець як жарко';
  return {coldLevel,heatLevel,feel,eq};
}

function syncEnvironmentalHazards(state,damageSources){
  const dynamic=state.hazards.dynamic;
  const set=(id,on,level,reason)=>{
    if(on)dynamic[id]={level,reason,ongoing:true};
    else delete dynamic[id];
  };
  set('dehydration',damageSources.has('dehydration'),'medium','зневоднення');
  set('starvation',damageSources.has('starvation'),'medium','голод');
  set('exhaustion',damageSources.has('exhaustion'),'medium','виснаження');
  set('cold',damageSources.has('cold'),'medium','сильний холод');
  set('heat',damageSources.has('heat'),'medium','перегрів');
}

export function threatInfo(state){
  if(state.health<=15)return{key:'critical',label:'КРИТИЧНА',reason:'критично низьке здоровʼя'};
  if(state.health<=45)return{key:'high',label:'ВИСОКА',reason:'низьке здоровʼя'};

  const hazards=Object.values(state.hazards?.dynamic||{});
  const high=hazards.find(h=>h.level==='high'||h.level==='critical');
  if(high)return{key:'high',label:'ВИСОКА',reason:high.reason};
  const med=hazards.find(h=>h.level==='medium');
  if(med)return{key:'medium',label:'СЕРЕДНЯ',reason:med.reason};

  return{key:'low',label:'НИЗЬКА',reason:'прямої небезпеки нема'};
}

function recordAudit(state,actionId,event){
  state.audit=state.audit||[];
  state.audit.push({
    at:state.clock.totalMinutes,
    actionId:actionId||'unknown',
    type:event.type,
    key:event.key||event.id||event.person||null,
    source:event.source||actionId||null,
    actual:event.actual??event.value??null
  });
  if(state.audit.length>120)state.audit.splice(0,state.audit.length-120);
}

function activeDrainMultiplier(state,key){
  let mult=1;
  for(const id of state.activeStatuses||[]){
    const m=STATUS_DEFS[id]?.drainMultipliers?.[key];
    if(m)mult*=Number(m);
  }
  return mult;
}

function timeCost(state,minutes,activity){
  if(minutes<=0)return{needs:{satiety:0,water:0,energy:0},wetness:0,health:0,damageSources:new Set()};
  const unit=minutes/10,t=thermal(state),eq=t.eq;
  const table={
    light:{satiety:-.35,water:-.7,energy:-.4},
    walk:{satiety:-.5,water:-1.2,energy:-1.2},
    work:{satiety:-1,water:-2,energy:-4},
    rest:{satiety:-.25,water:-.5,energy:6},
    dialogue:{satiety:0,water:0,energy:0}
  };
  const b=table[activity]||table.light;
  const needs={satiety:b.satiety*unit,water:b.water*unit,energy:b.energy*unit};

  needs.water-=t.heatLevel*.7*unit;
  needs.energy-=t.coldLevel*.7*unit;
  needs.satiety-=t.coldLevel*.35*unit;

  for(const key of ['satiety','water','energy']){
    if(needs[key]<0)needs[key]*=activeDrainMultiplier(state,key);
  }

  const wetness=state.world.weather.rain>0
    ?state.world.weather.rain*4*unit*(1-clamp(eq.rainProtection*.16,0,.8))
    :-3*unit;

  let health=0;
  const damageSources=new Set();
  if(state.needs.water<=0){health-=1*unit;damageSources.add('dehydration')}
  if(state.needs.satiety<=0){health-=1*unit;damageSources.add('starvation')}
  if(state.needs.energy<=0){health-=1*unit;damageSources.add('exhaustion')}
  if(t.coldLevel===3){health-=.6*unit;damageSources.add('cold')}
  if(t.heatLevel===3){health-=.6*unit;damageSources.add('heat')}
  return{needs,wetness,health,damageSources};
}

function applyDamage(state,e){
  const raw=Math.max(0,Number(e.amount||0));
  const blocked=(e.damageType||'physical')==='physical'&&!e.ignoreArmor
    ?Math.min(raw,equipmentTotals(state).armor):0;
  const final=Math.max(0,raw-blocked);
  state.health=clamp(state.health-final,0,100);
  return{final,blocked};
}

function applyEffect(state,e,events){
  const visible=e.visible!==false;
  if(e.type==='need'){
    const before=state.needs[e.key];
    state.needs[e.key]=clamp(before+e.value,0,100);
    events.push({...e,actual:state.needs[e.key]-before,visible});
  }else if(e.type==='health'){
    const before=state.health;
    state.health=clamp(before+e.value,0,100);
    events.push({...e,actual:state.health-before,visible});
  }else if(e.type==='damage'){
    const d=applyDamage(state,e);
    events.push({...e,actual:-d.final,blocked:d.blocked,visible});
  }else if(e.type==='stat'){
    events.push({...e,actual:e.value,visible:false},...addStatProgress(state,e.key,e.value));
  }else if(e.type==='statusAdd'){
    events.push(...addStatus(state,e.id));
  }else if(e.type==='statusRemove'){
    events.push(...removeStatus(state,e.id));
  }else if(e.type==='relationship'){
    const rel=state.relationships[e.person];if(!rel)return;
    const before=Number(rel.values[e.key]||0);
    rel.values[e.key]=clamp(before+Number(e.value||0),0,10);
    events.push({...e,actual:rel.values[e.key]-before,visible:false});
  }else if(e.type==='relationshipDiscover'){
    const rel=state.relationships[e.person];
    if(rel&&!rel.discoveredParams.includes(e.key))rel.discoveredParams.push(e.key);
    events.push({...e,visible:false});
  }else if(e.type==='itemAdd'){
    const ok=addItem(state,e.id,Number(e.qty||1));
    events.push({...e,ok,visible:false});
  }else if(e.type==='itemRemove'){
    const ok=removeItem(state,e.id,Number(e.qty||1));
    events.push({...e,ok,visible:false});
  }else if(e.type==='hazard'){
    state.hazards.dynamic[e.id]={level:e.level||'medium',reason:e.reason||'небезпека поруч',ongoing:true};
    events.push({...e,visible:false});
  }else if(e.type==='hazardClear'){
    delete state.hazards.dynamic[e.id];
    events.push({...e,visible:false});
  }else if(e.type==='flag'){
    state.flags[e.key]=e.value;
    events.push({...e,visible:false});
  }
}

function reconcileStatuses(state){
  const t=thermal(state),events=[];
  const set=(id,on)=>events.push(...(on?addStatus(state,id):removeStatus(state,id)));
  set('wet',state.wetness>=40);
  set('cold',t.coldLevel>=2);
  set('overheated',t.heatLevel>=2);
  set('hungry',state.needs.satiety<=20);
  set('tired',state.needs.energy<=20);
  return events;
}

export function executeAction(state,action){
  const next=clone(normalizeState(state)),events=[],minutes=Number(action.minutes||0),actionId=action.id||'unknown';

  if(minutes>0){
    const cost=timeCost(next,minutes,action.activity||'light');
    for(const key of ['satiety','water','energy']){
      const before=next.needs[key];
      next.needs[key]=clamp(before+cost.needs[key],0,100);
      const actual=next.needs[key]-before;
      if(actual)events.push({type:'need',key,actual,visible:true,source:actionId});
    }

    const wetBefore=next.wetness;
    next.wetness=clamp(wetBefore+cost.wetness,0,100);
    if(next.wetness!==wetBefore)events.push({type:'wetness',actual:next.wetness-wetBefore,visible:false,source:'weather'});

    const healthBefore=next.health;
    next.health=clamp(healthBefore+cost.health,0,100);
    if(next.health!==healthBefore)events.push({type:'health',actual:next.health-healthBefore,visible:true,source:'survival'});

    syncEnvironmentalHazards(next,cost.damageSources);
    next.clock.totalMinutes+=minutes;
  }

  for(const e of action.effects||[])applyEffect(next,{...e,source:e.source||actionId},events);
  for(const e of action.hiddenEffects||[])applyEffect(next,{...e,visible:false,source:e.source||actionId},events);

  events.push(...reconcileStatuses(next));
  next.updatedAt=Date.now();
  for(const e of events)recordAudit(next,actionId,e);
  clearInvalidQuickSlots(next);
  return{state:next,events};
}

export function previewAction(state,action){
  const next=executeAction(state,action).state;
  const parts=[];
  if(action.minutes>0)parts.push(action.minutes+' хв');

  const before={
    energy:Math.round(state.needs.energy),
    water:Math.round(state.needs.water),
    satiety:Math.round(state.needs.satiety),
    health:Math.round(state.health)
  };
  const after={
    energy:Math.round(next.needs.energy),
    water:Math.round(next.needs.water),
    satiety:Math.round(next.needs.satiety),
    health:Math.round(next.health)
  };

  const labels={energy:'Бадьорість',water:'Вода',satiety:'Ситість',health:'Здоровʼя'};
  for(const key of ['energy','water','satiety','health']){
    const d=after[key]-before[key];
    if(d!==0)parts.push(`${labels[key]} ${d>0?'+':''}${d}%`);
  }
  return parts;
}
