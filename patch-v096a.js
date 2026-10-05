// v0.9.6a – hotfix: missing hero art + duplicated hooded-figure reaction.
import {CHAPTER3_SCENES} from './chapter3.js?v=096b';

function fixRepeatedReaction096a(){
  const sc=CHAPTER3_SCENES.ch3_state_yebatorium;
  if(!sc)return;
  sc.text=`– Ех, була не була.

Ви робите крок до ТРУПОСМЕРДА.

Постать поруч різко повертає голову до вас.

– Ти куди поперся?

– Та гірше вже не буде.

– Буде.

ТРУПОСМЕРД теж робить крок до вас.

Ну. Аргумент прийнято.`;
}

function stamp096a(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.6a');
}

queueMicrotask(()=>{
  fixRepeatedReaction096a();
  stamp096a();
});
