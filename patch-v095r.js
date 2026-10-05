// v0.9.5r – tiny content/art patch only.
// 1) Garlic moves to the existing "Зброя" inventory category and gets a neutral description.
// 2) The opening talking-pigeon beat uses the already-approved combined hand art.
// 3) Hero PNG replacements are shipped as root assets (man_*.png), no story rewrite.

import {CHAPTER1_SCENES} from './chapter1.js?v=093';
import {ITEM_DEFS} from './data.js?v=093';

const HAND_A095R='./hero_pigeon_hand_a_095l.png';
const HAND_B095R='./hero_pigeon_hand_b_095l.png';
const combo=src=>({role:'hero combo095l hand-dialogue095r',src,position:'hero'});

function patchGarlic095r(){
  if(!ITEM_DEFS.garlic)return;
  ITEM_DEFS.garlic.category='Зброя';
  ITEM_DEFS.garlic.description='Часник. У бою можна кинути.';
}

function patchOpeningPigeon095r(){
  const S=CHAPTER1_SCENES;

  // First line where Євпапій actually starts talking: make him visible using
  // the approved hero+bird art instead of the globally hidden separate pigeon sprite.
  if(S.voice){
    S.voice.actors=[combo(HAND_A095R)];
    S.voice.text=`Голуб підлітає ближче й сідає вам на руку.

– Шановний, ти не туди йдеш.`;
  }

  if(S.shoulder){
    S.shoulder.actors=[combo(HAND_A095R)];
    S.shoulder.text=`Ви зупиняєтесь і озираєтесь.

Голуб сидить у вас на руці й каже:

– Я до тебе говорю, шановний.

Ви дивитесь на нього.

Нє. Не причулось.`;
  }

  // The same conversation continues through the introduction and his endless yapping.
  if(S.meet)S.meet.actors=[combo(HAND_B095R)];
  if(S.yap)S.yap.actors=[combo(HAND_B095R)];
}

function stamp095r(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5r');
}

function apply095r(){
  patchGarlic095r();
  patchOpeningPigeon095r();
  stamp095r();
}
queueMicrotask(apply095r);
