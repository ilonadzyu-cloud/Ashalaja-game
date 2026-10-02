import {
  STAT_KEYS,STAT_LABELS,STAT_DESCRIPTIONS,REL_LABELS
} from './config.js?v=055';
import {STATUS_DEFS,CLOTHES,ITEM_DEFS} from './data.js?v=055';
import {
  createInitialState,normalizeState,formatTime,threatInfo,thermal,equipmentTotals,equip,
  statModifiers,effectiveStat,itemCount,assignQuickSlot,useItem
} from './engine.js?v=055';
import {
  listRuns,loadRun,saveRun,clearRun,saveManual,loadManual,listManual,
  emergencySaveRun,storageCapabilities
} from './storage.js?v=055';
import {audioManager} from './audio.js?v=055';

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


function askConfirm({title='Почати заново?',text='',okText='Так, почати заново'}={}){
  return new Promise(resolve=>{
    const overlay=$('#confirmOverlay');
    const titleEl=$('#confirmTitle');
    const textEl=$('#confirmText');
    const okBtn=$('#confirmOkBtn');
    const cancelBtn=$('#confirmCancelBtn');

    titleEl.textContent=title;
    textEl.textContent=text;
    okBtn.textContent=okText;

    const finish=value=>{
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
      okBtn.onclick=null;
      cancelBtn.onclick=null;
      overlay.onclick=null;
      resolve(value);
    };

    okBtn.onclick=()=>finish(true);
    cancelBtn.onclick=()=>finish(false);
    overlay.onclick=e=>{ if(e.target===overlay)finish(false); };

    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');
  });
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
  G=createInitialState(run);
  await saveRun(G);
  showGame();
}

async function showStart(){
  if(G)await persist();
  audioManager.setAtmosphere('silent');
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
  audioManager.setAtmosphere('village');
}

async function renderStorageStatus(){
  const caps=await storageCapabilities();
  $('#storageStatus').textContent=`Збереження: ${caps.readBack?'працює':'є проблема'} · localStorage ${caps.localStorage?'✓':'×'} · IndexedDB ${caps.indexedDB?'✓':'×'}`;
}

async function openRunPicker(mode){
  const box=$('#runPicker');
  box.classList.remove('hidden');
  box.innerHTML='<div class="run-card"><b>Завантажую слоти…</b></div>';
  const runs=await listRuns();

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
    if(existing){
      const ok=await askConfirm({
        title:`Стерти проходження ${run}?`,
        text:'Цей сейв буде видалено, і гра почнеться з самого початку.',
        okText:'Так, почати заново'
      });
      if(!ok)return;
    }
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
    <div class="need-chip" title="${label}" aria-label="${label}: ${Math.round(value)}%">
      <span class="need-icon">${icon}</span>
      <span class="need-value">${Math.round(value)}%</span>
    </div>
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
  if(currentTab==='companions')renderCompanions();
  if(currentTab==='relations')renderRelations();
  if(currentTab==='map')renderMap();
  if(currentTab==='shop')renderShop();
  if(currentTab==='audio')renderAudio();
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


function renderCompanions(){
  const root=$('#menuContent');
  const companions=Object.entries(G.companions||{}).filter(([,c])=>c.known);
  const active=companions.filter(([,c])=>c.active);
  const known=companions.filter(([,c])=>!c.active);

  const card=([id,c])=>`
    <div class="companion-card ${c.active?'active':''}">
      <div class="companion-portrait-wrap">
        <img class="companion-portrait" src="${c.portrait||'./evpapiy.png'}" alt="${c.name}">
      </div>
      <div class="companion-copy">
        <div class="companion-head">
          <b>${c.name}</b>
          <span class="companion-badge ${c.active?'active':''}">${c.active?'З вами':(c.state||'Не з вами')}</span>
        </div>
        <div class="small">${c.active?'Цей персонаж зараз іде разом із героєм.':'Персонаж уже відомий, але зараз не є активним компаньйоном.'}</div>
      </div>
    </div>
  `;

  root.innerHTML=`
    <div class="section-title"><h2>Компаньйони</h2></div>
    <p class="explain">Тут тільки ті персонажі, які можуть іти разом із героєм. Стосунки з ними лишаються в окремій вкладці.</p>

    <div class="companion-section">
      <h3>Зараз із вами</h3>
      <div class="companions-grid">
        ${active.length?active.map(card).join(''):'<div class="locked-card"><b>Поки нікого.</b><div class="small">Коли хтось реально приєднається по сюжету, його портрет зʼявиться тут.</div></div>'}
      </div>
    </div>

    ${known.length?`
      <div class="companion-section">
        <h3>Відомі компаньйони</h3>
        <div class="companions-grid">${known.map(card).join('')}</div>
      </div>
    `:''}
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



function renderAudio(){
  const root=$('#menuContent');
  const s=audioManager.getSettings();
  const pct=v=>Math.round(v*100);

  root.innerHTML=`
    <div class="section-title"><h2>Звук</h2></div>
    <p class="explain">На iPhone звук активується після першого натискання. Далі сцени можуть самі перемикати атмосферу й запускати ефекти.</p>

    <div class="audio-settings">
      <div class="audio-card">
        <div class="audio-toggle">
          <div>
            <b>Звук у грі</b>
            <div class="small">${s.enabled?'Увімкнено':'Вимкнено'}</div>
          </div>
          <button id="audioToggleBtn" class="${s.enabled?'on':'off'}">${s.enabled?'Вимкнути':'Увімкнути'}</button>
        </div>
      </div>

      <div class="audio-card">
        <div class="audio-row">
          <b>Загальна гучність</b>
          <input id="masterVolume" type="range" min="0" max="100" value="${pct(s.master)}">
          <span id="masterVolumeValue">${pct(s.master)}%</span>
        </div>
        <div class="audio-row">
          <b>Атмосфера</b>
          <input id="ambientVolume" type="range" min="0" max="100" value="${pct(s.ambient)}">
          <span id="ambientVolumeValue">${pct(s.ambient)}%</span>
        </div>
        <div class="audio-row">
          <b>Музика</b>
          <input id="musicVolume" type="range" min="0" max="100" value="${pct(s.music)}">
          <span id="musicVolumeValue">${pct(s.music)}%</span>
        </div>
        <div class="audio-row">
          <b>Ефекти</b>
          <input id="effectsVolume" type="range" min="0" max="100" value="${pct(s.effects)}">
          <span id="effectsVolumeValue">${pct(s.effects)}%</span>
        </div>

        <div class="audio-note">
          У самій грі це перемикатиметься автоматично: надворі – село й далекі пси, у хаті – приглушене село + багаття, під дощем – дощ поверх села.
        </div>
      </div>

      <div class="audio-card">
        <b>Перевірити атмосферу</b>
        <div class="audio-presets">
          <button data-atmosphere="village">🌾 Село</button>
          <button data-atmosphere="hut">🔥 Хата + багаття</button>
          <button data-atmosphere="rain">🌧️ Дощ</button>
          <button data-atmosphere="silent">🔇 Тиша</button>
        </div>
      </div>

      <div class="audio-card">
        <b>Перевірити ефекти</b>
        <div class="audio-effects">
          <button data-sfx="dogs">🐕 Далекі пси</button>
          <button data-sfx="wings">🪽 Крила Євпапія</button>
          <button data-sfx="bang">💥 БАХ у сараї</button>
          <button data-sfx="ui">Клік</button>
        </div>
      </div>
    </div>
  `;

  $('#audioToggleBtn').onclick=async()=>{
    const next=!audioManager.getSettings().enabled;
    audioManager.setEnabled(next);
    if(next)await audioManager.unlock();
    renderAudio();
  };

  const bind=(id,kind,valueId)=>{
    const input=$(id),value=$(valueId);
    input.oninput=()=>{
      const v=Number(input.value)/100;
      audioManager.setVolume(kind,v);
      value.textContent=`${input.value}%`;
    };
  };

  bind('#masterVolume','master','#masterVolumeValue');
  bind('#ambientVolume','ambient','#ambientVolumeValue');
  bind('#musicVolume','music','#musicVolumeValue');
  bind('#effectsVolume','effects','#effectsVolumeValue');

  root.querySelectorAll('[data-atmosphere]').forEach(b=>b.onclick=async()=>{
    const ok=await audioManager.setAtmosphere(b.dataset.atmosphere);
    if(b.dataset.atmosphere==='silent'){
      toast('ТИША','Атмосферу вимкнено.');
    }else{
      toast(ok?'АТМОСФЕРА ПРАЦЮЄ':'НЕ ЗАПУСТИЛОСЬ',ok?b.textContent:'Спробуйте натиснути ще раз.');
    }
  });

  root.querySelectorAll('[data-sfx]').forEach(b=>b.onclick=async()=>{
    const ok=await audioManager.playEffect(b.dataset.sfx,{volume:0.9});
    toast(ok?'ЕФЕКТ ПРАЦЮЄ':'НЕ ЗАПУСТИЛОСЬ',ok?b.textContent:'Перевірте, чи звук увімкнений.');
  });
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

$('#newGameBtn').onclick=()=>{
  audioManager.unlock();
  openRunPicker('new').catch(err=>{
    console.error(err);
    $('#runPicker').classList.remove('hidden');
    $('#runPicker').innerHTML='<div class="run-card"><b>Не вдалося відкрити слоти.</b><div class="small">Оновіть сторінку. Якщо повториться – це вже конкретний баг, а не кнопка.</div></div>';
  });
};
$('#continueBtn').onclick=()=>{
  audioManager.unlock();
  openRunPicker('continue').catch(err=>{
    console.error(err);
    $('#runPicker').classList.remove('hidden');
    $('#runPicker').innerHTML='<div class="run-card"><b>Не вдалося прочитати сейви.</b></div>';
  });
};
$('#menuBtn').onclick=()=>{ audioManager.unlock(); openMenu(); };
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


document.addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(!button)return;
  if(button.dataset.sfx==='ui')return;
  audioManager.playEffect('ui',{volume:0.30});
});

window.addEventListener('pagehide',()=>{if(G)emergencySaveRun(G)});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'&&G){
    emergencySaveRun(G);
    saveRun(G);
  }
});

showStart().catch(err=>{
  console.error(err);
  const status=$('#storageStatus');
  if(status)status.textContent='Помилка запуску JS: '+(err?.message||String(err));
});
