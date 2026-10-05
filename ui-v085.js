// v0.9.4 – visual shell + scene/art patch + battle reactions.
import {installBattleTest} from './battle.js?v=096b';
import {applyScenePatch094} from './scene-patch.js?v=096b';

applyScenePatch094();

const groups085 = {
  hero: {label:'Герой',tabs:[['needs','Потреби'],['sleep','Сон'],['states','Стани'],['stats','Характеристики']]},
  things: {label:'Речі',tabs:[['inventory','Інвентар'],['clothes','Шмотки']]},
  people: {label:'Персонажі',tabs:[['characters','Персонажі'],['companions','Компаньйони'],['relations','Стосунки']]},
  world: {label:'Світ',tabs:[['map','Карта'],['shop','Крамничка']]}
};

const tabToGroup085 = Object.fromEntries(Object.entries(groups085).flatMap(([group,data]) => data.tabs.map(([tab]) => [tab,group])));
const lastTab085 = Object.fromEntries(Object.entries(groups085).map(([group,data]) => [group,data.tabs[0][0]]));
function q085(sel){ return document.querySelector(sel); }
function activateOriginalTab085(tab){ const btn=q085(`#menuTabs [data-tab="${tab}"]`); if(btn)btn.click(); }
function activeOriginalTab085(){ return q085('#menuTabs [data-tab].active')?.dataset.tab || 'inventory'; }

function installPatchCss094(){
  if(q085('#patchCss094'))return;
  const style=document.createElement('style');
  style.id='patchCss094';
  style.textContent=`
    /* Light, irregular flicker on the title-screen window glow. */
    .start-screen::after{animation:windowFlicker094 17s steps(1,end) infinite!important;opacity:.065}
    @keyframes windowFlicker094{
      0%,18%,46%,74%,100%{opacity:.055;filter:brightness(1)}
      19%{opacity:.095;filter:brightness(1.05)}
      19.5%{opacity:.04;filter:brightness(.92)}
      20.1%{opacity:.13;filter:brightness(1.08)}
      20.8%,47%{opacity:.06;filter:brightness(1)}
      47.5%{opacity:.105;filter:brightness(1.06)}
      48%{opacity:.045;filter:brightness(.94)}
      48.6%,75%{opacity:.06;filter:brightness(1)}
      75.4%{opacity:.11;filter:brightness(1.06)}
      76%{opacity:.05;filter:brightness(.95)}
      76.5%{opacity:.085;filter:brightness(1.03)}
    }
    @media (prefers-reduced-motion: reduce){.start-screen::after{animation:none!important;opacity:.07}}
    .equipment-story-note{margin:0 0 14px!important}
  `;
  document.head.appendChild(style);
}

function buildStart085(){
  const card=q085('.start-card');
  const actions=q085('#startActions');
  const continueBtn=q085('#continueBtn');
  const runPicker=q085('#runPicker');
  if(!card||!actions||!runPicker)return;
  if(continueBtn) actions.prepend(continueBtn);
  if(!q085('.start-tagline')){
    const p=document.createElement('p');p.className='start-tagline';p.textContent='Він вже тут. Значить, добром це не закінчиться.';actions.insertAdjacentElement('afterend',p);
  }
  const syncRunMode=()=>card.classList.toggle('run-mode',!runPicker.classList.contains('hidden'));
  syncRunMode();new MutationObserver(syncRunMode).observe(runPicker,{attributes:true,attributeFilter:['class']});
}

function buildGroupedMenu085(){
  const sheet=q085('.menu-sheet'),head=q085('.menu-head'),oldTabs=q085('#menuTabs'),close=q085('#closeMenuBtn');
  if(!sheet||!head||!oldTabs||!close||q085('#menuPrimary085'))return;
  const actions=document.createElement('div');actions.className='menu-head-actions';
  const settings=document.createElement('button');settings.type='button';settings.className='icon-btn ui-settings';settings.textContent='⚙️';settings.setAttribute('aria-label','Налаштування');settings.title='Налаштування';settings.addEventListener('click',()=>activateOriginalTab085('settings'));
  const exit=document.createElement('button');exit.type='button';exit.className='icon-btn ghost ui-exit';exit.textContent='Вийти';exit.setAttribute('aria-label','Вийти в головне меню');exit.addEventListener('click',()=>{close.click();setTimeout(()=>q085('#exitBtn')?.click(),0)});
  actions.append(settings,exit,close);head.append(actions);
  const primary=document.createElement('nav');primary.id='menuPrimary085';primary.className='menu-primary';primary.setAttribute('aria-label','Розділи меню');
  for(const [group,data] of Object.entries(groups085)){const b=document.createElement('button');b.type='button';b.dataset.group=group;b.textContent=data.label;b.addEventListener('click',()=>activateOriginalTab085(lastTab085[group]||data.tabs[0][0]));primary.append(b)}
  const secondary=document.createElement('nav');secondary.id='menuSecondary085';secondary.className='menu-secondary';secondary.setAttribute('aria-label','Підрозділи меню');
  oldTabs.before(primary,secondary);
  const sync=()=>{
    const active=activeOriginalTab085(),group=tabToGroup085[active];settings.classList.toggle('active',active==='settings');
    primary.querySelectorAll('[data-group]').forEach(b=>b.classList.toggle('active',Boolean(group&&b.dataset.group===group)));
    if(active==='settings'||!group){secondary.classList.add('settings-mode');secondary.replaceChildren();return}
    lastTab085[group]=active;secondary.classList.remove('settings-mode');secondary.replaceChildren();
    for(const [tab,label] of groups085[group].tabs){const b=document.createElement('button');b.type='button';b.dataset.subtab=tab;b.textContent=label;b.classList.toggle('active',tab===active);b.addEventListener('click',()=>activateOriginalTab085(tab));secondary.append(b)}
  };
  oldTabs.querySelectorAll('[data-tab]').forEach(b=>new MutationObserver(sync).observe(b,{attributes:true,attributeFilter:['class']}));
  new MutationObserver(sync).observe(q085('#menuOverlay'),{attributes:true,attributeFilter:['class']});sync();
}

function stampVersion094(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.4')}

function addEquipmentStoryNote094(){
  const root=q085('#menuContent');if(!root||activeOriginalTab085()!=='clothes'||root.querySelector('.equipment-story-note'))return;
  const note=document.createElement('div');note.className='info-card equipment-story-note';note.textContent='Шмотки можуть давати бонуси до характеристик.';
  const anchor=root.querySelector('.clothes-total')||root.querySelector('.section-title');
  if(anchor)anchor.insertAdjacentElement('afterend',note);else root.prepend(note);
}

function installEquipmentNoteObserver094(){
  const root=q085('#menuContent');if(!root)return;
  const run=()=>queueMicrotask(addEquipmentStoryNote094);new MutationObserver(run).observe(root,{childList:true,subtree:true});
  q085('#menuTabs')?.querySelectorAll('[data-tab]').forEach(b=>new MutationObserver(run).observe(b,{attributes:true,attributeFilter:['class']}));run();
}

const CREATURE_ART094={
  base:'./creature_normal_095f.webp',attack:'./creature_attack_095f.webp',angry:'./creature_attack_095f.webp',
  garlic:'./creature_garlic_story_095f.webp',vodka:'./creature_vodka_095f.webp',burn:'./creature_garlic_battle_095f.webp',
  onion:'./creature_smelly_095f.webp',critical:'./creature_battle_095c.webp'
};
let battleUiGuard094=false;
function normaliseBattleLog094(){
  const log=q085('[data-battle-log]');if(!log||battleUiGuard094)return;
  const raw=[...log.children].map(x=>x.textContent.trim()).filter(Boolean);if(!raw.length)return;
  const out=[];
  for(const line of raw){
    if(/^Звичайна цибуля:/i.test(line)){out.push('Ви кинули звичайну цибулю.');out.push(line.replace(/^Звичайна цибуля:/i,'Створіння:'));continue}
    if(/^Зла цибуля:/i.test(line)){out.push('Ви кинули злу цибулю.');out.push(line.replace(/^Зла цибуля:/i,'Створіння:'));continue}
    if(/^Вонюча цибуля:/i.test(line)){out.push('Ви кинули вонючу цибулю.');out.push('Створіння знепритомніло.');continue}
    if(/^Часник:/i.test(line)){out.push('Ви кинули часник.');out.push(line.replace(/^Часник:/i,'Створіння:'));continue}
    if(/^Ворог вирублений\. Ваш хід ще раз\.?$/i.test(line)){out.push('Створіння пропускає хід.');continue}
    out.push(line);
  }
  const trimmed=out.slice(-4);const now=raw.join('\n'),next=trimmed.join('\n');if(now===next)return;
  battleUiGuard094=true;log.innerHTML=trimmed.map(x=>`<div>${x.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</div>`).join('');battleUiGuard094=false;
}

function updateCreatureReaction094(){
  const overlay=q085('#battleTestOverlay');const art=q085('[data-enemy-art]');if(!overlay||!art||overlay.classList.contains('hidden'))return;
  const enemyName=q085('[data-enemy-name]')?.textContent||'';if(!/СТВОРІННЯ|ХУЙНЯ/i.test(enemyName))return;
  const hpText=q085('[data-enemy-hp]')?.textContent||'';const hp=Number(hpText.match(/(\d+)%/)?.[1]||100);
  const logText=q085('[data-battle-log]')?.textContent||'';
  let src=CREATURE_ART094.base;
  if(hp<=25)src=CREATURE_ART094.critical;
  else if(overlay.classList.contains('enemy-attacking'))src=CREATURE_ART094.attack;
  else if(/злу цибулю|Зла цибуля/i.test(logText))src=CREATURE_ART094.angry;
  else if(/вонючу цибулю|знепритомніло/i.test(logText))src=CREATURE_ART094.onion;
  else if(/часник|Часник припік/i.test(logText))src=CREATURE_ART094.burn;
  else if(/звичайну цибулю|Погано бачить/i.test(logText))src=CREATURE_ART094.onion;
  if(art.getAttribute('src')!==src)art.setAttribute('src',src);
}

function installBattleUiPatch094(){
  const root=document.body;const run=()=>queueMicrotask(()=>{normaliseBattleLog094();updateCreatureReaction094()});
  new MutationObserver(run).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','src']});run();
}

function boot085(){
  document.body.classList.add('ui-v085');stampVersion094();installPatchCss094();buildStart085();buildGroupedMenu085();installEquipmentNoteObserver094();installBattleUiPatch094();
}
boot085();
