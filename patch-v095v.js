// v0.9.5v – restore ЗЛИЙ, fix chapter visuals/copy, prayer order,
// character cards, and keep actors facing the scene instead of away from it.

import {CHAPTER1_SCENES} from './chapter1.js?v=093';
import {CHAPTER2_SCENES} from './chapter2.js?v=093';
import {CHAPTER3_SCENES} from './chapter3.js?v=093';
import {STATUS_DEFS} from './data.js?v=093';

const WOMAN095V={
  idle:'./wake_shadow_idle_095v.png',
  bowl:'./wake_shadow_bowl_095v.png',
  reveal:'./wake_woman_reveal_095v.png'
};

const asArray=x=>Array.isArray(x)?x:[];
const hasStatus=(s,id)=>Boolean(s?.activeStatuses?.includes(id));

function restoreAngry095v(){
  STATUS_DEFS.angry={
    name:'ЗЛИЙ',
    portrait:'./portrait_angry.png',
    blurb:'Настрій когось вʼєбати.',
    mods:{strength:2,pofigism:1,charisma:-2},
    durationMinutes:25,
    remove:'сам пройде через 25 ігрових хвилин.'
  };
}

function fixWater095v(){
  const S=CHAPTER1_SCENES;
  if(S.waterSearch095k){
    S.waterSearch095k.text='Ви оглядаєтесь, де тут можна попити. Біля хати є криниця.';
  }
  if(S.puddle&&typeof S.puddle.text==='string'){
    S.puddle.text=S.puddle.text.replace(
      'Євпапій дивиться на вас так, ніби навіть у нього є якісь стандарти.',
      'Євпапій дивиться на вас так, як теща, коли ви не викопали їй города.'
    );
  }
}

function hero095v(src,extra=''){
  return {role:`hero layout-hero095k trio-hero095v ${extra}`.trim(),src,position:'hero'};
}
function pigeon095v(src='./pigeon_base_095b.webp',extra=''){
  return {role:`pigeon layout-pigeon095k trio-pigeon095v ${extra}`.trim(),src,position:'pigeon'};
}
function woman095v(src=WOMAN095V.idle,extra=''){
  return {role:`npc layout-npc095k shadow-woman095v ${extra}`.trim(),src,position:'npc'};
}

function patchChapter2Woman095v(){
  const S=CHAPTER2_SCENES;

  if(S.ch2_legend){
    S.ch2_legend.actors=[
      hero095v('./ch2_hero_side.png'),
      pigeon095v('./pigeon_suspicious.png'),
      woman095v(WOMAN095V.idle)
    ];
    if(typeof S.ch2_legend.text==='string'){
      S.ch2_legend.text=S.ch2_legend.text
        .replace(
          'Євпапій тим часом уже знову сидить у вас на руці й дивиться на стіл. Точніше, на сало.',
          'Євпапій тим часом уже крутиться поруч і дивиться на стіл. Точніше, на сало.'
        )
        .replace(
          'Євпапій тим часом уже знову сидить у вас на плечі й дивиться на стіл. Точніше, на сало.',
          'Євпапій тим часом уже крутиться поруч і дивиться на стіл. Точніше, на сало.'
        );
    }
  }

  if(S.ch2_benchask){
    S.ch2_benchask.actors=[
      hero095v('./ch2_hero_tired.png'),
      pigeon095v('./pigeon_base_095b.webp'),
      woman095v(WOMAN095V.idle)
    ];
  }

  if(S.ch2_state_legend){
    S.ch2_state_legend.actors=[
      hero095v('./ch2_hero_side.png'),
      pigeon095v('./pigeon_suspicious.png'),
      woman095v(WOMAN095V.idle)
    ];
  }

  if(S.ch2_state_tired_bench){
    S.ch2_state_tired_bench.actors=[
      hero095v('./ch2_hero_tired.png'),
      pigeon095v('./pigeon_base_095b.webp'),
      woman095v(WOMAN095V.idle)
    ];
  }

  // This is the same woman later at the table; her face is still not revealed.
  if(S.ch2_table){
    S.ch2_table.actors=[
      hero095v('./ch2_hero_local.png','table-hero095v'),
      woman095v(WOMAN095V.bowl,'table-woman095v')
    ];
  }
}

function patchPrayerOrder095v(){
  const S=CHAPTER3_SCENES;
  if(!S.ch3_pray||!S.ch3_pray095_2||!S.ch3_pray095_3||!S.ch3_pray095_4)return;

  // First the full funny prayer / copying / salsa sequence.
  S.ch3_pray.choices=[{id:'pray095v_scene1',label:'Далі',next:'ch3_pray095_2'}];
  S.ch3_pray095_2.choices=[{id:'pray095v_scene2',label:'Далі',next:'ch3_pray095_3'}];
  S.ch3_pray095_3.choices=[{id:'pray095v_scene3',label:'Далі',next:'ch3_pray095_4'}];

  S.ch3_pray095_4.text=`І тут десь неподалік раптом дзвенить дзвіночок.

ТРУПОСМЕРД завмирає. Ви теж.

Ще секунду тому ця хуйня повторювала за вами кожен рух, а тепер повільно опускає руки й повертає голову до вас.

– Ахуєнна діскотєка.

ТРУПОСМЕРД більше нічого не повторює.

– Блядь.

Воно кидається на вас.`;

  S.ch3_pray095_4.choices=[{
    id:'pray095v_battle',
    label:'ПОЧИНАЄТЬСЯ БІЙ',
    battle:{
      id:'shedCreaturePrayer',
      enemyHp:100,
      enemyMax:100,
      lockVictory:true,
      turnLimit:2,
      enemyDamageMult:.4,
      enemyHitMult:.62,
      xpReward:10,
      scriptedTitle:'ТРУПОСМЕРД ЗʼЇБАВСЯ',
      scriptedBody:'Після двох ходів воно різко рвоне в ліс.',
      battleNotes:[
        'МОЛИТВА Й ТАНЦІ ЙОГО НОРМАЛЬНО ЗБИЛИ',
        'ПЕРЕЖИВІТЬ 2 ХОДИ – І СТВОРІННЯ ЗʼЇБЕТЬСЯ'
      ],
      nextOnWin:'ch3_pray095_key',
      nextOnLose:'ch3_dead'
    }
  }];

  // Same wording rule for the vodka survival branch.
  const vodka=S.ch3_vodka?.choices;
  if(Array.isArray(vodka)){
    for(const c of vodka){
      if(!c?.battle||Number(c.battle.turnLimit)!==2)continue;
      const notes=asArray(c.battle.battleNotes).map(x=>
        String(x).replace('ПЕРЕЖИВІТЬ 2 ХОДИ – І ВІН ЗʼЇБЕТЬСЯ','ПЕРЕЖИВІТЬ 2 ХОДИ – І СТВОРІННЯ ЗʼЇБЕТЬСЯ')
      );
      c.battle={...c.battle,battleNotes:notes};
    }
  }
}

const STATE_TAGS095V=[
  '[СОБАКА-ПОДОЗРЄВАКА]',
  '[ОБСЕРУНЬКАВСЯ ВІД СТРАХУ]',
  '[ЗЛИЙ]',
  '[ПІД ГРАДУСОМ]',
  '[ЗАЄБАВСЯ]',
  '[ЖОСТКИЙ БУДУНЯРА]',
  '[СРАНИЙ ГОЛУБ ВАС ПРИНИЗИВ]',
  '[ДИКИЙ СКУНС]',
  '[ЄБАТОРІУМ]'
];

function stateRank095v(label){
  const t=String(label||'');
  const i=STATE_TAGS095V.findIndex(tag=>t.startsWith(tag));
  return i<0?999:i;
}

function limitStateButtons095v(){
  const patchScene=sc=>{
    if(!sc?.choices)return;
    const old=sc.choices;
    sc.choices=s=>{
      const xs=typeof old==='function'?asArray(old(s)):asArray(old);
      const specials=xs
        .filter(c=>stateRank095v(c?.label)<999&&(!c.showIf||c.showIf(s)))
        .sort((a,b)=>stateRank095v(a.label)-stateRank095v(b.label));
      const keep=specials[0];
      return xs.filter(c=>{
        if(stateRank095v(c?.label)>=999)return true;
        if(c.showIf&&!c.showIf(s))return false;
        return c===keep;
      });
    };
  };
  for(const book of [CHAPTER1_SCENES,CHAPTER2_SCENES,CHAPTER3_SCENES]){
    for(const sc of Object.values(book||{}))patchScene(sc);
  }
}

function patchFacing095v(){
  // The hooded figure already carries the semantic class "face-left".
  // Make that class actually do its job. Other right-side arts we use are front-facing
  // or already look left (Євпапій), so they are not blindly mirrored.
  if(document.querySelector('#patch095vcss'))return;
  const st=document.createElement('style');
  st.id='patch095vcss';
  st.textContent=`
    .stage-image .actor.face-left{
      transform:scaleX(-1)!important;
      transform-origin:center bottom!important;
    }

    /* Chapter 2: hero left, Євпапій in the middle, faceless woman right. */
    .stage-image .actor.trio-hero095v{
      left:0!important;right:auto!important;bottom:0!important;
      width:38%!important;height:91%!important;
      max-width:none!important;max-height:none!important;
      object-fit:contain!important;object-position:left bottom!important;
      transform:none!important;z-index:4!important;
    }
    .stage-image .actor.trio-pigeon095v{
      left:40%!important;right:auto!important;bottom:4%!important;
      width:19%!important;height:35%!important;
      max-width:none!important;max-height:none!important;
      object-fit:contain!important;object-position:center bottom!important;
      transform:none!important;z-index:5!important;
    }
    .stage-image .actor.shadow-woman095v{
      left:auto!important;right:0!important;bottom:0!important;
      width:39%!important;height:90%!important;
      max-width:none!important;max-height:none!important;
      object-fit:contain!important;object-position:right bottom!important;
      transform:none!important;z-index:3!important;
    }
    .stage-image .actor.table-hero095v{width:45%!important}
    .stage-image .actor.table-woman095v{width:43%!important}

    @media(max-width:760px){
      .stage-image .actor.trio-hero095v{width:39%!important;height:91%!important}
      .stage-image .actor.trio-pigeon095v{left:39%!important;width:20%!important;height:34%!important}
      .stage-image .actor.shadow-woman095v{width:40%!important;height:90%!important}
      .stage-image .actor.table-hero095v{width:45%!important}
      .stage-image .actor.table-woman095v{width:44%!important}
    }
  `;
  document.head.appendChild(st);
}

function patchStateMenuCopy095v(){
  const menu=document.querySelector('#menuOverlay');
  if(!menu)return;
  const title=menu.querySelector('.section-title h2')?.textContent?.trim();
  if(title==='Стани'){
    const card=menu.querySelector('.info-card');
    if(card)card.textContent='На головному екрані показані активні стани. Тут – 9 сюжетних станів, які реально змінюють репліки, характеристики або дії.';
  }
}

function installUiHook095v(){
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#menuBtn,#menuOverlay button'))setTimeout(patchStateMenuCopy095v,0);
  },true);
}

function stamp095v(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5v');
}

function apply095v(){
  restoreAngry095v();
  fixWater095v();
  patchChapter2Woman095v();
  patchPrayerOrder095v();
  limitStateButtons095v();
  patchFacing095v();
  installUiHook095v();
  patchStateMenuCopy095v();
  stamp095v();
}
queueMicrotask(apply095v);
