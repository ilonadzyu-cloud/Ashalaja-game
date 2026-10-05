// v0.9.5g – Galina doorway visual + important item acquisition notifications.
import {CHAPTER1_SCENES} from './chapter1.js?v=096b';
import {CHAPTER3_SCENES} from './chapter3.js?v=096b';

const galinaDoor=()=>({role:'npc galina-door095g',src:'./galina_base.png',position:'npc'});

function fixGalinaAtDoor(){
  const S=CHAPTER1_SCENES;
  // At the first doorway scene the text is already Baba Galya speaking,
  // so the visual must actually show her. Keep the frame clean on mobile:
  // hero + Galina, instead of hero + pigeon with Galina missing.
  for(const id of ['end','state_hangover_vooody']){
    const scene=S[id];
    if(!scene)return;
    const actors=Array.isArray(scene.actors)?scene.actors:[];
    const hero=actors.find(a=>String(a?.role||'').includes('hero'))||{role:'hero',src:'./man_base.png',position:'hero'};
    scene.actors=[hero,galinaDoor()];
  }
}

function restoreKeyNotice(){
  const s=CHAPTER3_SCENES.ch3_galina;
  if(!s)return;
  const old=s.notice;
  s.notice=state=>{
    // Prayer branch already has its own key notice one scene earlier.
    if(state?.flags?.keyFoundBeforeGalina){
      return {title:'ОТРИМАНО: СТАРИЙ КЛЮЧ',body:'Лежав біля входу в сарай. Від чого він – поки хуй його знає.'};
    }
    return typeof old==='function'?old(state):(old||null);
  };
}

function installAcquisitionToast(){
  const extras=document.querySelector('#storyExtras');
  const toast=document.querySelector('#toast');
  if(!extras||!toast||extras.dataset.itemNotice095g==='1')return;
  extras.dataset.itemNotice095g='1';
  let last='';
  const run=()=>{
    const box=extras.querySelector('.story-notice');
    if(!box)return;
    const title=box.querySelector('b')?.textContent?.trim()||'';
    const body=box.querySelector('span')?.textContent?.trim()||'';
    if(!/^ОТРИМАНО:/i.test(title))return;
    const sig=title+'|'+body;
    if(sig===last)return;
    last=sig;
    toast.innerHTML=`<b>${title}</b>${body?`<span>${body}</span>`:''}`;
    toast.classList.remove('hidden');
    clearTimeout(toast._item095g);
    toast._item095g=setTimeout(()=>toast.classList.add('hidden'),3600);
  };
  // v0.9.5p: no live observer; the regular story notice remains visible.
  run();
}

function addCss(){
  if(document.querySelector('#patch095gcss'))return;
  const style=document.createElement('style');
  style.id='patch095gcss';
  style.textContent=`
    .stage-image .actor.galina-door095g{right:2%!important;max-width:42%!important;max-height:92%!important}
    @media(max-width:760px){.stage-image .actor.galina-door095g{right:-1%!important;max-width:46%!important;max-height:90%!important}}
  `;
  document.head.appendChild(style);
}

function stamp(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5g')}
function apply095g(){fixGalinaAtDoor();restoreKeyNotice();installAcquisitionToast();addCss();stamp()}
queueMicrotask(apply095g);
