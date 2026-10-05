import {STAT_KEYS} from './config.js?v=093';
import {STATUS_DEFS,CLOTHES,ITEM_DEFS} from './data.js?v=093';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const clone=x=>JSON.parse(JSON.stringify(x));

function defaultStats(){return {strength:{level:2},attention:{level:2},agility:{level:2},charisma:{level:2},pofigism:{level:2},ahui:{level:1}}}
const DEFAULT_STAT_LEVELS={strength:2,attention:2,agility:2,charisma:2,pofigism:2,ahui:1};
function defaultHeroProgression(){return {level:1,xp:0,xpToNext:100,points:0}}
function defaultEvpProgression(){return {level:1,xp:0,xpToNext:100,points:0,attack:1,aggression:1,health:1}}
export function createInitialState(runId=1){return {
 schemaVersion:11,runId,createdAt:Date.now(),updatedAt:Date.now(),lastAutosaveAt:null,
 chapter:1,scene:'intro',story:{chapter:1,sceneId:'intro',entered:[],finished:false},clock:{totalMinutes:400},
 health:100,needs:{satiety:75,water:42,energy:65},wetness:0,stats:defaultStats(),heroProgression:defaultHeroProgression(),
 activeStatuses:['hangover'],discoveredStatuses:['hangover'],statusTimers:{},unlocks:{yebatorium:false,sunsetContempt:false},
 inventory:[{id:'vodka',qty:1},{id:'knife',qty:1},{id:'salo',qty:1}],importantItems:[],quickSlots:[null,null,null],
 ownedClothes:['modern_shirt','modern_jacket','modern_pants','modern_boots'],
 equipment:{body:'modern_shirt',outer:'modern_jacket',legs:'modern_pants',feet:'modern_boots'},
 companions:{evpapiy:{name:'Євпапій',known:false,active:false,portrait:'./pigeon_base.png',state:'Не з вами',facts:[],level:1,hp:50,maxHp:50,skipBattles:0,offended:false,progression:defaultEvpProgression()}},
 relationships:{evpapiy:{name:'Євпапій',known:false,values:{trust:2,offense:4,greed:8,bullshit:6},discoveredParams:[]},galina:{name:'Баба Галя',known:false,values:{trust:5,offense:0},discoveredParams:[]},creature:{name:'Створіння',known:false,values:{attitude:0},discoveredParams:[]}},
 memories:{evpapiy:{},galina:{}},money:0,
 flags:{mapUnlocked:false,shopUnlocked:false,metPigeon:false,knowsPigeonName:false,doneWhere:false,donePuddle:false,doneWhy:false,watchGalina:false,localClothes:false,modernJacketPooped:false,initialStatusPopupShown:false,sweptYard:false,choppedWood:false,suspiciousDeal:false,evpapiySaloGivenCount:0,evpapiyEnemyConflictCount:0,scaredMigration091:false},
 hazards:{dynamic:{}},audit:[],world:{weather:{label:'Хмарно',icon:'☁️',tempC:16,wind:1,rain:0},location:'біля сільської хатини',environment:'outdoors'}
}}
export function normalizeState(raw){
 const legacySchema=Number(raw?.schemaVersion||0);
 const base=createInitialState(Number(raw?.runId||1)),s={...base,...clone(raw||{})};s.schemaVersion=11;
 s.clock={...base.clock,...(s.clock||{})};s.needs={...base.needs,...(s.needs||{})};s.unlocks={...base.unlocks,...(s.unlocks||{})};s.flags={...base.flags,...(s.flags||{})};s.equipment={...base.equipment,...(s.equipment||{})};
 s.story={...base.story,...(s.story||{})};s.story.entered=Array.isArray(s.story.entered)?s.story.entered:[];s.scene=s.story.sceneId||s.scene||'intro';
 // Міграція з v0.7.1: фінальний екран першої глави тепер є стартом другої.
 if(s.scene==='chapter1Outro'||s.scene==='chapter1End')s.scene='ch2_intro';
 s.story.sceneId=s.scene;
 const sceneId=String(s.scene||'');
 const detectedChapter=sceneId.startsWith('ch3_')?3:sceneId.startsWith('ch2_')?2:Number(s.story.chapter||s.chapter||1);
 s.chapter=detectedChapter>=3?3:detectedChapter>=2?2:1;s.story.chapter=s.chapter;
 const old=s.stats||{};s.stats=defaultStats();
 for(const k of STAT_KEYS){
   const v=old[k];
   if(legacySchema<11){
     let scalar=DEFAULT_STAT_LEVELS[k];
     if(v&&typeof v==='object'&&('level' in v||'progress' in v))scalar=Math.max(1,(Math.max(1,Number(v.level||1))-1)*10+Number(v.progress??v.base??0));
     else if(v&&typeof v==='object'&&('base' in v))scalar=Math.max(1,Number(v.base||1));
     else if(Number.isFinite(Number(v)))scalar=Math.max(1,Number(v));
     s.stats[k]={level:clamp(Math.round(scalar),1,10)};
   }else if(v&&typeof v==='object')s.stats[k]={level:clamp(Math.floor(Number(v.level||DEFAULT_STAT_LEVELS[k])),1,10)};
 }
 const migratedSpent=STAT_KEYS.reduce((n,k)=>n+Math.max(0,Number(s.stats[k]?.level||1)-Number(DEFAULT_STAT_LEVELS[k]||1)),0);
 s.heroProgression={...defaultHeroProgression(),...(s.heroProgression||{})};
 s.heroProgression.level=Math.max(1,Math.floor(Number(s.heroProgression.level||1)));
 if(legacySchema<11)s.heroProgression.level=Math.max(s.heroProgression.level,1+migratedSpent);
 s.heroProgression.xp=clamp(Math.floor(Number(s.heroProgression.xp||0)),0,99);
 s.heroProgression.xpToNext=100;
 s.heroProgression.points=Math.max(0,Math.floor(Number(s.heroProgression.points||0)));
 s.activeStatuses=Array.isArray(s.activeStatuses)?s.activeStatuses:[];s.discoveredStatuses=Array.isArray(s.discoveredStatuses)?s.discoveredStatuses:[];s.statusTimers={...(s.statusTimers||{})};s.inventory=Array.isArray(s.inventory)?s.inventory:[];s.quickSlots=Array.isArray(s.quickSlots)?s.quickSlots.slice(0,3):[null,null,null];while(s.quickSlots.length<3)s.quickSlots.push(null);
 const entered=new Set(s.story.entered||[]);
 const inferredSalo=(entered.has('wellSalo')?1:0)+(entered.has('ch2_salo')?1:0);
 s.flags.evpapiySaloGivenCount=Math.max(Number(s.flags.evpapiySaloGivenCount||0),inferredSalo);
 s.flags.evpapiyEnemyConflictCount=Math.max(Number(s.flags.evpapiyEnemyConflictCount||0),s.flags.evpapiyEnemyConflict?1:0);
 if(s.flags.evpapiySaloGivenCount>=2&&s.flags.evpapiyEnemyConflictCount>=1)s.unlocks.sunsetContempt=true;
 const earlyCh3=new Set(['ch3_intro','ch3_obey','ch3_turn','ch3_call_pigeon','ch3_tell_off','ch3_creature','ch3_vodka','ch3_garlic','ch3_garlic_hit','ch3_ask_pigeon','ch3_run','ch3_pray']);
 if(earlyCh3.has(sceneId)&&s.activeStatuses.includes('scared'))s.flags.scaredMigration091=true;
 if(earlyCh3.has(sceneId)&&!s.flags.scaredMigration091&&!s.activeStatuses.includes('scared')){
   s.activeStatuses.push('scared');
   if(!s.discoveredStatuses.includes('scared'))s.discoveredStatuses.push('scared');
   s.statusTimers.scared=s.clock.totalMinutes+20;
   s.flags.scaredMigration091=true;
 }
 const aliases={local_boots:'boots',local_waistcoat:'local_vest',modern_coat:'modern_jacket'};
 const modernSet=['modern_shirt','modern_jacket','modern_pants','modern_boots'];
 const localSet=['local_shirt','local_vest','local_pants','boots'];
 const localMilestones=new Set(['galinaChanged','galinaMurderScene','galinaVictim','galinaCalm','galinaGarlic','galinaPotion','galinaHolyWater','chapter1Outro','chapter1End']);
 const reachedLocalClothes=/^ch[23]_/.test(String(s.scene||''))||localMilestones.has(s.scene)||(s.story.entered||[]).some(id=>localMilestones.has(id));
 s.flags.localClothes=Boolean(reachedLocalClothes);
 const allowed=new Set(reachedLocalClothes?[...modernSet,...localSet]:modernSet);
 const migrated=(Array.isArray(s.ownedClothes)?s.ownedClothes:base.ownedClothes).map(id=>aliases[id]||id).filter(id=>CLOTHES[id]&&allowed.has(id));
 s.ownedClothes=[...new Set(migrated)];
 for(const id of modernSet)if(CLOTHES[id]&&!s.ownedClothes.includes(id))s.ownedClothes.push(id);
 if(reachedLocalClothes)for(const id of localSet)if(CLOTHES[id]&&!s.ownedClothes.includes(id))s.ownedClothes.push(id);
 const defaults=reachedLocalClothes?{body:'local_shirt',outer:'local_vest',legs:'local_pants',feet:'boots'}:base.equipment;
 for(const slot of ['body','outer','legs','feet']){
   const mapped=aliases[s.equipment?.[slot]]||s.equipment?.[slot];
   s.equipment[slot]=(mapped&&allowed.has(mapped)&&CLOTHES[mapped])?mapped:defaults[slot];
 }
 s.companions={...base.companions,...(s.companions||{})};
 const oldEvp=s.companions.evpapiy||{};s.companions.evpapiy={...base.companions.evpapiy,...oldEvp};
 s.companions.evpapiy.progression={...defaultEvpProgression(),...(s.companions.evpapiy.progression||{})};
 const ep=s.companions.evpapiy.progression;
 ep.level=Math.max(1,Math.floor(Number(ep.level||s.companions.evpapiy.level||1)));ep.xp=clamp(Math.floor(Number(ep.xp||0)),0,99);ep.xpToNext=100;ep.points=Math.max(0,Math.floor(Number(ep.points||0)));ep.attack=clamp(Math.floor(Number(ep.attack||1)),1,10);ep.aggression=clamp(Math.floor(Number(ep.aggression||1)),1,10);ep.health=clamp(Math.floor(Number(ep.health||1)),1,10);
 s.companions.evpapiy.level=ep.level;
 s.companions.evpapiy.maxHp=50+(ep.level-1)*10+(ep.health-1)*10;
 s.companions.evpapiy.hp=clamp(Number(s.companions.evpapiy.hp??s.companions.evpapiy.maxHp),0,s.companions.evpapiy.maxHp);
 s.companions.evpapiy.skipBattles=Math.max(0,Math.floor(Number(s.companions.evpapiy.skipBattles||0)));
 s.companions.evpapiy.offended=Boolean(s.companions.evpapiy.offended);
 if(entered.has('wellSalo')&&!s.flags.evpXpWellSalo092){addEvpXp(s,20);s.flags.evpXpWellSalo092=true}
 if(entered.has('ch2_salo')&&!s.flags.evpXpCh2Salo092){addEvpXp(s,20);s.flags.evpXpCh2Salo092=true}
 s.relationships={...base.relationships,...(s.relationships||{})};
 for(const id of Object.keys(base.relationships))s.relationships[id]={...base.relationships[id],...(s.relationships[id]||{}),values:{...base.relationships[id].values,...(s.relationships[id]?.values||{})},discoveredParams:Array.isArray(s.relationships[id]?.discoveredParams)?s.relationships[id].discoveredParams:[]};
 s.memories={...base.memories,...(s.memories||{})};s.hazards={...base.hazards,...(s.hazards||{}),dynamic:{...(s.hazards?.dynamic||{})}};s.world={...base.world,...(s.world||{}),weather:{...base.world.weather,...(s.world?.weather||{})}};
 clearInvalidQuickSlots(s);return s
}
export function formatTime(total){const day=Math.floor(total/1440)+1,m=((total%1440)+1440)%1440,h=Math.floor(m/60);return{day,time:String(h).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}}
export function equipmentTotals(state){const out={armor:0,warmth:0,heatBurden:0,rainProtection:0};for(const id of Object.values(state.equipment||{})){const d=CLOTHES[id];if(d)for(const k of Object.keys(out))out[k]+=Number(d[k]||0)}return out}
export function equip(state,id){const d=CLOTHES[id];if(!d||!state.ownedClothes.includes(id))return false;state.equipment[d.slot]=id;if(d.slot==='outer'&&state.flags?.modernJacketPooped){if(id==='modern_jacket')addStatus(state,'pigeonHumiliated');else removeStatus(state,'pigeonHumiliated')}return true}
function statusMods(state){const out=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));for(const id of state.activeStatuses||[]){const d=STATUS_DEFS[id];if(d?.mods)for(const [k,v] of Object.entries(d.mods))if(k in out)out[k]+=Number(v||0)}const shield=(state.activeStatuses||[]).reduce((n,id)=>Math.max(n,Number(STATUS_DEFS[id]?.negativeModShield||0)),0);if(shield>0)for(const k of STAT_KEYS)if(out[k]<0)out[k]=Math.min(0,out[k]+shield);return out}
export function statModifiers(state){const out=statusMods(state);for(const id of Object.values(state.equipment||{})){const d=CLOTHES[id];if(d?.statMods)for(const [k,v] of Object.entries(d.statMods))if(k in out)out[k]+=Number(v||0)}return out}
export function permanentStat(state,key){return Math.max(1,Number(state.stats?.[key]?.level||DEFAULT_STAT_LEVELS[key]||1))}
export function effectiveStat(state,key){return Math.max(0,permanentStat(state,key)+Number(statModifiers(state)[key]||0))}
export function addHeroXp(state,amount=0){
  const p=state.heroProgression||(state.heroProgression=defaultHeroProgression()),events=[];let add=Math.max(0,Math.round(Number(amount||0)));if(!add)return events;
  p.xp+=add;events.push({type:'heroXp',actual:add,visible:true});
  while(p.xp>=100){p.xp-=100;p.level+=1;p.points+=1;events.push({type:'heroLevelUp',level:p.level,points:p.points,visible:true})}
  p.xpToNext=100;return events
}
export function spendHeroPoint(state,key){if(!STAT_KEYS.includes(key))return false;const p=state.heroProgression||(state.heroProgression=defaultHeroProgression());if(p.points<=0)return false;const st=state.stats[key]||(state.stats[key]={level:DEFAULT_STAT_LEVELS[key]||1});if(Number(st.level||1)>=10)return false;p.points-=1;st.level=Number(st.level||1)+1;return true}
export function addEvpXp(state,amount=0){const c=state.companions?.evpapiy;if(!c)return[];c.progression={...defaultEvpProgression(),...(c.progression||{})};const p=c.progression,events=[];let add=Math.max(0,Math.round(Number(amount||0)));if(!add)return events;p.xp+=add;events.push({type:'evpXp',actual:add,visible:false});while(p.xp>=100){p.xp-=100;p.level+=1;p.points+=1;events.push({type:'evpLevelUp',level:p.level,points:p.points,visible:true})}c.level=p.level;const oldMax=Number(c.maxHp||50+(p.level-1)*10+(p.health-1)*10);c.maxHp=50+(p.level-1)*10+(p.health-1)*10;c.hp=clamp(Number(c.hp??oldMax)+(c.maxHp-oldMax),0,c.maxHp);return events}
export function spendEvpPoint(state,key){const c=state.companions?.evpapiy;if(!c)return false;c.progression={...defaultEvpProgression(),...(c.progression||{})};const p=c.progression;if(p.points<=0||!['attack','aggression','health'].includes(key)||Number(p[key]||1)>=10)return false;const oldMax=50+(Number(p.level||1)-1)*10+(Number(p.health||1)-1)*10;p.points-=1;p[key]=Number(p[key]||1)+1;if(key==='health'){const newMax=50+(Number(p.level||1)-1)*10+(p.health-1)*10;c.hp=clamp(Number(c.hp||oldMax)+(newMax-oldMax),0,newMax);c.maxHp=newMax}c.level=p.level;return true}
export function addStat(state,key,value){if(!STAT_KEYS.includes(key))return[];return addHeroXp(state,Math.max(0,Number(value||0))*10)}
export function addStatus(state,id){const d=STATUS_DEFS[id];if(!d)return[];const events=[];if(!state.activeStatuses.includes(id)){state.activeStatuses.push(id);events.push({type:'statusAdded',id,visible:false})}if(!state.discoveredStatuses.includes(id))state.discoveredStatuses.push(id);if(Number(d.durationMinutes)>0)state.statusTimers[id]=state.clock.totalMinutes+Number(d.durationMinutes);if(d.persistentUnlock)state.unlocks[d.persistentUnlock]=true;return events}
export function removeStatus(state,id){const had=state.activeStatuses.includes(id);state.activeStatuses=state.activeStatuses.filter(x=>x!==id);delete state.statusTimers[id];return had?[{type:'statusRemoved',id,visible:false}]:[]}
function expireTimedStatuses(state){const e=[];for(const [id,until] of Object.entries(state.statusTimers||{}))if(state.clock.totalMinutes>=Number(until))e.push(...removeStatus(state,id));return e}
export function itemCount(state,id){return(state.inventory||[]).filter(x=>x.id===id).reduce((n,x)=>n+Number(x.qty||0),0)}
export function removeItem(state,id,qty=1){let left=qty;for(let i=state.inventory.length-1;i>=0&&left>0;i--){const s=state.inventory[i];if(s.id!==id)continue;const take=Math.min(left,s.qty);s.qty-=take;left-=take;if(s.qty<=0)state.inventory.splice(i,1)}clearInvalidQuickSlots(state);return left===0}
export function addItem(state,id,qty=1){const d=ITEM_DEFS[id];if(!d||qty<=0)return false;let left=qty;for(const s of state.inventory){if(s.id!==id||s.qty>=d.stack)continue;const add=Math.min(d.stack-s.qty,left);s.qty+=add;left-=add;if(left<=0)return true}while(left>0){if(state.inventory.length>=16)return false;const add=Math.min(d.stack,left);state.inventory.push({id,qty:add});left-=add}return true}
export function clearInvalidQuickSlots(state){state.quickSlots=(state.quickSlots||[null,null,null]).map(id=>id&&itemCount(state,id)>0?id:null)}
export function assignQuickSlot(state,i,id){if(i<0||i>2)return false;if(id!==null&&itemCount(state,id)<=0)return false;state.quickSlots[i]=id;return true}
export function useItem(state,id){const d=ITEM_DEFS[id];if(!d||itemCount(state,id)<=0||!d.useEffects?.length)return{state,used:false,events:[]};const r=executeAction(state,{id:`use_${id}`,effects:d.useEffects,hiddenEffects:[{type:'itemRemove',id,qty:1}]});return{...r,used:true}}
export function thermal(state){const w=state.world.weather,eq=equipmentTotals(state);const outdoor=!['indoors','barn'].includes(state.world.environment);const coldRaw=Math.max(0,18-w.tempC+(w.wind||0)*1.4+(outdoor?state.wetness*.075:0)-eq.warmth*3);const heatRaw=Math.max(0,w.tempC-24+eq.heatBurden*2);const coldLevel=coldRaw>=12?3:coldRaw>=7?2:coldRaw>=3?1:0,heatLevel=heatRaw>=10?3:heatRaw>=6?2:heatRaw>=2?1:0;let feel='нормально';if(coldLevel===1)feel='прохолодно';if(coldLevel===2)feel='холодно';if(coldLevel===3)feel='дуже холодно';if(heatLevel===1)feel='тепло';if(heatLevel===2)feel='жарко';if(heatLevel===3)feel='пиздець як жарко';return{coldLevel,heatLevel,feel,eq}}

export function threatInfo(state){
  if(state.health<=15)return{key:'critical',label:'КРИТИЧНА',reason:'критично низьке здоровʼя'};
  if(state.health<=45)return{key:'high',label:'ВИСОКА',reason:'низьке здоровʼя'};
  if(state.needs.water<=10||state.needs.satiety<=10||state.needs.energy<=10)return{key:'medium',label:'СЕРЕДНЯ',reason:'організм уже нормально так просить допомоги'};
  const t=thermal(state);if(t.coldLevel>=3)return{key:'medium',label:'СЕРЕДНЯ',reason:'сильний холод'};if(t.heatLevel>=3)return{key:'medium',label:'СЕРЕДНЯ',reason:'перегрів'};
  return{key:'low',label:'НИЗЬКА',reason:'прямої небезпеки нема'};
}

function timeCost(state,minutes,activity){if(minutes<=0)return{needs:{satiety:0,water:0,energy:0},wetness:0,health:0};const u=minutes/10,t=thermal(state),eq=t.eq;const table={
  light:{satiety:-.35,water:-.7,energy:-.4},
  walk:{satiety:-.5,water:-1.2,energy:-1.2},
  work:{satiety:-1,water:-2,energy:-4},
  rest:{satiety:-.25,water:-.5,energy:6},
  sleep_house:{satiety:-.25,water:-.4,energy:1.6},
  sleep_barn:{satiety:-.28,water:-.45,energy:1.4},
  sleep_outdoors:{satiety:-.32,water:-.55,energy:1.15},
  dialogue:{satiety:0,water:0,energy:0}
};const b=table[activity]||table.light,needs={satiety:b.satiety*u,water:b.water*u,energy:b.energy*u};if(t.heatLevel){needs.water-=t.heatLevel*.7*u}if(t.coldLevel){needs.energy-=t.coldLevel*.7*u;needs.satiety-=t.coldLevel*.35*u}for(const id of state.activeStatuses||[]){const d=STATUS_DEFS[id];for(const k of ['satiety','water','energy'])if(needs[k]<0&&d?.drainMultipliers?.[k])needs[k]*=Number(d.drainMultipliers[k])}const outdoors=!['indoors','barn'].includes(state.world.environment);const wetness=outdoors&&state.world.weather.rain>0?state.world.weather.rain*4*u*(1-clamp(eq.rainProtection*.16,0,.8)):(outdoors?-2*u:-8*u);let health=0;if(state.needs.water<=0)health-=1*u;if(state.needs.satiety<=0)health-=1*u;if(state.needs.energy<=0)health-=1*u;if(t.coldLevel===3)health-=.6*u;if(t.heatLevel===3)health-=.6*u;return{needs,wetness,health}}
function applyEffect(s,e,events){if(e.type==='need'){const b=s.needs[e.key];s.needs[e.key]=clamp(b+Number(e.value||0),0,100);events.push({...e,actual:s.needs[e.key]-b,visible:e.visible!==false})}else if(e.type==='health'){const b=s.health;s.health=clamp(b+Number(e.value||0),0,100);events.push({...e,actual:s.health-b,visible:e.visible!==false})}else if(e.type==='damage'){const armor=e.ignoreArmor?0:equipmentTotals(s).armor,final=Math.max(0,Number(e.amount||0)-armor),b=s.health;s.health=clamp(b-final,0,100);events.push({...e,actual:s.health-b,visible:e.visible!==false})}else if(e.type==='stat'){const xs=addStat(s,e.key,e.value);if(e.visible===false)for(const x of xs)x.visible=false;events.push(...xs)}else if(e.type==='heroXp'){const xs=addHeroXp(s,e.value);if(e.visible===false)for(const x of xs)x.visible=false;events.push(...xs)}else if(e.type==='evpXp'){const xs=addEvpXp(s,e.value);if(e.visible===false)for(const x of xs)x.visible=false;events.push(...xs)}else if(e.type==='money'){const b=Number(s.money||0);s.money=Math.max(0,b+Number(e.value||0));events.push({...e,actual:s.money-b,visible:e.visible!==false})}else if(e.type==='statusAdd')events.push(...addStatus(s,e.id));else if(e.type==='statusRemove')events.push(...removeStatus(s,e.id));else if(e.type==='itemAdd')events.push({...e,ok:addItem(s,e.id,Number(e.qty||1)),visible:false});else if(e.type==='itemRemove')events.push({...e,ok:removeItem(s,e.id,Number(e.qty||1)),visible:false});else if(e.type==='flag'){s.flags[e.key]=e.value;events.push({...e,visible:false})}else if(e.type==='unlock'){s.unlocks[e.key]=e.value!==false;events.push({...e,visible:false})}else if(e.type==='relationshipKnown'){if(s.relationships[e.person])s.relationships[e.person].known=e.value!==false}else if(e.type==='relationship'){const r=s.relationships[e.person];if(r)r.values[e.key]=clamp(Number(r.values[e.key]||0)+Number(e.value||0),0,10)}else if(e.type==='relationshipDiscover'){const r=s.relationships[e.person];if(r&&!r.discoveredParams.includes(e.key))r.discoveredParams.push(e.key)}else if(e.type==='memory'){s.memories[e.person]=s.memories[e.person]||{};s.memories[e.person][e.key]=e.value===undefined?true:e.value}else if(e.type==='companion'){const c=s.companions[e.person];if(c){if(e.known!==undefined)c.known=!!e.known;if(e.active!==undefined)c.active=!!e.active;if(e.name)c.name=e.name;if(e.state!==undefined)c.state=e.state}}else if(e.type==='companionFact'){const c=s.companions[e.person];if(c&&!c.facts.includes(e.text))c.facts.push(e.text)}else if(e.type==='clothesAdd'){if(CLOTHES[e.id]&&!s.ownedClothes.includes(e.id))s.ownedClothes.push(e.id);if(e.equip&&CLOTHES[e.id])s.equipment[CLOTHES[e.id].slot]=e.id}else if(e.type==='equip')equip(s,e.id);else if(e.type==='world'){if(e.key==='weather'&&typeof e.value==='object')s.world.weather={...s.world.weather,...e.value};else s.world[e.key]=e.value}}
function reconcileStatuses(s){const ev=[],t=thermal(s),set=(id,on)=>ev.push(...(on?addStatus(s,id):removeStatus(s,id)));set('wet',s.wetness>=40);set('cold',t.coldLevel>=2);set('overheated',t.heatLevel>=2);set('hungry',s.needs.satiety<=40);set('thirsty',s.needs.water<=40);set('tired',s.needs.energy<=40);return ev}
export function executeAction(state,action){const s=clone(normalizeState(state)),events=[],minutes=Number(action.minutes||0);if(minutes>0){const c=timeCost(s,minutes,action.activity||'light');for(const k of ['satiety','water','energy']){const b=s.needs[k];s.needs[k]=clamp(b+c.needs[k],0,100);if(s.needs[k]!==b)events.push({type:'need',key:k,actual:s.needs[k]-b,visible:true})}s.wetness=clamp(s.wetness+c.wetness,0,100);s.health=clamp(s.health+c.health,0,100);s.clock.totalMinutes+=minutes;events.push(...expireTimedStatuses(s))}for(const e of action.effects||[])applyEffect(s,e,events);for(const e of action.hiddenEffects||[])applyEffect(s,{...e,visible:false},events);events.push(...reconcileStatuses(s));s.updatedAt=Date.now();clearInvalidQuickSlots(s);return{state:s,events}}
export function previewAction(state,action){const n=executeAction(state,action).state,parts=[];if(action.minutes>0)parts.push(action.minutes+' хв');const labels={energy:'Бадьорість',water:'Вода',satiety:'Ситість',health:'Здоровʼя'};for(const k of Object.keys(labels)){const a=Math.round(k==='health'?state.health:state.needs[k]),b=Math.round(k==='health'?n.health:n.needs[k]),d=b-a;if(d)parts.push(`${labels[k]} ${d>0?'+':''}${d}%`)}return parts}
