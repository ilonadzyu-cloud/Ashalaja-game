import {STAT_KEYS,STAT_LABELS,STAT_DESCRIPTIONS,REL_LABELS} from './config.js?v=063';
import {STATUS_DEFS,CLOTHES,ITEM_DEFS} from './data.js?v=063';
import {
  createInitialState,normalizeState,formatTime,threatInfo,thermal,equipmentTotals,equip,
  statModifiers,effectiveStat,itemCount,assignQuickSlot,useItem,executeAction,previewAction
} from './engine.js?v=063';
import {
  listRuns,loadRun,saveRun,clearRun,saveManual,loadManual,listManual,
  emergencySaveRun,storageCapabilities
} from './storage.js?v=054';
import {audioManager} from './audio.js?v=059';
import {getChapter1Scene,resolveSceneValue,CHAPTER1_START} from './chapter1.js?v=063';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const paras=t=>String(t||'').split('\n\n').map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');

let G=null;
let currentTab='inventory';
let inventoryCategory='all';
let pendingQuickItem=null;
let toastTimer=null;
let noticeQueue=[];
let noticeBusy=false;
let stateModalQueue=[];
let stateModalBusy=false;
let sfxTimers=[];
let persistChain=Promise.resolve();

function howToCards(){
  return `
    <div class="howto-grid">
      <article class="howto-card howto-lead">
        <h2>Кожне ваше рішення має значення.</h2>
        <p>Вибір може змінити стан героя, вплинути на ставлення до вас або вилізти боком значно пізніше. Не все корисне виявиться добрим, а не кожна хуйова ідея закінчиться хуйово.</p>
        <p>Стани й характеристики можуть відкривати нові варіанти в діалогах і діях.</p>
        <p>Будьте обережні – не все те, чим здається.</p>
      </article>
      <article class="howto-card"><h2>Стани</h2><p>Стани змінюють характеристики героя. Деякі можна зняти. Деякі самі пройдуть. А деякі будуть з вами, поки ви не розгребете ту хуйню, яку наробили.</p></article>
      <article class="howto-card"><h2>Характеристики</h2><p>Сила, уважність, спритність, харизма й інші характеристики ростуть по ходу гри. Вони впливають на перевірки й інколи відкривають варіанти, яких ви інакше навіть не побачите.</p></article>
      <article class="howto-card"><h2>Інвентар і виживання</h2><p>Їжа, вода, бадьорість, здоровʼя, мокрий одяг і речі в кишенях – це не декор. Те, що ви взяли, зʼїли, вдягнули або лишили лежати, може знадобитися далеко не одразу.</p></article>
      <article class="howto-card"><h2>Памʼять персонажів</h2><p>Персонажі пам’ятатимуть, шо ви перед ними витворяли. Не кожен наслідок вилізе одразу.</p></article>
    </div>`;
}

function showHowToIntro(){
  $('#startScreen').classList.add('hidden');
  $('#gameScreen').classList.add('hidden');
  $('#howToScreen').classList.remove('hidden');
  $('#howToIntroCards').innerHTML=howToCards();
  audioManager.setAtmosphere('silent');
}

async function beginFromHowTo(){
  if(!G)return;
  await persist();
  $('#howToScreen').classList.add('hidden');
  showGame();
  if(!G.flags.initialStatusPopupShown){
    G.flags.initialStatusPopupShown=true;
    await persist();
    queueStateModal('hangover');
  }
}

function renderHowTo(root=$('#menuContent'),{embedded=false}={}){
  const heading=embedded?'':`<div class="section-title"><h2>Як грати</h2></div><p class="explain">Той самий вступ із початку нової гри.</p>`;
  root.innerHTML=`${heading}${howToCards()}`;
}

function showNextNotice(){
  if(noticeBusy||!noticeQueue.length)return;
  noticeBusy=true;
  const {title,body}=noticeQueue.shift();
  const el=$('#toast');
  el.innerHTML=`<b>${esc(title)}</b>${body?`<span>${esc(body)}</span>`:''}`;
  el.classList.remove('hidden');
  requestAnimationFrame(()=>el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=>{
      el.classList.add('hidden');
      noticeBusy=false;
      showNextNotice();
    },180);
  },2400);
}

function toast(title,body=''){
  noticeQueue.push({title,body});
  showNextNotice();
}

function renderStatePopup(id){
  const d=STATUS_DEFS[id];if(!d)return;
  const effects=statusEffectText(id);
  $('#statePopup').innerHTML=`<div class="state-popup-card"><img src="${d.portrait||'./hero-face.png'}" alt=""><div class="state-popup-copy"><h3>${esc(d.name)}</h3><div class="state-popup-blurb">${esc(d.blurb||'')}</div>${effects?`<div class="state-popup-effect">${esc(effects)}</div>`:''}<div class="state-popup-remove"><b>як позбутись:</b> ${esc(d.remove||'')}</div>${d.persistentUnlock?'<div class="state-popup-secret"><b>особливий ефект:</b> відкриває секретні дії [ЄБАТОРІУМ].</div>':''}</div></div>`;
}

function showNextStateModal(){
  if(stateModalBusy||!stateModalQueue.length)return;
  stateModalBusy=true;
  const id=stateModalQueue.shift();
  renderStatePopup(id);
  const overlay=$('#stateOverlay');
  overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');
}

function queueStateModal(id){
  if(!STATUS_DEFS[id])return;
  stateModalQueue.push(id);
  showNextStateModal();
}

function closeStateModal(){
  const overlay=$('#stateOverlay');
  overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');
  stateModalBusy=false;
  showNextStateModal();
}

function notifyGameEvents(events=[]){
  for(const event of events){
    if(event.type==='statusAdded'){
      if(STATUS_DEFS[event.id])queueStateModal(event.id);
    }else if(event.type==='statusRemoved'){
      const d=STATUS_DEFS[event.id];
      if(d)toast('СТАН ЗНЯТО',d.name);
    }
  }
}

function askConfirm({title='Почати заново?',text='',okText='Так, почати заново'}={}){
  return new Promise(resolve=>{
    const overlay=$('#confirmOverlay'),ok=$('#confirmOkBtn'),cancel=$('#confirmCancelBtn');
    $('#confirmTitle').textContent=title;$('#confirmText').textContent=text;ok.textContent=okText;
    const finish=value=>{
      overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');
      ok.onclick=null;cancel.onclick=null;overlay.onclick=null;resolve(value);
    };
    ok.onclick=()=>finish(true);cancel.onclick=()=>finish(false);overlay.onclick=e=>{if(e.target===overlay)finish(false)};
    overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');
  });
}

function statusEffectText(id){
  const d=STATUS_DEFS[id];if(!d)return'';
  const parts=[];
  for(const [key,value] of Object.entries(d.mods||{}))parts.push(`${STAT_LABELS[key]||key} ${value>0?'+':''}${value}`);
  for(const extra of d.extraEffects||[])parts.push(extra);
  return parts.join(' · ');
}

async function persist(){
  if(!G)return;
  G=normalizeState(G);
  const snapshot=normalizeState(G);
  persistChain=persistChain.then(()=>saveRun(snapshot));
  await persistChain;
}

async function createRun(run){
  await clearRun(run);
  G=createInitialState(run);
  await saveRun(G);
  showHowToIntro();
}

async function showStart(){
  if(G)await persist();
  audioManager.setAtmosphere('silent');
  clearSceneSfx();
  G=null;
  $('#gameScreen').classList.add('hidden');
  $('#howToScreen').classList.add('hidden');
  $('#startScreen').classList.remove('hidden');
  $('#runPicker').classList.add('hidden');
  await renderStorageStatus();
}

function showGame(){
  $('#startScreen').classList.add('hidden');
  $('#howToScreen').classList.add('hidden');
  $('#gameScreen').classList.remove('hidden');
  renderGame();
}

async function renderStorageStatus(){
  const caps=await storageCapabilities();
  $('#storageStatus').textContent=`Збереження: ${caps.readBack?'працює':'є проблема'} · localStorage ${caps.localStorage?'✓':'×'} · IndexedDB ${caps.indexedDB?'✓':'×'}`;
}

async function openRunPicker(mode){
  const box=$('#runPicker');box.classList.remove('hidden');box.innerHTML='<div class="run-card"><b>Завантажую слоти…</b></div>';
  const runs=await listRuns();
  if(mode==='continue'){
    const saved=runs.filter(x=>x.state);
    if(!saved.length){box.innerHTML='<div class="run-card"><b>Нема збережених проходжень.</b></div>';return;}
    box.innerHTML=saved.map(({run,state})=>{
      const s=normalizeState(state),tm=formatTime(s.clock.totalMinutes),scene=getChapter1Scene(s);
      return `<div class="run-card"><div class="run-top"><b>Проходження ${run}</b><span class="small">День ${tm.day} · ${tm.time} · ${esc(scene.caption||'Глава 1')}</span></div><div class="run-actions"><button class="primary" data-continue="${run}">Продовжити</button></div></div>`;
    }).join('');
    box.querySelectorAll('[data-continue]').forEach(b=>b.onclick=async()=>{G=normalizeState(await loadRun(Number(b.dataset.continue)));showGame()});
    return;
  }
  box.innerHTML=runs.map(({run,state})=>{
    const s=state?normalizeState(state):null,meta=s?`Є сейв · День ${formatTime(s.clock.totalMinutes).day}`:'Пусто';
    return `<div class="run-card"><div class="run-top"><b>Проходження ${run}</b><span class="small">${meta}</span></div><div class="run-actions"><button class="primary" data-new="${run}">${s?'Почати заново':'Почати'}</button></div></div>`;
  }).join('');
  box.querySelectorAll('[data-new]').forEach(b=>b.onclick=async()=>{
    const run=Number(b.dataset.new),existing=await loadRun(run);
    if(existing){const ok=await askConfirm({title:`Стерти проходження ${run}?`,text:'Цей сейв буде видалено, і гра почнеться з самого початку.',okText:'Так, почати заново'});if(!ok)return;}
    await createRun(run);
  });
}

function clearSceneSfx(){
  for(const t of sfxTimers)clearTimeout(t);
  sfxTimers=[];
}

function scheduleSceneSfx(scene){
  clearSceneSfx();
  for(const cue of scene.sfxOnEnter||[]){
    const c=typeof cue==='string'?{id:cue,delay:0}:cue;
    const timer=setTimeout(()=>audioManager.playEffect(c.id,{volume:c.volume??0.85}),Number(c.delay||0));
    sfxTimers.push(timer);
  }
}

function ensureSceneEntered(){
  const scene=getChapter1Scene(G);
  const entered=new Set(G.story.entered||[]);
  if(entered.has(scene.id))return scene;
  const effects=resolveSceneValue(scene.onEnter||[],G)||[];
  if(effects.length){
    const result=executeAction(G,{id:`enter_${scene.id}`,effects});
    G=result.state;
    notifyGameEvents(result.events);
  }
  G.story.entered=[...(G.story.entered||[]),scene.id];
  G.story.sceneId=scene.id;G.scene=scene.id;
  scheduleSceneSfx(scene);
  persist().catch(console.error);
  return getChapter1Scene(G);
}

function syncSceneAudio(scene=getChapter1Scene(G)){
  if(!G)return;
  audioManager.setAtmosphere(scene.atmosphere||'silent');
}

function renderGame(){
  if(!G)return;
  G=normalizeState(G);
  const scene=ensureSceneEntered();
  syncSceneAudio(scene);
  renderHud(scene);
  renderStage(scene);
  renderStory(scene);
  renderQuickSlots();
  renderActiveStates();
}

function renderHud(scene){
  const tm=formatTime(G.clock.totalMinutes),w=G.world.weather,t=thermal(G),th=threatInfo(G);
  $('#timeLine').textContent=`День ${tm.day} · ${tm.time}`;
  $('#weatherLine').textContent=`${w.icon} ${w.label} ${w.tempC}°C · ${t.feel}`;
  $('#threatLine').innerHTML=`Загроза: <b class="${th.key==='low'?'good':th.key==='medium'?'warn':'bad'}">${th.label}</b>${th.key!=='low'?` · ${esc(th.reason)}`:''}`;
  $('#heroPortrait').src=scene.hud||'./hero-face.png';
  const needs=[['❤️','Здоровʼя',G.health],['🍞','Ситість',G.needs.satiety],['💧','Вода',G.needs.water],['😴','Бадьорість',G.needs.energy]];
  $('#miniNeeds').innerHTML=needs.map(([icon,label,value])=>`<div class="need-chip" title="${label}" aria-label="${label}: ${Math.round(value)}%"><span class="need-icon">${icon}</span><span class="need-value">${Math.round(value)}%</span></div>`).join('');
}

function renderActiveStates(){
  $('#activeStateCount').textContent=`(${G.activeStatuses.length})`;
  $('#activeStates').innerHTML=G.activeStatuses.length?G.activeStatuses.map(id=>{
    const d=STATUS_DEFS[id];if(!d)return'';const effects=statusEffectText(id);
    return `<div class="state-row"><b>${esc(d.name)}</b><div class="small">${esc(d.blurb)}${effects?`<br>ефект: ${esc(effects)}`:''}</div></div>`;
  }).join(''):'<div class="small" style="padding-top:8px">Нема активних станів.</div>';
}

function renderStage(scene){
  const actors=resolveSceneValue(scene.actors||[],G)||[];
  const root=$('#stageImage');
  root.className=`stage-image ${scene.stageTone||''}`;
  root.style.setProperty('--scene-bg',`url("${scene.background}")`);
  root.innerHTML=`<img class="scene-bg" src="${scene.background}" alt=""><div class="scene-shade"></div>${actors.map(a=>`<img class="scene-actor ${esc(a.role)} pos-${esc(a.position||a.role)}" src="${a.src}" alt="">`).join('')}${scene.caption?`<div class="scene-caption">${esc(scene.caption)}</div>`:''}`;
}

function resolveChoices(scene){
  const raw=resolveSceneValue(scene.choices||[],G)||[];
  return raw.filter(c=>!c.showIf||c.showIf(G));
}

function pigeonIsPresent(){
  if(!G)return false;
  const scene=getChapter1Scene(G);
  const actors=resolveSceneValue(scene.actors||[],G)||[];
  return actors.some(a=>a?.role==='pigeon');
}

function canFitItem(id,qty=1){
  const def=ITEM_DEFS[id];if(!def)return false;
  let left=qty;
  for(const slot of G.inventory){
    if(slot.id!==id||slot.qty>=def.stack)continue;
    left-=Math.min(left,def.stack-slot.qty);if(left<=0)return true;
  }
  return left<=Math.max(0,16-G.inventory.length)*def.stack;
}

async function choose(choice){
  if(choice.requiresSpace&&!canFitItem(choice.requiresSpace,1)){
    toast('ІНВЕНТАР ЗАБИТИЙ','Треба щось використати або звільнити слот.');openMenu('inventory');return;
  }
  if(choice.sfx)audioManager.playEffect(choice.sfx,{volume:0.9});
  const result=executeAction(G,{id:choice.id,minutes:choice.minutes||0,activity:choice.activity||'light',effects:choice.effects||[],hiddenEffects:choice.hiddenEffects||[]});
  G=result.state;
  notifyGameEvents(result.events);
  if(choice.next){G.story.sceneId=choice.next;G.scene=choice.next;}
  await persist();
  renderGame();
  window.scrollTo({top:0,behavior:'instant'});
}

function renderStory(scene){
  $('#storyKicker').textContent=`ГЛАВА 1 · ${scene.caption||'ДЕСЬ НЕ ТАМ'}`;
  $('#storyText').innerHTML=paras(resolveSceneValue(scene.text||'',G));
  const flash=resolveSceneValue(scene.flash||'',G);
  const notice=resolveSceneValue(scene.notice||null,G);
  $('#storyExtras').innerHTML=`${flash?`<div class="story-flash">${esc(flash)}</div>`:''}${notice?`<div class="story-notice"><b>${esc(notice.title||'')}</b><span>${esc(notice.body||'')}</span></div>`:''}`;
  const choices=resolveChoices(scene);
  const root=$('#storyChoices');
  if(scene.end){
    root.innerHTML='<div class="chapter-end-note">Сейв уже містить усі наслідки цього проходження.</div>';
    return;
  }
  root.innerHTML='';
  for(const choice of choices){
    const b=document.createElement('button');
    b.className=`story-choice${choice.kind==='secret'?' secret':''}`;
    const preview=previewAction(G,{id:`preview_${choice.id}`,minutes:choice.minutes||0,activity:choice.activity||'light',effects:choice.effects||[],hiddenEffects:[]})
      .filter(x=>/^(Бадьорість|Вода|Ситість|Здоровʼя) /.test(x));
    b.innerHTML=`<span class="choice-main">${esc(choice.label)}</span>${preview.length?`<span class="choice-meta">${preview.map(x=>`<span>${esc(x)}</span>`).join('')}</span>`:''}`;
    b.onclick=()=>choose(choice).catch(console.error);
    root.appendChild(b);
  }
}

function renderQuickSlots(){
  const root=$('#quickSlots');
  root.innerHTML=G.quickSlots.map((id,i)=>{
    if(!id)return `<button class="quick-slot empty" data-q="${i}">Слот ${i+1}</button>`;
    const d=ITEM_DEFS[id],count=itemCount(G,id);
    return `<button class="quick-slot" data-q="${i}"><span class="qicon">${d?.icon||'◻️'}</span><span>${esc(d?.name||id)}</span><span class="qcount">×${count}</span></button>`;
  }).join('');
  root.querySelectorAll('[data-q]').forEach(b=>b.onclick=async()=>{
    const i=Number(b.dataset.q),id=G.quickSlots[i];
    if(!id){openMenu('inventory');return;}
    const result=useItem(G,id);
    if(!result.used){toast('НЕ ВИЙШЛО','Цей предмет зараз не використовується напряму.');return;}
    G=result.state;notifyGameEvents(result.events);await persist();renderGame();if(!$('#menuOverlay').classList.contains('hidden'))renderMenu();toast('ВИКОРИСТАНО',ITEM_DEFS[id]?.name||id);
  });
}

function openMenu(tab=currentTab){currentTab=tab;$('#menuOverlay').classList.remove('hidden');$('#menuOverlay').setAttribute('aria-hidden','false');renderMenu()}
function closeMenu(){
  $('#menuOverlay').classList.add('hidden');$('#menuOverlay').setAttribute('aria-hidden','true');
  if(G)syncSceneAudio();
}

function renderMenu(){
  if(!G)return;
  document.querySelectorAll('#menuTabs [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===currentTab));
  const tm=formatTime(G.clock.totalMinutes);$('#menuMeta').textContent=`Проходження ${G.runId} · День ${tm.day} · ${tm.time}`;
  if(currentTab==='inventory')renderInventory();
  if(currentTab==='clothes')renderClothes();
  if(currentTab==='stats')renderStats();
  if(currentTab==='states')renderStates();
  if(currentTab==='companions')renderCompanions();
  if(currentTab==='relations')renderRelations();
  if(currentTab==='map')renderMap();
  if(currentTab==='shop')renderShop();
  if(currentTab==='settings')renderSettings();
}

function inventoryCategoryKey(item){
  const cat=ITEM_DEFS[item?.id]?.category||'';
  if(cat==='Їжа'||cat==='Їжа та напої')return 'food';
  if(cat==='Медицина'||cat==='Ліки')return 'medicine';
  if(cat==='Зброя')return 'weapon';
  if(cat==='Якась хуйня')return 'weird';
  return 'other';
}

function renderInventory(cat=inventoryCategory){
  inventoryCategory=cat||'all';
  const root=$('#menuContent');
  const occupied=[...G.inventory];
  const used=occupied.length;
  const tabs=[
    ['all','Все'],
    ['food','Їжа та напої'],
    ['medicine','Ліки'],
    ['weapon','Зброя'],
    ['weird','Якась хуйня']
  ];
  const tabHtml=`<div class="inventory-tabs">${tabs.map(([id,label])=>`<button class="inventory-tab${inventoryCategory===id?' active':''}" data-invcat="${id}">${esc(label)}</button>`).join('')}</div>`;

  let visible;
  if(inventoryCategory==='all'){
    visible=[...occupied];
    while(visible.length<16)visible.push(null);
  }else{
    visible=occupied.filter(slot=>slot&&inventoryCategoryKey(slot)===inventoryCategory);
  }

  const itemCards=visible.length?visible.map(slot=>{
    if(!slot)return '<div class="inventory-slot empty">Пусто</div>';
    const d=ITEM_DEFS[slot.id]||{name:slot.id,icon:'◻️',category:'Інше',description:''};
    const canUse=Array.isArray(d.useEffects)&&d.useEffects.length>0;
    return `<div class="inventory-slot"><div><div class="item-top"><span class="item-icon">${d.icon}</span><span class="item-qty">×${slot.qty}</span></div><div class="item-name">${esc(d.name)}</div><div class="item-cat">${esc(d.category)}</div><div class="item-desc">${esc(d.description||'')}</div></div><div class="item-actions">${canUse?`<button data-use="${slot.id}">Використати</button>`:''}${slot.id==='salo'&&G.flags.metPigeon&&pigeonIsPresent()?`<button data-gift-pigeon="salo">Дати ${G.flags.knowsPigeonName?'Євпапію':'голубу'}</button>`:''}<button data-quick="${slot.id}">У швидкий слот</button></div></div>`;
  }).join(''):'<div class="inventory-empty-category">Поки пусто.</div>';

  const charImg=G.flags.localClothes?'./man_local.png':'./man_base.png';
  const charName=G.flags.localClothes?'Місцевий прикид':'Ваш прикид';
  const important=G.importantItems.length?G.importantItems.map(x=>`<div class="important-card"><b>${esc(x.name||x.id)}</b></div>`).join(''):'<div class="locked-card"><b>Поки пусто.</b></div>';

  root.innerHTML=`
    <div class="section-title"><h2>Інвентар</h2><span class="small">${used}/16 слотів</span></div>
    <div class="inventory-character-layout">
      <div class="inventory-left">
        ${tabHtml}
        <div class="inventory-grid${inventoryCategory!=='all'?' filtered':''}">${itemCards}</div>
        <div class="section-title inventory-important-title"><h2>Важливе</h2></div>
        <div class="important-list">${important}</div>
      </div>
      <aside class="inventory-character-pane">
        <img src="${charImg}" alt="Герой">
        <div class="inventory-character-name">${esc(charName)}</div>
      </aside>
    </div>`;

  root.querySelectorAll('[data-invcat]').forEach(b=>b.onclick=()=>renderInventory(b.dataset.invcat));
  root.querySelectorAll('[data-use]').forEach(b=>b.onclick=async()=>{
    const result=useItem(G,b.dataset.use);
    if(!result.used){toast('НЕ ВИЙШЛО','Цей предмет зараз не використовується напряму.');return;}
    G=result.state;notifyGameEvents(result.events);await persist();renderGame();renderInventory(inventoryCategory);toast('ВИКОРИСТАНО',ITEM_DEFS[b.dataset.use]?.name||b.dataset.use);
  });
  root.querySelectorAll('[data-gift-pigeon]').forEach(b=>b.onclick=async()=>{
    if(!pigeonIsPresent()||itemCount(G,'salo')<=0){toast('НЕ ВИЙШЛО','Голуб зараз не поруч або сала вже нема.');renderInventory(inventoryCategory);return;}
    const result=executeAction(G,{id:'gift_pigeon_salo',hiddenEffects:[
      {type:'itemRemove',id:'salo',qty:1},
      {type:'relationship',person:'evpapiy',key:'trust',value:1},
      {type:'relationship',person:'evpapiy',key:'offense',value:-1},
      {type:'relationshipDiscover',person:'evpapiy',key:'trust'},
      {type:'relationshipDiscover',person:'evpapiy',key:'offense'},
      {type:'flag',key:'gavePigeonSalo',value:true},
      {type:'memory',person:'evpapiy',key:'receivedSaloGift',value:true}
    ]});
    G=result.state;
    notifyGameEvents(result.events);
    await persist();renderGame();renderInventory(inventoryCategory);toast(G.flags.knowsPigeonName?'ЄВПАПІЙ ВЗЯВ САЛО':'ГОЛУБ ВЗЯВ САЛО','Сало зникло з інвентаря.');
  });
  root.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{pendingQuickItem=b.dataset.quick;$('#slotPickerOverlay').classList.remove('hidden');renderSlotPicker()});
}

function renderSlotPicker(){
  const root=$('#slotPickerButtons');
  root.innerHTML=[0,1,2].map(i=>{const current=G.quickSlots[i],c=current?ITEM_DEFS[current]:null;return `<button data-slot="${i}"><b>Слот ${i+1}</b><br><span class="small">${c?`${c.icon} ${esc(c.name)}`:'пусто'}</span></button>`}).join('');
  root.querySelectorAll('[data-slot]').forEach(b=>b.onclick=async()=>{assignQuickSlot(G,Number(b.dataset.slot),pendingQuickItem);$('#slotPickerOverlay').classList.add('hidden');pendingQuickItem=null;await persist();renderGame();renderInventory(inventoryCategory)});
}

function renderClothes(){
  const root=$('#menuContent'),eq=equipmentTotals(G);
  root.innerHTML=`<div class="section-title"><h2>Шмотки</h2><span class="small">Броня +${eq.armor} · холод +${eq.warmth} · жара -${eq.heatBurden} · дощ +${eq.rainProtection}</span></div><p class="explain">Одяг, який ви реально отримали. Речі одного слота замінюють одна одну.</p><div class="clothes-list">${G.ownedClothes.map(id=>{
    const d=CLOTHES[id];if(!d)return'';const on=G.equipment[d.slot]===id;const chips=[`Броня +${d.armor}`,`Холод +${d.warmth}`];if(d.heatBurden)chips.push(`Жара -${d.heatBurden}`);if(d.rainProtection)chips.push(`Дощ +${d.rainProtection}`);if(d.statMods)for(const [k,v] of Object.entries(d.statMods))chips.push(`${STAT_LABELS[k]} ${v>0?'+':''}${v}`);
    return `<div class="clothes-card"><div class="clothes-head"><div><b>${esc(d.name)}</b><div class="small">${esc(d.note||'')}</div></div><button data-equip="${id}" ${on?'disabled':''}>${on?'Вдягнено':'Вдягнути'}</button></div><div class="chips">${chips.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></div>`;
  }).join('')}</div>`;
  root.querySelectorAll('[data-equip]').forEach(b=>b.onclick=async()=>{
    const before=new Set(G.activeStatuses||[]);
    equip(G,b.dataset.equip);
    const after=new Set(G.activeStatuses||[]);
    const events=[];
    for(const id of after)if(!before.has(id))events.push({type:'statusAdded',id});
    for(const id of before)if(!after.has(id))events.push({type:'statusRemoved',id});
    notifyGameEvents(events);
    await persist();renderGame();renderClothes();
  });
}

function renderStats(){
  const root=$('#menuContent'),mods=statModifiers(G);
  root.innerHTML=`<div class="section-title"><h2>Характеристики</h2></div><p class="explain">Прогрес постійний. Стани й одяг змінюють тільки значення «Зараз».</p><div class="stat-list">${STAT_KEYS.map(k=>{
    const s=G.stats[k],mod=mods[k]||0,now=effectiveStat(G,k),base=Math.max(0,Math.min(10,Number(s.progress||0)));
    const lost=Math.min(base,Math.max(0,-mod)),kept=base-lost,bonus=Math.max(0,Math.min(10-base,mod));
    const pips=Array.from({length:10},(_,i)=>{let cls='pip';if(i<kept)cls+=' base';else if(i<base)cls+=' debuff';else if(i<base+bonus)cls+=' buff';return `<span class="${cls}"></span>`}).join('');
    return `<div class="stat-card"><div><div class="stat-name">${STAT_LABELS[k]}</div><div class="stat-desc">${STAT_DESCRIPTIONS[k]}</div><div class="stat-meta">Рівень ${s.level} · прогрес ${s.progress}/10${mod?` · тимчасово ${mod>0?'+':''}${mod}`:''} · <b>Зараз: ${now}</b></div></div><div class="stat-meter">${pips}</div></div>`;
  }).join('')}</div>`;
}

function renderStates(){
  const root=$('#menuContent'),known=new Set(G.discoveredStatuses),ids=Object.keys(STATUS_DEFS);
  root.innerHTML=`<div class="section-title"><h2>Стани</h2><span class="small">Відкрито ${ids.filter(x=>known.has(x)).length}/${ids.length}</span></div><p class="explain">На головному екрані тільки активні. Тут – усе, що герой уже відкрив.</p><div class="state-list">${ids.map(id=>{
    const d=STATUS_DEFS[id];if(!known.has(id))return '<div class="locked-card"><b>???</b><div class="small">Ще не відкрито.</div></div>';
    const effects=statusEffectText(id);return `<div class="state-card"><div class="state-name">${esc(d.name)}</div><div class="state-blurb">${esc(d.blurb)}</div><div class="state-extra">${effects?`<b>ефект:</b> ${esc(effects)}<br>`:''}${d.persistentUnlock?'<b>особливий ефект:</b> відкриває секретні дії [ЄБАТОРІУМ].<br>':''}<b>як позбутись:</b> ${esc(d.remove)}</div></div>`;
  }).join('')}</div>`;
}

function renderCompanions(){
  const root=$('#menuContent');
  const active=Object.entries(G.companions||{}).filter(([,c])=>c.known&&c.active);
  const card=([,c])=>`<div class="companion-card active"><div class="companion-portrait-wrap"><img class="companion-portrait" src="${c.portrait||'./evpapiy.png'}" alt="${esc(c.name)}"></div><div class="companion-copy"><div class="companion-head"><b>${esc(c.name)}</b><span class="companion-badge active">З вами</span></div><div class="small">${esc(c.state||'Поруч')}</div>${c.facts?.length?`<div class="companion-facts">${c.facts.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}</div></div>`;
  root.innerHTML=`<div class="section-title"><h2>Компаньйони</h2></div><p class="explain">Тут тільки ті, хто фізично зараз із героєм. Якщо персонаж відійшов або залишився в іншій локації, картка зникає звідси, але стосунки й памʼять нікуди не діваються.</p><div class="companions-grid">${active.length?active.map(card).join(''):'<div class="locked-card"><b>Зараз ви самі.</b><div class="small">Ніхто не йде поруч із героєм.</div></div>'}</div>`;
}

function renderRelations(){
  const root=$('#menuContent'),rels=Object.entries(G.relationships).filter(([,r])=>r.known);
  root.innerHTML=`<div class="section-title"><h2>Стосунки</h2></div><p class="explain">Параметри 0–10 відкриваються тільки тоді, коли герой має підстави їх зрозуміти. Самі наслідки можуть бути прихованими.</p><div class="relation-list">${rels.length?rels.map(([id,r])=>{
    const discovered=r.discoveredParams||[];
    const displayName=id==='evpapiy'&&!G.flags.knowsPigeonName?'Голуб':r.name;
    return `<div class="relation-card"><div class="relation-head"><b>${esc(displayName)}</b><span class="small">${discovered.length?'':'Поки незрозуміло'}</span></div>${discovered.length?`<div class="relation-params">${discovered.map(k=>{const v=r.values[k]??0;return `<div class="relation-param"><span>${REL_LABELS[k]||esc(k)}</span><div class="rel-track"><div class="rel-fill" style="width:${v*10}%"></div></div><b>${v}/10</b></div>`}).join('')}</div>`:'<div class="small" style="margin-top:8px">Ви ще мало знаєте цього персонажа.</div>'}</div>`;
  }).join(''):'<div class="locked-card"><b>Поки нема з ким розбиратись.</b></div>'}</div>`;
}

function renderMap(){
  $('#menuContent').innerHTML='<div class="section-title"><h2>Карта</h2></div><div class="map-box"><div><b>КАРТА ПОКИ НЕ ВІДКРИТА</b><span class="small">Не розширюємо світ раніше, ніж стабільно працюють сюжетні глави.</span></div></div>';
}
function renderShop(){
  $('#menuContent').innerHTML='<div class="section-title"><h2>Крамничка</h2></div><div class="shop-box"><div><b>КРАМНИЧКА ПОКИ НЕ ВІДКРИТА</b><span class="small">До неї повернемось після сюжетних глав.</span></div></div>';
}

function renderSettings(){
  const root=$('#menuContent');
  root.innerHTML=`<div class="section-title"><h2>Налаштування</h2></div><div class="settings-list"><details class="settings-section" data-settings-section="audio"><summary><span><b>Звук</b><small>Гучність, атмосфера й ефекти</small></span></summary><div id="settingsAudio" class="settings-body"></div></details><details class="settings-section" data-settings-section="howto"><summary><span><b>Як грати</b><small>Вибори, стани, характеристики й виживання</small></span></summary><div id="settingsHowTo" class="settings-body"></div></details><details class="settings-section" data-settings-section="saves"><summary><span><b>Збереження</b><small>Автосейв і ручні слоти</small></span></summary><div id="settingsSaves" class="settings-body"></div></details></div>`;
  const lazy=(name,load)=>{const d=root.querySelector(`[data-settings-section="${name}"]`);d.addEventListener('toggle',()=>{if(!d.open||d.dataset.loaded==='1')return;d.dataset.loaded='1';load()})};
  lazy('audio',()=>renderAudio(root.querySelector('#settingsAudio'),{embedded:true}));
  lazy('howto',()=>renderHowTo(root.querySelector('#settingsHowTo'),{embedded:true}));
  lazy('saves',()=>renderSaves(root.querySelector('#settingsSaves'),{embedded:true}));
}

function renderAudio(root=$('#menuContent'),{embedded=false}={}){
  const s=audioManager.getSettings(),pct=v=>Math.round(v*100),q=sel=>root.querySelector(sel);
  root.innerHTML=`${embedded?'':'<div class="section-title"><h2>Звук</h2></div>'}<p class="${embedded?'settings-copy':'explain'}">У самій грі атмосфера тепер привʼязана до сцени: надворі – село, у хаті – піч, окремі події запускають ефекти самі.</p><div class="audio-settings"><div class="audio-card"><div class="audio-toggle"><div><b>Звук у грі</b><div class="small">${s.enabled?'Увімкнено':'Вимкнено'}</div></div><button id="audioToggleBtn" class="${s.enabled?'on':'off'}">${s.enabled?'Вимкнути':'Увімкнути'}</button></div></div><div class="audio-card"><div class="audio-row"><b>Загальна гучність</b><input id="masterVolume" type="range" min="0" max="100" value="${pct(s.master)}"><span id="masterVolumeValue">${pct(s.master)}%</span></div><div class="audio-row"><b>Атмосфера</b><input id="ambientVolume" type="range" min="0" max="100" value="${pct(s.ambient)}"><span id="ambientVolumeValue">${pct(s.ambient)}%</span></div><div class="audio-row"><b>Ефекти</b><input id="effectsVolume" type="range" min="0" max="100" value="${pct(s.effects)}"><span id="effectsVolumeValue">${pct(s.effects)}%</span></div></div><div class="audio-card"><b>Перевірити</b><div class="audio-presets"><button data-atmosphere="village">🌾 Село</button><button data-atmosphere="hut">🔥 Хата</button><button data-atmosphere="rain">🌧️ Дощ</button><button data-atmosphere="silent">🔇 Тиша</button></div><div class="audio-effects"><button data-sfx="wings">🪽 Крила</button><button data-sfx="bang">💥 БАХ</button><button data-sfx="ui">Клік</button></div></div></div>`;
  q('#audioToggleBtn').onclick=async()=>{await audioManager.setEnabled(!audioManager.getSettings().enabled);renderAudio(root,{embedded})};
  const bind=(id,kind,valueId)=>{const input=q(id),value=q(valueId);input.oninput=()=>{audioManager.setVolume(kind,Number(input.value)/100);value.textContent=`${input.value}%`}};
  bind('#masterVolume','master','#masterVolumeValue');bind('#ambientVolume','ambient','#ambientVolumeValue');bind('#effectsVolume','effects','#effectsVolumeValue');
  root.querySelectorAll('[data-atmosphere]').forEach(b=>b.onclick=async()=>{const ok=await audioManager.setAtmosphere(b.dataset.atmosphere);toast(b.dataset.atmosphere==='silent'?'ТИША':ok?'АТМОСФЕРА ПРАЦЮЄ':'НЕ ЗАПУСТИЛОСЬ',b.textContent)});
  root.querySelectorAll('[data-sfx]').forEach(b=>b.onclick=async()=>{const ok=await audioManager.playEffect(b.dataset.sfx,{volume:.9});toast(ok?'ЕФЕКТ ПРАЦЮЄ':'НЕ ЗАПУСТИЛОСЬ',b.textContent)});
}

async function renderSaves(root=$('#menuContent'),{embedded=false}={}){
  const saves=await listManual(G.runId),at=G.lastAutosaveAt?new Date(G.lastAutosaveAt).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'ще нема';
  root.innerHTML=`${embedded?'':'<div class="section-title"><h2>Збереження</h2></div>'}<p class="${embedded?'settings-copy':'explain'}">Автосейв: ${at}. Сейв запамʼятовує точну сцену, одноразові наслідки, інвентар, стани, стосунки й компаньйонів.</p><div class="save-list">${saves.map(({slot,state})=>{const s=state?normalizeState(state):null,tm=s?formatTime(s.clock.totalMinutes):null;return `<div class="save-card"><div class="save-head"><b>Ручний слот ${slot}</b><span class="small">${s?`День ${tm.day} · ${tm.time}`:'Пусто'}</span></div><div class="save-actions"><button data-save="${slot}">Зберегти</button>${s?`<button data-load="${slot}">Завантажити</button>`:''}</div></div>`}).join('')}</div>`;
  root.querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{await saveManual(G,Number(b.dataset.save));toast('ЗБЕРЕЖЕНО',`Ручний слот ${b.dataset.save}`);renderSaves(root,{embedded})});
  root.querySelectorAll('[data-load]').forEach(b=>b.onclick=async()=>{const state=await loadManual(G.runId,Number(b.dataset.load));if(!state)return;G=normalizeState(state);await persist();renderGame();renderSaves(root,{embedded});toast('ЗАВАНТАЖЕНО',`Ручний слот ${b.dataset.load}`)});
}

$('#newGameBtn').onclick=()=>{audioManager.unlock();openRunPicker('new').catch(console.error)};
$('#continueBtn').onclick=()=>{audioManager.unlock();openRunPicker('continue').catch(console.error)};
$('#beginGameBtn').onclick=()=>{audioManager.unlock();beginFromHowTo().catch(console.error)};
$('#menuBtn').onclick=()=>{audioManager.unlock();openMenu()};
$('#exitBtn').onclick=showStart;
$('#closeMenuBtn').onclick=closeMenu;
$('#closeSlotPickerBtn').onclick=()=>{$('#slotPickerOverlay').classList.add('hidden');pendingQuickItem=null};
$('#stateOkBtn').onclick=closeStateModal;

document.querySelectorAll('#menuTabs [data-tab]').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;renderMenu()});
$('#menuOverlay').addEventListener('click',e=>{if(e.target===$('#menuOverlay'))closeMenu()});
$('#slotPickerOverlay').addEventListener('click',e=>{if(e.target===$('#slotPickerOverlay')){$('#slotPickerOverlay').classList.add('hidden');pendingQuickItem=null}});

document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button||button.dataset.sfx==='ui')return;audioManager.playEffect('ui',{volume:.30})});
window.addEventListener('pagehide',()=>{if(G)emergencySaveRun(G)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&G){emergencySaveRun(G);persist().catch(console.error)}});

showStart().catch(err=>{console.error(err);const status=$('#storageStatus');if(status)status.textContent='Помилка запуску JS: '+(err?.message||String(err))});
