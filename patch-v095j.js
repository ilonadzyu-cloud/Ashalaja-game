// v0.9.5j – battle flow, starter onion, guaranteed mystery potion, clearer exit button.
import {CHAPTER1_SCENES} from './chapter1.js?v=093';
import {CHAPTER2_SCENES} from './chapter2.js?v=093';
import {CHAPTER3_SCENES} from './chapter3.js?v=093';
import {ITEM_DEFS} from './data.js?v=093';

const asArray=x=>Array.isArray(x)?x:[];
const count=(s,id)=>(s?.inventory||[]).filter(x=>x.id===id).reduce((n,x)=>n+Number(x.qty||0),0);

function mergeEnter(scene,adder){
  if(!scene)return;
  const old=scene.onEnter;
  scene.onEnter=state=>{
    const base=typeof old==='function'?asArray(old(state)):asArray(old);
    const extra=typeof adder==='function'?asArray(adder(state)):asArray(adder);
    return [...base,...extra];
  };
}

function starterItems(){
  // Нова гра: звичайна цибуля лежить у вас одразу.
  mergeEnter(CHAPTER1_SCENES.intro,s=>count(s,'onion')?[]:[{type:'itemAdd',id:'onion',qty:1},{type:'flag',key:'starterOnion095j',value:true}]);
  // Якщо тестово стартують одразу з 2/3 глави – не лишаємо гравця без сюжетних речей з першої.
  for(const scene of [CHAPTER2_SCENES.ch2_intro,CHAPTER3_SCENES.ch3_intro]){
    mergeEnter(scene,s=>{
      const out=[];
      if(!count(s,'onion'))out.push({type:'itemAdd',id:'onion',qty:1});
      if(!count(s,'potion_unknown'))out.push({type:'itemAdd',id:'potion_unknown',qty:1});
      return out;
    });
  }
}

function guaranteedMysteryPotion(){
  if(ITEM_DEFS.potion_unknown){
    ITEM_DEFS.potion_unknown.name='Невідоме зілля';
    ITEM_DEFS.potion_unknown.description='Якась мутна хуйня від баби Галі. Ефект поки невідомий.';
  }
  const S=CHAPTER1_SCENES;
  if(!S.galinaGarlic||!S.galinaHolyWater)return;
  const oldChoices=S.galinaGarlic.choices;
  S.galinaGarlic.choices=state=>{
    const xs=typeof oldChoices==='function'?oldChoices(state):asArray(oldChoices);
    return xs.map(c=>c&&c.next==='galinaHolyWater'?{...c,next:'galinaMysteryPotion095j'}:c);
  };
  S.galinaMysteryPotion095j={
    ...S.galinaHolyWater,
    id:'galinaMysteryPotion095j',
    caption:'якась невідома хуйня',
    onEnter:s=>count(s,'potion_unknown')?[]:[{type:'itemAdd',id:'potion_unknown',qty:1},{type:'flag',key:'galinaMysteryPotionGiven095j',value:true}],
    text:s=>!s.flags?.galinaMysteryPotionGiven095j?`Баба Галя киває на маленьку пляшечку з мутною рідиною, яку ви вже встигли випросити.\n\n– Оце не загуби.\n\n– А шо воно взагалі таке?\n\n– Як треба буде – поймеш.\n\n– Дуже конкретно.`:`Баба Галя вже ніби збирається відпустити вас, але потім дістає маленьку пляшечку з мутною рідиною й ставить перед вами.\n\n– І це візьми.\n\n– А це шо?\n\n– Зілля.\n\n– Яке?\n\nБаба Галя дивиться на пляшечку.\n\n– Якась невідома хуйня.\n\n– Заєбісь. Дуже помогли.`,
    notice:s=>s.flags?.galinaMysteryPotionGiven095j?{title:'ОТРИМАНО: НЕВІДОМЕ ЗІЛЛЯ',body:'Ефект поки невідомий. Не викидайте.'}:{title:'ВАЖЛИВЕ: НЕВІДОМЕ ЗІЛЛЯ',body:'Не викидайте. Воно ще нада буде.'},
    choices:[{id:'mysteryPotion095j_next',label:'Забрати й не задавати лишніх вопросов.',next:'galinaHolyWater'}]
  };
}

function patchStoryBattles(){
  const S=CHAPTER3_SCENES;
  if(!S.ch3_creature)return;

  if(S.ch3_vodka){
    S.ch3_vodka.text=`Ви дістаєте горілку.\n\n– Будеш?\n\nПостать повільно повертає голову до вас.\n\n– Ти довбойоб?\n\nСтворіння завмирає. Дивиться на пляшку. Облизує губи й різко вихоплює її з рук.\n\nПʼє жадібно, обливається, аж пританцьовує від щастя.\n\nВи вже майже думаєте, шо питання вирішилось мирно.\n\nАга. Щас.\n\nТРУПОСМЕРД витирає рота рукавом і все одно суне на вас. Тільки тепер трохи криво.`;
    S.ch3_vodka.choices=[{id:'ch3_vodka_battle095j',label:'Ну блядь. Битись.',battle:{
      id:'shedCreatureVodka',enemyHp:70,enemyMax:100,lockVictory:true,turnLimit:2,
      enemyDamageMult:.55,enemyHitMult:.72,xpReward:10,
      scriptedTitle:'ТРУПОСМЕРД ЗʼЇБАВСЯ',scriptedBody:'Горілка зробила своє. Йому різко стало не до вас.',
      battleNotes:['ГОРІЛКА · ТРУПОСМЕРД МЛЯВІШИЙ І КОСІШИЙ','ПЕРЕЖИВІТЬ 2 ХОДИ – І ВІН ЗʼЇБЕТЬСЯ'],
      nextOnWin:'ch3_vodka_after095j',nextOnLose:'ch3_dead'
    }}];
    const hero=S.ch3_vodka.actors?.find?.(a=>String(a?.role||'').includes('hero'));
    const pigeon=S.ch3_ask_pigeon?.actors?.find?.(a=>String(a?.role||'').includes('pigeon'));
    S.ch3_vodka_after095j={
      ...S.ch3_vodka,id:'ch3_vodka_after095j',caption:'я прийду ше',actors:[hero,pigeon].filter(Boolean),onEnter:[],
      text:`Після двох дуже кривих спроб вас вʼєбати ТРУПОСМЕРД раптом завмирає.\n\nПлечі розправляються. Очі стають живіші. Воно навіть ніби трохи посвіжішало.\n\nКілька секунд дуже уважно дивиться на вас. І шиплячим голосом каже:\n\n– Я прийду ше.\n\nПісля чого різко зйобує в ліс. Ви ще пару секунд дивитесь йому вслід. Євпапій теж.\n\n– От нахуй ти йому показав, де наливають?\n\nПостать нарешті відпускає вашу сорочку та дивиться в бік лісу.\n\n– Тепер воно повернеться.\n\n– Заєбісь, – каже Євпапій.`,
      choices:[{id:'ch3_vodka_after_next095j',label:'Далі',next:'ch3_galina'}]
    };
  }

  if(S.ch3_garlic_hit){
    S.ch3_garlic_hit.choices=[{id:'ch3_battle_from_garlic',label:'ПОЧИНАЄТЬСЯ БІЙ',battle:{
      id:'shedCreature',enemyHp:80,enemyMax:100,lockVictory:true,xpReward:20,
      battleNotes:['ЧАСНИК УЖЕ ПРИПІК · ТРУПОСМЕРД ПОЧИНАЄ З 80 HP'],
      nextOnKnockout:'ch3_wakeup',nextOnLose:'ch3_dead'
    }}];
  }

  if(S.ch3_ask_pigeon){
    S.ch3_ask_pigeon.choices=[{id:'ch3_battle_from_pigeon',label:'ПОЧИНАЄТЬСЯ БІЙ',battle:{
      id:'shedCreature',enemyHp:100,enemyMax:100,lockVictory:true,heroDamageMult:1.1,xpReward:20,
      battleNotes:['ПОСЛУХАЛИ ЄВПАПІЯ · +10% ДО ВАШОГО УРОНУ'],
      nextOnKnockout:'ch3_wakeup',nextOnLose:'ch3_dead'
    }}];
  }

  if(S.ch3_run){
    S.ch3_run.onEnter=[{type:'damage',amount:15,ignoreArmor:true},{type:'flag',key:'triedRunningFromShed',value:true}];
    S.ch3_run.text=`Ви вирішуєте, що з вас досить.\n\n– Та йдіть ви всі нахуй.\n\nРозвертаєтесь і рвете звідси.\n\nПлан прекрасний приблизно секунд три.\n\nЗзаду щось влітає вам у спину, ви летите мордою вперед у землю, але цього разу не вирубаєтесь. Піднімаєте голову – ТРУПОСМЕРД уже тут.\n\n– Ну канєшно. Просто зʼїбатись не можна було.`,
    S.ch3_run.notice={title:'ЗДОРОВʼЯ -15',body:'Втеча дала вам фору рівно до першого удару.'};
    S.ch3_run.choices=[{id:'ch3_run_battle095j',label:'Вставати й битись.',battle:{
      id:'shedCreature',enemyHp:100,enemyMax:100,lockVictory:true,enemyDamageMult:1.1,xpReward:20,
      battleNotes:['НЕВДАЛА ВТЕЧА · ВИ ВЖЕ ОТРИМАЛИ -15 HP','ТРУПОСМЕРД РОЗІГНАВСЯ · ЙОГО УРОН +10%'],
      nextOnKnockout:'ch3_wakeup',nextOnLose:'ch3_dead'
    }}];
  }

  if(S.ch3_pray){
    S.ch3_pray.choices=[{id:'pray095_battle095j',label:'Молитись далі.',battle:{
      id:'shedCreaturePrayer',enemyHp:100,enemyMax:100,lockVictory:true,turnLimit:2,actionMode:'prayer',
      enemyDamageMult:.4,enemyHitMult:.62,xpReward:10,
      scriptedTitle:'І ВОНО, СУКА, ПРАЦЮЄ',scriptedBody:'Ви пережили перші секунди й ТРУПОСМЕРД почав повторювати за вами.',
      battleNotes:['МОЛИТВА · НЕ ТРЕБА ЙОГО ВБИВАТИ','ПЕРЕЖИВІТЬ 2 ХОДИ – І СЦЕНА ПІДЕ ДАЛІ'],
      nextOnWin:'ch3_pray095_2',nextOnLose:'ch3_dead'
    }}];
  }
}

function clearerExit(){
  const fix=()=>{
    const b=document.querySelector('.menu-head-actions .ui-exit');
    if(!b)return;
    if(b.textContent!=='Вийти в меню')b.textContent='Вийти в меню';
    if(b.getAttribute('aria-label')!=='Вийти в головне меню')b.setAttribute('aria-label','Вийти в головне меню');
    if(b.title!=='Вийти в головне меню')b.title='Вийти в головне меню';
  };
  // v0.9.5p: apply once; no body observer during gameplay.
  fix();
  if(!document.querySelector('#patch095jcss')){
    const st=document.createElement('style');st.id='patch095jcss';st.textContent=`
      @media(max-width:760px){
        .menu-head-actions .ui-exit{font-size:.76rem!important;width:auto!important;min-width:86px!important;padding:8px 10px!important}
        .menu-head-actions .ui-exit::after{content:none!important;display:none!important}
      }
    `;document.head.appendChild(st);
  }
}

function stamp(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5j')}
function apply095j(){starterItems();guaranteedMysteryPotion();patchStoryBattles();clearerExit();stamp()}
queueMicrotask(apply095j);
