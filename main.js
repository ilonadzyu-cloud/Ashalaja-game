import {STAT_KEYS,STAT_LABELS,STAT_DESCRIPTIONS} from './config.js?v=083';
import {STATUS_DEFS,CLOTHES,ITEM_DEFS} from './data.js?v=083';
import {createInitialState,normalizeState,formatTime,threatInfo,thermal,equipmentTotals,equip,statModifiers,effectiveStat,itemCount,assignQuickSlot,useItem,executeAction,previewAction,addItem} from './engine.js?v=083';
import {listRuns,loadRun,saveRun,clearRun,saveManual,loadManual,listManual,emergencySaveRun,storageCapabilities} from './storage.js?v=083';
import {audioManager} from './audio.js?v=071';
import {getChapter1Scene,CHAPTER1_SCENES,resolveSceneValue} from './chapter1.js?v=083';
import {getChapter2Scene,CHAPTER2_SCENES} from './chapter2.js?v=083';

function getGameScene(state){
  const id=state?.story?.sceneId||state?.scene||'intro';
  return CHAPTER2_SCENES[id]||CHAPTER1_SCENES[id]||getChapter1Scene(state);
}

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const paras=t=>String(t||'').split('\n\n').map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
const lowerFirst=s=>{s=String(s||'');return s?s[0].toLocaleLowerCase('uk-UA')+s.slice(1):s};

let G=null;
let currentTab='inventory';
let inventoryCategory='all';
let noticeQueue=[];
let noticeBusy=false;
let persistChain=Promise.resolve();
let sfxTimers=[];
const categories=['all','Їжа та напої','Ліки','Зброя','Якась хуйня'];

const statFlavor={
  strength:{1:'Пока не Геракл.',2:'Ну, лавку вже не боїтесь.',3:'Вже можна шось важче за голуба.',4:'Може, двері самі відкриються.',5:'Село починає берегти меблі.'},
  attention:{1:'Шерлок з вас пока так собі.',2:'Шось таки помічаєте.',3:'Муху в супі вже не пропустите.',4:'Від вас хуй шо сховаєш.',5:'Бачите вже більше, ніж хотілось би.'},
  agility:{1:'Не навернулись – уже добре.',2:'Ноги вже іноді слухаються.',3:'Може, навіть втечете красиво.',4:'Болото перестає бути босом.',5:'Поки всі думають – ви вже зʼїбались.'},
  charisma:{1:'Викрутитись можете, але шанс мізерний.',2:'Вже не кожна розмова закінчується «йди нахуй».',3:'Можете даже когось переконати.',4:'Люди чомусь вас слухають.',5:'От тепер можна пиздіти впевнено.'},
  pofigism:{1:'Пока ше не всьо похуй.',2:'Уже трохи легше дивитись на піздєц.',3:'«Ну і хуй з ним» працює частіше.',4:'Вас уже важко здивувати.',5:'Майже духовне просвітлення.'},
  ahui:{1:'Ви тільки починаєте ахуєвати.',2:'Дивна хуйня вже не дивує кожні пʼять хвилин.',3:'Починаєте приймати правила цього дурдому.',4:'Самі вже звучите як місцевий.',5:'Ще трохи – і нормальне життя здасться дивним.'}
};

function statFlavorText(key,level){return statFlavor[key]?.[level]||`Рівень ${level}. Ше є куди рости.`}

function toast(title,text=''){
  const e=$('#toast');
  e.innerHTML=`<b>${esc(title)}</b>${text?`<span>${esc(text)}</span>`:''}`;
  e.classList.remove('hidden');
  clearTimeout(e._t);
  e._t=setTimeout(()=>e.classList.add('hidden'),2400);
}

function statusEffectText(id){
  const d=STATUS_DEFS[id];
  if(!d)return'';
  const parts=[];
  for(const [key,value] of Object.entries(d.mods||{})){
    if(!value)continue;
    parts.push(`${String(STAT_LABELS[key]||key).toLocaleLowerCase('uk-UA')} ${value>0?'+':''}${value}`);
  }
  for(const extra of d.extraEffects||[])parts.push(lowerFirst(extra).replace(/[.]$/,''));
  return parts.join(', ');
}

function queueState(id){if(!STATUS_DEFS[id])return;noticeQueue.push(id);pumpState()}
function pumpState(){
  if(noticeBusy||!noticeQueue.length)return;
  noticeBusy=true;
  const id=noticeQueue.shift(),d=STATUS_DEFS[id],effects=statusEffectText(id);
  $('#statePopup').innerHTML=`${d.portrait?`<img src="${d.portrait}" class="state-popup-img" alt="">`:''}<h2>${esc(d.name)}</h2><p>${esc(d.blurb||'')}</p>${effects?`<div class="state-popup-effect"><b>ефект:</b> ${esc(effects)}</div>`:''}<div class="state-popup-remove"><b>як позбутись:</b> ${esc(d.remove||'')}</div>`;
  $('#stateOverlay').classList.remove('hidden');
  $('#stateOverlay').setAttribute('aria-hidden','false');
}
function closeState(){noticeBusy=false;$('#stateOverlay').classList.add('hidden');$('#stateOverlay').setAttribute('aria-hidden','true');pumpState()}
function notifyEvents(events){
  for(const e of events||[]){
    if(e.type==='statusAdded')queueState(e.id);
    if(e.type==='statusRemoved')toast('СТАН ЗНЯТО',STATUS_DEFS[e.id]?.name||e.id);
    if(e.type==='statLevelUp')toast(`${STAT_LABELS[e.key]||e.key} – НОВИЙ РІВЕНЬ`,`Рівень ${e.level}`);
  }
}

function heroForClothes(){
  if(G?.flags?.localClothes)return './man_local.png';
  if(G?.activeStatuses?.includes('scared'))return './man_worry.png';
  if(G?.activeStatuses?.includes('tired'))return './man_tired.png';
  if(G?.activeStatuses?.includes('pigeonHumiliated'))return './man_angry.png';
  return './man_base.png';
}

function persist(){if(!G)return Promise.resolve();persistChain=persistChain.then(()=>saveRun(G)).catch(()=>emergencySaveRun(G));return persistChain}
function show(screen){for(const id of ['startScreen','howToScreen','gameScreen'])$('#'+id).classList.add('hidden');$('#'+screen).classList.remove('hidden')}

function askConfirm({title='Почати заново?',text='',okText='Так, почати заново'}={}){
  return new Promise(resolve=>{
    const overlay=$('#confirmOverlay'),ok=$('#confirmOkBtn'),cancel=$('#confirmCancelBtn');
    $('#confirmTitle').textContent=title;
    $('#confirmText').textContent=text;
    ok.textContent=okText;
    const finish=value=>{
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
      ok.onclick=null;cancel.onclick=null;overlay.onclick=null;
      resolve(value);
    };
    ok.onclick=()=>finish(true);
    cancel.onclick=()=>finish(false);
    overlay.onclick=e=>{if(e.target===overlay)finish(false)};
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');
  });
}

async function renderStart(mode='home'){
  show('startScreen');
  document.body.classList.remove('menu-open');
  G=null;
  audioManager.setAtmosphere('silent');
  const runs=await listRuns();
  const root=$('#runPicker');
  const actions=$('#startActions');
  root.innerHTML='';
  root.classList.toggle('hidden',mode==='home');
  actions.classList.toggle('hidden',mode!=='home');

  if(mode!=='home'){
    const head=document.createElement('div');
    head.className='run-picker-head';
    head.innerHTML=`<b>${mode==='new'?'Нове проходження':'Продовжити'}</b><button class="ghost tiny" data-back-start>Назад</button>`;
    root.appendChild(head);
    for(const r of runs){
      const s=r.state?normalizeState(r.state):null,tm=s?formatTime(s.clock.totalMinutes):null;
      const b=document.createElement('button');
      b.className='run-card';
      b.innerHTML=`<b>Проходження ${r.run}</b><span>${s?`Глава ${s.chapter} · ${tm.time}`:'Порожньо'}</span>`;
      b.onclick=()=>mode==='new'?startNew(r.run):continueRun(r.run,s);
      root.appendChild(b);
    }
    root.querySelector('[data-back-start]').onclick=()=>renderStart('home');
  }

  const cap=await storageCapabilities();
  const storage=$('#storageStatus');
  if(cap.readBack){storage.textContent='';storage.classList.add('hidden')}
  else{storage.textContent='Є проблема зі збереженням у цьому браузері.';storage.classList.remove('hidden')}
}

async function startNew(run){
  const old=await loadRun(run);
  if(old){
    const ok=await askConfirm({title:`Стерти проходження ${run}?`,text:'Цей сейв буде видалено, і гра почнеться з самого початку.',okText:'Так, почати заново'});
    if(!ok)return;
  }
  await clearRun(run);
  G=createInitialState(run);
  await saveRun(G);
  show('howToScreen');
}

async function continueRun(run,state){
  if(!state){toast('НЕМА СЕЙВУ','Тут ще нема проходження.');return}
  G=normalizeState(state);
  show('gameScreen');
  await renderGame();
}

async function beginGame(){
  show('gameScreen');
  await renderGame();
  if(!G.flags.initialStatusPopupShown){
    G.flags.initialStatusPopupShown=true;
    await persist();
    queueState('hangover');
  }
}

function clearSfx(){for(const t of sfxTimers)clearTimeout(t);sfxTimers=[]}
async function ensureSceneEntered(scene){
  const id=scene.id;
  const chapter=Number(scene.chapter||G.chapter||1);
  G.chapter=chapter;G.story.chapter=chapter;
  if(G.story.entered.includes(id))return false;
  G.story.entered.push(id);
  const world=resolveSceneValue(scene.world||[],G)||[];
  const onEnter=resolveSceneValue(scene.onEnter||[],G)||[];
  const r=executeAction(G,{id:`enter_${id}`,effects:[...world,...onEnter]});
  G=r.state;
  G.story.entered=[...new Set([...G.story.entered,id])];
  G.story.sceneId=id;G.scene=id;
  notifyEvents(r.events);
  clearSfx();
  for(const fx of scene.sfxOnEnter||[])sfxTimers.push(setTimeout(()=>audioManager.playEffect(fx.id,{volume:fx.volume||1}),fx.delay||0));
  await persist();
  return true;
}
function syncSceneAudio(scene){audioManager.setAtmosphere(scene?.atmosphere||'silent')}
async function renderGame(){
  if(!G)return;
  G=normalizeState(G);
  let scene=getGameScene(G);
  await ensureSceneEntered(scene);
  scene=getGameScene(G);
  syncSceneAudio(scene);
  renderHeader();renderStage(scene);renderStory(scene);renderQuickSlots();renderActiveStates();
  if(!$('#menuOverlay').classList.contains('hidden'))renderMenu();
}

function renderHeader(){
  const tm=formatTime(G.clock.totalMinutes),w=G.world.weather,t=thermal(G),th=threatInfo(G);
  $('#timeLine').textContent=`День ${tm.day} · ${tm.time}`;
  $('#weatherLine').textContent=`${w.icon} ${w.label} ${w.tempC}° · ${t.feel}`;
  $('#threatLine').textContent=`Небезпека: ${th.label}`;
  $('#threatLine').className=`threat ${th.key}`;
  const vals=[['❤️',G.health,'Здоровʼя'],['🍞',G.needs.satiety,'Ситість'],['💧',G.needs.water,'Вода'],['⚡',G.needs.energy,'Бадьорість']];
  $('#miniNeeds').innerHTML=vals.map(([i,v,label])=>`<span title="${label}">${i} ${Math.round(v)}%</span>`).join('');
}

function renderStage(scene){
  const root=$('#stageImage');
  root.style.backgroundImage=`linear-gradient(rgba(5,8,6,.05),rgba(5,8,6,.16)),url('${scene.background||'./bg.jpg'}')`;
  root.className=`stage-image ${scene.stageTone||''}`;
  const actors=resolveSceneValue(scene.actors||[],G)||[];
  root.innerHTML=actors.map((a,i)=>{const src=resolveSceneValue(a.src,G);return `<img src="${src}" class="actor ${esc(a.role||'')} ${esc(a.position||'')} actor-${i}" alt="">`}).join('');
}

function resolveChoices(scene){const xs=resolveSceneValue(scene.choices||[],G)||[];return xs.filter(c=>c&&(!c.showIf||c.showIf(G)))}
async function choose(choice){
  await audioManager.unlock();
  const r=executeAction(G,{id:choice.id,minutes:choice.minutes||0,activity:choice.activity||'light',effects:choice.effects||[],hiddenEffects:choice.hiddenEffects||[]});
  G=r.state;notifyEvents(r.events);
  if(choice.next){G.story.sceneId=choice.next;G.scene=choice.next}
  await persist();await renderGame();window.scrollTo({top:0,behavior:'instant'});
}

function renderStory(scene){
  $('#storyKicker').textContent=`ГЛАВА ${scene.chapter||G.chapter||1} · ${scene.caption||'ДЕСЬ НЕ ТАМ'}`;
  $('#storyText').innerHTML=paras(resolveSceneValue(scene.text||'',G));
  const n=resolveSceneValue(scene.notice||null,G);
  $('#storyExtras').innerHTML=n?`<div class="story-notice"><b>${esc(n.title)}</b><span>${esc(n.body)}</span></div>`:'';
  const root=$('#storyChoices');root.innerHTML='';
  if(scene.end)return;
  for(const c of resolveChoices(scene)){
    const b=document.createElement('button');
    b.className=`story-choice ${c.kind==='secret'?'secret':''}`;
    const prev=previewAction(G,{id:'preview',minutes:c.minutes||0,activity:c.activity||'light',effects:c.effects||[]}).filter(x=>/^(Бадьорість|Вода|Ситість|Здоровʼя)/.test(x));
    const prevHtml=prev.map(x=>`<span class="choice-cost ${x.includes('+')?'plus':'minus'}">${esc(x)}</span>`).join(' · ');
    b.innerHTML=`<span>${esc(c.label)}</span>${prev.length?`<small>${prevHtml}</small>`:''}`;
    b.onclick=()=>choose(c);
    root.appendChild(b);
  }
}

function renderQuickSlots(){
  const root=$('#quickSlots');
  root.innerHTML=G.quickSlots.map((id,i)=>!id?`<button class="quick-slot empty" data-q="${i}">Слот ${i+1}</button>`:`<button class="quick-slot" data-q="${i}">${ITEM_DEFS[id]?.icon||'◻'} ${esc(ITEM_DEFS[id]?.name||id)} <b>×${itemCount(G,id)}</b></button>`).join('');
  root.querySelectorAll('[data-q]').forEach(b=>b.onclick=async()=>{
    const i=Number(b.dataset.q),id=G.quickSlots[i];
    if(!id){openMenu('inventory');return}
    const r=useItem(G,id);
    if(!r.used){toast('НЕ ВИКОРИСТОВУЄТЬСЯ','Ця штука поки сюжетна.');return}
    G=r.state;notifyEvents(r.events);await persist();await renderGame();toast('ВИКОРИСТАНО',ITEM_DEFS[id].name);
  });
}

function renderActiveStates(){
  const ids=G.activeStatuses||[];
  $('#activeStateCount').textContent=ids.length?`(${ids.length})`:'';
  $('#activeStates').innerHTML=ids.length?ids.map(id=>{
    const d=STATUS_DEFS[id],effects=statusEffectText(id);
    return `<div class="active-state-card"><b>${esc(d?.name||id)}</b>${effects?`<span><b>ефект:</b> ${esc(effects)}</span>`:''}</div>`;
  }).join(''):'<span class="small">Нічого активного.</span>';
}

function openMenu(tab='inventory'){
  currentTab=tab;
  document.body.classList.add('menu-open');
  $('#menuOverlay').classList.remove('hidden');
  $('#menuOverlay').setAttribute('aria-hidden','false');
  renderMenu();
}
function closeMenu(){
  document.body.classList.remove('menu-open');
  $('#menuOverlay').classList.add('hidden');
  $('#menuOverlay').setAttribute('aria-hidden','true');
  syncSceneAudio(getGameScene(G));
}
function renderMenu(){
  document.querySelectorAll('#menuTabs [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===currentTab));
  const tm=formatTime(G.clock.totalMinutes);$('#menuMeta').textContent=`Проходження ${G.runId} · День ${tm.day}, ${tm.time}`;
  ({states:renderStates,stats:renderStats,needs:renderNeeds,inventory:renderInventory,clothes:renderClothes,companions:renderCompanions,relations:renderRelations,map:renderMap,shop:renderShop,settings:renderSettings}[currentTab]||renderInventory)();
}

function renderInventory(){
  const root=$('#menuContent');
  const filtered=G.inventory.filter(s=>inventoryCategory==='all'||ITEM_DEFS[s.id]?.category===inventoryCategory);
  root.innerHTML=`<div class="section-title"><h2>Інвентар</h2><span>${G.inventory.length}/16 слотів</span></div><div class="category-tabs">${categories.map(c=>`<button data-cat="${esc(c)}" class="${inventoryCategory===c?'active':''}">${c==='all'?'Все':esc(c)}</button>`).join('')}</div><div class="item-grid">${filtered.length?filtered.map(s=>{const d=ITEM_DEFS[s.id]||{};return `<article class="item-card"><div class="item-icon">${d.icon||'◻️'}</div><div class="item-copy"><b>${esc(d.name||s.id)}</b><span>${esc(d.description||'')}</span><small>${esc(d.category||'')} · ×${s.qty}</small><div class="item-actions">${d.useEffects?.length?`<button data-use="${s.id}">Використати</button>`:''}<button data-slot="0" data-item="${s.id}">1</button><button data-slot="1" data-item="${s.id}">2</button><button data-slot="2" data-item="${s.id}">3</button></div></div></article>`}).join(''):'<div class="empty-state">Тут поки пусто.</div>'}</div>`;
  root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{inventoryCategory=b.dataset.cat;renderInventory()});
  root.querySelectorAll('[data-use]').forEach(b=>b.onclick=async()=>{const r=useItem(G,b.dataset.use);if(!r.used)return;G=r.state;notifyEvents(r.events);await persist();await renderGame();renderInventory()});
  root.querySelectorAll('[data-slot]').forEach(b=>b.onclick=async()=>{assignQuickSlot(G,Number(b.dataset.slot),b.dataset.item);await persist();renderQuickSlots();renderInventory();toast('ШВИДКИЙ СЛОТ',`Поставлено в слот ${Number(b.dataset.slot)+1}`)});
}

function clothingBonusText(d){
  const parts=[`броня +${Number(d.armor||0)}`,`тепло +${Number(d.warmth||0)}`,`дощ +${Number(d.rainProtection||0)}`];
  if(d.heatBurden)parts.push(`спека +${d.heatBurden}`);
  for(const [k,v] of Object.entries(d.statMods||{}))if(v)parts.push(`${String(STAT_LABELS[k]||k).toLocaleLowerCase('uk-UA')} ${v>0?'+':''}${v}`);
  return parts.join(' · ');
}

function renderClothes(){
  const root=$('#menuContent'),tot=equipmentTotals(G);
  const equippedIds=Object.values(G.equipment||{}).filter(id=>CLOTHES[id]);
  const ownedIds=[...new Set([...(Array.isArray(G.ownedClothes)?G.ownedClothes:[]),...equippedIds])].filter(id=>CLOTHES[id]);
  if(G.flags?.localClothes){
    for(const id of ['local_shirt','local_vest','local_pants','boots'])if(CLOTHES[id]&&!ownedIds.includes(id))ownedIds.push(id);
  }
  if(!ownedIds.length){
    for(const id of ['modern_shirt','modern_jacket','modern_pants','modern_boots'])if(CLOTHES[id])ownedIds.push(id);
  }
  root.innerHTML=`<div class="section-title"><h2>Шмотки</h2></div><div class="clothes-total"><span><b>Броня</b> ${tot.armor}</span><span><b>Тепло</b> ${tot.warmth}</span><span><b>Захист від дощу</b> ${tot.rainProtection}</span></div><div class="clothes-shell"><div class="clothes-hero"><img src="${heroForClothes()}" alt="Герой"><div class="equipped-list">${equippedIds.map(id=>`<span>${esc(CLOTHES[id].name)}</span>`).join('')}</div></div><div class="clothes-list">${ownedIds.map(id=>{const d=CLOTHES[id];const on=G.equipment?.[d.slot]===id;return `<article class="clothes-card ${on?'equipped':''}"><b>${esc(d.name)}</b>${d.note?`<span>${esc(d.note)}</span>`:''}<small>${esc(clothingBonusText(d))}</small><button data-equip="${id}" ${on?'disabled':''}>${on?'Вдягнено':'Вдягнути'}</button></article>`}).join('')}</div></div>`;
  root.querySelectorAll('[data-equip]').forEach(b=>b.onclick=async()=>{
    const before=new Set(G.activeStatuses||[]);
    equip(G,b.dataset.equip);
    const after=new Set(G.activeStatuses||[]),ev=[];
    for(const id of after)if(!before.has(id))ev.push({type:'statusAdded',id});
    for(const id of before)if(!after.has(id))ev.push({type:'statusRemoved',id});
    notifyEvents(ev);await persist();await renderGame();renderClothes();
  });
}

function renderStats(){
  const mods=statModifiers(G),root=$('#menuContent');
  root.innerHTML=`<div class="section-title"><h2>Характеристики</h2></div><div class="info-card">10 очок прогресу = новий рівень. Прогрес постійний, а стани й одяг дають тимчасовий плюс або мінус. Зелені поділки – плюс, червоні – мінус.</div><div class="stat-list">${STAT_KEYS.map(k=>{
    const st=G.stats[k]||{level:1,progress:0},progress=Math.max(0,Math.min(9,Number(st.progress||0))),level=Math.max(1,Number(st.level||1)),mod=Number(mods[k]||0),now=effectiveStat(G,k);
    const lost=Math.min(progress,Math.max(0,-mod)),kept=progress-lost,bonus=Math.max(0,Math.min(10-progress,mod));
    const pips=Array.from({length:10},(_,i)=>`<span class="pip ${i<kept?'base':i<progress?'debuff':i<progress+bonus?'buff':''}"></span>`).join('');
    const id=`stat-desc-${k}`;
    return `<article class="stat-card"><div class="stat-head"><div><b>${STAT_LABELS[k]}</b> <button class="info-btn" type="button" data-info="${id}">ⓘ</button><div class="stat-level">Рівень ${level} · прогрес ${progress}/10${mod?` · <span class="${mod>0?'buff-text':'debuff-text'}">тимчасово ${mod>0?'+':''}${mod}</span> · зараз ${now}`:''}</div></div></div><div class="stat-meter">${pips}</div><div class="stat-desc" id="${id}">${esc(STAT_DESCRIPTIONS[k])}</div><div class="stat-flavor">${esc(statFlavorText(k,level))}</div></article>`;
  }).join('')}</div>`;
  root.querySelectorAll('.info-btn').forEach(btn=>btn.onclick=()=>{const el=$('#'+btn.dataset.info);if(el)el.classList.toggle('open')});
}

function needTone(v){v=Number(v)||0;if(v>40)return'needgood';if(v>20)return'needmid';if(v>5)return'needlow';return'needcrit'}
function needFlavor(kind,v){
  v=Number(v)||0;
  if(kind==='health'){
    if(v>=90)return'Здоровʼя в порядку.';
    if(v>60)return'Трохи потріпало, але тримаєтесь.';
    if(v>40)return'Здоровʼя просіло – треба відновитись.';
    if(v>20)return'Добряче дісталось – треба підлікуватись.';
    if(v>5)return'Здоровʼя мало – треба терміново підлікуватись.';
    return'Здоровʼя критично мало – ледве тримаєтесь.';
  }
  if(kind==='hunger'){
    if(v>=90)return'Наїлись, їсти поки не хочеться.';
    if(v>40)return'Шось би перекусити.';
    if(v>20)return'Голодний капець.';
    if(v>5)return'Їсти хочеться пиздець.';
    return G.flags.knowsPigeonName?'Євпапій починає виглядати їстівним.':G.flags.metPigeon?'Голуб починає виглядати їстівним.':'Ви вже готові зʼїсти хуй зна шо.';
  }
  if(kind==='thirst'){
    if(v>=90)return'Напились, пити поки не хочеться.';
    if(v>40)return'Шось би випити.';
    if(v>20)return'Сушить.';
    if(v>5)return'Пити хочеться пиздець.';
    return'Ви вже готові пити хуй зна шо.';
  }
  if(kind==='fatigue'){
    if(v>=90)return'Відпочили, сил вистачає.';
    if(v>40)return'Поки нормально.';
    if(v>20)return'Трохи підзаєбались.';
    if(v>5)return'Спати вже хочеться.';
    return'Вирубає.';
  }
  return'';
}

function renderNeeds(){
  const rows=[['Здоровʼя',G.health,'health'],['Ситість',G.needs.satiety,'hunger'],['Вода',G.needs.water,'thirst'],['Бадьорість',G.needs.energy,'fatigue']];
  $('#menuContent').innerHTML=`<div class="section-title"><h2>Потреби</h2></div><div class="info-card">Чим більше відсотків, тим краще. Плюс – добре. Мінус – хуйово. На 40% і нижче вже починаються стани, на 20% – сильні дебафи, 5% і нижче – критично. Їжа відновлює ситість, напої – воду, перепочинок – бадьорість, аптечка – здоровʼя. Брудний одяг можна випрати або змінити. При 0% здоровʼя гра завершується.</div><div class="needs-list">${rows.map(([label,value,kind])=>`<article class="need-card"><div class="need-row"><b>${label}</b><b>${Math.round(value)}%</b></div><div class="need-bar ${needTone(value)}"><span style="width:${Math.max(0,Math.min(100,value))}%"></span></div><div class="stat-flavor">${esc(needFlavor(kind,value))}</div></article>`).join('')}</div>`;
}

function renderStates(){
  const known=new Set(G.discoveredStatuses);
  $('#menuContent').innerHTML=`<div class="section-title"><h2>Стани</h2></div><div class="info-card">На головному екрані показані активні стани. Тут – усе, що герой уже відкрив.</div><div class="state-list">${Object.entries(STATUS_DEFS).map(([id,d])=>{
    if(!known.has(id))return'<article class="locked-card"><b>???</b><span>Ще не відкрито.</span></article>';
    const effects=statusEffectText(id);
    return `<article class="state-card ${G.activeStatuses.includes(id)?'active':''}"><b>${esc(d.name)}</b>${d.blurb?`<span>${esc(d.blurb)}</span>`:''}${effects?`<small><b>ефект:</b> ${esc(effects)}</small>`:''}<small><b>як позбутись:</b> ${esc(d.remove||'')}</small>${d.persistentUnlock?'<small><b>особливий ефект:</b> відкриває секретні дії [ЄБАТОРІУМ].</small>':''}</article>`;
  }).join('')}</div>`;
}

function companionDots(value){
  const n=Math.max(0,Math.min(5,Math.round(Number(value||0)/2)));
  return `<span class="comp-dots" aria-label="${n} з 5">${'●'.repeat(n)}${'○'.repeat(5-n)}</span>`;
}

function renderCompanions(){
  const all=Object.entries(G.companions||{}).filter(([,c])=>c.known);
  if(!all.length){
    $('#menuContent').innerHTML=`<div class="section-title"><h2>Компаньйони</h2></div><div class="empty-state">Поки ви самі. Насолоджуйтесь моментом.</div>`;
    return;
  }

  $('#menuContent').innerHTML=`<div class="section-title"><h2>Компаньйони</h2></div>${all.map(([id,c])=>{
    if(id==='evpapiy'){
      const r=G.relationships?.evpapiy?.values||{};
      const stats=[
        ['ПІЗДАБОЛЬСТВО',r.bullshit,'як часто він бреше та підйобує.'],
        ['ДОВІРА',r.trust,'чим вище, тим більше шансів, шо ця жирна падла реально скаже щось корисне.'],
        ['ОБРАЗА',r.offense,'Євпапій памʼятає більше, ніж хотілося б.'],
        ['ЖАДІБНІСТЬ',r.greed,'наскільки легко його задобрити їжею.']
      ];
      return `<article class="companion-profile">
        <div class="companion-main">
          <img src="${esc(c.portrait||'./pigeon_base.png')}" alt="Євпапій">
          <div class="companion-main-copy">
            <div class="companion-name">${esc(c.name||'Євпапій')}</div>
            <div class="companion-state">${esc(c.active?'З вами':c.state||'Не з вами')}</div>
            <p>До вас прибився жирний наглий голуб, який дуже бісить.</p>
          </div>
        </div>
        <div class="companion-characteristics">
          <h3>Характеристики Євпапія</h3>
          ${stats.map(([label,value,desc])=>`<div class="comp-stat"><div class="comp-stat-head"><b>${label}</b>${companionDots(value)}</div><span>${esc(desc)}</span></div>`).join('')}
        </div>
        <div class="companion-warning">З ним може бути легше. Може, веселіше. А може, на вас просто чекає жирна підстава.</div>
      </article>`;
    }
    return `<article class="companion-card"><img src="${esc(c.portrait||'')}" alt=""><div><b>${esc(c.name)}</b><span>${esc(c.active?'З вами':c.state||'Не з вами')}</span>${c.facts?.map(x=>`<small>${esc(x)}</small>`).join('')||''}</div></article>`;
  }).join('')}`;
}

function renderRelations(){
  const known=Object.values(G.relationships).filter(r=>r.known);
  $('#menuContent').innerHTML=`<div class="section-title"><h2>Стосунки</h2></div><div class="info-card">Усе має наслідки. І не завжди бути добреньким – добре. Персонажі памʼятають, що ви витворяли, але цифри й приховані наслідки гра вам не спойлерить.</div>${known.length?known.map(r=>`<article class="relation-card"><b>${esc(r.name)}</b><span>Що саме цей персонаж про вас думає, доведеться поняти по ходу.</span></article>`).join(''):'<div class="empty-state">Ше нема кого бісити.</div>'}`;
}

function renderMap(){
  const unlocked=Boolean(G.flags.mapUnlocked);
  const scene=String(G.scene||G.story?.sceneId||'');
  const loc=String(G.world?.location||'');

  const knownHome=unlocked;
  const knownWake=Boolean(G.flags.chapter2Started)||scene.startsWith('ch2_');
  const knownShed=Boolean(G.flags.heardShedConversation||G.flags.heardShedBang||G.flags.pigeonSawInsideShed||G.flags.ignoredShed)||['ch2_pee','ch2_bang','ch2_bang3','ch2_after_bang','ch2_side','ch2_garlic','ch2_salo','ch2_pigeon_scared','ch2_leave','ch2_figure','ch2_end'].includes(scene);

  const currentHome=/хат|криниц/i.test(loc)&&!knownWake;
  const currentWake=/помин|стол/i.test(loc);
  const currentShed=/сарай/i.test(loc);

  const marker=(cls,label,x,y,current=false)=>`<div class="map-marker ${cls}${current?' current':''}" style="left:${x}%;top:${y}%">${label}</div>`;
  const unknown=(x,y)=>`<div class="map-unknown" style="left:${x}%;top:${y}%"><span>?</span></div>`;

  const overlays = unlocked ? [
    knownHome ? marker('known','Хатина з криницею',27,70,currentHome) : unknown(27,70),
    knownWake ? marker('known','Двір з поминками',64,39,currentWake) : unknown(64,39),
    knownShed ? marker('known small','Сарай',83,47,currentShed) : unknown(83,47),
    unknown(21,18),
    unknown(45,13),
    unknown(84,20)
  ].join('') : '';

  $('#menuContent').innerHTML=`<div class="section-title"><h2>Карта</h2></div>
    <div class="map-visual ${unlocked?'':'locked'}">
      <img src="./map_village.jpg?v=084" alt="Карта села">
      ${unlocked?`<div class="map-overlays">${overlays}</div>`:`<div class="map-lock-copy"><b>ПОКИ ЗАКРИТО</b><span>Спочатку треба хоча б трохи розібратись, де ви взагалі опинились.</span></div>`}
    </div>
    ${unlocked?`<div class="map-help">Назви зʼявляються прямо на карті тільки після того, як ви реально побували в локації. Знаки питання – місця, про які ви поки знаєте приблизно нихуя.</div>`:''}`;
}

function renderShop(){
  const items=[['water',4],['aspirin',8],['onion',2]];
  const jobs=[
    {id:'sweep',title:'Підмести двір',pay:2,minutes:15,done:G.flags.sweptYard,effects:[{type:'money',value:2}],hidden:[{type:'flag',key:'sweptYard',value:true}]},
    {id:'wood',title:'Нарубати дрова',pay:4,minutes:25,done:G.flags.choppedWood,effects:[{type:'money',value:4},{type:'stat',key:'strength',value:1}],hidden:[{type:'flag',key:'choppedWood',value:true}]},
    {id:'deal',title:'Підписатись на підозріле діло',pay:8,minutes:10,done:G.flags.suspiciousDeal,effects:[{type:'money',value:8}],hidden:[{type:'flag',key:'suspiciousDeal',value:true},{type:'flag',key:'suspiciousDealConsequence',value:true}]}
  ];
  $('#menuContent').innerHTML=`<div class="section-title"><h2>Крамничка</h2><span><b>${G.money}</b> монет</span></div>${G.flags.shopUnlocked?`<div class="shop-money">У вас зараз <b>${G.money} монет</b>.</div><div class="shop-grid">${items.map(([id,p])=>`<article class="item-card"><div class="item-icon">${ITEM_DEFS[id].icon}</div><div class="item-copy"><b>${esc(ITEM_DEFS[id].name)}</b><span>${p} мон.</span><button data-buy="${id}" data-price="${p}">Купити</button></div></article>`).join('')}</div><div class="section-title shop-work-title"><h2>Як заробити</h2></div><div class="shop-jobs">${jobs.map(j=>`<article class="job-card ${j.done?'done':''}"><div><b>${esc(j.title)}</b><span>${j.done?'Уже зробили.':`${j.minutes} хв · +${j.pay} монет`}</span></div><button data-job="${j.id}" ${j.done?'disabled':''}>${j.done?'Готово':'Взятись'}</button></article>`).join('')}</div>`:'<div class="locked-big">Ще закрито.</div>'}`;
  document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=async()=>{const p=Number(b.dataset.price);if(G.money<p){toast('НЕМА ГРОШЕЙ','Ну от так.');return}if(!addItem(G,b.dataset.buy,1)){toast('НЕМА МІСЦЯ','Інвентар забитий.');return}G.money-=p;await persist();renderShop()});
  document.querySelectorAll('[data-job]').forEach(b=>b.onclick=async()=>{
    const j=jobs.find(x=>x.id===b.dataset.job);if(!j||j.done)return;
    const r=executeAction(G,{id:`shop_${j.id}`,minutes:j.minutes,activity:'work',effects:j.effects,hiddenEffects:j.hidden});
    G=r.state;notifyEvents(r.events);await persist();await renderGame();renderShop();toast('ЗАРОБИЛИ',`+${j.pay} монет`);
  });
}


async function renderSettings(){
  const root=$('#menuContent'),a=audioManager.getSettings(),manual=await listManual(G.runId);
  root.innerHTML=`<div class="section-title"><h2>Налаштування</h2></div><div class="settings-block"><label><input id="soundEnabled" type="checkbox" ${a.enabled?'checked':''}> Звук</label><label>Загальна гучність <input id="masterVol" type="range" min="0" max="1" step=".05" value="${a.master}"></label><label>Атмосфера <input id="ambientVol" type="range" min="0" max="1" step=".05" value="${a.ambient}"></label><label>Ефекти <input id="effectsVol" type="range" min="0" max="1" step=".05" value="${a.effects}"></label><button id="testSound">Перевірити клік</button></div><div class="section-title"><h2>Ручні сейви</h2></div><div class="save-grid">${manual.map(x=>`<article><b>Слот ${x.slot}</b><span>${x.state?'Є сейв':'Порожньо'}</span><div><button data-save="${x.slot}">Зберегти</button>${x.state?`<button data-load="${x.slot}">Завантажити</button>`:''}</div></article>`).join('')}</div>`;
  $('#soundEnabled').onchange=e=>audioManager.setEnabled(e.target.checked);
  for(const [id,k] of [['masterVol','master'],['ambientVol','ambient'],['effectsVol','effects']])$('#'+id).oninput=e=>audioManager.setVolume(k,Number(e.target.value));
  $('#testSound').onclick=()=>audioManager.testEffect();
  root.querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{await saveManual(G,Number(b.dataset.save));toast('ЗБЕРЕЖЕНО',`Слот ${b.dataset.save}`);renderSettings()});
  root.querySelectorAll('[data-load]').forEach(b=>b.onclick=async()=>{const s=await loadManual(G.runId,Number(b.dataset.load));if(s){G=normalizeState(s);await persist();closeMenu();await renderGame();toast('ЗАВАНТАЖЕНО',`Слот ${b.dataset.load}`)}});
}

$('#newGameBtn').onclick=()=>renderStart('new');
$('#continueBtn').onclick=()=>renderStart('continue');
$('#beginGameBtn').onclick=beginGame;
$('#menuBtn').onclick=()=>openMenu('inventory');
$('#closeMenuBtn').onclick=closeMenu;
$('#exitBtn').onclick=async()=>{await persist();renderStart('home')};
$('#stateOkBtn').onclick=closeState;
$('#miniNeeds').onclick=()=>openMenu('needs');
$('#miniNeeds').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMenu('needs')}};
$('#menuOverlay').onclick=e=>{if(e.target===$('#menuOverlay'))closeMenu()};
document.querySelectorAll('#menuTabs [data-tab]').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;renderMenu()});
document.addEventListener('pointerdown',e=>{if(e.target.closest('button')){audioManager.unlock();audioManager.playEffect('ui',{volume:.32})}},{passive:true});
window.addEventListener('beforeunload',()=>{if(G)emergencySaveRun(G)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&G)emergencySaveRun(G)});

renderStart('home');
