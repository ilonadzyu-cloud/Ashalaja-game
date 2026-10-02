import {STAT_KEYS,STAT_LABELS,REL_LABELS} from './config.js';
import {STATUS_DEFS,CLOTHES,WEATHER_PRESETS} from './data.js';
import {createInitialState,executeAction,previewAction,equipmentTotals,equip,statModifiers,thermal,formatTime,threatInfo} from './engine.js';
import {listRuns,loadRun,saveRun,clearRun,saveManual,loadManual,listManual,emergencySaveRun,storageCapabilities} from './storage.js';
import {coreActions} from './story-test.js';

const $=s=>document.querySelector(s);
let G=null,currentTab='stats',toastTimer=null,lastSaveResult=null;

function toast(title,body=''){
  const el=$('#toast');
  el.innerHTML=`<b>${title}</b>${body}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.add('hidden'),2200);
}

async function autosave(){
  if(!G)return;
  lastSaveResult=await saveRun(G);
}

async function newRun(run){
  await clearRun(run);
  const state=createInitialState(run);
  await saveRun(state);
  return state;
}

async function showStart(){
  if(G)await autosave();
  G=null;
  $('#gameScreen').classList.add('hidden');
  $('#startScreen').classList.remove('hidden');
  await renderRuns();
}

async function showGame(state){
  G=state;
  $('#startScreen').classList.add('hidden');
  $('#gameScreen').classList.remove('hidden');
  render();
}

async function renderRuns(){
  const root=$('#runSlots'),runs=await listRuns();
  root.innerHTML=runs.map(({run,state})=>{
    const tm=state?formatTime(state.clock.totalMinutes):null;
    const meta=state?`День ${tm.day} · ${tm.time} · ${Math.round(state.health)}% здоровʼя`:'Пусто';
    return `<div class="run"><div class="run-head"><b>Проходження ${run}</b><span class="small">${meta}</span></div><div class="run-actions">${
      state?`<button class="primary" data-cont="${run}">Продовжити</button><button data-new="${run}">Почати заново</button>`:`<button class="primary" data-new="${run}">Нова гра</button>`
    }</div></div>`;
  }).join('');

  root.querySelectorAll('[data-cont]').forEach(b=>b.onclick=async()=>showGame(await loadRun(Number(b.dataset.cont))));
  root.querySelectorAll('[data-new]').forEach(b=>b.onclick=async()=>{
    const run=Number(b.dataset.new),existing=await loadRun(run);
    if(existing&&!confirm(`Стерти проходження ${run} і почати заново?`))return;
    showGame(await newRun(run));
  });

  const caps=await storageCapabilities();
  $('#storageStatus').textContent=`Збереження: ${caps.readBack?'працює':'є проблема'} · localStorage ${caps.localStorage?'✓':'×'} · IndexedDB ${caps.indexedDB?'✓':'×'}`;
}

function fmtPreview(text){
  if(/-\d/.test(text))return `<span class="bad">${text}</span>`;
  if(/\+\d/.test(text))return `<span class="good">${text}</span>`;
  return text;
}

function render(){
  const tm=formatTime(G.clock.totalMinutes),w=G.world.weather,t=thermal(G),threat=threatInfo(G);
  $('#timeLine').textContent=`День ${tm.day} · ${tm.time}`;
  $('#weatherLine').textContent=`${w.icon} ${w.label} ${w.tempC}°C · ${t.feel}`;
  $('#threatLine').innerHTML=`Загроза: <b class="${threat.key==='low'?'good':threat.key==='medium'?'warn':'bad'}">${threat.label}</b> · ${threat.reason}`;

  const values=[
    ['❤️','Здоровʼя',G.health],
    ['🍞','Ситість',G.needs.satiety],
    ['💧','Вода',G.needs.water],
    ['😴','Бадьорість',G.needs.energy]
  ];
  $('#miniNeeds').innerHTML=values.map(([icon,label,value])=>`<div class="needChip"><b>${icon} ${label}</b><span>${Math.round(value)}%</span></div>`).join('');

  $('#activeStateCount').textContent=`(${G.activeStatuses.length})`;
  $('#activeStates').innerHTML=G.activeStatuses.map(id=>`<div class="state"><b>${STATUS_DEFS[id].name}</b><div class="small">${STATUS_DEFS[id].blurb}</div></div>`).join('')||'<p class="small">Нема активних станів.</p>';

  renderActions();
  renderTab();
}

function renderActions(){
  const actions=coreActions(G),root=$('#actions');
  root.innerHTML=actions.map((a,i)=>{
    const p=previewAction(G,a);
    return `<button class="action" data-action="${i}"><div class="action-title">${a.title}</div>${p.length?`<div class="action-preview">${p.map(fmtPreview).join(' · ')}</div>`:''}</button>`;
  }).join('');

  root.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
    const action=actions[Number(b.dataset.action)],result=executeAction(G,action);
    G=result.state;
    $('#sceneText').textContent=action.afterText||'Дія виконана.';
    await autosave();
    render();
  });
}

function renderTab(){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===currentTab));
  const panel=$('#tabPanel');

  if(currentTab==='stats'){
    const mods=statModifiers(G);
    panel.innerHTML='<h2>Характеристики</h2>'+STAT_KEYS.map(k=>{
      const s=G.stats[k],pips=Array.from({length:10},(_,i)=>`<span class="pip ${i<s.progress?'on':''}"></span>`).join('');
      return `<div class="stat-row"><div><b>${STAT_LABELS[k]}</b><div class="small">Рівень ${s.level}${mods[k]?` · тимчасово ${mods[k]>0?'+':''}${mods[k]}`:''}</div></div><div class="stat-meter">${pips}</div></div>`;
    }).join('');
  }

  if(currentTab==='relations'){
    panel.innerHTML='<h2>Стосунки</h2><p class="small">Гра не показує, яка саме дія змінила ставлення. Не всі параметри персонажа відомі одразу.</p>'+
      Object.entries(G.relationships).filter(([,r])=>r.known).map(([id,r])=>{
        const discovered=r.discoveredParams||[];
        return `<div class="relation-card"><div class="relation-head"><b>${r.name}</b><span class="small">${discovered.length?'':'Ставлення: незрозуміле'}</span></div>${
          discovered.length?`<div class="relation-params">${discovered.map(k=>{
            const v=r.values[k]??0;
            return `<div class="relation-param"><span>${REL_LABELS[k]||k}</span><div class="relTrack"><div class="relFill" style="width:${v*10}%"></div></div><b>${v}/10</b></div>`;
          }).join('')}</div>`:'<div class="small" style="margin-top:8px">Ви ще мало його знаєте.</div>'
        }</div>`;
      }).join('');
  }

  if(currentTab==='clothes'){
    const eq=equipmentTotals(G);
    panel.innerHTML=`<div class="panel-head"><h2>Шмотки</h2><span class="small">Броня +${eq.armor} · холод +${eq.warmth} · жара -${eq.heatBurden}</span></div>`+
      G.ownedClothes.map(id=>{
        const d=CLOTHES[id],on=G.equipment[d.slot]===id,bits=[`Броня +${d.armor}`,`Холод +${d.warmth}`];
        if(d.heatBurden)bits.push(`Жара -${d.heatBurden}`);
        if(d.rainProtection)bits.push(`Дощ +${d.rainProtection}`);
        return `<div class="clothes-row"><div><b>${d.name}</b><div class="small">${bits.join(' · ')}${d.note?' · '+d.note:''}</div></div><button data-equip="${id}" ${on?'disabled':''}>${on?'Вдягнено':'Вдягнути'}</button></div>`;
      }).join('');
    panel.querySelectorAll('[data-equip]').forEach(b=>b.onclick=async()=>{
      equip(G,b.dataset.equip);await autosave();render();
    });
  }

  if(currentTab==='states'){
    const known=new Set(G.discoveredStatuses),ids=Object.keys(STATUS_DEFS);
    panel.innerHTML=`<h2>Стани</h2><div class="small">Відкрито ${ids.filter(x=>known.has(x)).length} / ${ids.length}</div>`+
      ids.map(id=>{
        const d=STATUS_DEFS[id];
        return known.has(id)
          ?`<div class="book-row"><b>${d.name}</b><div class="small">${d.blurb}<br><b>як позбутись:</b> ${d.remove}${d.persistentUnlock?'<br><b>ефект:</b> відкриває секретні дії [ЄБАТОРІУМ].':''}</div></div>`
          :'<div class="book-row locked"><b>???</b><div class="small">Ще не відкрито.</div></div>';
      }).join('');
  }

  if(currentTab==='weather'){
    panel.innerHTML='<h2>Погода – технічний тест</h2><div class="summary">'+Object.entries(WEATHER_PRESETS).map(([id,w])=>`<button data-weather="${id}">${w.icon} ${w.label} · ${w.tempC}°C</button>`).join('')+'</div>';
    panel.querySelectorAll('[data-weather]').forEach(b=>b.onclick=async()=>{
      G.world.weather={...WEATHER_PRESETS[b.dataset.weather]};await autosave();render();
    });
  }

  if(currentTab==='saves'){
    renderSaves(panel);
  }
}

async function renderSaves(panel){
  const saves=await listManual(G.runId);
  const at=G.lastAutosaveAt?new Date(G.lastAutosaveAt).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'ще нема';
  panel.innerHTML=`<h2>Збереження</h2><div class="small">Автосейв: ${at}. Після кожної дії, зміни шмоток і важливої системної зміни.</div>`+
    saves.map(({slot,state})=>{
      const tm=state?formatTime(state.clock.totalMinutes):null;
      return `<div class="save-row"><b>Ручний слот ${slot}</b><div class="small">${state?`День ${tm.day} · ${tm.time}`:'Пусто'}</div><div class="run-actions"><button data-save="${slot}">Зберегти</button>${state?`<button data-load="${slot}">Завантажити</button>`:''}</div></div>`;
    }).join('');

  panel.querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
    await saveManual(G,Number(b.dataset.save));toast('ЗБЕРЕЖЕНО','Ручний слот '+b.dataset.save);renderTab();
  });
  panel.querySelectorAll('[data-load]').forEach(b=>b.onclick=async()=>{
    const state=await loadManual(G.runId,Number(b.dataset.load));
    if(state){G=state;await autosave();render();}
  });
}

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;renderTab()});
$('#backToRuns').onclick=showStart;

window.addEventListener('pagehide',()=>{if(G)emergencySaveRun(G)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&G){emergencySaveRun(G);saveRun(G)}});

await showStart();
