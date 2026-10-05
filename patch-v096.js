// v0.9.6 – one large logic pass over chapters 1–3.
// No new plot invented: fixes branch logic, knowledge order, consequence timing, menu structure and testing.

import {CHAPTER1_SCENES} from './chapter1.js?v=093';
import {CHAPTER2_SCENES} from './chapter2.js?v=093';
import {CHAPTER3_SCENES} from './chapter3.js?v=093';
import {STATUS_DEFS,ITEM_DEFS} from './data.js?v=093';
import {normalizeState,statModifiers,effectiveStat} from './engine.js?v=093';
import {loadRun} from './storage.js?v=093';

const asArray=v=>Array.isArray(v)?v:[];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const books=[CHAPTER1_SCENES,CHAPTER2_SCENES,CHAPTER3_SCENES];
const allScenes=()=>books.flatMap(b=>Object.values(b||{})).filter(Boolean);

function copyScene(base,id,caption,text,choices){return{...base,id,caption,text,choices,onEnter:[]}}
function wrapChoices(scene,fn){if(!scene)return;const old=scene.choices;scene.choices=s=>fn(typeof old==='function'?asArray(old(s)):asArray(old),s)}
function addHidden(choice,effect){return{...choice,hiddenEffects:[...asArray(choice.hiddenEffects),effect]}}

// 1. Євпапій introduces himself on every branch, but the response matches what the player actually chose.
function patchEvpapiyMeeting096(){
  const S=CHAPTER1_SCENES;if(!S.shoulder||!S.yap)return;
  S.shoulder.choices=[
    {id:'shoulder_no_lie',label:'Не пизди.',next:'evp_no_lie096'},
    {id:'shoulder_who',label:'Ти хто, блять?',next:'evp_who096'},
    {id:'shoulder_leave',label:'Мовчки відійти. Може, попустить.',next:'nameless'}
  ];
  S.evp_no_lie096=copyScene(S.shoulder,'evp_no_lie096','та не пиздить',`– Не пизди.\n\nГолуб дивиться на вас.\n\n– Я не пизджу.\n\nВи дивитесь на голуба. Голуб дивиться на вас.\n\n– Євпапій.\n\n– Шо?\n\n– Звати мене Євпапій, шановний.`,[
    {id:'evp_no_lie_next096',label:'Ладно. Євпапій так Євпапій.',next:'yap',hiddenEffects:[{type:'flag',key:'knowsPigeonName',value:true},{type:'companion',person:'evpapiy',known:true,active:true,name:'Євпапій',state:'Іде за вами'},{type:'memory',person:'evpapiy',key:'knowsName',value:true}]}
  ]);
  S.evp_who096=copyScene(S.shoulder,'evp_who096','євпапій. для вас – екакій',`– Ти хто, блять?\n\n– Євпапій.\n\n– Екакій?\n\nГолуб дивиться на вас.\n\n– Єв-па-пій.\n\n– Ага. Екакій.\n\n– Шановний, ти тугий?`,[
    {id:'evp_who_next096',label:'Далі',next:'yap',hiddenEffects:[{type:'flag',key:'knowsPigeonName',value:true},{type:'companion',person:'evpapiy',known:true,active:true,name:'Євпапій',state:'Іде за вами'},{type:'memory',person:'evpapiy',key:'knowsName',value:true}]}
  ]);
  if(S.nameless){
    S.nameless.text=`Ви мовчки йдете далі, роблячи вигляд, шо говорящого голуба не існує.\n\nВін теж мовчить.\n\nСекунд пʼять.\n\n– Євпапій.\n\nВи йдете далі.\n\n– Мене Євпапій звати. Раз уже морозишся, то хоча би знай, кого ігноруєш.`;
    S.nameless.choices=[{id:'nameless_next096',label:'Далі',next:'yap',hiddenEffects:[{type:'flag',key:'knowsPigeonName',value:true},{type:'companion',person:'evpapiy',known:true,active:true,name:'Євпапій',state:'Іде за вами'},{type:'memory',person:'evpapiy',key:'knowsName',value:true}]}];
  }
  if(S.yap&&typeof S.yap.text==='function'){const old=S.yap.text;S.yap.text=s=>String(old(s)).replaceAll('кіт Галини','кіт баби Галі')}
  else if(S.yap&&typeof S.yap.text==='string')S.yap.text=S.yap.text.replaceAll('кіт Галини','кіт баби Галі');
}

// Water search: no premature puddle hint. Puddle remains valid for old saves/tests and keeps its real consequences.
function patchWater096(){
  const S=CHAPTER1_SCENES;if(S.waterSearch095k){
    S.waterSearch095k.text='Ви оглядаєтесь, де тут можна попити. Біля хати є криниця.';
    S.waterSearch095k.choices=[
      {id:'water096_well',label:'Піти до криниці.',next:'well',minutes:5,activity:'walk'},
      {id:'water096_back',label:'Передумати.',next:'hub'}
    ];
  }
  if(S.puddle){
    S.puddle.text=`Ви присідаєте біля калюжі.\n\nЄвпапій дивиться на вас так, як теща, коли ви не викопали їй города.\n\n– Ти серйозно?\n\n– А шо?\n\n– Та нічо. Пий.\n\nВода мутна, холодна й бридка на смак.\n\nЄвпапій мовчить секунд пʼять.\n\n– Тут собака зранку сцяла.\n\nСука.`;
    S.puddle.notice={title:'ОТ І ПОПИЛИ',body:'Вода +15% · Здоровʼя -10%'};
  }
}

// 2. The woman says “місцева лєгенда” first. Every response gets its own short reaction before branches merge.
function patchLegend096(){
  const S=CHAPTER2_SCENES;if(!S.ch2_legend||!S.ch2_bench)return;
  wrapChoices(S.ch2_legend,(xs)=>xs.map(c=>{
    if(c.id==='legend_ask')return{...c,next:'ch2_benchask'};
    if(c.id==='legend_tease')return{...c,next:'legend_tease096'};
    if(c.id==='legend_attention')return{...c,next:'legend_look096'};
    if(c.id==='legend_pofig')return{...c,next:'legend_pofig096'};
    if(c.id==='ch2_state_legend_choice')return c;
    return c;
  }));
  const actors=S.ch2_legend.actors;
  const tail=`Жінку гукають від столу. Вона махає рукою в бік лавки.\n\n– Раз уже прийшов – бери з того боку.\n\n– Я?\n\n– А хто, я?\n\nВам уже сунуть край лавки в руки.\n\n– Ну заєбісь.`;
  S.legend_tease096={...S.ch2_legend,id:'legend_tease096',caption:'звєзда місцева',actors,onEnter:[],text:`– Ну шо, звєзда місцева?\n\nЄвпапій повільно повертає до вас голову.\n\n– Завидуй мовчки.\n\n${tail}`,choices:[{id:'legend_tease_carry096',label:'Тягнути лавку.',next:'ch2_bench',minutes:10,activity:'work',hiddenEffects:[{type:'flag',key:'helpedCarryBench',value:true}]}]};
  S.legend_look096={...S.ch2_legend,id:'legend_look096',caption:'шось він затих',actors,onEnter:[],text:`Ви мовчки дивитесь на Євпапія.\n\nВін пару секунд робить вигляд, шо вас не бачить.\n\n– Шо?\n\n– Нічо.\n\n${tail}`,choices:[{id:'legend_look_carry096',label:'Тягнути лавку.',next:'ch2_bench',minutes:10,activity:'work',hiddenEffects:[{type:'flag',key:'helpedCarryBench',value:true}]}]};
  S.legend_pofig096={...S.ch2_legend,id:'legend_pofig096',caption:'та похуй',actors,onEnter:[],text:`Ви дивитесь на Євпапія, на жінку й вирішуєте, шо зараз вам похуй.\n\n${tail}`,choices:[{id:'legend_pofig_carry096',label:'Тягнути лавку.',next:'ch2_bench',minutes:10,activity:'work',hiddenEffects:[{type:'flag',key:'helpedCarryBench',value:true}]}]};
  if(S.ch2_state_legend&&Array.isArray(S.ch2_state_legend.choices))S.ch2_state_legend.choices=S.ch2_state_legend.choices.map(c=>({...c,next:'legend_look096'}));
}

// 3–4. Mechanical consequences happen after the player has read the event that caused them.
// Static onEnter changes are moved to the scene's outgoing choice, once per scene.
const POST_TYPES=new Set(['statusAdd','health','damage','need','heroXp','evpXp','itemAdd','itemRemove','clothesAdd','equip']);
function consequenceText(e){
  if(e.type==='health')return`Здоровʼя ${Number(e.value)>0?'+':''}${Number(e.value)}%`;
  if(e.type==='damage')return`Здоровʼя -${Number(e.amount||0)}%`;
  if(e.type==='need'){const n={water:'Вода',satiety:'Ситість',energy:'Бадьорість'}[e.key]||e.key;return`${n} ${Number(e.value)>0?'+':''}${Number(e.value)}%`}
  return'';
}
function moveStaticConsequences096(){
  for(const scene of allScenes()){
    if(!scene.onEnter||!scene.choices)continue;
    const originalEnter=scene.onEnter;
    const effectsFor=s=>typeof originalEnter==='function'?asArray(originalEnter(s)):asArray(originalEnter);
    const probe=typeof originalEnter==='function'?null:effectsFor(null);
    if(probe&&!probe.some(e=>POST_TYPES.has(e?.type)))continue;
    scene.onEnter=s=>effectsFor(s).filter(e=>!POST_TYPES.has(e?.type));
    const flag=`post096_${scene.id}`,old=scene.choices;
    scene.choices=s=>{
      const xs=typeof old==='function'?asArray(old(s)):asArray(old);if(s.flags?.[flag])return xs;
      const moved=effectsFor(s).filter(e=>POST_TYPES.has(e?.type));if(!moved.length)return xs;
      return xs.map(c=>({...c,effects:[...asArray(c.effects),...moved],hiddenEffects:[...asArray(c.hiddenEffects),{type:'flag',key:flag,value:true}]}));
    };
    const oldN=scene.notice;
    scene.notice=s=>{
      const n=typeof oldN==='function'?oldN(s):oldN,visible=effectsFor(s).filter(e=>POST_TYPES.has(e?.type)).map(consequenceText).filter(Boolean);
      if(!visible.length)return n||null;const extra=visible.join(' · ');return n?{...n,body:[n.body,extra].filter(Boolean).join(' · ')}:{title:'НАСЛІДОК',body:extra};
    };
  }
}

// Random early popups were the main remaining “effect before cause” source. Use explicit triggers instead.
function patchStateTriggers096(){
  const C2=CHAPTER2_SCENES,C3=CHAPTER3_SCENES;
  if(C2.ch2_legend)C2.ch2_legend.onEnter=[];
  if(C2.ch2_pee){C2.ch2_pee.onEnter=[{type:'flag',key:'heardShedConversation',value:true}];wrapChoices(C2.ch2_pee,xs=>xs.map(c=>({...c,effects:[...asArray(c.effects),{type:'statusAdd',id:'suspicious'}]})))}
  if(C2.ch2_garlic){C2.ch2_garlic.onEnter=[{type:'relationship',person:'evpapiy',key:'offense',value:1},{type:'memory',person:'evpapiy',key:'offeredGarlicAtShed',value:true}];wrapChoices(C2.ch2_garlic,xs=>xs.map(c=>({...c,effects:[...asArray(c.effects),{type:'statusAdd',id:'angry'}]})))}
  if(C3.ch3_pray095_2)C3.ch3_pray095_2.onEnter=[];
  if(C3.ch3_wake_crowd){C3.ch3_wake_crowd.onEnter=[{type:'heroXp',value:10},{type:'flag',key:'wakeCrowdAhuied',value:true}];wrapChoices(C3.ch3_wake_crowd,xs=>xs.map(c=>({...c,effects:[...asArray(c.effects),{type:'statusAdd',id:'suspicious'}]})))}
}

// 5. Fixed HP losses + meal does not magically heal wounds.
function patchHealth096(){
  const S=CHAPTER3_SCENES;
  if(S.ch3_run){S.ch3_run.onEnter=[{type:'damage',amount:15,ignoreArmor:true},{type:'flag',key:'triedRunningFromShed',value:true}];S.ch3_run.notice={title:'ЗДОРОВʼЯ -15',body:'Втеча дала вам фору рівно до першого удару.'}}
  if(S.ch3_garlic_hit){S.ch3_garlic_hit.onEnter=[{type:'damage',amount:10,ignoreArmor:true}];S.ch3_garlic_hit.notice={title:'ЧАСНИК СПРАЦЮВАВ',body:'ТРУПОСМЕРД рухається гірше · Здоровʼя -10%'}}
  if(S.ch3_galina_hut){
    S.ch3_galina_hut.onEnter=[{type:'need',key:'satiety',value:100},{type:'need',key:'water',value:100},{type:'flag',key:'galinaFedAfterShed',value:true}];
    S.ch3_galina_hut.notice={title:'ВИ НОРМАЛЬНО ПОЇЛИ',body:'Вода й ситість відновлені. Рани від картоплі не заживають.'};
  }
}

// 8. One progression system: story “stat +1” effects become explicit XP, not fake characteristic growth.
function unifyProgression096(){
  const convert=arr=>asArray(arr).map(e=>e?.type==='stat'?{type:'heroXp',value:Math.max(0,Number(e.value||0))*10,visible:e.visible}:e);
  for(const scene of allScenes()){
    if(Array.isArray(scene.onEnter))scene.onEnter=convert(scene.onEnter);
    else if(typeof scene.onEnter==='function'){const enter=scene.onEnter;scene.onEnter=s=>convert(enter(s))}
    const old=scene.choices;if(!old)continue;
    scene.choices=s=>{
      const xs=typeof old==='function'?asArray(old(s)):asArray(old);
      return xs.map(c=>({...c,effects:convert(c.effects),hiddenEffects:convert(c.hiddenEffects)}));
    };
  }
}

// 9. Garlic callback reads the memory where chapter 2 actually stored it.
function patchGarlicMemory096(){
  const sc=CHAPTER3_SCENES.ch3_garlic;if(!sc)return;
  const base=`– Ну давай, сука. Не підведи.\n\n– Ти шо робиш? – шипить постать.\n\n– Перевіряю народну медицину.\n\nВи кидаєте часник у створіння. Він влучає прямо в груди.\n\nСтворіння згинається й шипить, ніби його ошпарили. Від сорочки піднімається легкий дим.\n\n– О, – каже Євпапій.\n\n– Шо «о»?\n\n– Працює.`;
  sc.text=s=>s.memories?.evpapiy?.offeredGarlicAtShed
    ?`${base}\n\n– ТИ Ж КАЗАВ, ШО ЧАСНИК ХУЙНЯ.\n\n– Я сказав, шо мені його не давати.\n\nСтворіння повільно випрямляється і робить крок до вас.\n\nПостать тихо каже:\n\n– Тепер воно тебе запамʼятало.\n\n– Заєбісь.`
    :`${base}\n\n– Сам бачу, блядь.\n\nСтворіння повільно випрямляється і робить крок до вас.\n\nПостать тихо каже:\n\n– Тепер воно тебе запамʼятало.\n\n– Заєбісь.`;
}

// 10–11. The name exists only after the player sees the naming line.
function patchTruposmerdKnowledge096(){
  const S=CHAPTER3_SCENES;if(!S.ch3_creature)return;
  S.ch3_creature.text=`З темряви повільно вилазить щось брудне й засмальцьоване.\n\nВоно стоїть біля сараю, вонюче до ригачок, потом і ще хуй зна чим.\n\n– Трупосмерд, блядь.`;
  wrapChoices(S.ch3_creature,(xs,s)=>xs.map(c=>s.flags?.truposmerdNamed096?c:addHidden(c,{type:'flag',key:'truposmerdNamed096',value:true})));
}

// 11. Knowledge flags are recorded after the player has actually read the discovery.
function patchKnowledgeTiming096(){
  const S=CHAPTER3_SCENES;
  const deferFlags=(sc,keys)=>{
    if(!sc)return;const set=new Set(keys),oldEnter=sc.onEnter;
    if(oldEnter){sc.onEnter=s=>{const xs=typeof oldEnter==='function'?asArray(oldEnter(s)):asArray(oldEnter);return xs.filter(e=>!(e?.type==='flag'&&set.has(e.key)))}}
    wrapChoices(sc,xs=>xs.map(c=>({...c,hiddenEffects:[...asArray(c.hiddenEffects),...keys.map(key=>({type:'flag',key,value:true}))]})));
  };
  deferFlags(S.ch3_vodka,['creatureVodkaFriend','creatureRescueAvailable']);
  deferFlags(S.ch3_garlic,['creatureGarlicUsed']);
  deferFlags(S.ch3_pray095_4,['creaturePrayerReactionKnown095w','creaturePrayerStalled095w']);
}

// 16. Second condition for ЗАКАТ: the player quarrels with the cat that almost ate Євпапій.
function patchSunset096(){
  const S=CHAPTER3_SCENES;
  for(const id of ['ch3_cat_insult095n','ch3_cat_insult095m']){
    const sc=S[id];if(!sc)continue;wrapChoices(sc,xs=>xs.map(c=>addHidden(c,{type:'flag',key:'evpapiyEnemyConflict096',value:true})));
  }
}

// 18. Map is actually announced when it opens.
function patchMapUnlockNotice096(){
  const s=CHAPTER2_SCENES.ch2_intro;if(!s)return;const n=s.notice||{};
  s.notice={...n,body:String(n.body||'').includes('ВІДКРИТО: КАРТА')?n.body:`${n.body||''} · ВІДКРИТО: КАРТА`.replace(/^ · /,'')};
}

// 21–23 + 12–14 + stats/map UI. No observers, only finite click hooks.
function currentRunId096(){const t=document.querySelector('#menuMeta')?.textContent||'';return Number(t.match(/Проходження\s+(\d+)/)?.[1]||0)}
async function currentSaved096(){const id=currentRunId096();if(!id)return null;const raw=await loadRun(id);return raw?normalizeState(raw):null}
function activateTab096(tab){document.querySelectorAll('#menuTabs [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab))}

function safeForShop096(s){
  if(!s)return false;const scene=String(s.story?.sceneId||s.scene||''),loc=String(s.world?.location||'').toLocaleLowerCase('uk-UA');
  if(s.world?.environment==='indoors'&&/хат/.test(loc))return true;
  if(/^ch2_(intro|fence|real|crowd|legend|bench|table|supplies)/.test(scene))return true;
  return false;
}
function shopBlocked096(){activateTab096('shop');document.querySelector('#menuContent').innerHTML=`<div class="section-title"><h2>Крамничка</h2></div><div class="empty-state"><b>Зараз не до того.</b><br><br>Спочатку виберіться туди, де можна спокійно торгуватись або рубати дрова, а не чекати, поки вас хтось вʼєбе біля сараю.</div>`}
function decorateShop096(){
  document.querySelectorAll('.job-card').forEach(card=>{if(!/Нарубати дрова/.test(card.textContent||''))return;const sp=card.querySelector('span');if(sp&&!/10 XP/.test(sp.textContent||'')&&!/вже зробили|Уже зробили/i.test(sp.textContent||''))sp.textContent=`${sp.textContent} · +10 XP`});
}
function decorateStats096(){
  document.querySelectorAll('.stat-upgrade-card').forEach(card=>{
    card.querySelector('.stat-meter096')?.remove();const txt=card.querySelector('.stat-level')?.textContent||'';
    const base=Math.max(0,Number(txt.match(/Рівень\s+(\d+)/)?.[1]||0));const mod=Number(txt.match(/стани\s+([+-]?\d+)/)?.[1]||0);const now=Math.max(0,base+mod);
    const meter=document.createElement('div');meter.className='stat-meter096';
    for(let i=1;i<=10;i++){const x=document.createElement('i');if(i<=base)x.classList.add('perm');if(mod>0&&i>base&&i<=Math.min(10,base+mod))x.classList.add('buff');if(mod<0&&i>now&&i<=base)x.classList.add('debuff');meter.appendChild(x)}
    const level=card.querySelector('.stat-level');if(level){const clean=level.innerHTML.replace(/\s*·\s*зараз\s*\d+/i,'');level.innerHTML=`${clean} · зараз ${now}`}
    card.appendChild(meter);
  });
  const head=document.querySelector('#menuContent .section-title h2');if(head?.textContent==='Характеристики'){
    const prog=document.querySelector('#menuContent .progression-card small');if(prog)prog.textContent='Сюжетні дії дають XP. 100 XP = новий рівень + 1 очко. Тільки ви вирішуєте, яку характеристику підняти.';
  }
}
function decorateNeeds096(){const h=document.querySelector('#menuContent .section-title h2');if(h?.textContent!=='Потреби')return;const c=document.querySelector('#menuContent .info-card');if(c)c.textContent='Здоровʼя, вода, ситість і бадьорість працюють напряму. Окремих станів «голодний», «сушняк» чи «розбита голова» нема. Нижче 35% бадьорості зʼявляється «ЗАЄБАВСЯ», знімається вище 55%. При 0% потреб здоровʼя вже починає зменшуватись.'}
function decorateCompanions096(){
  const h=document.querySelector('#menuContent .section-title h2');if(h?.textContent!=='Компаньйони')return;
  document.querySelectorAll('.companion-profile').forEach(card=>{
    [...card.querySelectorAll('.companion-characteristics')].forEach(x=>{if(/Характер і стосунки/i.test(x.textContent||''))x.remove()});card.querySelector('.companion-warning')?.remove();
    card.classList.add('comp-collapsed096');const main=card.querySelector('.companion-main');if(main&&!main.dataset.fold096){main.dataset.fold096='1';main.setAttribute('role','button');main.setAttribute('tabindex','0');const toggle=()=>card.classList.toggle('comp-open096');main.onclick=toggle;main.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}}}
  });
}

async function renderCharacters096(){
  activateTab096('characters');const root=document.querySelector('#menuContent');root.innerHTML='<div class="section-title"><h2>Персонажі</h2></div><div class="empty-state">Завантаження...</div>';
  const s=await currentSaved096();if(!s){root.innerHTML='<div class="section-title"><h2>Персонажі</h2></div><div class="empty-state">Поки пусто.</div>';return}
  const entered=new Set(s.story?.entered||[]),chars=[];
  const galya=Boolean(s.relationships?.galina?.known||[...entered].some(x=>/galina/i.test(String(x))));
  if(galya){const facts=[];if(s.flags?.localClothes)facts.push('Дала вам місцеві шмотки.');if(s.flags?.galinaFedAfterShed)facts.push('Нагодувала після пригоди біля сараю.');chars.push({name:'Баба Галя',portrait:'./galina_base.png',facts})}
  const hoodSeen=entered.has('ch2_figure')||[...entered].some(x=>/^ch3_(intro|obey|turn|tell_off)/.test(String(x)));
  if(hoodSeen)chars.push({name:'Постать',portrait:'./ch2_unknown_v2.png',facts:['Обличчя поки не видно.','Знає про сарай більше, ніж говорить.']});
  const catSeen=Boolean(s.flags?.catMet||s.flags?.catFirstMeeting||[...entered].some(x=>String(x).startsWith('ch3_cat_')));
  if(catSeen){const facts=['Живе в баби Галі.','Лежить де хоче.'];if(s.flags?.catFirstMeeting==='insult')facts.push('Ви вже встигли посратись.');if(s.flags?.catFirstMeeting==='petAttempt')facts.push('Пальці ви вчасно забрали.');chars.push({name:'Риже гамно',portrait:'./cat_base_095m.png',facts})}
  const creatureSeen=entered.has('ch3_creature')||[...entered].some(x=>/^ch3_(vodka|garlic|run|ask_pigeon|pray)/.test(String(x)));
  if(creatureSeen){const named=Boolean(s.flags?.truposmerdNamed096),facts=['Вилізло із сараю.'];if(named)facts[0]='Виліз із сараю. Воняє до ригачок.';if(s.flags?.itemKnown095s_garlic||s.flags?.creatureGarlicUsed)facts.push('Часник йому дуже не подобається.');if(s.flags?.creaturePrayerReactionKnown095w)facts.push('На молитву реагує дуже дивно.');if(s.flags?.creatureVodkaFriend)facts.push('Горілку любить.');chars.push({name:named?'ТРУПОСМЕРД':'???',portrait:'./creature_normal_095f.webp',facts})}
  root.innerHTML=`<div class="section-title"><h2>Персонажі</h2></div>${chars.length?chars.map(c=>`<details class="character-card096"><summary><img src="${esc(c.portrait)}" alt=""><b>${esc(c.name)}</b></summary><div>${c.facts.length?c.facts.map(f=>`<p>${esc(f)}</p>`).join(''):'<p>Поки ви про нього майже нічого не знаєте.</p>'}</div></details>`).join(''):'<div class="empty-state">Поки ви ні з ким нормально не познайомились.</div>'}`;
}
async function renderMap096(){
  activateTab096('map');const root=document.querySelector('#menuContent');const s=await currentSaved096();if(!s)return;
  const unlocked=Boolean(s.flags?.mapUnlocked),scene=String(s.story?.sceneId||s.scene||''),loc=String(s.world?.location||'');
  const knownHome=unlocked,knownWake=Boolean(s.flags?.chapter2Started)||/^ch[23]_/.test(scene),knownShed=Boolean(s.flags?.heardShedConversation||s.flags?.heardShedBang||s.flags?.pigeonSawInsideShed||s.flags?.ignoredShed)||/^ch3_/.test(scene)||/^ch2_(pee|bang|after_bang|side|garlic|salo|pigeon_scared|leave|figure|end)/.test(scene);
  const currentHome=/хат|криниц/i.test(loc),currentWake=/помин|стол|двір/i.test(loc)&&!/сарай/i.test(loc),currentShed=/сарай/i.test(loc);
  const marker=(label,x,y,current=false,small=false)=>`<div class="map-marker known${small?' small':''}${current?' current':''}" style="left:${x}%;top:${y}%">${label}</div>`;const unknown=(x,y)=>`<div class="map-unknown" style="left:${x}%;top:${y}%"><span>?</span></div>`;
  const overlays=unlocked?[knownHome?marker('Хатина з криницею',27,70,currentHome):unknown(27,70),knownWake?marker('Двір з поминками',64,39,currentWake):unknown(64,39),knownShed?marker('Сарай',83,47,currentShed,true):unknown(83,47),unknown(21,18),unknown(45,13),unknown(84,20)].join(''):'';
  root.innerHTML=`<div class="section-title"><h2>Карта</h2></div><div class="map-visual ${unlocked?'':'locked'}"><img src="./map_village.jpg?v=084" alt="Карта села">${unlocked?`<div class="map-overlays">${overlays}</div>`:`<div class="map-lock-copy"><b>ПОКИ ЗАКРИТО</b><span>Спочатку треба розібратись, де ви взагалі опинились.</span></div>`}</div>${unlocked?'<div class="map-help">Назва зʼявляється тільки після того, як ви реально відкрили місце. Все інше – ?</div>':''}`;
}
function addCharactersTab096(){const nav=document.querySelector('#menuTabs');if(!nav||nav.querySelector('[data-tab="characters"]'))return;const b=document.createElement('button');b.dataset.tab='characters';b.textContent='Персонажі';const rel=nav.querySelector('[data-tab="relations"]');nav.insertBefore(b,rel||null);b.onclick=renderCharacters096}
function installMenuHooks096(){
  addCharactersTab096();
  const stats=document.querySelector('#menuTabs [data-tab="stats"]');stats?.addEventListener('click',()=>setTimeout(decorateStats096,0),true);
  const needs=document.querySelector('#menuTabs [data-tab="needs"]');needs?.addEventListener('click',()=>setTimeout(decorateNeeds096,0),true);
  const comps=document.querySelector('#menuTabs [data-tab="companions"]');comps?.addEventListener('click',()=>setTimeout(decorateCompanions096,0),true);
  const map=document.querySelector('#menuTabs [data-tab="map"]');map?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();renderMap096()},true);
  const shop=document.querySelector('#menuTabs [data-tab="shop"]');shop?.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();const s=await currentSaved096();if(!safeForShop096(s)){shopBlocked096();return}shop.onclick?.call(shop);setTimeout(decorateShop096,0)},true);
}

// 24. Extend the existing test UI without touching normal saves.
function injectTestOptions096(){
  const box=document.querySelector('.test-options');if(!box||box.dataset.v096)return;box.dataset.v096='1';
  const opts=[['testYeb096','ОСТАНОВОЧКА ЄБАТОРІУМ','yebatorium'],['testTipsy096','ПІД ГРАДУСОМ','tipsy'],['testAngry096','ЗЛИЙ','angry'],['testSusp096','СОБАКА-ПОДОЗРЄВАКА','suspicious'],['testTired096','ЗАЄБАВСЯ','tired'],['testSkunk096','ДИКИЙ СКУНС','skunk']];
  for(const [id,label,status] of opts){const l=document.createElement('label');l.innerHTML=`<input type="checkbox" id="${id}" data-test-status096="${status}"> Дати ${label}`;box.appendChild(l)}
  document.querySelectorAll('[data-test-chapter]').forEach(btn=>btn.addEventListener('click',()=>{const statuses=[...document.querySelectorAll('[data-test-status096]:checked')].map(x=>x.dataset.testStatus096);if(document.querySelector('#testScared')?.checked)statuses.push('scared');const cfg={statuses,sunset:Boolean(document.querySelector('#testSunset')?.checked)};try{localStorage.setItem('dnt-test-v096',JSON.stringify(cfg))}catch{}},true));
}
function installTestHooks096(){document.querySelector('#testModeBtn')?.addEventListener('click',()=>{for(const ms of [0,60,180,400])setTimeout(injectTestOptions096,ms)},true)}

// Hero art remap after all old patches have run.
const HERO_MAP096={
 './hero_shrug_095.webp':'./hero_shrug_096.png','./hero_annoyed_095.webp':'./hero_angry_096.png','./hero_laugh_095.webp':'./hero_laugh_096.png','./hero_shocked_095.webp':'./hero_shocked_096.png','./hero_worried_095.webp':'./hero_worry_096.png','./hero_injured_095.webp':'./hero_injured_096.png','./hero_injured.png':'./hero_injured_096.png','./ch2_hero_tired.png':'./hero_worry_096.png','./ch2_hero_scared.png':'./hero_shocked_096.png','./ch2_hero_side.png':'./hero_shrug_096.png','./ch2_hero_local.png':'./hero_shrug_096.png'
};
function remapHero096(a){if(!a||typeof a!=='object')return a;const src=String(a.src||'');return HERO_MAP096[src]?{...a,src:HERO_MAP096[src]}:a}
function patchHeroArt096(){for(const scene of allScenes()){if(Array.isArray(scene.actors))scene.actors=scene.actors.map(remapHero096)}}

function addCss096(){if(document.querySelector('#patch096css'))return;const st=document.createElement('style');st.id='patch096css';st.textContent=`
.stat-meter096{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin-top:10px}.stat-meter096 i{height:14px;border-radius:3px;border:1px solid #4a574f;background:transparent}.stat-meter096 i.perm{background:#eee8dc}.stat-meter096 i.buff{background:#74ad79}.stat-meter096 i.debuff{background:#b95b54}
.companion-profile.comp-collapsed096>:not(.companion-main){display:none}.companion-profile.comp-open096>:not(.companion-main){display:block}.companion-main[role="button"]{cursor:pointer}.companion-main[role="button"]:after{content:'Натисніть, щоб відкрити';display:block;font-size:.72rem;opacity:.65;margin-left:auto}.comp-open096 .companion-main[role="button"]:after{content:'Згорнути'}
.character-card096{border:1px solid #34443a;border-radius:18px;background:#122017;margin:10px 0;overflow:hidden}.character-card096 summary{display:flex;align-items:center;gap:14px;padding:14px;cursor:pointer}.character-card096 summary img{width:64px;height:64px;object-fit:contain}.character-card096>div{padding:0 16px 14px}.character-card096 p{margin:7px 0;color:#d6d0c4}
.stage-image .actor.face-left{transform:scaleX(-1)!important;transform-origin:center bottom!important}
.stage-image:has(.actor-2) .actor.hero{left:0!important;right:auto!important;max-width:38%!important}.stage-image:has(.actor-2) .actor.pigeon{left:40%!important;right:auto!important;max-width:20%!important;z-index:5!important}.stage-image:has(.actor-2) .actor.npc{left:auto!important;right:0!important;max-width:40%!important}
`;document.head.appendChild(st)}

function fixOutdatedUiCopy096(){
  const about=document.querySelector('#aboutOverlay .about-copy');if(about){about.innerHTML=about.innerHTML.replace('Голод, страх, холод, будуняра та інша хуйня реально впливають на характеристики й бій.','Будуняра, страх, злість, підозра, втома та інша хуйня реально впливають на характеристики й дії.').replace('За досвід росте загальний рівень героя','За досвід росте ваш загальний рівень')}
}
function stamp096(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.6')}

function apply096(){
  patchEvpapiyMeeting096();patchWater096();patchLegend096();patchStateTriggers096();patchHealth096();patchGarlicMemory096();patchTruposmerdKnowledge096();patchKnowledgeTiming096();patchSunset096();patchMapUnlockNotice096();unifyProgression096();moveStaticConsequences096();patchHeroArt096();addCss096();installMenuHooks096();installTestHooks096();fixOutdatedUiCopy096();stamp096();
}
queueMicrotask(apply096);
