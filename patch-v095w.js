// v0.9.5w – first TРУПОСМЕРД encounter is a survival encounter, not a fake full fight.

import {CHAPTER3_SCENES} from './chapter3.js?v=093';

const asArray=x=>Array.isArray(x)?x:[];
const mergeEffects=(a,b)=>[...asArray(a),...asArray(b)];
const heroFrom=sc=>asArray(sc?.actors).find(a=>String(a?.role||'').includes('hero'));
const pigeonFrom=sc=>asArray(sc?.actors).find(a=>String(a?.role||'').includes('pigeon'));

function survivalBattle095w(extra={}){
  return{
    id:'shedCreatureSurvival095w',
    enemyName:'ТРУПОСМЕРД',
    enemyHp:100,
    enemyMax:100,
    lockVictory:true,
    turnLimit:2,
    actionMode:'survival',
    xpReward:10,
    scriptedTitle:'ТРУПОСМЕРД ЗʼЇБАВСЯ',
    scriptedBody:'Ви пережили ці дві спроби вас вʼєбати.',
    battleNotes:['ПЕРЕЖИВІТЬ 2 ХОДИ – І СТВОРІННЯ ЗʼЇБЕТЬСЯ'],
    ...extra
  };
}

function patchPrayer095w(){
  const S=CHAPTER3_SCENES;
  if(!S.ch3_pray||!S.ch3_pray095_2||!S.ch3_pray095_3||!S.ch3_pray095_4)return;

  S.ch3_pray.choices=[{id:'pray095w_1',label:'Далі',next:'ch3_pray095_2'}];
  S.ch3_pray095_2.choices=[{id:'pray095w_2',label:'Далі',next:'ch3_pray095_3'}];
  S.ch3_pray095_3.choices=[{id:'pray095w_3',label:'Далі',next:'ch3_pray095_4'}];

  S.ch3_pray095_4.onEnter=mergeEffects(S.ch3_pray095_4.onEnter,[
    {type:'flag',key:'creaturePrayerReactionKnown095w',value:true},
    {type:'flag',key:'creaturePrayerStalled095w',value:true}
  ]);
  S.ch3_pray095_4.text=`І тут десь неподалік раптом дзвенить дзвіночок.

ТРУПОСМЕРД на мить завмирає, різко повертає голову на звук, а тоді зривається з місця й несеться в сторону лісу так, ніби весь цей час просто прикидався дохлим.

Ви ще секунду стоїте з піднятою рукою.

– Ахуєнна діскотєка.`;
  S.ch3_pray095_4.choices=[{id:'pray095w_key',label:'Далі',next:'ch3_pray095_key'}];
}

function sharedBellScene095w(){
  const S=CHAPTER3_SCENES;
  const base=S.ch3_creature||{};
  const hero=heroFrom(S.ch3_garlic_hit)||heroFrom(S.ch3_run)||heroFrom(base);
  const pigeon=pigeonFrom(S.ch3_ask_pigeon);
  S.ch3_survival_bell095w={
    ...base,
    id:'ch3_survival_bell095w',
    caption:'дзвіночок',
    actors:[hero,pigeon].filter(Boolean),
    onEnter:[],
    text:`ТРУПОСМЕРД знову сіпається у вашу сторону.

І тут десь неподалік дзвенить дзвіночок.

Створіння завмирає посеред руху. Різко повертає голову на звук – і зривається в сторону лісу.

Ви ще кілька секунд дивитесь йому вслід.

– А це зараз шо було?

Євпапій теж дивиться в бік лісу.

– Хуй його знає.

– Заєбісь. Дуже поміг.`,
    choices:[{id:'survival095w_done',label:'Далі',next:'ch3_galina'}]
  };
}

function patchVodka095w(){
  const S=CHAPTER3_SCENES;
  if(!S.ch3_vodka)return;
  S.ch3_vodka.choices=[{
    id:'ch3_vodka_survive095w',
    label:'Ну блядь. Відбиватись.',
    battle:survivalBattle095w({
      id:'shedCreatureVodka',
      enemyDamageMult:.55,
      enemyHitMult:.72,
      scriptedTitle:'ТРУПОСМЕРД ЗʼЇБАВСЯ',
      scriptedBody:'Горілка зробила своє. Йому різко стало не до вас.',
      battleNotes:[
        'ГОРІЛКА · ТРУПОСМЕРД МЛЯВІШИЙ І КОСІШИЙ',
        'ПЕРЕЖИВІТЬ 2 ХОДИ – І СТВОРІННЯ ЗʼЇБЕТЬСЯ'
      ],
      nextOnWin:'ch3_vodka_after095j',
      nextOnLose:'ch3_dead'
    })
  }];
}

function patchGarlic095w(){
  const S=CHAPTER3_SCENES;
  if(!S.ch3_garlic_hit)return;
  S.ch3_garlic_hit.notice={title:'ЧАСНИК СПРАЦЮВАВ',body:'ТРУПОСМЕРД рухається гірше.'};
  S.ch3_garlic_hit.choices=[{
    id:'ch3_garlic_survive095w',
    label:'Відбиватись.',
    battle:survivalBattle095w({
      id:'shedCreatureGarlic',
      enemyDamageMult:.78,
      enemyHitMult:.68,
      battleNotes:[
        'ЧАСНИК ПРИПІК · ТРУПОСМЕРД РУХАЄТЬСЯ ГІРШЕ',
        'ПЕРЕЖИВІТЬ 2 ХОДИ – І СТВОРІННЯ ЗʼЇБЕТЬСЯ'
      ],
      nextOnWin:'ch3_survival_bell095w',
      nextOnLose:'ch3_dead'
    })
  }];
}

function patchPigeon095w(){
  const S=CHAPTER3_SCENES;
  if(!S.ch3_ask_pigeon)return;

  S.ch3_ask_pigeon.text=`– Євпапій, шо робити?!

Ви простягаєте руку. Євпапій сідає на неї й дивиться на створіння. Потім на вас. Потім знов на створіння.

– Вліво відскакуй.

– Чого вліво?

– Правою воно хуйово махає.

– Ти впевнений?

– Канєшно.

– Якщо я здохну, я тебе найду.`;

  S.ch3_ask_pigeon.choices=[{
    id:'ch3_pigeon_survive095w',
    label:'Ладно. Вліво так вліво.',
    battle:survivalBattle095w({
      id:'shedCreaturePigeon',
      enemyHitMult:.72,
      battleNotes:[
        'ЄВПАПІЙ ПІДКАЗАВ, КУДИ ВІДСКАКУВАТИ',
        'ПЕРЕЖИВІТЬ 2 ХОДИ – І СТВОРІННЯ ЗʼЇБЕТЬСЯ'
      ],
      nextOnWin:'ch3_survival_bell095w',
      nextOnLose:'ch3_dead'
    })
  }];
}

function patchRun095w(){
  const S=CHAPTER3_SCENES;
  if(!S.ch3_run)return;
  S.ch3_run.choices=[{
    id:'ch3_run_survive095w',
    label:'Піднятись.',
    battle:survivalBattle095w({
      id:'shedCreatureRun',
      enemyDamageMult:1.1,
      enemyHitMult:1.05,
      battleNotes:[
        'НЕВДАЛА ВТЕЧА · ВИ ВЖЕ ОТРИМАЛИ -15 HP',
        'ТРУПОСМЕРД РОЗІГНАВСЯ · УХИЛИТИСЬ ВАЖЧЕ',
        'ПЕРЕЖИВІТЬ 2 ХОДИ – І СТВОРІННЯ ЗʼЇБЕТЬСЯ'
      ],
      nextOnWin:'ch3_survival_bell095w',
      nextOnLose:'ch3_dead'
    })
  }];
}

function stamp095w(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5w');
}

function apply095w(){
  sharedBellScene095w();
  patchPrayer095w();
  patchVodka095w();
  patchGarlic095w();
  patchPigeon095w();
  patchRun095w();
  stamp095w();
}
queueMicrotask(apply095w);
