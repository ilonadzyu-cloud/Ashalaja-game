import {STAT_KEYS,STAT_LABELS,STAT_DESCRIPTIONS} from './config.js?v=093';
import {STATUS_DEFS,CLOTHES,ITEM_DEFS} from './data.js?v=093';
import {createInitialState,normalizeState,formatTime,threatInfo,thermal,equipmentTotals,equip,statModifiers,effectiveStat,itemCount,assignQuickSlot,useItem,executeAction,previewAction,addItem,spendHeroPoint,spendEvpPoint,addHeroXp,addEvpXp} from './engine.js?v=093';
import {listRuns,loadRun,saveRun,clearRun,saveManual,loadManual,listManual,saveChapterCheckpoint,loadChapterCheckpoint,listChapterCheckpoints,clearChapterCheckpointsAfter,emergencySaveRun,storageCapabilities} from './storage.js?v=093';
import {audioManager} from './audio.js?v=071';
import {getChapter1Scene,CHAPTER1_SCENES,resolveSceneValue} from './chapter1.js?v=093';
import {getChapter2Scene,CHAPTER2_SCENES} from './chapter2.js?v=093';
import {getChapter3Scene,CHAPTER3_SCENES} from './chapter3.js?v=093';
import {openStoryBattle} from './battle.js?v=093';

function getGameScene(state){
  const id=state?.story?.sceneId||state?.scene||'intro';
  return CHAPTER3_SCENES[id]||CHAPTER2_SCENES[id]||CHAPTER1_SCENES[id]||getChapter1Scene(state);
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
let deathTimer=null;
let lastSleepMessage='';
const categories=['all','Їжа та напої','Ліки','Зброя','Якась хуйня'];

const TESTER_UNLOCK_KEY='des-ne-tam-tester-unlocked-v1';
const TESTER_CODE_HASH='58346b69699f6dadc90ed95b5dd126bc42de7130d6b8213d83bc5b0cf59e885d';
let testerTapCount=0;
let testerTapTimer=null;
function testerUnlocked(){try{return localStorage.getItem(TESTER_UNLOCK_KEY)==='1'}catch{return false}}
function syncTesterAccess(){const b=$('#testModeBtn');if(!b)return;const on=testerUnlocked();b.classList.toggle('hidden',!on);b.setAttribute('aria-hidden',on?'false':'true')}
async function sha256Text(value){const bytes=new TextEncoder().encode(String(value||''));const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function tryUnlockTester(){
  const entered=window.prompt('КОД ТЕСТЕРА');
  if(entered===null)return;
  let ok=false;
  try{ok=(await sha256Text(entered.trim()))===TESTER_CODE_HASH}catch{}
  if(!ok){toast('НЕ ТОЙ КОД','Тестовий режим лишився закритим.');return}
  try{localStorage.setItem(TESTER_UNLOCK_KEY,'1')}catch{}
  syncTesterAccess();toast('ТЕСТ ВІДКРИТО','Кнопка зʼявилась у головному меню.');
}
function installTesterUnlock(){
  const version=$('.start-card .version');if(!version)return;
  version.style.cursor='default';
  version.addEventListener('click',()=>{
    clearTimeout(testerTapTimer);testerTapTimer=setTimeout(()=>{testerTapCount=0},2800);
    testerTapCount+=1;
    if(testerTapCount>=7){testerTapCount=0;clearTimeout(testerTapTimer);tryUnlockTester()}
  });
  syncTesterAccess();
}

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
    if(e.type==='heroXp'&&e.visible!==false)toast('ДОСВІД',`+${e.actual} XP`);
    if(e.type==='heroLevelUp')toast('НОВИЙ РІВЕНЬ ГЕРОЯ',`Рівень ${e.level} · +1 очко прокачки`);
    if(e.type==='evpLevelUp')toast('ЄВПАПІЙ ПІДНЯВ РІВЕНЬ',`Рівень ${e.level} · +1 очко прокачки`);
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

const CHAPTER_META={
  1:{title:'Глава 1',scene:'intro'},
  2:{title:'Глава 2',scene:'ch2_intro'},
  3:{title:'Глава 3',scene:'ch3_intro'}
};

function createChapterState(run,chapter){
  const s=createInitialState(run);
  s.flags.initialStatusPopupShown=true;
  if(chapter===1)return normalizeState(s);

  s.chapter=chapter;
  s.story={chapter,sceneId:CHAPTER_META[chapter].scene,entered:[],finished:false};
  s.scene=CHAPTER_META[chapter].scene;
  s.flags.metPigeon=true;
  s.flags.knowsPigeonName=true;
  s.relationships.evpapiy.known=true;

  if(chapter>=2){
    s.flags.mapUnlocked=true;
    s.flags.shopUnlocked=true;
    s.flags.chapter1Complete=true;
    s.companions.evpapiy.known=true;
    s.companions.evpapiy.active=true;
    s.companions.evpapiy.state='З вами';
  }

  if(chapter>=3){
    s.flags.chapter2Started=true;
    s.flags.chapter2Complete=true;
    s.activeStatuses=['scared'];
    s.discoveredStatuses=['hangover','scared'];
    s.statusTimers={scared:s.clock.totalMinutes+20};
    s.flags.scaredMigration091=true;
    const salo=s.inventory.find(x=>x.id==='salo');
    if(salo)salo.qty=Math.min(5,Number(salo.qty||0)+1);
    else s.inventory.push({id:'salo',qty:1});
    if(!s.inventory.some(x=>x.id==='water'))s.inventory.push({id:'water',qty:1});
  }
  return normalizeState(s);
}

async function renderStart(mode='home'){
  if(mode==='test'&&!testerUnlocked())mode='home';
  show('startScreen');
  syncTesterAccess();
  document.body.classList.remove('menu-open');
  closeDeathOverlay();
  G=null;
  audioManager.setAtmosphere('silent');
  const runs=await listRuns();
  const root=$('#runPicker');
  const actions=$('#startActions');
  root.innerHTML='';
  root.classList.toggle('hidden',mode==='home');
  actions.classList.toggle('hidden',mode!=='home');

  const addHead=(title,back='home')=>{
    const head=document.createElement('div');head.className='run-picker-head';head.innerHTML=`<b>${esc(title)}</b><button class="ghost tiny" data-back-start>Назад</button>`;root.appendChild(head);head.querySelector('[data-back-start]').onclick=()=>renderStart(back);return head;
  };
  const runCard=(run,state,onClick,label='')=>{const tm=state?formatTime(state.clock.totalMinutes):null;const b=document.createElement('button');b.className='run-card';b.innerHTML=`<b>Проходження ${run}</b><span>${state?`Глава ${state.chapter} · ${tm.time}`:'Порожньо'}${label?` · ${esc(label)}`:''}</span>`;b.onclick=onClick;root.appendChild(b)};

  if(mode==='new'){
    addHead('Нове проходження');
    for(const r of runs){const st=r.state?normalizeState(r.state):null;runCard(r.run,st,()=>startNew(r.run))}
  }else if(mode==='continue'){
    addHead('Продовжити');
    let shown=0;for(const r of runs){if(!r.state)continue;shown++;const st=normalizeState(r.state);runCard(r.run,st,()=>continueRun(r.run,st))}
    if(!shown)root.insertAdjacentHTML('beforeend','<div class="empty-state">Ще нема жодного сейву.</div>');
  }else if(mode==='chapters'){
    addHead('Глави');
    const grid=document.createElement('div');grid.className='chapter-grid';
    for(const chapter of [1,2,3]){
      let checkpointCount=0,continueCount=0;
      for(const r of runs){if(chapter===1||await loadChapterCheckpoint(r.run,chapter))checkpointCount++;if(r.state&&normalizeState(r.state).chapter===chapter)continueCount++}
      const card=document.createElement('article');card.className='chapter-card';
      card.innerHTML=`<div><b>${CHAPTER_META[chapter].title}</b><span>${chapter===1?'Початок гри':chapter===3?'Продовження глави ще буде.':'Збережений початок глави'}</span></div><div class="chapter-card-actions"><button type="button" data-chapter-new="${chapter}" ${checkpointCount?'':'disabled'}>${chapter===1?'Нова гра':'Почати главу заново'}</button><button type="button" data-chapter-continue="${chapter}" ${continueCount?'':'disabled'}>Продовжити</button></div>`;
      grid.appendChild(card);
    }
    root.appendChild(grid);
    root.querySelectorAll('[data-chapter-new]').forEach(b=>b.onclick=()=>renderStart(`chapter-new-${b.dataset.chapterNew}`));
    root.querySelectorAll('[data-chapter-continue]').forEach(b=>b.onclick=()=>renderStart(`chapter-continue-${b.dataset.chapterContinue}`));
  }else if(mode.startsWith('chapter-new-')||mode.startsWith('chapter-continue-')){
    const isNew=mode.startsWith('chapter-new-'),chapter=Number(mode.split('-').pop());addHead(`${CHAPTER_META[chapter].title} · ${isNew?(chapter===1?'Нова гра':'Почати заново'):'Продовжити'}`,'chapters');let shown=0;
    for(const r of runs){const st=r.state?normalizeState(r.state):null;if(isNew&&chapter>1&&!(await loadChapterCheckpoint(r.run,chapter)))continue;if(!isNew&&(!st||st.chapter!==chapter))continue;shown++;runCard(r.run,st,()=>isNew?startFromChapter(r.run,chapter):continueRun(r.run,st),isNew&&chapter>1?'чекпойнт глави':'')}
    if(!shown)root.insertAdjacentHTML('beforeend','<div class="empty-state">Тут поки нема відповідного сейву.</div>');
  }else if(mode==='saves'){
    addHead('Збереження');
    for(const r of runs){const section=document.createElement('div');section.className='start-save-group';const manual=await listManual(r.run);section.innerHTML=`<div class="start-save-title"><b>Проходження ${r.run}</b><span>${r.state?`автосейв · глава ${normalizeState(r.state).chapter}`:'автосейву нема'}</span></div><div class="start-save-slots">${manual.map(x=>`<button type="button" data-start-manual="${r.run}:${x.slot}" ${x.state?'':'disabled'}><b>Слот ${x.slot}</b><span>${x.state?`Глава ${normalizeState(x.state).chapter}`:'Порожньо'}</span></button>`).join('')}</div>`;root.appendChild(section)}
    root.querySelectorAll('[data-start-manual]').forEach(b=>b.onclick=async()=>{const [run,slot]=b.dataset.startManual.split(':').map(Number),st=await loadManual(run,slot);if(await loadManualState(run,st)){show('gameScreen');await renderGame()}});
  }else if(mode==='test'){
    addHead('Тестовий сейв');
    const saved=await loadRun(99);
    root.insertAdjacentHTML('beforeend',`<div class="test-mode-panel"><div class="info-card">Окремий тестовий сейв. Нормальні проходження 1–3 він не чіпає.</div>${saved?'<button type="button" class="big" id="continueTestBtn">Продовжити тест</button>':''}<div class="test-chapters"><button data-test-chapter="1">Глава 1</button><button data-test-chapter="2">Глава 2</button><button data-test-chapter="3">Глава 3</button></div><div class="test-options"><label><input type="checkbox" id="testAllItems" checked> Дати тестові предмети</label><label><input type="checkbox" id="testPrayer" checked> Відкрити молитву</label><label><input type="checkbox" id="testSunset" checked> Відкрити ЗАКАТ ПРЄЗРЄНІЯ</label><label><input type="checkbox" id="testScared"> Дати ОБСЕРУНЬКАВСЯ ВІД СТРАХУ</label></div></div>`);
    $('#continueTestBtn')?.addEventListener('click',()=>continueRun(99,normalizeState(saved)));
    root.querySelectorAll('[data-test-chapter]').forEach(b=>b.onclick=()=>startTestChapter(Number(b.dataset.testChapter),{allItems:$('#testAllItems').checked,prayer:$('#testPrayer').checked,sunset:$('#testSunset').checked,scared:$('#testScared').checked}));
  }

  const cap=await storageCapabilities();const storage=$('#storageStatus');if(cap.readBack){storage.textContent='';storage.classList.add('hidden')}else{storage.textContent='Є проблема зі збереженням у цьому браузері.';storage.classList.remove('hidden')}
}

async function startFromChapter(run,chapter){
  if(chapter===1)return startNew(run);
  const checkpoint=await loadChapterCheckpoint(run,chapter);
  if(!checkpoint){toast('НЕМА ЧЕКПОЙНТА',`Спочатку треба реально дійти до ${CHAPTER_META[chapter].title.toLocaleLowerCase('uk-UA')}.`);return}
  const old=await loadRun(run);
  if(old){const ok=await askConfirm({title:`Почати ${CHAPTER_META[chapter].title.toLocaleLowerCase('uk-UA')} заново?`,text:'Повернемось до стану, з яким ви вперше зайшли в цю главу. Усі наслідки попередніх глав лишаться.',okText:'Так, почати главу'});if(!ok)return}
  G=normalizeState({...checkpoint,runId:run});await clearChapterCheckpointsAfter(run,chapter);await saveRun(G);show('gameScreen');await renderGame();
}

async function startNew(run){
  const old=await loadRun(run);
  if(old){const ok=await askConfirm({title:`Стерти проходження ${run}?`,text:'Цей сейв буде видалено, і гра почнеться з самого початку.',okText:'Так, почати заново'});if(!ok)return}
  await clearRun(run);G=createInitialState(run);await saveRun(G);await saveChapterCheckpoint(G,1);show('howToScreen');
}

async function startTestChapter(chapter,opts={}){
  if(!testerUnlocked()){await renderStart('home');return}
  await clearRun(99);G=createChapterState(99,chapter);G.flags.testMode=true;G.flags.initialStatusPopupShown=true;
  if(opts.allItems){for(const [id,qty] of [['water',2],['salo',2],['vodka',2],['knife',1],['garlic',3],['onion',2],['onion_angry',1],['onion_smelly',1],['medkit',2]]){const cur=G.inventory.find(x=>x.id===id);if(cur)cur.qty=Math.max(cur.qty,qty);else G.inventory.push({id,qty})}}
  if(opts.prayer){G.flags.prayerUnlocked=true;G.unlocks.prayer=true}
  if(opts.sunset){G.unlocks.sunsetContempt=true;G.flags.evpapiySaloGivenCount=2;G.flags.evpapiyEnemyConflictCount=1}
  if(opts.scared){if(!G.activeStatuses.includes('scared'))G.activeStatuses.push('scared');if(!G.discoveredStatuses.includes('scared'))G.discoveredStatuses.push('scared');G.statusTimers.scared=G.clock.totalMinutes+20}else{G.activeStatuses=G.activeStatuses.filter(x=>x!=='scared');delete G.statusTimers.scared;G.flags.scaredMigration091=true}
  G.heroProgression.points=Math.max(5,Number(G.heroProgression.points||0));if(G.companions?.evpapiy?.progression)G.companions.evpapiy.progression.points=Math.max(5,Number(G.companions.evpapiy.progression.points||0));
  G=normalizeState(G);await saveRun(G);await saveChapterCheckpoint(G,chapter);show('gameScreen');await renderGame();
}

async function continueRun(run,state){
  if(!state){toast('НЕМА СЕЙВУ','Тут ще нема проходження.');return}
  G=normalizeState({...state,runId:run});show('gameScreen');await renderGame();
}

async function loadManualState(run,raw){
  if(!raw)return false;
  const savedCheckpoint=raw.__chapterCheckpoint?JSON.parse(JSON.stringify(raw.__chapterCheckpoint)):null;
  const clean=JSON.parse(JSON.stringify(raw));delete clean.__chapterCheckpoint;
  G=normalizeState({...clean,runId:run});
  await clearChapterCheckpointsAfter(run,G.chapter);
  if(savedCheckpoint){savedCheckpoint.runId=run;await saveChapterCheckpoint(savedCheckpoint,G.chapter)}
  else await saveChapterCheckpoint(G,G.chapter);
  await saveRun(G);return true;
}

async function beginGame(){
  show('gameScreen');await renderGame();if(!G.flags.initialStatusPopupShown){G.flags.initialStatusPopupShown=true;await persist();queueState('hangover')}
}

function clearSfx(){for(const t of sfxTimers)clearTimeout(t);sfxTimers=[]}
async function ensureSceneEntered(scene){
  const id=scene.id;
  const chapter=Number(scene.chapter||G.chapter||1);
  G.chapter=chapter;G.story.chapter=chapter;
  if(G.story.entered.includes(id))return false;
  const checkpoint=await loadChapterCheckpoint(G.runId,chapter);
  if(!checkpoint)await saveChapterCheckpoint(G,chapter);
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
  if(G.health<=0){clearTimeout(deathTimer);deathTimer=setTimeout(()=>openDeathOverlay(),1600)}else closeDeathOverlay();
}

function closeDeathOverlay(){
  clearTimeout(deathTimer);deathTimer=null;const o=$('#deathOverlay');if(!o)return;o.classList.add('hidden');o.setAttribute('aria-hidden','true');$('#deathManualSaves')?.classList.add('hidden');
}

async function openDeathOverlay(){
  if(!G||G.health>0)return;const o=$('#deathOverlay');if(!o)return;const chapter=Number(G.chapter||1),checkpoint=await loadChapterCheckpoint(G.runId,chapter),manual=await listManual(G.runId);o.classList.remove('hidden');o.setAttribute('aria-hidden','false');
  const restart=$('#deathChapterBtn');restart.disabled=!checkpoint;restart.textContent=checkpoint?`Почати главу ${chapter} заново`:'Нема чекпойнта цієї глави';
  const box=$('#deathManualSaves');box.innerHTML=manual.map(x=>`<button type="button" data-death-load="${x.slot}" ${x.state?'':'disabled'}><b>Слот ${x.slot}</b><span>${x.state?`Глава ${normalizeState(x.state).chapter}`:'Порожньо'}</span></button>`).join('');
  box.querySelectorAll('[data-death-load]').forEach(b=>b.onclick=async()=>{const run=G.runId,st=await loadManual(run,Number(b.dataset.deathLoad));if(!await loadManualState(run,st))return;closeDeathOverlay();show('gameScreen');await renderGame();toast('ЗАВАНТАЖЕНО',`Слот ${b.dataset.deathLoad}`)});
  $('#deathManualBtn').onclick=()=>box.classList.toggle('hidden');
  restart.onclick=async()=>{if(!checkpoint)return;G=normalizeState({...checkpoint,runId:G.runId});await clearChapterCheckpointsAfter(G.runId,chapter);await saveRun(G);closeDeathOverlay();show('gameScreen');await renderGame()};
  $('#deathMenuBtn').onclick=async()=>{closeDeathOverlay();await renderStart('home')};
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

  if(choice.battle){
    await persist();
    const result=await openStoryBattle(G,choice.battle);
    if(result?.state)G=normalizeState(result.state);if(result?.events)notifyEvents(result.events);
    const next=result?.outcome==='knockout'?choice.battle.nextOnKnockout:result?.outcome==='lose'?choice.battle.nextOnLose:choice.battle.nextOnWin;
    if(next){G.story.sceneId=next;G.scene=next}
    await persist();await renderGame();window.scrollTo({top:0,behavior:'instant'});
    return;
  }

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
  ({states:renderStates,stats:renderStats,needs:renderNeeds,sleep:renderSleep,inventory:renderInventory,clothes:renderClothes,companions:renderCompanions,relations:renderRelations,map:renderMap,shop:renderShop,settings:renderSettings}[currentTab]||renderInventory)();
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
  const mods=statModifiers(G),root=$('#menuContent'),p=G.heroProgression||{level:1,xp:0,points:0};
  const xp=Math.max(0,Math.min(99,Number(p.xp||0)));
  root.innerHTML=`<div class="section-title"><h2>Характеристики</h2><span>ГЕРОЙ · РІВЕНЬ ${p.level}</span></div>
    <div class="progression-card"><div class="progression-head"><div><b>Досвід</b><span>${xp}/100 XP</span></div><div><b>Очки прокачки</b><strong>${p.points}</strong></div></div><div class="progression-bar"><i style="width:${xp}%"></i></div><small>100 XP = новий рівень + 1 очко. Очки ви самі вкладаєте в характеристики.</small></div>
    <div class="stat-list">${STAT_KEYS.map(k=>{const st=G.stats[k]||{level:1},level=Math.max(1,Number(st.level||1)),mod=Number(mods[k]||0),now=effectiveStat(G,k),id=`stat-desc-${k}`;return `<article class="stat-card stat-upgrade-card"><div class="stat-head"><div><b>${STAT_LABELS[k]}</b> <button class="info-btn" type="button" data-info="${id}">ⓘ</button><div class="stat-level">Рівень ${level}${mod?` · <span class="${mod>0?'buff-text':'debuff-text'}">стани ${mod>0?'+':''}${mod}</span> · зараз ${now}`:''}</div></div><button type="button" class="stat-plus" data-stat-upgrade="${k}" ${p.points<=0||level>=10?'disabled':''}>+1</button></div><div class="stat-desc" id="${id}">${esc(STAT_DESCRIPTIONS[k])}</div><div class="stat-flavor">${esc(statFlavorText(k,level))}</div></article>`}).join('')}</div>`;
  root.querySelectorAll('.info-btn').forEach(btn=>btn.onclick=()=>{const el=$('#'+btn.dataset.info);if(el)el.classList.toggle('open')});
  root.querySelectorAll('[data-stat-upgrade]').forEach(btn=>btn.onclick=async()=>{if(!spendHeroPoint(G,btn.dataset.statUpgrade))return;await persist();renderStats();renderHeader();toast('ПРОКАЧАНО',`${STAT_LABELS[btn.dataset.statUpgrade]} +1`)})
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

function sleepPlace(){
  const env=String(G.world?.environment||'outdoors');
  const loc=String(G.world?.location||'').toLocaleLowerCase('uk-UA');
  if(env==='barn'||/хлів/.test(loc))return{key:'barn',label:'Хлів',activity:'sleep_barn'};
  if(env==='indoors')return{key:'house',label:'Хатина',activity:'sleep_house'};
  return{key:'outdoors',label:'Вулиця',activity:'sleep_outdoors'};
}

function sleepMessage(place,hours,cow){
  if(cow)return'Вас облизала корова';
  if(place==='house'){
    if(hours===8)return'Вісім годин без хуйні. Новий рекорд.';
    return'Вперше за сьогодні ви лежите і ніхто не говорить з вами. Навіть Євпапій. Підозріло.';
  }
  if(place==='barn')return'Пахне сіном і гімно';
  return'Спалось хуйово. Все';
}

async function doSleep(hours){
  const place=sleepPlace();
  const cow=place.key==='barn'&&Math.random()<.05;
  const effects=cow?[{type:'statusAdd',id:'cowLicked'}]:[];
  const r=executeAction(G,{
    id:`sleep_${place.key}_${hours}h`,
    minutes:hours*60,
    activity:place.activity,
    effects
  });
  G=r.state;
  notifyEvents(r.events);
  lastSleepMessage=sleepMessage(place.key,hours,cow);
  await persist();
  await renderGame();
  toast('ВИ ПОСПАЛИ',lastSleepMessage);
}

function renderSleep(){
  const place=sleepPlace();
  const options=[1,4,8];
  const root=$('#menuContent');
  const cards=options.map(hours=>{
    const action={id:'sleep_preview',minutes:hours*60,activity:place.activity,effects:[]};
    const preview=previewAction(G,action).filter(x=>/^(Бадьорість|Вода|Ситість|Здоровʼя)/.test(x));
    const effects=preview.map(x=>`<span class="sleep-effect ${x.includes('+')?'plus':'minus'}">${esc(x)}</span>`).join('');
    return `<button class="sleep-card" type="button" data-sleep-hours="${hours}">
      <b>${hours===1?'Подрімати 1 годину':hours===4?'Поспати 4 години':'Виспатися 8 годин'}</b>
      <small>${effects||'Час пройде.'}</small>
    </button>`;
  }).join('');
  root.innerHTML=`<div class="section-title"><h2>Сон</h2><span>${esc(place.label)}</span></div>
    <div class="info-card">Спати можна коли хочете. Наскільки це хороша ідея, залежить від місця й погоди.</div>
    ${lastSleepMessage?`<div class="sleep-result">${esc(lastSleepMessage)}</div>`:''}
    <div class="sleep-grid">${cards}</div>
    ${place.key==='barn'?'<div class="sleep-note">У хліві іноді може статись дещо рідкісне.</div>':''}`;
  root.querySelectorAll('[data-sleep-hours]').forEach(b=>b.onclick=()=>doSleep(Number(b.dataset.sleepHours)));
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
  if(!all.length){$('#menuContent').innerHTML=`<div class="section-title"><h2>Компаньйони</h2></div><div class="empty-state">Поки ви самі. Насолоджуйтесь моментом.</div>`;return}
  $('#menuContent').innerHTML=`<div class="section-title"><h2>Компаньйони</h2></div>${all.map(([id,c])=>{
    if(id==='evpapiy'){
      const r=G.relationships?.evpapiy?.values||{},p=c.progression||{level:c.level||1,xp:0,points:0,attack:1,aggression:1,health:1};const xp=Math.max(0,Math.min(99,Number(p.xp||0)));
      const rel=[['ПІЗДАБОЛЬСТВО',r.bullshit,'як часто він бреше та підйобує.'],['ДОВІРА',r.trust,'чим вище, тим більше шансів, шо ця жирна падла реально скаже щось корисне.'],['ОБРАЗА',r.offense,'Євпапій памʼятає більше, ніж хотілося б.'],['ЖАДІБНІСТЬ',r.greed,'наскільки легко його задобрити їжею.']];
      const combat=[['attack','АТАКА',p.attack,'сильніше бʼє, коли ви таки використовуєте голуба як зброю.'],['aggression','АГРЕСІЯ',p.aggression,'додає шкоди його бойовим діям.'],['health','ЗДОРОВʼЯ',p.health,`максимум зараз ${c.maxHp} HP.`]];
      return `<article class="companion-profile"><div class="companion-main"><img src="${esc(c.portrait||'./pigeon_base.png')}" alt="Євпапій"><div class="companion-main-copy"><div class="companion-name">${esc(c.name||'Євпапій')} · РІВЕНЬ ${p.level}</div><div class="companion-state">${esc(c.active?'З вами':c.state||'Не з вами')}</div><p>До вас прибився жирний наглий голуб, який дуже бісить.</p></div></div>
        <div class="progression-card compact"><div class="progression-head"><div><b>Досвід</b><span>${xp}/100 XP</span></div><div><b>Очки прокачки</b><strong>${p.points}</strong></div></div><div class="progression-bar"><i style="width:${xp}%"></i></div></div>
        <div class="companion-characteristics"><h3>Бойова прокачка</h3>${combat.map(([key,label,value,desc])=>`<div class="comp-stat upgrade"><div class="comp-stat-head"><b>${label} · ${value}</b><button type="button" data-evp-upgrade="${key}" ${p.points<=0||value>=10?'disabled':''}>+1</button></div><span>${esc(desc)}</span></div>`).join('')}</div>
        <div class="companion-characteristics"><h3>Характер і стосунки</h3>${rel.map(([label,value,desc])=>`<div class="comp-stat"><div class="comp-stat-head"><b>${label}</b>${companionDots(value)}</div><span>${esc(desc)}</span></div>`).join('')}</div><div class="companion-warning">З ним може бути легше. Може, веселіше. А може, на вас просто чекає жирна підстава.</div></article>`;
    }
    return `<article class="companion-card"><img src="${esc(c.portrait||'')}" alt=""><div><b>${esc(c.name)}</b><span>${esc(c.active?'З вами':c.state||'Не з вами')}</span>${c.facts?.map(x=>`<small>${esc(x)}</small>`).join('')||''}</div></article>`
  }).join('')}`;
  document.querySelectorAll('[data-evp-upgrade]').forEach(btn=>btn.onclick=async()=>{if(!spendEvpPoint(G,btn.dataset.evpUpgrade))return;await persist();renderCompanions();toast('ЄВПАПІЙ ПРОКАЧАНИЙ',`${btn.dataset.evpUpgrade==='attack'?'АТАКА':btn.dataset.evpUpgrade==='aggression'?'АГРЕСІЯ':'ЗДОРОВʼЯ'} +1`)})
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
  const day=Math.floor(Number(G.clock?.totalMinutes||0)/1440)+1;
  const jobs=[
    {id:'sweep',title:'Підмести двір',pay:2,minutes:15,repeat:'daily',done:Number(G.flags.sweptYardDay||0)===day,effects:[{type:'money',value:2}],hidden:[{type:'flag',key:'sweptYard',value:true},{type:'flag',key:'sweptYardDay',value:day}]},
    {id:'wood',title:'Нарубати дрова',pay:4,minutes:25,repeat:'daily',done:Number(G.flags.choppedWoodDay||0)===day,effects:[{type:'money',value:4},{type:'stat',key:'strength',value:1}],hidden:[{type:'flag',key:'choppedWood',value:true},{type:'flag',key:'choppedWoodDay',value:day}]},
    {id:'deal',title:'Підписатись на підозріле діло',pay:8,minutes:10,repeat:'once',done:Boolean(G.flags.suspiciousDeal),effects:[{type:'money',value:8}],hidden:[{type:'flag',key:'suspiciousDeal',value:true},{type:'flag',key:'suspiciousDealDay',value:day},{type:'flag',key:'suspiciousDealConsequence',value:true},{type:'flag',key:'suspiciousDealConsequencePending',value:true}]}
  ];
  $('#menuContent').innerHTML=`<div class="section-title"><h2>Крамничка</h2><span><b>${G.money}</b> монет</span></div>${G.flags.shopUnlocked?`<div class="shop-money">У вас зараз <b>${G.money} монет</b>.</div><div class="shop-grid">${items.map(([id,p])=>`<article class="item-card"><div class="item-icon">${ITEM_DEFS[id].icon}</div><div class="item-copy"><b>${esc(ITEM_DEFS[id].name)}</b><span>${p} мон.</span><button data-buy="${id}" data-price="${p}">Купити</button></div></article>`).join('')}</div><div class="section-title shop-work-title"><h2>Як заробити</h2><span>День ${day}</span></div><div class="info-card">Звичайна робота поновлюється кожного нового ігрового дня.</div><div class="shop-jobs">${jobs.map(j=>`<article class="job-card ${j.done?'done':''}"><div><b>${esc(j.title)}</b><span>${j.done?(j.repeat==='daily'?'На сьогодні вже зробили.':'Уже зробили.'):`${j.minutes} хв · +${j.pay} монет`}</span></div><button data-job="${j.id}" ${j.done?'disabled':''}>${j.done?'Готово':'Взятись'}</button></article>`).join('')}</div>`:'<div class="locked-big">Ще закрито.</div>'}`;
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
  root.querySelectorAll('[data-load]').forEach(b=>b.onclick=async()=>{const run=G.runId,s=await loadManual(run,Number(b.dataset.load));if(await loadManualState(run,s)){closeMenu();await renderGame();toast('ЗАВАНТАЖЕНО',`Слот ${b.dataset.load}`)}});
}

function openAbout(){const o=$('#aboutOverlay');o.classList.remove('hidden');o.setAttribute('aria-hidden','false')}
function closeAbout(){const o=$('#aboutOverlay');o.classList.add('hidden');o.setAttribute('aria-hidden','true')}

$('#newGameBtn').onclick=()=>renderStart('new');
$('#continueBtn').onclick=()=>renderStart('continue');
$('#chaptersBtn').onclick=()=>renderStart('chapters');
$('#savesBtn').onclick=()=>renderStart('saves');
$('#aboutBtn').onclick=openAbout;
$('#testModeBtn').onclick=()=>{if(testerUnlocked())renderStart('test')};
$('#aboutCloseBtn').onclick=closeAbout;
$('#aboutOverlay').onclick=e=>{if(e.target===$('#aboutOverlay'))closeAbout()};
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

installTesterUnlock();
renderStart('home');
