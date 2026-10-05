// v0.9.5f – full TРУПОСМЕРД reaction art pass.
import {CHAPTER3_SCENES} from './chapter3.js?v=093';

const F095={
  normal:'./creature_normal_095f.webp',
  attack:'./creature_attack_095f.webp',
  garlicStory:'./creature_garlic_story_095f.webp',
  vodka:'./creature_vodka_095f.webp',
  hit:'./creature_hit_095f.webp',
  garlicBattle:'./creature_garlic_battle_095f.webp',
  bullshit:'./creature_bullshit_095f.webp',
  smelly:'./creature_smelly_095f.webp',
  dance:'./creature_dance_095f.webp'
};

function actorIsCreature(a){
  const src=String(a?.src||'').toLowerCase();
  const role=String(a?.role||'').toLowerCase();
  return /creature|труп|zomb/.test(src)||/creature/.test(role);
}
function setCreatureArt(scene,src,extraRole=''){
  if(!scene||!Array.isArray(scene.actors))return;
  scene.actors=scene.actors.map(a=>{
    if(!actorIsCreature(a))return a;
    const role=[String(a.role||''),extraRole].filter(Boolean).join(' ').trim();
    return {...a,src,role};
  });
}
function patchStoryCreatureArt(){
  const S=CHAPTER3_SCENES;
  // Default story state.
  for(const [id,s] of Object.entries(S||{})){
    if(id==='ch3_pray095_3')continue;
    setCreatureArt(s,F095.normal);
  }
  // Exact situational reactions supplied by Ilona.
  setCreatureArt(S.ch3_creature,F095.normal,'creature-door095c');
  setCreatureArt(S.ch3_vodka,F095.vodka,'creature-front095c');
  setCreatureArt(S.ch3_garlic,F095.garlicStory,'creature-front095c');
  setCreatureArt(S.ch3_garlic_hit,F095.attack,'creature-front095c');
  setCreatureArt(S.ch3_run,F095.attack,'creature-front095c');
  setCreatureArt(S.ch3_state_tipsy,F095.bullshit,'creature-front095c');
  setCreatureArt(S.ch3_state_yebatorium,F095.bullshit,'creature-front095c');

  // Prayer sequence: normal -> normal mimic -> dedicated dance -> normal again.
  setCreatureArt(S.ch3_pray,F095.normal,'creature-front095c');
  setCreatureArt(S.ch3_pray095_2,F095.normal,'creature-front095c');
  if(S.ch3_pray095_3){
    S.ch3_pray095_3.actors=[{role:'dance095f',src:F095.dance,position:'hero'}];
  }
  setCreatureArt(S.ch3_pray095_4,F095.normal,'creature-front095c');
}
function addCss(){
  if(document.querySelector('#patch095fcss'))return;
  const style=document.createElement('style');style.id='patch095fcss';style.textContent=`
    .stage-image .actor.dance095f{max-width:88%!important;max-height:98%!important;left:6%!important;right:auto!important;bottom:0!important}
    @media(max-width:760px){.stage-image .actor.dance095f{max-width:94%!important;left:3%!important}}
  `;document.head.appendChild(style);
}
function stamp(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5f')}
function installStampGuard(){ /* v0.9.5p: disabled live DOM observer */ }
function apply095f(){patchStoryCreatureArt();addCss();stamp();installStampGuard()}
queueMicrotask(apply095f);
