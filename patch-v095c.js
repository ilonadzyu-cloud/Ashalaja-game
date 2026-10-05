import {CHAPTER3_SCENES} from './chapter3.js?v=096b';
import {ITEM_DEFS} from './data.js?v=096b';

const C095C={
  creature:{normal:'./creature_normal_095c.webp',battle:'./creature_battle_095c.webp'},
  onion:{normal:'./onion_normal_095.webp',angry:'./onion_angry_095.webp',smelly:'./onion_smelly_095.webp'},
  wakeTable:'./wake_table_095c.webp'
};

function hasRole(a,role){return String(a?.role||'').split(/\s+/).includes(role)}
function isCreatureActor(a){
  if(!a||!hasRole(a,'npc'))return false;
  const src=String(a.src||'').toLowerCase();
  return /creature|труп|zomb/.test(src);
}
function withRole(a,extra){
  const parts=new Set(String(a?.role||'').split(/\s+/).filter(Boolean));
  parts.add(extra);return {...a,role:[...parts].join(' ')};
}

function patchCreatureScenes(){
  const S=CHAPTER3_SCENES;
  // У звичайних сюжетних сценах ТРУПОСМЕРД завжди спокійний/дивний, а не бойовий.
  for(const [id,s] of Object.entries(S||{})){
    if(!s||!Array.isArray(s.actors)||id==='ch3_pray095_3')continue;
    s.actors=s.actors.map(a=>isCreatureActor(a)?{...a,src:C095C.creature.normal}:a);
  }
  // Перша поява: він тільки вилазить із сараю, тому стоїть біля дверей і менший.
  if(S?.ch3_creature&&Array.isArray(S.ch3_creature.actors)){
    S.ch3_creature.actors=S.ch3_creature.actors.map(a=>isCreatureActor(a)?withRole({...a,src:C095C.creature.normal},'creature-door095c'):a);
  }
  // У сценах перед боєм він уже ближче, але все ще в звичайному стані.
  for(const id of ['ch3_vodka','ch3_garlic','ch3_garlic_hit','ch3_run','ch3_pray','ch3_pray095_2','ch3_pray095_4']){
    const s=S?.[id];if(!s||!Array.isArray(s.actors))continue;
    s.actors=s.actors.map(a=>isCreatureActor(a)?withRole({...a,src:C095C.creature.normal},'creature-front095c'):a);
  }
}

function patchWakeTable(){
  const s=CHAPTER3_SCENES?.ch3_wake_crowd;
  if(!s)return;
  s.background=C095C.wakeTable;
  s.stageTone=`${s.stageTone||''} wake-table095c`.trim();
}

function onionKindFromText(text=''){
  const t=String(text).toLowerCase();
  if(/вонюч|smelly|onion_smelly/.test(t))return 'smelly';
  if(/зла цибул|angry|onion_angry/.test(t))return 'angry';
  if(/звичайна цибул|onion\b/.test(t))return 'normal';
  return null;
}
function onionImg(kind,cls='item-inline-art095c'){
  const img=document.createElement('img');img.className=cls;img.src=C095C.onion[kind];img.alt=kind==='angry'?'зла цибуля':kind==='smelly'?'вонюча цибуля':'звичайна цибуля';return img;
}
function patchRenderedOnions(root=document){
  // Інвентар/магазин: визначаємо вид цибулі по назві картки, а не по самому emoji.
  root.querySelectorAll?.('.item-card').forEach(card=>{
    const kind=onionKindFromText(card.textContent);if(!kind)return;
    const icon=card.querySelector('.item-icon');if(!icon)return;
    const current=icon.querySelector('img[data-onion-kind095c]');
    if(current?.dataset.onionKind095c===kind)return;
    const img=onionImg(kind,'item-card-art095c');img.dataset.onionKind095c=kind;icon.replaceChildren(img);
  });
  // Швидкі слоти: там старий рендер дає той самий emoji, тому теж дивимось на назву предмета.
  root.querySelectorAll?.('.quick-slot:not(.empty)').forEach(btn=>{
    const kind=onionKindFromText(btn.textContent);if(!kind)return;
    const qty=(btn.textContent.match(/×\s*\d+/)||[''])[0];
    const label=kind==='angry'?'Зла цибуля':kind==='smelly'?'Вонюча цибуля':'Звичайна цибуля';
    const img=onionImg(kind,'quick-onion-art095c');img.dataset.onionKind095c=kind;
    btn.replaceChildren(img,document.createTextNode(` ${label} `));
    if(qty){const b=document.createElement('b');b.textContent=qty;btn.appendChild(b)}
  });
}
function patchOnionDefs(){
  const html=(kind)=>`<img class="item-inline-art095c" data-onion-kind095c="${kind}" src="${C095C.onion[kind]}" alt="цибуля">`;
  if(ITEM_DEFS.onion){ITEM_DEFS.onion.art=C095C.onion.normal;ITEM_DEFS.onion.icon=html('normal')}
  if(ITEM_DEFS.onion_angry){ITEM_DEFS.onion_angry.art=C095C.onion.angry;ITEM_DEFS.onion_angry.icon=html('angry')}
  if(ITEM_DEFS.onion_smelly){ITEM_DEFS.onion_smelly.art=C095C.onion.smelly;ITEM_DEFS.onion_smelly.icon=html('smelly')}
}

let quickPlaceholder=null,statePlaceholder=null,hudExtra=null;
const mq=window.matchMedia('(max-width:760px)');
function setupHudRelocation(){
  const stage=document.querySelector('#gameScreen .stage');
  const header=document.querySelector('#gameScreen .game-top');
  const quick=document.querySelector('#gameScreen .quick-row');
  const states=document.querySelector('#gameScreen .active-states');
  if(!stage||!header||!quick||!states)return;
  if(!quickPlaceholder){quickPlaceholder=document.createComment('quick-row-home');quick.before(quickPlaceholder)}
  if(!statePlaceholder){statePlaceholder=document.createComment('active-states-home');states.before(statePlaceholder)}
  if(!hudExtra){hudExtra=document.createElement('div');hudExtra.className='mobile-hud-extra095c'}
  const relocate=()=>{
    if(mq.matches){
      if(!hudExtra.isConnected)header.appendChild(hudExtra);
      hudExtra.append(quick,states);
      if(states.hasAttribute('open'))states.removeAttribute('open');
    }else{
      quickPlaceholder.parentNode?.insertBefore(quick,quickPlaceholder.nextSibling);
      statePlaceholder.parentNode?.insertBefore(states,statePlaceholder.nextSibling);
      hudExtra.remove();
    }
  };
  mq.addEventListener?.('change',relocate);relocate();
}

function syncGameViewport(){
  const screen=document.querySelector('#gameScreen');if(!screen)return;
  const run=()=>document.body.classList.toggle('game-active095c',mq.matches&&!screen.classList.contains('hidden'));
  // v0.9.5p: do not watch class mutations during stage startup.
  mq.addEventListener?.('change',run);run();
}

function resetStoryScroll(){
  const text=document.querySelector('#storyText'),card=document.querySelector('.story-card');if(!text||!card)return;
  // v0.9.5p: story scroll reset is handled by normal navigation; no mutation watcher.
}

function addCss(){
  if(document.querySelector('#patch095ccss'))return;
  const style=document.createElement('style');style.id='patch095ccss';style.textContent=`
    .item-inline-art095c,.onion-icon095b{width:28px;height:28px;object-fit:contain;vertical-align:-7px;margin-right:4px}
    .item-card-art095c{width:46px;height:46px;object-fit:contain;display:block}
    .quick-onion-art095c{width:23px;height:23px;object-fit:contain;vertical-align:middle;flex:0 0 auto}
    .stage-image .actor.creature-door095c{max-width:22%!important;max-height:62%!important;right:17%!important;bottom:10%!important;left:auto!important}
    .stage-image .actor.creature-front095c{max-width:41%!important;max-height:88%!important;right:3%!important;bottom:0!important;left:auto!important}
    .stage-image.wake-table095c{background-position:center center!important;background-size:cover!important}
    .stage-image.wake-table095c .actor.hero{max-width:34%!important;left:1%!important}
    .stage-image.wake-table095c .actor.npc{max-width:31%!important;right:1%!important}
    @media(max-width:760px){
      body.game-active095c{height:100dvh!important;overflow:hidden!important;overscroll-behavior:none}
      #gameScreen.game-shell:not(.hidden){display:flex!important;flex-direction:column!important;height:100dvh!important;min-height:0!important;overflow:hidden!important}
      #gameScreen .game-top{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto auto!important;column-gap:8px!important;row-gap:5px!important;padding:10px 14px 8px!important;flex:0 0 auto!important}
      #gameScreen .top-copy{grid-column:1/2!important;grid-row:1!important;min-width:0!important}
      #gameScreen .game-name{font-size:1.08rem!important;line-height:1.05!important}
      #gameScreen .world-line{font-size:.84rem!important;line-height:1.25!important;gap:5px!important;margin-top:4px!important;flex-wrap:wrap!important}
      #gameScreen .top-buttons{grid-column:2!important;grid-row:1!important;align-self:start!important}
      #gameScreen #menuBtn{padding:9px 11px!important;font-size:.88rem!important;white-space:nowrap!important}
      #gameScreen #exitBtn{display:none!important}
      #gameScreen .mini-needs{grid-column:1/-1!important;grid-row:2!important;margin:0!important;gap:5px!important;display:grid!important;grid-template-columns:repeat(4,1fr)!important}
      #gameScreen .mini-needs span{padding:7px 6px!important;font-size:.82rem!important;min-width:0!important;text-align:center!important;white-space:nowrap!important}
      #gameScreen .mobile-hud-extra095c{grid-column:1/-1!important;grid-row:3!important;display:flex!important;align-items:center!important;gap:6px!important;min-width:0!important;position:relative!important;z-index:30!important}
      #gameScreen .mobile-hud-extra095c .quick-row{display:flex!important;align-items:center!important;gap:5px!important;margin:0!important;padding:0!important;min-width:0!important;flex:1 1 auto!important}
      #gameScreen .mobile-hud-extra095c .quick-label{display:none!important}
      #gameScreen .mobile-hud-extra095c .quick-slots{display:flex!important;gap:5px!important;min-width:0!important;flex:1 1 auto!important}
      #gameScreen .mobile-hud-extra095c .quick-slot{min-width:0!important;flex:1 1 0!important;padding:7px 6px!important;font-size:.72rem!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;border-radius:12px!important}
      #gameScreen .mobile-hud-extra095c .active-states{position:relative!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;flex:0 0 auto!important}
      #gameScreen .mobile-hud-extra095c .active-states summary{display:flex!important;align-items:center!important;gap:4px!important;padding:7px 9px!important;min-height:34px!important;border:1px solid var(--line)!important;border-radius:12px!important;background:var(--panel)!important;font-size:.72rem!important;white-space:nowrap!important;cursor:pointer!important}
      #gameScreen .mobile-hud-extra095c .active-states summary::marker{font-size:.7em!important}
      #gameScreen .mobile-hud-extra095c .active-states #activeStates{position:absolute!important;top:calc(100% + 5px)!important;right:0!important;width:min(88vw,390px)!important;max-height:32dvh!important;overflow:auto!important;padding:8px!important;border:1px solid var(--line)!important;border-radius:14px!important;background:var(--panel)!important;box-shadow:0 12px 32px rgba(0,0,0,.45)!important;z-index:80!important}
      #gameScreen .stage{display:flex!important;flex-direction:column!important;flex:1 1 auto!important;min-height:0!important;overflow:hidden!important;gap:8px!important;padding:6px 12px 10px!important}
      #gameScreen .stage-image{flex:0 0 clamp(188px,30dvh,255px)!important;width:100%!important;height:auto!important;min-height:0!important;margin:0!important;border-radius:22px!important;background-size:cover!important;background-position:center center!important}
      #gameScreen .story-card{display:block!important;flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;margin:0!important;padding:16px 16px 28px!important;border-radius:20px!important}
      #gameScreen .story-text{font-size:1rem!important;line-height:1.55!important}
      #gameScreen .story-text p:first-child{margin-top:0!important}
      #gameScreen .story-actions{padding-bottom:max(8px,env(safe-area-inset-bottom))!important}
      #gameScreen .stage-image .actor.creature-door095c{max-width:20%!important;max-height:58%!important;right:16%!important;bottom:10%!important}
      #gameScreen .stage-image .actor.creature-front095c{max-width:38%!important;max-height:86%!important;right:2%!important}
      #gameScreen .stage-image.wake-table095c .actor.hero{max-width:31%!important}
      #gameScreen .stage-image.wake-table095c .actor.npc{max-width:28%!important}
    }
    @media(max-width:390px) and (max-height:740px){
      #gameScreen .game-top{padding-top:7px!important;padding-bottom:6px!important;row-gap:4px!important}
      #gameScreen .stage-image{flex-basis:180px!important}
      #gameScreen .mini-needs span{font-size:.76rem!important;padding:6px 4px!important}
      #gameScreen .mobile-hud-extra095c .quick-slot,#gameScreen .mobile-hud-extra095c .active-states summary{font-size:.67rem!important;padding-top:6px!important;padding-bottom:6px!important}
    }
  `;document.head.appendChild(style);
}

function installOnionObserver(){
  // v0.9.5p: one-shot render decoration only; avoids broad DOM observation on WebKit.
  patchRenderedOnions(document);
}

function apply095c(){
  patchCreatureScenes();patchWakeTable();patchOnionDefs();addCss();setupHudRelocation();syncGameViewport();resetStoryScroll();installOnionObserver();
}
queueMicrotask(apply095c);
