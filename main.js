import {
  STAT_KEYS,STAT_LABELS,STAT_DESCRIPTIONS,REL_LABELS
} from './config.js';
import {STATUS_DEFS,CLOTHES,ITEM_DEFS} from './data.js';
import {
  normalizeState,formatTime,threatInfo,thermal,equipmentTotals,equip,
  statModifiers,effectiveStat,itemCount,assignQuickSlot,useItem
} from './engine.js';
import {
  listRuns,loadRun,saveRun,clearRun,saveManual,loadManual,listManual,
  emergencySaveRun,storageCapabilities
} from './storage.js';

const $=s=>document.querySelector(s);
let G=null;
let currentTab='inventory';
let pendingQuickItem=null;
let toastTimer=null;

function toast(title,body=''){
  const el=$('#toast');
  el.innerHTML=`<b>${title}</b>${body}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.add('hidden'),2200);
}

function statusEffectText(id){
  const d=STATUS_DEFS[id];if(!d)return'';
  const parts=[];
  for(const [key,value] of Object.entries(d.mods||{})){
    const label=STAT_LABELS[key]||key;
    parts.push(`${label} ${value>0?'+':''}${value}`);
  }
  for(const extra of d.extraEffects||[])parts.push(extra);
  return parts.join(' · ');
}

async function persist(){
  if(!G)return;
  G=normalizeState(G);
  await saveRun(G);
}

async function createRun(run){
  await clearRun(run);
  const {createInitialState}=await import('./engine.js');
  G=createInitialState(run);
  await saveRun(G);
  showGame();
}

async function showStart(){
  if(G)await persist();
  G=null;
  $('#gameScreen').classList.add('hidden');
  $('#startScreen').classList.remove('hidden');
  $('#runPicker').classList.add('hidden');
  await renderStorageStatus();
}

function showGame(){
  $('#startScreen').classList.add('hidden');
  $('#gameScreen').classList.remove('hidden');
  renderGame();
}

async function renderStorageStatus(){
  const caps=await storageCapabilities();
  $('#storageStatus').textContent=`Збереження: ${caps.readBack?'працює':'є проблема'} · localStorage ${caps.localStorage?'✓':'×'} · IndexedDB ${caps.indexedDB?'✓':'×'}`;
}

async function openRunPicker(mode){
  const runs=await listRuns();
  const box=$('#runPicker');
  box.classList.remove('hidden');

  if(mode==='continue'){
    const saved=runs.filter(x=>x.state);
    if(saved.length===0){
      box.innerHTML='<div class="run-card"><b>Нема збережених проходжень.</b></div>';
      return;
    }
    box.innerHTML=saved.map(({run,state})=>{
      const s=normalizeState(state),tm=formatTime(s.clock.totalMinutes);
      return `<div class="run-card">
        <div class="run-top"><b>Проходження ${run}</b><span class="small">День ${tm.day} · ${tm.time} · ❤️ ${Math.round(s.health)}%</span></div>
        <div class="run-actions"><button class="primary" data-continue="${run}">Продовжити</button></div>
      </div>`;
    }).join('');

    box.querySelectorAll('[data-continue]').forEach(b=>b.onclick=async()=>{
      G=normalizeState(await loadRun(Number(b.dataset.continue)));
      showGame();
    });
    return;
  }

  box.innerHTML=runs.map(({run,state})=>{
    const s=state?normalizeState(state):null;
    const meta=s?`Є сейв · День ${formatTime(s.clock.totalMinutes).day}`:'Пусто';
    return `<div class="run-card">
      <div class="run-top"><b>Проходження ${run}</b><span class="small">${meta}</span></div>
      <div class="run-actions"><button class="primary" data-new="${run}">${s?'Почати заново':'Почати'}</button></div>
    </div>`;
  }).join('');

  box.querySelectorAll('[data-new]').forEach(b=>b.onclick=async()=>{
    const run=Number(b.dataset.new),existing=await loadRun(run);
    if(existing&&!confirm(`Стерти проходження ${run} і почати заново?`))return;
    await createRun(run);
  });
}

function renderGame(){
  if(!G)return;
  G=normalizeState(G);

  const tm=formatTime(G.clock.totalMinutes),w=G.world.weather,t=thermal(G),th=threatInfo(G);

  $('#timeLine').textContent=`День ${tm.day} · ${tm.time}`;
  $('#weatherLine').textContent=`${w.icon} ${w.label} ${w.tempC}°C · ${t.feel}`;
  $('#threatLine').innerHTML=`Загроза: <b class="${th.key==='low'?'good':th.key==='medium'?'warn':'bad'}">${th.label}</b>${th.key!=='low'?` · ${th.reason}`:''}`;

  const needs=[
    ['❤️','Здоровʼя',G.health],
    ['🍞','Ситість',G.needs.satiety],
    ['💧','Вода',G.needs.water],
    ['😴','Бадьорість',G.needs.energy]
  ];
  $('#miniNeeds').innerHTML=needs.map(([icon,label,value])=>`
    <div class="need-chip"><b>${icon} ${label}</b><span>${icon} ${Math.round(value)}%</span></div>
  `).join('');

  $('#activeStateCount').textContent=`(${G.activeStatuses.length})`;
  $('#activeStates').innerHTML=G.activeStatuses.length
    ?G.activeStatuses.map(id=>{
      const d=STATUS_DEFS[id],effects=statusEffectText(id);
      return `<div class="state-row"><b>${d.name}</b><div class="small">${d.blurb}${effects?`<br>ефект: ${effects}`:''}</div></div>`;
    }).join('')
    :'<div class="small" style="padding-top:8px">Нема активних станів.</div>';

  renderQuickSlots();
}

function renderQuickSlots(){
  const root=$('#quickSlots');
  root.innerHTML=G.quickSlots.map((id,i)=>{
    if(!id)return `<button class="quick-slot empty" data-q="${i}">Слот ${i+1}</button>`;
    const d=ITEM_DEFS[id],count=itemCount(G,id);
    return `<button class="quick-slot" data-q="${i}">
      <span class="qicon">${d?.icon||'◻️'}</span>
      <span>${d?.name||id}</span>
      <span class="qcount">×${count}</span>
    </button>`;
  }).join('');

  root.querySelectorAll('[data-q]').forEach(b=>b.onclick=async()=>{
    const i=Number(b.dataset.q),id=G.quickSlots[i];
    if(!id){openMenu('inventory');return;}
    const result=useItem(G,id);
    if(!result.used){
      toast('НЕ ВИЙШЛО','Цей предмет зараз не використовується напряму.');
      return;
    }
    G=result.state;
    await persist();
    renderGame();
    if(!$('#menuOverlay').classList.contains('hidden'))renderMenu();
    toast('ВИКОРИСТАНО',ITEM_DEFS[id]?.name||id);
  });
}

function openMenu(tab=currentTab){
  currentTab=tab;
  $('#menuOverlay').classList.remove('hidden');
  $('#menuOverlay').setAttribute('aria-hidden','false');
  renderMenu();
}

function closeMenu(){
  $('#menuOverlay').classList.add('hidden');
  $('#menuOverlay').setAttribute('aria-hidden','true');
}

function renderMenu(){
  if(!G)return;
  document.querySelectorAll('#menuTabs [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===currentTab));

  const tm=formatTime(G.clock.totalMinutes);
  $('#menuMeta').textContent=`Проходження ${G.runId} · День ${tm.day} · ${tm.time}`;

  if(currentTab==='inventory')renderInventory();
  if(currentTab==='clothes')renderClothes();
  if(currentTab==='stats')renderStats();
  if(currentTab==='states')renderStates();
  if(currentTab==='relations')renderRelations();
  if(currentTab==='map')renderMap();
  if(currentTab==='shop')renderShop();
  if(currentTab==='saves')renderSaves();
}

function renderInventory(){
  const root=$('#menuContent');
  const slots=[...G.inventory];
  while(slots.length<16)slots.push(null);

  root.innerHTML=`
    <div class="section-title"><h2>Інвентар</h2><span class="small">${G.inventory.length}/16 слотів</span></div>
    <p class="explain">Звичайні речі займають слот. Важливі сюжетні предмети лежать окремо й місце не жеруть.</p>
    <div class="inventory-grid">
      ${slots.map((slot,i)=>{
        if(!slot)return `<div class="inventory-slot empty">Пусто</div>`;
        const d=ITEM_DEFS[slot.id]||{name:slot.id,icon:'◻️',category:'Інше',description:''};
        const canUse=Array.isArray(d.useEffects)&&d.useEffects.length>0;
        return `<div class="inventory-slot">
          <div>
            <div class="item-top"><span class="item-icon">${d.icon}</span><span class="item-qty">×${slot.qty}</span></div>
            <div class="item-name">${d.name}</div>
            <div class="item-cat">${d.category}</div>
            <div class="item-desc">${d.description||''}</div>
          </div>
          <div class="item-actions">
            ${canUse?`<button data-use="${slot.id}">Використати</button>`:''}
            <button data-quick="${slot.id}">У швидкий слот</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="section-title" style="margin-top:18px"><h2>Важливе</h2></div>
    <div class="important-list">
      ${G.importantItems.length
        ?G.importantItems.map(x=>`<div class="important-card"><b>${x.name||x.id}</b></div>`).join('')
        :'<div class="locked-card"><b>Поки пусто.</b><div class="small">Сюжетні речі зʼявляться тут і не займуть звичайні слоти.</div></div>'}
    </div>
  `;

  root.querySelectorAll('[data-use]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.use,result=useItem(G,id);
    if(!result.used){toast('НЕ ВИЙШЛО','Цей предмет зараз не використовується напряму.');return;}
    G=result.state;await persist();renderGame();renderInventory();toast('ВИКОРИСТАНО',ITEM_DEFS[id]?.name||id);
  });

  root.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{
    pendingQuickItem=b.dataset.quick;
    $('#slotPickerOverlay').classList.remove('hidden');
    renderSlotPicker();
  });
}

function renderSlotPicker(){
  const root=$('#slotPickerButtons');
  const d=ITEM_DEFS[pendingQuickItem];
  root.innerHTML=[0,1,2].map(i=>{
    const current=G.quickSlots[i],c=current?ITEM_DEFS[current]:null;
    return `<button data-slot="${i}">
      <b>Слот ${i+1}</b><br>
      <span class="small">${c?`${c.icon} ${c.name}`:'пусто'}</span>
    </button>`;
  }).join('');

  root.querySelectorAll('[data-slot]').forEach(b=>b.onclick=async()=>{
    assignQuickSlot(G,Number(b.dataset.slot),pendingQuickItem);
    $('#slotPickerOverlay').classList.add('hidden');
    pendingQuickItem=null;
    await persist();
    renderGame();
    renderInventory();
  });
}

function renderClothes(){
  const root=$('#menuContent'),eq=equipmentTotals(G);
  root.innerHTML=`
    <div class="section-title"><h2>Шмотки</h2><span class="small">Броня +${eq.armor} · холод +${eq.warmth} · жара -${eq.heatBurden} · дощ +${eq.rainProtection}</span></div>
    <p class="explain">Одяг тепер реально впливає на броню, холод, спеку й дощ. Речі одного слота замінюють одна одну.</p>
    <div class="clothes-list">
      ${G.ownedClothes.map(id=>{
        const d=CLOTHES[id],on=G.equipment[d.slot]===id;
        const chips=[`Броня +${d.armor}`,`Холод +${d.warmth}`];
        if(d.heatBurden)chips.push(`Жара -${d.heatBurden}`);
        if(d.rainProtection)chips.push(`Дощ +${d.rainProtection}`);
        if(d.statMods)for(const [k,v] of Object.entries(d.statMods))chips.push(`${STAT_LABELS[k]} ${v>0?'+':''}${v}`);
        return `<div class="clothes-card">
          <div class="clothes-head"><div><b>${d.name}</b><div class="small">${d.note||''}</div></div><button data-equip="${id}" ${on?'disabled':''}>${on?'Вдягнено':'Вдягнути'}</button></div>
          <div class="chips">${chips.map(x=>`<span class="chip">${x}</span>`).join('')}</div>
        </div>`;
      }).join('')}
    </div>
  `;

  root.querySelectorAll('[data-equip]').forEach(b=>b.onclick=async()=>{
    equip(G,b.dataset.equip);
    await persist();
    renderGame();
    renderClothes();
  });
}

function renderStats(){
  const root=$('#menuContent'),mods=statModifiers(G);
  root.innerHTML=`
    <div class="section-title"><h2>Характеристики</h2></div>
    <p class="explain">Кожна характеристика має рівень і 10 поділок прогресу. Заповнили всі 10 – отримуєте новий рівень. Тимчасові плюси й мінуси прогрес не змінюють. «Зараз» – реальне значення з усіма модифікаторами.</p>
    <div class="stat-list">
      ${STAT_KEYS.map(k=>{
        const s=G.stats[k],mod=mods[k]||0,now=effectiveStat(G,k);
        const pips=Array.from({length:10},(_,i)=>`<span class="pip ${i<s.progress?'on':''}"></span>`).join('');
        return `<div class="stat-card">
          <div>
            <div class="stat-name">${STAT_LABELS[k]}</div>
            <div class="stat-desc">${STAT_DESCRIPTIONS[k]}</div>
            <div class="stat-meta">Рівень ${s.level} · прогрес ${s.progress}/10${mod?` · тимчасово ${mod>0?'+':''}${mod}`:''} · <b>Зараз: ${now}</b></div>
          </div>
          <div class="stat-meter">${pips}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function renderStates(){
  const root=$('#menuContent'),known=new Set(G.discoveredStatuses),ids=Object.keys(STATUS_DEFS);
  root.innerHTML=`
    <div class="section-title"><h2>Стани</h2><span class="small">Відкрито ${ids.filter(x=>known.has(x)).length}/${ids.length}</span></div>
    <p class="explain">На головному екрані показуються тільки активні стани. Тут – довідник усіх станів, які ви вже відкрили.</p>
    <div class="state-list">
      ${ids.map(id=>{
        const d=STATUS_DEFS[id];
        if(!known.has(id))return `<div class="locked-card"><b>???</b><div class="small">Ще не відкрито.</div></div>`;
        const effects=statusEffectText(id);
        return `<div class="state-card">
          <div class="state-name">${d.name}</div>
          <div class="state-blurb">${d.blurb}</div>
          <div class="state-extra">${effects?`<b>ефект:</b> ${effects}<br>`:''}${d.persistentUnlock?'<b>особливий ефект:</b> відкриває секретні дії [ЄБАТОРІУМ].<br>':''}<b>як позбутись:</b> ${d.remove}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function renderRelations(){
  const root=$('#menuContent');
  const rels=Object.entries(G.relationships).filter(([,r])=>r.known);

  root.innerHTML=`
    <div class="section-title"><h2>Стосунки</h2></div>
    <p class="explain">Шкали 0–10. Не всі параметри персонажа відкриваються одразу, а гра не пояснює, яка саме ваша дія змінила ставлення.</p>
    <div class="relation-list">
      ${rels.map(([id,r])=>{
        const discovered=r.discoveredParams||[];
        return `<div class="relation-card">
          <div class="relation-head"><b>${r.name}</b><span class="small">${discovered.length?'':'Ставлення: незрозуміле'}</span></div>
          ${discovered.length?`<div class="relation-params">${discovered.map(k=>{
            const v=r.values[k]??0;
            return `<div class="relation-param"><span>${REL_LABELS[k]||k}</span><div class="rel-track"><div class="rel-fill" style="width:${v*10}%"></div></div><b>${v}/10</b></div>`;
          }).join('')}</div>`:'<div class="small" style="margin-top:8px">Ви ще мало його знаєте.</div>'}
        </div>`;
      }).join('')}
    </div>
  `;
}

function renderMap(){
  const root=$('#menuContent');
  root.innerHTML=`
    <div class="section-title"><h2>Карта</h2></div>
    ${G.flags.mapUnlocked
      ?'<div class="map-box"><div><b>Карта відкрита.</b><span class="small">Справжні точки додамо разом із переносом сюжету, щоб не спойлерити локації наперед.</span></div></div>'
      :'<div class="map-box"><div><b>КАРТА ЩЕ НЕ ВІДКРИТА</b><span class="small">Коли герой її отримає по сюжету, вкладка оживе сама.</span></div></div>'}
  `;
}

function renderShop(){
  const root=$('#menuContent');
  root.innerHTML=`
    <div class="section-title"><h2>Крамничка</h2></div>
    ${G.flags.shopUnlocked
      ?'<div class="shop-box"><div><b>Крамничка відкрита.</b><span class="small">Асортимент і роботу за товари підключимо разом із бабою Галею.</span></div></div>'
      :'<div class="shop-box"><div><b>КРАМНИЧКА ЩЕ НЕ ВІДКРИТА</b><span class="small">Вона привʼязана до сюжетної локації, тому зараз тут нічого не спойлеримо.</span></div></div>'}
  `;
}

async function renderSaves(){
  const root=$('#menuContent'),saves=await listManual(G.runId);
  const at=G.lastAutosaveAt?new Date(G.lastAutosaveAt).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'ще нема';

  root.innerHTML=`
    <div class="section-title"><h2>Збереження</h2></div>
    <p class="explain">Автосейв: ${at}. Він спрацьовує після важливих змін і дублюється у двох сховищах браузера.</p>
    <div class="save-list">
      ${saves.map(({slot,state})=>{
        const s=state?normalizeState(state):null,tm=s?formatTime(s.clock.totalMinutes):null;
        return `<div class="save-card">
          <div class="save-head"><b>Ручний слот ${slot}</b><span class="small">${s?`День ${tm.day} · ${tm.time}`:'Пусто'}</span></div>
          <div class="save-actions"><button data-save="${slot}">Зберегти</button>${s?`<button data-load="${slot}">Завантажити</button>`:''}</div>
        </div>`;
      }).join('')}
    </div>
  `;

  root.querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
    await saveManual(G,Number(b.dataset.save));
    toast('ЗБЕРЕЖЕНО',`Ручний слот ${b.dataset.save}`);
    renderSaves();
  });

  root.querySelectorAll('[data-load]').forEach(b=>b.onclick=async()=>{
    const state=await loadManual(G.runId,Number(b.dataset.load));
    if(!state)return;
    G=normalizeState(state);
    await persist();
    renderGame();
    renderSaves();
    toast('ЗАВАНТАЖЕНО',`Ручний слот ${b.dataset.load}`);
  });
}

$('#newGameBtn').onclick=()=>openRunPicker('new');
$('#continueBtn').onclick=()=>openRunPicker('continue');
$('#menuBtn').onclick=()=>openMenu();
$('#exitBtn').onclick=showStart;
$('#closeMenuBtn').onclick=closeMenu;
$('#openInventoryBtn').onclick=()=>openMenu('inventory');
$('#openRelationsBtn').onclick=()=>openMenu('relations');
$('#closeSlotPickerBtn').onclick=()=>{
  $('#slotPickerOverlay').classList.add('hidden');
  pendingQuickItem=null;
};

document.querySelectorAll('#menuTabs [data-tab]').forEach(b=>b.onclick=()=>{
  currentTab=b.dataset.tab;
  renderMenu();
});

$('#menuOverlay').addEventListener('click',e=>{
  if(e.target===$('#menuOverlay'))closeMenu();
});
$('#slotPickerOverlay').addEventListener('click',e=>{
  if(e.target===$('#slotPickerOverlay')){
    $('#slotPickerOverlay').classList.add('hidden');
    pendingQuickItem=null;
  }
});

window.addEventListener('pagehide',()=>{if(G)emergencySaveRun(G)});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'&&G){
    emergencySaveRun(G);
    saveRun(G);
  }
});

await showStart();
