// v0.9.5q – targeted playtest fixes only: battle mobile layout, time flow,
// danger label, meal healing, branch-safe garlic line, smoother early chapter 2,
// and clearer persistent ЄБАТОРІУМ unlock wording.
import {CHAPTER2_SCENES} from './chapter2.js?v=096b';
import {CHAPTER3_SCENES} from './chapter3.js?v=096b';
import {STATUS_DEFS} from './data.js?v=096b';

const asArray=x=>Array.isArray(x)?x:[];

function patchChoice(scene,predicate,patch){
  if(!scene)return;
  const old=scene.choices;
  const apply=xs=>asArray(xs).map(c=>predicate(c)?{...c,...patch}:c);
  scene.choices=typeof old==='function'?(s=>apply(old(s))):apply(old);
}

function patchStatuses095q(){
  if(STATUS_DEFS.suspicious){
    STATUS_DEFS.suspicious.durationMinutes=30;
    STATUS_DEFS.suspicious.remove='сам пройде через 30 ігрових хвилин.';
  }
  if(STATUS_DEFS.yebatorium){
    STATUS_DEFS.yebatorium.extraEffects=[
      'Секретні [ЄБАТОРІУМ] дії, які ви вже відкрили, залишаються доступними й після завершення стану.'
    ];
    STATUS_DEFS.yebatorium.remove='сам стан пройде через 30 ігрових хвилин; відкриті [ЄБАТОРІУМ] дії залишаться.';
  }
}

function patchChapter3TimeAndMeal(){
  const S=CHAPTER3_SCENES;

  // Після бою час уже рухається всередині battle.js. Тут додаємо тільки дорогу/розмови/вечерю.
  patchChoice(S.ch3_wakeup,c=>c?.id==='ch3_key_next',{minutes:4,activity:'walk'});
  patchChoice(S.ch3_galina,c=>c?.id==='galina095_yard',{minutes:6,activity:'walk'});
  patchChoice(S.ch3_wake_crowd,c=>c?.id==='galina095_bird',{minutes:4,activity:'dialogue'});
  patchChoice(S.ch3_evp_missing,c=>c?.id==='galina095_hut',{minutes:5,activity:'walk'});

  if(S.ch3_galina_hut){
    const old=S.ch3_galina_hut.onEnter;
    const filterHealth=effects=>asArray(effects).filter(e=>!(e?.type==='health'));
    S.ch3_galina_hut.onEnter=typeof old==='function'?(s=>filterHealth(old(s))):filterHealth(old);
    S.ch3_galina_hut.notice={title:'ВИ НОРМАЛЬНО ПОЇЛИ',body:'Голод знято · вода й ситість відновлені. Розбита голова сама від вечері не зажила.'};
    patchChoice(S.ch3_galina_hut,c=>c?.id==='galina095_talk',{minutes:35,activity:'dialogue'});
  }

  // Вихід із хати після кота теж займає кілька хвилин.
  for(const id of ['ch3_cat_polite095n','ch3_cat_insult095n','ch3_cat_pet095n','ch3_cat_polite095m','ch3_cat_insult095m','ch3_cat_pet095m']){
    const sc=S[id];if(!sc)continue;
    const old=sc.choices;
    const apply=xs=>asArray(xs).map(c=>c?.next==='ch3_evp_returns'?{...c,minutes:5,activity:'walk'}:c);
    sc.choices=typeof old==='function'?(s=>apply(old(s))):apply(old);
  }
}

function patchGarlicBranchText(){
  const sc=CHAPTER3_SCENES.ch3_garlic;
  if(!sc||typeof sc.text!=='string')return;
  const original=sc.text;
  const wrong=`– ТИ Ж КАЗАВ, ШО ЧАСНИК ХУЙНЯ.\n\n– Я сказав, шо мені його не давати.`;
  sc.text=s=>{
    if(s.flags?.offeredGarlicAtShed)return original;
    return original.replace(wrong,`– Сам бачу, блядь.`);
  };
}

function patchChapter2Flow(){
  const S=CHAPTER2_SCENES;
  // Не переписуємо сюжет: просто склеюємо сусідні короткі екрани, які й так ішли без вибору.
  if(S.ch2_intro&&S.ch2_fence&&typeof S.ch2_intro.text==='string'&&typeof S.ch2_fence.text==='string'){
    S.ch2_intro.text=`${S.ch2_intro.text}\n\n${S.ch2_fence.text}`;
    S.ch2_intro.choices=S.ch2_fence.choices;
  }
  if(S.ch2_real&&S.ch2_crowd&&typeof S.ch2_real.text==='string'&&typeof S.ch2_crowd.text==='string'){
    S.ch2_real.text=`${S.ch2_real.text}\n\n${S.ch2_crowd.text}`;
    const a=asArray(S.ch2_real.onEnter),b=asArray(S.ch2_crowd.onEnter);
    S.ch2_real.onEnter=[...a,...b];
    S.ch2_real.choices=S.ch2_crowd.choices;
  }
  if(S.ch2_benchask&&typeof S.ch2_benchask.text==='string'){
    S.ch2_benchask.text=S.ch2_benchask.text.replace(
      'Незалежно від того, що ви вибрали, нормально розпитати не виходить. Жінку гукають від столу, вона відмахується й киває на лавку.',
      'Жінка вже збирається щось відповісти, але її гукають від столу. Вона відмахується, киває на лавку й обриває розмову.'
    );
  }
}

function battleUiSafetyNet(){
  // CSS дублює виправлення з battle.js, щоб воно застосувалось навіть якщо battle.css прийде з кешу.
  if(document.querySelector('#battleUi095q'))return;
  const st=document.createElement('style');st.id='battleUi095q';st.textContent=`
    @media(max-width:760px){
      #battleTestOverlay{overflow:hidden!important}
      #battleTestOverlay .battle-shell{display:block!important;height:100dvh!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important}
      #battleTestOverlay .battle-head{position:sticky!important;top:0!important;z-index:40!important}
      #battleTestOverlay .battle-arena{height:500px!important;min-height:500px!important}
      #battleTestOverlay .battle-before,#battleTestOverlay .battle-statuses,#battleTestOverlay [data-battle-throwables],#battleTestOverlay .battle-log,#battleTestOverlay [data-battle-controls]{position:relative!important;z-index:2!important}
    }
  `;document.head.appendChild(st);
}

function stamp(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5q')}
function apply095q(){patchStatuses095q();patchChapter3TimeAndMeal();patchGarlicBranchText();patchChapter2Flow();battleUiSafetyNet();stamp()}
queueMicrotask(apply095q);
