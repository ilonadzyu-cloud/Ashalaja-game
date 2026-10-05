// v0.9.5j – combat + story branches + first-battle help + pre-battle modifiers.
import {createInitialState,normalizeState,effectiveStat,equipmentTotals,itemCount,removeItem,clone,addHeroXp,addEvpXp,executeAction} from './engine.js?v=093';
import {STATUS_DEFS,ITEM_DEFS} from './data.js?v=093';
import {loadRun} from './storage.js?v=093';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

let sourceState=null;
let battle=null;
let overlay=null;
let settingsObserver=null;
let phaseTimer=null;
let storyResolver=null;
let storyOptions=null;
let battleKind='test';

const evpSession={level:1,maxHp:50,hp:50,skipBattles:0,offended:false};

const INTENTS={
  lunge:{id:'lunge',target:'hero',hint:'Воно пригнулось і подалось уперед. Зараз рвоне прямо на вас.',hit:.88,min:14,max:18,dodgePower:.86},
  grab:{id:'grab',target:'hero',hint:'Воно тягне до вас обидві руки. Походу хоче схопити.',hit:.80,min:11,max:15,dodgePower:.78},
  heavy:{id:'heavy',target:'hero',hint:'Воно повільно заносить руки над головою. Якщо це прилетить – буде боляче.',hit:.66,min:22,max:28,dodgePower:.84},
  sweep:{id:'sweep',target:'hero',hint:'Воно розводить руки в сторони. Зараз махне всім, чим має.',hit:.82,min:13,max:17,dodgePower:.46},
  pigeon:{id:'pigeon',target:'pigeon',hint:'Воно зиркає на Євпапія. Євпапію це явно не подобається.',hit:.80,min:12,max:17,dodgePower:0}
};

const THROWABLES={
  onion:{id:'onion',name:'ДИВНА ЦИБУЛЯ',icon:'🧅'},
  onionAngry:{id:'onion_angry',name:'ЗЛА ЦИБУЛЯ',icon:'🧅'},
  onionSmelly:{id:'onion_smelly',name:'ВОНЮЧА ЦИБУЛЯ',icon:'🧅'},
  garlic:{id:'garlic',name:'ЧАСНИК',icon:'🧄'}
};

const CREATURE_ART_095F={
  normal:'./creature_normal_095f.webp',attack:'./creature_attack_095f.webp',
  hit:'./creature_hit_095f.webp',garlic:'./creature_garlic_battle_095f.webp',smelly:'./creature_smelly_095f.webp'
};
function setCreatureReaction(kind,ms=620){
  if(battleKind!=='story'||!String(battle?.storyId||'').startsWith('shedCreature'))return;
  battle.enemyReaction=kind;battle.enemyReactionUntil=Date.now()+ms;
}
function reactionPending(){return Boolean(battle?.enemyReaction&&Number(battle.enemyReactionUntil||0)>Date.now())}
function clearCreatureReaction(){if(!battle)return;battle.enemyReaction=null;battle.enemyReactionUntil=0}

function ensureBattleCss(){
  if(!document.querySelector('link[data-battle-css="095"]')){
    document.querySelector('link[data-battle-css]')?.remove();
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='./battle.css?v=095';link.dataset.battleCss='095';document.head.appendChild(link);
  }
  if(!document.querySelector('#battleLayout095q')){
    const st=document.createElement('style');st.id='battleLayout095q';st.textContent=`
      @media(max-width:760px){
        .battle-overlay{display:block!important;overflow:hidden!important;padding:0!important}
        .battle-overlay.hidden{display:none!important}
        .battle-shell{display:block!important;width:100%!important;height:100dvh!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;touch-action:pan-y!important}
        .battle-head{position:sticky!important;top:0!important;z-index:40!important}
        .battle-arena{height:500px!important;min-height:500px!important;overflow:hidden!important}
        .battle-before,.battle-statuses,[data-battle-throwables],.battle-log,[data-battle-controls]{position:relative!important;z-index:2!important;flex:none!important}
        .battle-before{padding:8px 10px!important;margin:0!important;border-bottom:1px solid #27362c!important;background:#0c140f!important}
        .battle-log{min-height:72px!important}
        .battle-actions{padding-bottom:calc(14px + env(safe-area-inset-bottom))!important}
      }
    `;document.head.appendChild(st);
  }
}

function currentRunId(){const meta=document.querySelector('#menuMeta')?.textContent||'';const m=meta.match(/Проходження\s+(\d+)/i);return Math.max(1,Number(m?.[1]||1))}
async function readCurrentState(runId){try{const raw=await loadRun(runId);return normalizeState(raw||createInitialState(runId))}catch{return normalizeState(createInitialState(runId))}}
function statusSet(){return new Set(sourceState?.activeStatuses||[])}
function hasStatus(id){return statusSet().has(id)}
function heroStat(key){return effectiveStat(sourceState,key)}
function armor(){return Number(equipmentTotals(sourceState).armor||0)}

function syncEvpapiySession(){
  const saved=sourceState?.companions?.evpapiy||{},prog=saved.progression||{};
  const level=Math.max(1,Number(prog.level||saved.level||1));
  const maxHp=Math.max(50,Number(saved.maxHp||50+(Math.max(1,Number(prog.health||1))-1)*10));
  if(battleKind==='story'){
    evpSession.level=level;evpSession.maxHp=maxHp;
    evpSession.hp=clamp(Number(saved.hp??maxHp),0,maxHp);
    evpSession.skipBattles=Math.max(0,Number(saved.skipBattles||0));
    evpSession.offended=Boolean(saved.offended);
    return;
  }
  if(evpSession.level!==level){
    const ratio=evpSession.maxHp>0?evpSession.hp/evpSession.maxHp:1;
    evpSession.level=level;evpSession.maxHp=maxHp;evpSession.hp=clamp(Math.round(maxHp*ratio),1,maxHp);
  }else{evpSession.level=level;evpSession.maxHp=maxHp;evpSession.hp=clamp(evpSession.hp,1,maxHp)}
}

function energyCost(base){let extra=0;if(hasStatus('tired'))extra+=2;if(Number(sourceState?.needs?.water||100)<=20)extra+=1;return Math.max(0,base+extra)}
function randomIntent(b){if(b?.pigeon?.available&&Math.random()<.14)return{...INTENTS.pigeon};const pool=[INTENTS.lunge,INTENTS.grab,INTENTS.heavy,INTENTS.sweep];return{...pool[Math.floor(Math.random()*pool.length)]}}

function initialItems(){
  if(battleKind==='test')return{onion:2,onionAngry:1,onionSmelly:1,garlic:1,medkit:2,salo:1};
  return{
    onion:itemCount(sourceState,'onion'),
    onionAngry:itemCount(sourceState,'onion_angry'),
    onionSmelly:itemCount(sourceState,'onion_smelly'),
    garlic:itemCount(sourceState,'garlic'),
    medkit:itemCount(sourceState,'medkit'),
    salo:itemCount(sourceState,'salo')
  };
}

function freshBattle(){
  syncEvpapiySession();
  const hp=clamp(Math.round(Number(sourceState?.health||100)),1,100);
  const energy=clamp(Math.round(Number(sourceState?.needs?.energy||65)),0,100);
  let pigeonAvailable=true,recovering=false;
  if(evpSession.skipBattles>0){pigeonAvailable=false;recovering=true;evpSession.skipBattles-=1;evpSession.hp=evpSession.maxHp}
  const b={
    heroMax:100,heroHp:hp,heroEnergy:energy,heroLevel:Math.max(1,Number(sourceState?.heroProgression?.level||1)),
    enemyName:storyOptions?.enemyName||'ТЕСТОВА ХУЙНЯ',enemyMax:Number(storyOptions?.enemyMax||100),enemyHp:Number(storyOptions?.enemyHp||100),
    enemyArt:storyOptions?.enemyArt||null,enemyAttackArt:storyOptions?.enemyAttackArt||null,enemyWasHit:false,
    storyId:storyOptions?.id||null,lockVictory:Boolean(storyOptions?.lockVictory),
    enemyDamageMult:Number(storyOptions?.enemyDamageMult||1),enemyHitMult:Number(storyOptions?.enemyHitMult||1),heroDamageMult:Number(storyOptions?.heroDamageMult||1),pigeonDamageMult:Number(storyOptions?.pigeonDamageMult||1),
    turnLimit:Math.max(0,Number(storyOptions?.turnLimit||0)),scriptedTitle:storyOptions?.scriptedTitle||'',scriptedBody:storyOptions?.scriptedBody||'',xpReward:Math.max(0,Number(storyOptions?.xpReward??20)),
    actionMode:storyOptions?.actionMode||'normal',battleNotes:Array.isArray(storyOptions?.battleNotes)?[...storyOptions.battleNotes]:[],
    turn:1,result:null,mode:'actions',phase:'hero',enemyTarget:null,enemyIntent:null,
    firstDamageAction:true,dodging:false,guarding:false,blindTurns:0,angryOnionTurns:0,stunTurns:0,
    pigeonThrown:false,pigeonUsed:false,pigeonTargetTurns:0,sunsetUsed:false,
    lastImpact:'',impactKind:'',consumed:{},knifeDestroyed:false,enemyReaction:null,enemyReactionUntil:0,
    pigeon:{level:evpSession.level,maxHp:evpSession.maxHp,hp:evpSession.hp,available:pigeonAvailable,recovering,retreated:false,offended:evpSession.offended},
    items:initialItems(),log:[storyOptions?.actionMode==='survival'?'ТРУПОСМЕРД КИДАЄТЬСЯ НА ВАС':'ПОЧИНАЄТЬСЯ БІЙ']
  };
  b.heroHp=clamp(b.heroHp+Number(storyOptions?.heroHpDelta||0),1,b.heroMax);
  if(Number(storyOptions?.openingEnemyDamage||0)>0){const d=Math.max(0,Math.round(Number(storyOptions.openingEnemyDamage)));b.enemyHp=clamp(b.enemyHp-d,b.lockVictory?1:0,b.enemyMax);if(d)b.log.push(`ПЕРЕД БОЄМ: ТРУПОСМЕРД -${d} HP`)}
  b.enemyIntent=randomIntent(b);return b;
}

function addLog(text){if(!text)return;battle.log.push(text);battle.log=battle.log.slice(-3)}
function spend(cost){if(battle.heroEnergy<cost){addLog('Не вистачає бадьорості.');return false}battle.heroEnergy=clamp(battle.heroEnergy-cost,0,100);return true}
function physicalDamage(base){let damage=base+Math.floor(heroStat('strength')*.45);if(Number(sourceState?.needs?.satiety||100)<=20)damage=Math.max(1,Math.round(damage*.85));if(hasStatus('hangover')&&battle.firstDamageAction)damage=Math.max(1,Math.round(damage*.75));damage=Math.max(1,Math.round(damage*Number(battle?.heroDamageMult||1)));battle.firstDamageAction=false;return damage}
function hurtEnemy(amount,label){const n=Math.max(0,Math.round(amount)),before=battle.enemyHp,floor=battleKind==='story'&&battle.lockVictory?1:0;battle.enemyHp=clamp(battle.enemyHp-n,floor,battle.enemyMax);const actual=Math.max(0,before-battle.enemyHp);if(actual>0)battle.enemyWasHit=true;addLog(`${label}: -${actual} HP`);return actual}
function consume(key,qty=1){battle.consumed[key]=(battle.consumed[key]||0)+qty}

function checkEnd(){
  if(battle.enemyHp<=0){battle.result='win';battle.mode='result';battle.phase='done';return true}
  if(battle.heroHp<=0){battle.result='lose';battle.mode='result';battle.phase='done';return true}
  return false;
}

function evpapiyRetreatIfNeeded(){
  if(!battle.pigeon.available||battle.pigeon.hp>10)return false;
  battle.pigeon.hp=10;battle.pigeon.available=false;battle.pigeon.retreated=true;battle.pigeon.offended=true;
  evpSession.hp=10;evpSession.offended=true;evpSession.skipBattles=1;
  addLog('Євпапій виходить з бою і ображається.');return true;
}
function hurtPigeon(amount){if(!battle.pigeon.available)return 0;const n=Math.max(1,Math.round(amount));battle.pigeon.hp=clamp(battle.pigeon.hp-n,0,battle.pigeon.maxHp);evpSession.hp=battle.pigeon.hp;addLog(`Євпапій: -${n} HP`);evpapiyRetreatIfNeeded();return n}

function preEnemyPhase(){
  if(checkEnd())return{skip:true};
  if(battle.angryOnionTurns>0){battle.enemyHp=clamp(battle.enemyHp-4,battleKind==='story'&&battle.lockVictory?1:0,battle.enemyMax);battle.angryOnionTurns-=1;addLog('Зла цибуля гризе далі: -4 HP');if(checkEnd())return{skip:true}}
  if(hasStatus('skunk')){battle.enemyHp=clamp(battle.enemyHp-3,battleKind==='story'&&battle.lockVictory?1:0,battle.enemyMax);addLog('ДИКИЙ СКУНС: -3 HP');if(checkEnd())return{skip:true};if(Math.random()<.2){addLog('Ворог збився через сморід і пропустив хід.');battle.dodging=false;battle.heroEnergy=clamp(battle.heroEnergy+4,0,100);return{skip:true}}}
  if(battle.stunTurns>0){battle.stunTurns-=1;addLog('Ворог вирублений. Ваш хід ще раз.');battle.dodging=false;battle.heroEnergy=clamp(battle.heroEnergy+4,0,100);return{skip:true}}
  let intent=battle.enemyIntent||randomIntent(battle);
  if(battle.pigeon.available&&battle.pigeonTargetTurns>0){intent={...INTENTS.pigeon,hint:'Воно різко переключається на Євпапія.'};battle.pigeonTargetTurns-=1}
  else if(intent.target==='pigeon'&&!battle.pigeon.available)intent={...INTENTS.lunge};
  battle.enemyIntent=intent;return{skip:false,target:intent.target,intent};
}

function resolveEnemyAttack(target,intent){
  let hitChance=Number(intent?.hit||.82)*Number(battle?.enemyHitMult||1);if(battle.blindTurns>0){hitChance*=.48;battle.blindTurns-=1}
  if(target==='hero'&&battle.dodging){const agility=clamp(.45+heroStat('agility')*.035,.45,.9);hitChance*=1-(agility*Number(intent?.dodgePower??.7))}
  let hit=false,damage=0;
  if(Math.random()<hitChance){
    hit=true;const min=Number(intent?.min||13),max=Number(intent?.max||17);let raw=Math.max(1,Math.round((min+Math.floor(Math.random()*(Math.max(0,max-min)+1)))*Number(battle?.enemyDamageMult||1)));
    if(target==='hero'&&battle.guarding){raw=Math.max(1,Math.round(raw*.55));addLog('Прикрились · удар слабший.')}
    if(target==='pigeon'&&battle.pigeon.available){damage=hurtPigeon(raw);battle.lastImpact=`ЄВПАПІЮ -${damage} HP`;battle.impactKind='pigeon'}
    else{damage=Math.max(1,raw-armor());battle.heroHp=clamp(battle.heroHp-damage,0,battle.heroMax);addLog(`Ви: -${damage} HP`);battle.lastImpact=`ВАМ -${damage} HP`;battle.impactKind='hero'}
  }else{battle.lastImpact='ПРОМАЗАВ';battle.impactKind='miss';addLog(target==='pigeon'?'Ворог промазав по Євпапію.':'Ворог промазав.')}
  battle.dodging=false;battle.guarding=false;battle.heroEnergy=clamp(battle.heroEnergy+4,0,100);checkEnd();return{target,hit,damage};
}

function clearPhaseTimer(){if(phaseTimer){clearTimeout(phaseTimer);phaseTimer=null}}
function finishTurnAfterEnemy(){
  if(!battle.result&&battleKind==='story'&&battle.turnLimit>0&&battle.turn>=battle.turnLimit){
    battle.result='win';battle.mode='result';battle.phase='done';battle.enemyTarget=null;battle.lastImpact='';battle.impactKind='';
    if(battle.scriptedTitle)addLog(battle.scriptedTitle);renderBattle();return;
  }
  if(!battle.result){battle.turn+=1;battle.enemyIntent=randomIntent(battle)}
  battle.mode=battle.result?'result':'actions';battle.phase=battle.result?'done':'hero';battle.enemyTarget=null;battle.lastImpact='';battle.impactKind='';renderBattle()
}
function startEnemyPhase(){
  if(checkEnd()){renderBattle();return}const prep=preEnemyPhase();if(battle.result){renderBattle();return}
  if(prep.skip){battle.phase='enemy-resolve';battle.mode='enemy';battle.lastImpact='ХІД ПРОПУЩЕНО';battle.impactKind='skip';renderBattle();clearPhaseTimer();phaseTimer=setTimeout(finishTurnAfterEnemy,720);return}
  battle.phase='enemy';battle.mode='enemy';battle.enemyTarget=prep.target;battle.lastImpact='';battle.impactKind='';renderBattle();clearPhaseTimer();
  phaseTimer=setTimeout(()=>{if(!battle||battle.result)return;const out=resolveEnemyAttack(prep.target,prep.intent);battle.phase='impact';renderBattle();if(overlay){overlay.classList.remove('hero-hit','pigeon-hit','enemy-miss');if(out.hit)overlay.classList.add(out.target==='pigeon'?'pigeon-hit':'hero-hit');else overlay.classList.add('enemy-miss')}phaseTimer=setTimeout(()=>{if(overlay)overlay.classList.remove('hero-hit','pigeon-hit','enemy-miss');finishTurnAfterEnemy()},720)},980);
}
function finishHeroAction(){
  if(checkEnd()){renderBattle();return}
  if(reactionPending()){
    battle.mode='enemy';battle.phase='reaction';renderBattle();clearPhaseTimer();
    const wait=Math.max(220,Number(battle.enemyReactionUntil||0)-Date.now());
    phaseTimer=setTimeout(()=>{clearCreatureReaction();startEnemyPhase()},wait);return;
  }
  startEnemyPhase();
}

function triggerShedKnife(){
  const dmg=physicalDamage(14);hurtEnemy(dmg,'Ніж');battle.knifeDestroyed=true;consume('knife',1);addLog('НІЖ ЗНИЩЕНО');setCreatureReaction('hit',620);
  battle.mode='enemy';battle.phase='reaction';battle.lastImpact='';renderBattle();clearPhaseTimer();
  phaseTimer=setTimeout(()=>{
    clearCreatureReaction();battle.phase='enemy';renderBattle();
    phaseTimer=setTimeout(()=>{
      const dmgHero=40;battle.heroHp=clamp(battle.heroHp-dmgHero,0,battle.heroMax);battle.lastImpact=`ВАМ -${dmgHero} HP`;battle.impactKind='hero';battle.phase='impact';addLog(`Вас вʼєбало об сарай: -${dmgHero} HP`);renderBattle();overlay?.classList.add('hero-hit');
      phaseTimer=setTimeout(()=>{overlay?.classList.remove('hero-hit');battle.result=battle.heroHp<=0?'lose':'knockout';battle.mode='result';battle.phase='done';renderBattle()},850);
    },700);
  },620);
}

function actKnife(){const cost=energyCost(7);if(!spend(cost)){renderBattle();return}if(battleKind==='story'&&battle.storyId==='shedCreature')return triggerShedKnife();hurtEnemy(physicalDamage(14),'Ніж');setCreatureReaction('hit');finishHeroAction()}
function actDodge(){const cost=energyCost(hasStatus('hangover')?10:8);if(!spend(cost)){renderBattle();return}battle.dodging=true;addLog('Ви готуєтесь відскочити.');finishHeroAction()}
function actGuard(){const cost=energyCost(5);if(!spend(cost)){renderBattle();return}battle.guarding=true;addLog('Ви прикриваєтесь і чекаєте удару.');finishHeroAction()}
function actPrayer(){const cost=energyCost(3);if(!spend(cost)){renderBattle();return}battle.dodging=true;addLog('Ви молитесь далі й стараєтесь не отримати по єбалу.');finishHeroAction()}
function actPigeon(){if(!battle.pigeon.available)return;const cost=energyCost(10);if(!spend(cost)){renderBattle();return}battle.pigeonThrown=true;battle.pigeonUsed=true;battle.pigeonTargetTurns=1;if(battle.actionMode==='survival'){addLog('Євпапій відволік ТРУПОСМЕРДА на себе.');finishHeroAction();return}const ep=sourceState?.companions?.evpapiy?.progression||{};const dmg=Math.max(1,Math.round((8+Number(ep.attack||1)*2+Number(ep.aggression||1))*Number(battle?.pigeonDamageMult||1)));hurtEnemy(dmg,'Євпапій');setCreatureReaction('hit');finishHeroAction()}
function actSunset(){if(!battle.pigeon.available)return;const cost=energyCost(6);if(!spend(cost)){renderBattle();return}battle.sunsetUsed=true;battle.pigeonUsed=true;battle.pigeonTargetTurns=1;hurtEnemy(Math.max(1,Math.ceil(battle.enemyHp/2)),'ЗАКАТ ПРЄЗРЄНІЯ');setCreatureReaction('hit');finishHeroAction()}
function actHeal(){if(Number(battle.items.medkit||0)<=0||battle.heroHp>=battle.heroMax)return;battle.items.medkit-=1;consume('medkit',1);const before=battle.heroHp;battle.heroHp=clamp(battle.heroHp+25,0,battle.heroMax);addLog(`Аптечка: +${battle.heroHp-before} HP`);battle.mode='actions';finishHeroAction()}
function actEatSalo(){
  if(Number(sourceState?.needs?.satiety||100)>40||Number(battle.items.salo||0)<=0)return;
  battle.items.salo-=1;consume('salo',1);
  sourceState.needs=sourceState.needs||{};
  sourceState.needs.satiety=clamp(Number(sourceState.needs.satiety||0)+25,0,100);
  if(sourceState.needs.satiety>40){
    addLog('Ви зʼїли сало. ГОЛОДНИЙ знято.');
  }else addLog('Ви зʼїли сало. Полегшало, але ви все ще голодний.');
  battle.mode='actions';finishHeroAction();
}

const KNOWN_THROWABLES_095S={
  garlic:{description:'ТРУПОСМЕРДу дуже не подобається.'},
  onion:{description:'Після кидка ворог погано бачить 1 хід.'},
  onion_angry:{description:'Вгризається й продовжує кусати.'},
  onion_smelly:{description:'Від неї можна й вирубитись.'}
};
function revealThrowable095s(key){
  if(battleKind!=='story'||!sourceState)return;
  const id=THROWABLES[key]?.id,known=KNOWN_THROWABLES_095S[id];if(!id||!known)return;
  sourceState.flags=sourceState.flags||{};sourceState.flags[`itemKnown095s_${id}`]=true;
  const d=ITEM_DEFS[id];if(d){d.category='Зброя';d.description=known.description;if(id==='onion')d.name='Дивна цибуля'}
}
function actItem(key){
  const cost=energyCost(4);if(!spend(cost)){renderBattle();return}if(!battle.items[key])return;
  battle.items[key]-=1;consume(THROWABLES[key].id,1);revealThrowable095s(key);
  if(key==='onion'){hurtEnemy(5,'Дивна цибуля');battle.blindTurns=1;addLog('Погано бачить 1 хід');setCreatureReaction('hit')}
  else if(key==='onionAngry'){hurtEnemy(7,'Зла цибуля');battle.angryOnionTurns=3;addLog('Вгризлась · -4 HP ще 3 ходи');setCreatureReaction('hit')}
  else if(key==='onionSmelly'){battle.stunTurns=2;addLog('Вонюча цибуля: ворог вирубився · у вас 2 ходи');setCreatureReaction('smelly',760)}
  else if(key==='garlic'){hurtEnemy(battle.storyId==='shedCreature'?20:8,'Часник');addLog(battle.storyId==='shedCreature'?'Часник припік нормально.':'Часник прилетів.');setCreatureReaction('garlic',760)}
  battle.mode='actions';finishHeroAction();
}

function battleStatusEffect(id){const map={hangover:'перша атака слабша · відскок дорожчий',scared:'уважність +2 · спритність +1 · похуїзм -2',tired:'дії коштують більше бадьорості · спритність -1',angry:'сила +2 · похуїзм +1 · харизма -2',suspicious:'точніше бачите, що готує ворог',skunk:'ворог -3 HP/хід · може зірвати атаку',tipsy:'похуїзм +2 · харизма +1 · уважність -1 · спритність -1',yebatorium:'уважність +1 · похуїзм +1 · ахуй +1',pigeonHumiliated:'харизма -1 · похуїзм +1'};if(map[id])return map[id];const d=STATUS_DEFS[id],parts=[];for(const [k,v] of Object.entries(d?.mods||{}))if(v)parts.push(`${k} ${v>0?'+':''}${v}`);return parts.join(' · ')||'активний стан'}
function statusChips(){const ids=(sourceState?.activeStatuses||[]).filter(id=>STATUS_DEFS[id]);if(!ids.length)return'<span class="battle-no-state">СТАНІВ НЕМА</span>';return ids.map(id=>`<span class="battle-state-chip"><b>${esc(STATUS_DEFS[id].name)}</b><small>${esc(battleStatusEffect(id))}</small></span>`).join('')}
function enemyEffects(){const out=[];if(battle.blindTurns>0)out.push(`ПОГАНО БАЧИТЬ · ${battle.blindTurns} ХІД`);if(battle.angryOnionTurns>0)out.push(`ЗЛА ЦИБУЛЯ ВГРИЗЛАСЬ · -4 HP/ХІД · ${battle.angryOnionTurns} ХОД.`);if(battle.stunTurns>0)out.push(`ВИРУБИВСЯ · ${battle.stunTurns} ХОД.`);if(hasStatus('skunk'))out.push('СКУНС · -3 HP/ХІД');return out}
function actionButton(label,action,{disabled=false,extra=''}={}){return `<button type="button" class="battle-action ${extra}" data-battle-action="${action}" ${disabled?'disabled':''}>${esc(label)}</button>`}
function availableThrowables(){return Object.entries(THROWABLES).filter(([key])=>Number(battle.items[key]||0)>0)}
function throwableRack(){const xs=availableThrowables();if(!xs.length)return'<div class="battle-throw-rack empty">КИДАТИ НІЧИМ</div>';return `<div class="battle-throw-rack">${xs.map(([key,d])=>`<span>${d.icon} ${esc(d.name)} ×${battle.items[key]}</span>`).join('')}</div>`}

function renderActionArea(){
  if(battle.mode==='enemy')return'<div class="battle-enemy-wait">ВОРОГ АТАКУЄ</div>';
  if(battle.actionMode==='prayer'){
    return `<div class="battle-actions">${actionButton('МОЛИТИСЬ ДАЛІ','pray-continue',{disabled:battle.heroEnergy<energyCost(3)})}${actionButton('ВІДСКОЧИТИ','dodge',{disabled:battle.heroEnergy<energyCost(hasStatus('hangover')?10:8)})}</div>`;
  }
  if(battle.mode==='items'){
    const noEnergy=battle.heroEnergy<energyCost(4),xs=availableThrowables();
    return `<div class="battle-actions battle-items">${xs.map(([key,d])=>actionButton(`${d.icon} ${d.name} ×${battle.items[key]}`,`item-${key}`,{disabled:noEnergy})).join('')}${actionButton('НАЗАД','items-back',{extra:'ghost'})}</div>`;
  }
  if(battle.actionMode==='survival'){
    const dodgeCost=energyCost(hasStatus('hangover')?10:8),guardCost=energyCost(5),pigeonCost=energyCost(10),pigeonAvailable=battle.pigeon.available;
    return `<div class="battle-actions">
      ${actionButton('ВІДСКОЧИТИ','dodge',{disabled:battle.heroEnergy<dodgeCost})}
      ${actionButton('ПРИКРИТИСЬ','guard',{disabled:battle.heroEnergy<guardCost})}
      ${actionButton('КИНУТИ ПРЕДМЕТ','items',{disabled:!availableThrowables().length||battle.heroEnergy<energyCost(4)})}
      ${Number(battle.items.medkit||0)>0?actionButton(`ЛІКУВАТИСЬ · 🩹 ×${battle.items.medkit}`,'heal',{disabled:battle.heroHp>=battle.heroMax}):''}
      ${pigeonAvailable&&!battle.pigeonThrown?actionButton('ЄВПАПІЙ, ВІДВОЛІЧИ ЙОГО','pigeon',{disabled:battle.heroEnergy<pigeonCost}):''}
    </div>`;
  }
  const knifeCost=energyCost(7),dodgeCost=energyCost(hasStatus('hangover')?10:8),pigeonCost=energyCost(10),sunsetCost=energyCost(6),pigeonAvailable=battle.pigeon.available;
  const hasKnife=battleKind==='test'||itemCount(sourceState,'knife')-Number(battle.consumed.knife||0)>0;
  return `<div class="battle-actions">
    ${actionButton('ВʼЄБАТИ НОЖЕМ','knife',{disabled:!hasKnife||battle.heroEnergy<knifeCost})}
    ${actionButton('ВІДСКОЧИТИ','dodge',{disabled:battle.heroEnergy<dodgeCost})}
    ${actionButton('КИНУТИ ПРЕДМЕТ','items',{disabled:!availableThrowables().length||battle.heroEnergy<energyCost(4)})}
    ${Number(battle.items.medkit||0)>0?actionButton(`ЛІКУВАТИСЬ · 🩹 ×${battle.items.medkit}`,'heal',{disabled:battle.heroHp>=battle.heroMax}):''}
    ${Number(sourceState?.needs?.satiety||100)<=40&&Number(battle.items.salo||0)>0?actionButton(`ЗʼЇСТИ САЛО · 🥓 ×${battle.items.salo}`,'eat-salo'):''}
    ${pigeonAvailable&&!battle.pigeonThrown?actionButton('КИНУТИ ЄВПАПІЄМ','pigeon',{disabled:battle.heroEnergy<pigeonCost}):''}
    ${pigeonAvailable&&!battle.sunsetUsed&&(battleKind==='test'||sourceState?.unlocks?.sunsetContempt)?actionButton('ЗАКАТ ПРЄЗРЄНІЯ','sunset',{disabled:battle.heroEnergy<sunsetCost,extra:'special'}):''}
  </div>`;
}

function pigeonResultLine(){if(!battle.pigeonUsed)return'';return `<div class="battle-pigeon-line"><img src="./pigeon_serious.png" alt="Євпапій"><div><b>Євпапій</b><p>– Ще раз так зробиш – наступний полетиш ти.</p></div></div>`}
function resultHtml(){
  const title=battle.result==='win'?(battle.scriptedTitle||'ПЕРЕМОГА'):battle.result==='knockout'?'ВАС ВИРУБИЛО':'ВИ ЗДОХЛИ';
  const body=battle.result==='win'&&battle.scriptedBody?`<small>${esc(battle.scriptedBody)}</small>`:'';
  if(battleKind==='story')return `<div class="battle-result"><b>${title}</b>${body}${pigeonResultLine()}<div>${actionButton('ПРОДОВЖИТИ','story-continue')}</div></div>`;
  return `<div class="battle-result"><b>${title}</b>${pigeonResultLine()}<small>Це тест. Сейв не змінено.</small><div>${actionButton('ЩЕ РАЗ','restart')}${actionButton('ЗАКРИТИ','close',{extra:'ghost'})}</div></div>`;
}

function preBattleNotesHtml(){
  const notes=[...(battle?.battleNotes||[])];
  if(sourceState?.flags?.tipsyNegotiatedWithCreature)notes.push('ПЕРЕГОВОРИ ПІД ГРАДУСОМ · ТРУПОСМЕРД ТРОХИ ЗАВИС');
  if(sourceState?.flags?.usedYebatoriumAtCreature)notes.push('«ЕХ, БУЛА НЕ БУЛА» · ВИ БʼЄТЕ ТРОХИ СМІЛИВІШЕ');
  const title=battle?.actionMode==='survival'?'ПЕРЕД СУТИЧКОЮ':'ПЕРЕД БОЄМ';
  return notes.length?`<div class="battle-before-title">${title}</div><div class="battle-before-list">${notes.slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'';
}
function renderPigeonCard(){const card=overlay?.querySelector('[data-pigeon-card]');if(!card)return;const p=battle.pigeon,pct=p.available?Math.round(clamp(p.hp/p.maxHp*100,0,100)):0;card.classList.toggle('unavailable',!p.available);card.classList.toggle('recovering',p.recovering);card.querySelector('[data-pigeon-state]').textContent=p.recovering?'ЛІКУЄТЬСЯ':p.retreated?'ВИЙШОВ З БОЮ':`РІВ. ${p.level}`;card.querySelector('[data-pigeon-hp]').textContent=p.available?`❤️ ${pct}%`:'❤️ –';card.querySelector('[data-pigeon-real-hp]').textContent=p.available?`${p.hp}/${p.maxHp}`:''}
function readableIntent(intent){
  if(hasStatus('suspicious'))return intent.hint;
  if(intent.id==='pigeon')return'Воно дивиться в бік Євпапія.';
  if(intent.id==='heavy')return'Воно заносить руки над головою.';
  if(intent.id==='grab')return'Воно тягне до вас руки.';
  if(intent.id==='sweep')return'Воно розводить руки в сторони.';
  return'Воно пригнулось і дивиться прямо на вас.';
}
function intentCopy(){
  if(battle.stunTurns>0)return{label:'ВОРОГ',text:'Валяється і поки нікуди не збирається.'};
  const intent=battle.enemyIntent||INTENTS.lunge;
  if(battle.phase==='impact')return{label:'УДАР',text:battle.lastImpact||''};
  const text=readableIntent(intent);
  if(battle.phase==='enemy')return{label:'ВОРОГ АТАКУЄ',text};
  return{label:hasStatus('suspicious')?'СОБАКА-ПОДОЗРЄВАКА':'ВОНО ГОТУЄТЬСЯ',text};
}

function renderBattle(){
  if(!overlay||!battle)return;
  overlay.classList.toggle('story-mode',battleKind==='story');
  overlay.querySelector('[data-battle-kicker]').textContent=battleKind==='story'?(battle.actionMode==='survival'?'СУТИЧКА':'БІЙ'):'ТЕСТ БОЮ';
  overlay.querySelector('[data-enemy-name]').textContent=battle.enemyName;
  overlay.querySelector('[data-enemy-hp]').textContent=battle.actionMode==='survival'?'НЕВІДОМО':`❤️ ${Math.round(clamp(battle.enemyHp/battle.enemyMax*100,0,100))}%`;
  overlay.querySelector('[data-hero-hp]').textContent=`❤️ ${Math.round(clamp(battle.heroHp/battle.heroMax*100,0,100))}%`;
  overlay.querySelector('[data-energy]').textContent=`⚡ ${Math.round(clamp(battle.heroEnergy,0,100))}%`;overlay.querySelector('[data-hero-level]').textContent=`РІВ. ${battle.heroLevel}`;
  overlay.querySelector('[data-battle-turn]').textContent=`ХІД ${battle.turn}`;
  overlay.querySelector('[data-battle-states]').innerHTML=statusChips();overlay.querySelector('[data-battle-before]').innerHTML=preBattleNotesHtml();
  overlay.querySelector('[data-battle-log]').innerHTML=battle.log.map(x=>`<div>${esc(x)}</div>`).join('');
  overlay.querySelector('[data-battle-throwables]').innerHTML=throwableRack();
  overlay.querySelector('[data-battle-controls]').innerHTML=battle.result?resultHtml():renderActionArea();
  overlay.querySelector('[data-enemy-effects]').innerHTML=enemyEffects().map(x=>`<span>${esc(x)}</span>`).join('');
  renderPigeonCard();
  const copy=intentCopy();overlay.querySelector('[data-intent-label]').textContent=copy.label;overlay.querySelector('[data-intent-text]').textContent=copy.text;
  const impact=overlay.querySelector('[data-impact]');impact.textContent=battle.lastImpact||'';impact.className=`battle-impact ${battle.phase==='impact'||battle.phase==='enemy-resolve'?'show':''} ${battle.impactKind||''}`;
  const art=overlay.querySelector('[data-enemy-art]'),placeholder=overlay.querySelector('[data-enemy-placeholder]');
  let src;
  if(battleKind==='story'&&String(battle.storyId||'').startsWith('shedCreature')){
    if(battle.phase==='reaction'&&battle.enemyReaction)src=CREATURE_ART_095F[battle.enemyReaction]||CREATURE_ART_095F.hit;
    else if(battle.phase==='enemy'||battle.phase==='impact')src=CREATURE_ART_095F.attack;
    else src=CREATURE_ART_095F.normal;
  }else src=(battle.phase==='enemy'&&battle.enemyAttackArt?battle.enemyAttackArt:battle.enemyArt);
  if(src){art.src=src;art.classList.remove('hidden');placeholder.classList.add('hidden')}else{art.removeAttribute('src');art.classList.add('hidden');placeholder.classList.remove('hidden')}
  overlay.classList.toggle('enemy-attacking',battle.phase==='enemy');overlay.classList.toggle('target-pigeon',battle.phase==='enemy'&&battle.enemyTarget==='pigeon');overlay.classList.toggle('target-hero',battle.phase==='enemy'&&battle.enemyTarget==='hero');
  overlay.querySelectorAll('[data-battle-action]').forEach(btn=>btn.onclick=()=>handleAction(btn.dataset.battleAction));
}

function applyBattleToStoryState(){
  let s=clone(normalizeState(sourceState));
  const fightMinutes=Math.max(3,Math.min(15,Math.max(1,Number(battle.turn||1))*2));
  const blackoutMinutes=battle.result==='knockout'?20:0;
  const timed=executeAction(s,{id:'story_battle_time095q',minutes:fightMinutes+blackoutMinutes,activity:blackoutMinutes?'rest':'light'});
  s=timed.state;
  battle.timeEvents=timed.events||[];
  s.health=clamp(battle.heroHp,0,100);s.needs.energy=clamp(battle.heroEnergy,0,100);
  for(const [id,qty] of Object.entries(battle.consumed||{}))removeItem(s,id,qty);
  const p=s.companions.evpapiy;s.companions.evpapiy={...p,level:battle.pigeon.level,maxHp:battle.pigeon.maxHp,hp:battle.pigeon.hp,skipBattles:evpSession.skipBattles,offended:battle.pigeon.offended||evpSession.offended};
  const reward=Math.max(0,Number(battle.xpReward??20));const progressEvents=[...(battle.timeEvents||[]),...addHeroXp(s,reward)];if(s.companions.evpapiy?.known&&battle.pigeon.available)progressEvents.push(...addEvpXp(s,reward));battle.progressEvents=progressEvents;
  return normalizeState(s);
}

function finishStoryBattle(){
  if(!storyResolver)return;
  const resolve=storyResolver;storyResolver=null;const state=applyBattleToStoryState();const outcome=battle.result||'cancel';
  closeOverlay(false);
  // WebKit sometimes kept the full-screen battle layer painted after the result.
  // Remove this particular DOM node completely; the next battle will build a fresh one.
  const oldOverlay=overlay;overlay=null;oldOverlay?.remove();
  document.body.classList.remove('battle-open');
  resolve({outcome,state,battle:{...battle},events:battle.progressEvents||[]});
}

function handleAction(action){
  if(!battle||battle.mode==='enemy')return;
  if(action==='knife')return actKnife();if(action==='dodge')return actDodge();if(action==='guard')return actGuard();if(action==='pray-continue')return actPrayer();if(action==='heal')return actHeal();if(action==='eat-salo')return actEatSalo();if(action==='pigeon')return actPigeon();if(action==='sunset')return actSunset();
  if(action==='items'){battle.mode='items';return renderBattle()}if(action==='items-back'){battle.mode='actions';return renderBattle()}
  if(action.startsWith('item-'))return actItem(action.slice(5));
  if(action==='restart'){battle=freshBattle();return renderBattle()}if(action==='close')return closeBattleTest();if(action==='story-continue')return finishStoryBattle();
}

function makeOverlay(){
  if(overlay)return overlay;overlay=document.createElement('div');overlay.id='battleTestOverlay';overlay.className='battle-overlay hidden';overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML=`<section class="battle-shell" role="dialog" aria-modal="true" aria-label="Бій">
    <header class="battle-head"><div><span data-battle-kicker>ТЕСТ БОЮ</span><b data-battle-turn>ХІД 1</b></div><button type="button" class="battle-close" data-battle-close aria-label="Закрити">✕</button></header>
    <div class="battle-arena">
      <div class="battle-enemy-strip"><b data-enemy-name>ТЕСТОВА ХУЙНЯ</b><span data-enemy-hp>❤️ 100%</span></div>
      <div class="battle-enemy-effects" data-enemy-effects></div>
      <div class="battle-intent"><small data-intent-label>ВОНО ГОТУЄТЬСЯ</small><b data-intent-text></b></div>
      <div class="battle-figure" aria-hidden="true"><img class="hidden" data-enemy-art alt=""><span data-enemy-placeholder>?</span></div>
      <div class="battle-impact" data-impact></div>
      <div class="battle-bottom-stats">
        <div class="battle-hero-compact" data-hero-card><img src="./hero-face.png" alt="Ви"><div class="battle-hero-copy"><b>ВИ</b><small data-hero-level>РІВ. 1</small></div><span data-hero-hp>❤️ 100%</span><span data-energy>⚡ 100%</span></div>
        <div class="battle-pigeon-compact" data-pigeon-card><img src="./pigeon_serious.png" alt="Євпапій"><div><b>ЄВПАПІЙ</b><span data-pigeon-hp>❤️ 100%</span><small><span data-pigeon-state>РІВ. 1</span><i data-pigeon-real-hp>50/50</i></small></div></div>
      </div>
    </div>
    <div class="battle-before" data-battle-before></div>
    <div class="battle-statuses" data-battle-states></div>
    <div data-battle-throwables></div>
    <div class="battle-log" data-battle-log></div>
    <div data-battle-controls></div>
  </section>`;
  overlay.querySelector('[data-battle-close]').onclick=()=>{if(battleKind==='test')closeBattleTest()};document.body.appendChild(overlay);return overlay;
}

async function openBattleTest(runId=currentRunId()){
  battleKind='test';storyOptions=null;sourceState=await readCurrentState(runId);syncEvpapiySession();battle=freshBattle();makeOverlay();overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');document.body.classList.add('battle-open');renderBattle();
}

function ensureBattleHelpCss095j(){
  if(document.querySelector('#battleHelpCss095j'))return;
  const st=document.createElement('style');st.id='battleHelpCss095j';st.textContent=`
    .battle-help095j{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.82);display:grid;place-items:center;padding:18px}
    .battle-help-card095j{width:min(440px,100%);background:#121b16;border:1px solid #3a4b3d;border-radius:18px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.5)}
    .battle-help-card095j h2{margin:4px 0 10px}.battle-help-card095j p{margin:7px 0;color:#d6d1c5;line-height:1.45}.battle-help-card095j button{width:100%;margin-top:12px}
    .battle-before{margin:8px 0}.battle-before-title{font-size:.68rem;letter-spacing:.1em;color:#d7b36a;font-weight:800;margin-bottom:5px}.battle-before-list{display:flex;flex-wrap:wrap;gap:5px}.battle-before-list span{font-size:.72rem;border:1px solid #435445;background:#17231c;border-radius:999px;padding:5px 8px;color:#e7dfce}
  `;document.head.appendChild(st)
}
function showBattleHelpOnce095j(){
  if(battleKind!=='story'||sourceState?.flags?.battleHelpShown095j)return Promise.resolve();
  sourceState.flags=sourceState.flags||{};sourceState.flags.battleHelpShown095j=true;ensureBattleHelpCss095j();
  return new Promise(resolve=>{
    const survival=battle?.actionMode==='survival';
    const o=document.createElement('div');o.className='battle-help095j';
    o.innerHTML=survival
      ?`<div class="battle-help-card095j"><small>ЯК ПРАЦЮЄ СУТИЧКА</small><h2>Зараз його не треба вбивати.</h2><p>За хід ви робите одну дію: відскакуєте, прикриваєтесь, кидаєте предмет або просите Євпапія відволікти цю херню.</p><p>Те, шо ви зробили перед сутичкою, реально міняє її.</p><p>ПЕРЕЖИВІТЬ 2 ХОДИ – І СТВОРІННЯ ЗʼЇБЕТЬСЯ.</p><button class="primary">ПОНЯВ. ДАВАЙ.</button></div>`
      :`<div class="battle-help-card095j"><small>ЯК ПРАЦЮЄ БІЙ</small><h2>Тут уже треба трохи думати.</h2><p>За хід ви робите одну дію: бʼєте, відскакуєте, кидаєте предмет або використовуєте Євпапія.</p><p>Стани й попередні рішення реально міняють бій.</p><p>Якщо цю херню можна добити – добивайте. Якщо ні – задача буде написана прямо перед вами.</p><button class="primary">ПОНЯВ. ДАВАЙ.</button></div>`;
    o.querySelector('button').onclick=()=>{o.remove();resolve()};document.body.appendChild(o);
  });
}
export async function openStoryBattle(state,options={}){
  ensureBattleCss();ensureBattleHelpCss095j();makeOverlay();clearPhaseTimer();battleKind='story';storyOptions={enemyName:'ТРУПОСМЕРД',enemyMax:100,enemyHp:100,enemyArt:CREATURE_ART_095F.normal,enemyAttackArt:CREATURE_ART_095F.attack,lockVictory:true,...options};sourceState=normalizeState(clone(state));
  if(sourceState?.flags?.usedYebatoriumAtCreature&&!('heroDamageMult' in options))storyOptions.heroDamageMult=1.1;
  if(sourceState?.flags?.tipsyNegotiatedWithCreature&&!('enemyHitMult' in options))storyOptions.enemyHitMult=.9;
  syncEvpapiySession();battle=freshBattle();await showBattleHelpOnce095j();overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');document.body.classList.add('battle-open');renderBattle();return new Promise(resolve=>{storyResolver=resolve});
}

function closeOverlay(resetKind=true){clearPhaseTimer();if(!overlay)return;overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');overlay.classList.remove('enemy-attacking','target-pigeon','target-hero','hero-hit','pigeon-hit','enemy-miss','story-mode');document.body.classList.remove('battle-open');if(resetKind){battleKind='test';storyOptions=null}}
function closeBattleTest(){closeOverlay(true)}

function addSettingsEntry(){const root=document.querySelector('#menuContent');if(!root||root.querySelector('#battleTestEntry')||!root.querySelector('#soundEnabled'))return;const section=document.createElement('div');section.id='battleTestEntry';section.className='battle-test-entry';section.innerHTML=`<div class="section-title"><h2>Бойовий тест</h2></div><div class="settings-block"><button id="battleTestBtn" type="button">Відкрити тест бою</button><small>Тест не змінює сейв.</small></div>`;root.appendChild(section);section.querySelector('#battleTestBtn').onclick=async()=>{const runId=currentRunId();document.querySelector('#closeMenuBtn')?.click();await openBattleTest(runId)}}

export function installBattleTest(){ensureBattleCss();makeOverlay();const root=document.querySelector('#menuContent');if(root&&!settingsObserver){settingsObserver=new MutationObserver(()=>queueMicrotask(addSettingsEntry));settingsObserver.observe(root,{childList:true,subtree:true})}addSettingsEntry();document.addEventListener('keydown',e=>{if(e.key==='Escape'&&battleKind==='test'&&overlay&&!overlay.classList.contains('hidden'))closeBattleTest()})}
