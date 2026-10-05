// v0.9.5l – cleaner staging: max 2 visible characters; participating characters stay visible.
import {CHAPTER1_SCENES} from './chapter1.js?v=093';
import {CHAPTER2_SCENES} from './chapter2.js?v=093';
import {CHAPTER3_SCENES} from './chapter3.js?v=093';

const A095L={
  handA:'./hero_pigeon_hand_a_095l.png',
  handB:'./hero_pigeon_hand_b_095l.png',
  handNight:'./hero_pigeon_hand_night_095l.png'
};

const books=[CHAPTER1_SCENES,CHAPTER2_SCENES,CHAPTER3_SCENES];
const asArray=x=>Array.isArray(x)?x:[x].filter(Boolean);
const hasRole=(a,role)=>String(a?.role||'').split(/\s+/).includes(role);

function comboActor(src,extra=''){
  return {role:`hero combo095l ${extra}`.trim(),src,position:'hero'};
}

function patchHandScenes(){
  const c1=CHAPTER1_SCENES,c2=CHAPTER2_SCENES,c3=CHAPTER3_SCENES;

  if(c1.shoulder){
    c1.shoulder.actors=[comboActor(A095L.handA,'hand-a095l')];
    if(typeof c1.shoulder.text==='string'){
      c1.shoulder.text=c1.shoulder.text
        .replace('сідає на плече','сідає вам на руку')
        .replace('сідає вам на плече','сідає вам на руку');
    }
  }

  if(c2.ch2_legend){
    c2.ch2_legend.actors=[comboActor(A095L.handB,'hand-b095l')];
    if(typeof c2.ch2_legend.text==='string'){
      c2.ch2_legend.text=c2.ch2_legend.text
        .replace('сидить у вас на плечі','сидить у вас на руці')
        .replace('сидить у вас на плече','сидить у вас на руці');
    }
  }

  if(c3.ch3_call_pigeon){
    c3.ch3_call_pigeon.actors=[comboActor(A095L.handNight,'hand-night095l')];
    c3.ch3_call_pigeon.text=`– Євпапій…

– Шо?

– Тихо, блядь.

Євпапій підлітає ближче й сідає вам на руку. Ви трохи піднімаєте її, щоб він бачив сарай.

Кілька секунд мовчить.

– Не рухайся.

– Та ви шо, сьогодні всі договорились?

Євпапій не відповідає.

І от це вже трохи напрягає.`;
  }

  if(c3.ch3_ask_pigeon){
    c3.ch3_ask_pigeon.actors=[comboActor(A095L.handNight,'hand-night095l')];
    c3.ch3_ask_pigeon.text=`– Євпапій, шо робити?!

Ви простягаєте руку. Євпапій сідає на неї й дивиться на створіння. Потім на вас. Потім знов на створіння.

– Бий ножем.

– Ти впевнений?

– Канєшно.

– Якщо я здохну, я тебе найду.`;
  }
}

function cleanActors(scene,id){
  const apply=xs=>{
    let arr=asArray(xs).filter(Boolean);

    // Ready combined arts stay as-is.
    if(arr.some(a=>String(a?.role||'').includes('combo095l')))return arr.slice(0,2);

    // Existing ready head/dance combined arts are one visual actor and should stay.
    const combo=arr.find(a=>hasRole(a,'hero')&&/combo095b|dance095b|dance095f/.test(String(a.role||'')));
    if(combo){
      const npc=arr.find(a=>hasRole(a,'npc'));
      return npc?[combo,npc]:[combo];
    }

    const hero=arr.find(a=>hasRole(a,'hero'));
    const npc=arr.find(a=>hasRole(a,'npc'));
    const pigeon=arr.find(a=>hasRole(a,'pigeon'));

    // Max two visible actors, but never delete a character who is actually part of the scene.
    // Hero + NPC has priority when a third actor would overcrowd the frame.
    if(hero&&npc)return [hero,npc];
    if(hero&&pigeon)return [hero,pigeon];
    if(npc&&pigeon)return [npc,pigeon];
    if(hero)return [hero];
    if(npc)return [npc];
    if(pigeon)return [pigeon];
    return arr.slice(0,2);
  };

  const old=scene.actors;
  scene.actors=typeof old==='function'?(s=>apply(old(s))):apply(old);
}

function enforceTwoCharacterRule(){
  for(const book of books){
    for(const [id,scene] of Object.entries(book||{})){
      if(!scene?.actors)continue;
      cleanActors(scene,id);
    }
  }
}

function stageGuard(){
  // v0.9.5p: runtime DOM trimming observer disabled. Scene data is already normalized above.
}

function addCss(){
  if(document.querySelector('#patch095lcss'))return;
  const s=document.createElement('style');
  s.id='patch095lcss';
  s.textContent=`
    /* Combined hero + Євпапій arts. The pair behaves as the left-side actor. */
    .stage-image .actor.combo095l{
      left:1%!important;
      right:auto!important;
      bottom:0!important;
      width:55%!important;
      height:94%!important;
      max-width:none!important;
      max-height:none!important;
      object-fit:contain!important;
      object-position:left bottom!important;
      transform:none!important;
      z-index:4!important;
    }

    /* With only two actors, the second person gets one stable right-side slot. */
    .stage-image .actor.combo095l + .actor.layout-npc095k,
    .stage-image .actor.layout-hero095k + .actor.layout-npc095k{
      left:auto!important;
      right:2%!important;
      bottom:0!important;
      width:39%!important;
      height:90%!important;
      max-width:none!important;
      max-height:none!important;
      object-fit:contain!important;
      object-position:right bottom!important;
    }

    /* Separate Євпапій art is allowed whenever he is one of the two acting characters. */
    .stage-image .actor.pigeon{display:block!important}

    @media(max-width:760px){
      .stage-image .actor.combo095l{
        left:0!important;
        width:58%!important;
        height:95%!important;
      }
      .stage-image .actor.combo095l + .actor.layout-npc095k,
      .stage-image .actor.layout-hero095k + .actor.layout-npc095k{
        right:1%!important;
        width:40%!important;
        height:91%!important;
      }
    }
  `;
  document.head.appendChild(s);
}

function warm(){for(const src of Object.values(A095L)){const i=new Image();i.decoding='async';i.loading='eager';i.src=src}}
function stamp(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5l')}

function apply095l(){
  patchHandScenes();
  enforceTwoCharacterRule();
  addCss();
  warm();
  stageGuard();
  stamp();
}
queueMicrotask(apply095l);
