import {CHAPTER1_SCENES} from './chapter1.js?v=093';
import {CHAPTER2_SCENES} from './chapter2.js?v=093';
import {CHAPTER3_SCENES} from './chapter3.js?v=093';
import {STATUS_DEFS} from './data.js?v=093';

const hasStatus=(s,id)=>Boolean(s?.activeStatuses?.includes(id));
const asArray=v=>Array.isArray(v)?v:[];
const copyScene=(s,id,caption)=>({...s,id,caption,onEnter:[]});

function mergeEffects(original,extra){
  return s=>{
    const base=typeof original==='function'?original(s):asArray(original);
    const add=typeof extra==='function'?extra(s):asArray(extra);
    return [...base,...add];
  };
}
function chanceStatus(id,chance){
  return s=>{
    if(hasStatus(s,id))return [];
    return Math.random()<chance?[{type:'statusAdd',id}]:[];
  };
}
function appendChoice(scene,choice){
  if(!scene)return;
  const old=scene.choices;
  scene.choices=s=>{
    const base=typeof old==='function'?old(s):asArray(old);
    if(base.some(x=>x?.id===choice.id))return base;
    return [...base,choice];
  };
}
function prependChoice(scene,choice){
  if(!scene)return;
  const old=scene.choices;
  scene.choices=s=>{
    const base=typeof old==='function'?old(s):asArray(old);
    if(base.some(x=>x?.id===choice.id))return base;
    return [choice,...base];
  };
}
function stateChoice(id,label,status,next,extra={}){
  return {id,label,next,kind:'secret',showIf:s=>hasStatus(s,status)&&(!extra.flag||!s.flags?.[extra.flag]),...extra};
}

function tuneTemporaryStates(){
  // Ситуативні стани мають відпускати самі. Сильні фізичні стани й потреби лишаються за своїми правилами.
  if(STATUS_DEFS.suspicious){
    STATUS_DEFS.suspicious.durationMinutes=25;
    STATUS_DEFS.suspicious.remove='сам пройде через 25 ігрових хвилин.';
  }
  if(STATUS_DEFS.angry){
    STATUS_DEFS.angry.durationMinutes=25;
    STATUS_DEFS.angry.remove='сам пройде через 25 ігрових хвилин.';
  }
}

function makeStatesAppearMoreOften(){
  const C2=CHAPTER2_SCENES,C3=CHAPTER3_SCENES;

  // Євпапій раптом виявляється «місцевою лєгендою» – інколи герой одразу включає режим підозрєваки.
  if(C2.ch2_legend)C2.ch2_legend.onEnter=mergeEffects(C2.ch2_legend.onEnter,chanceStatus('suspicious',0.45));
  // «Минулого разу», схований ключ і сарай – тут уже шанс значно вищий.
  if(C2.ch2_pee)C2.ch2_pee.onEnter=mergeEffects(C2.ch2_pee.onEnter,chanceStatus('suspicious',0.72));
  // Голуб послав із часником – інколи героя реально підпалює.
  if(C2.ch2_garlic)C2.ch2_garlic.onEnter=mergeEffects(C2.ch2_garlic.onEnter,chanceStatus('angry',0.5));
  // Коли ТРУПОСМЕРД раптом починає повторювати молитву, мозок теж може включити підозрєваку.
  if(C3.ch3_pray095_2)C3.ch3_pray095_2.onEnter=mergeEffects(C3.ch3_pray095_2.onEnter,chanceStatus('suspicious',0.4));
  // Після всього біля сараю всі поводяться так, ніби нічого не було. Якщо підозрєвака вже минула – вона тут гарантовано повертається.
  if(C3.ch3_wake_crowd)C3.ch3_wake_crowd.onEnter=mergeEffects(C3.ch3_wake_crowd.onEnter,s=>hasStatus(s,'suspicious')?[]:[{type:'statusAdd',id:'suspicious'}]);
}

function patchChapter1StateReplies(){
  const S=CHAPTER1_SCENES;

  // Будуняра + Євпапій, який не замовкає.
  S.state_hangover_short=copyScene(S.yap,'state_hangover_short','можна коротше?');
  S.state_hangover_short.actors=S.yap?.actors;
  S.state_hangover_short.text=`– Можна коротше? Мені і так хуйово.\n\nЄвпапій дивиться на вас.\n\n– Я ж коротко.\n\n– Ти вже хвилин пʼять не закриваєш єбало.\n\n– То я вступ робив.\n\nВи мовчки дивитесь на нього.\n\n– Ладно, – каже він. – Вода он там.`;
  S.state_hangover_short.choices=[{id:'state_hangover_short_next',label:'Піти вже до криниці.',next:'hub',hiddenEffects:[{type:'memory',person:'evpapiy',key:'heroAskedToShutUpHungover',value:true}]}];
  appendChoice(S.yap,stateChoice('state_hangover_short_choice','[ЖОСТКИЙ БУДУНЯРА] Можна коротше? Мені і так хуйово.','hangover','state_hangover_short',{flag:'usedHangoverShort',hiddenEffects:[{type:'flag',key:'usedHangoverShort',value:true}]}));

  // Голуб ще й має нахабство щось коментувати після куртки.
  S.state_pigeon_debt=copyScene(S.yap,'state_pigeon_debt','голуб ше й винний');
  S.state_pigeon_debt.text=`– Мовчи, ти мені і так винний за те, шо куртку обісрав.\n\nЄвпапій на секунду реально замовкає.\n\n– Відпереться.\n\n– Я тебе зараз теж відперу. Об стіну.\n\n– Ой всьо. Вода он там.`;
  S.state_pigeon_debt.choices=[{id:'state_pigeon_debt_next',label:'Піти до криниці.',next:'hub',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'offense',value:1},{type:'memory',person:'evpapiy',key:'remindedAboutJacket',value:true}]}];
  appendChoice(S.yap,stateChoice('state_pigeon_debt_choice','[СРАНИЙ ГОЛУБ ВАС ПРИНИЗИВ] Мовчи, ти мені і так винний за те, шо куртку обісрав.','pigeonHumiliated','state_pigeon_debt',{flag:'usedPigeonDebtLine',hiddenEffects:[{type:'flag',key:'usedPigeonDebtLine',value:true}]}));

  // Баба Галя пропонує їжу й воду. При будунярі герой формулює потреби дуже точно.
  S.state_hangover_water=copyScene(S.galinaInside,'state_hangover_water','просто дайте води');
  S.state_hangover_water.text=`– Похуй, просто дайте води.\n\nБаба Галя мовчки підсуває глечик.\n\nВи пʼєте так, ніби до цього вас три дні сушили на сонці.\n\n– Ше? – питає вона.\n\nВи киваєте.\n\nНарешті нормальна людина.`;
  S.state_hangover_water.choices=[{id:'state_hangover_water_next',label:'О. Уже трохи краще.',next:'galinaClothes',minutes:8,activity:'light',effects:[{type:'need',key:'water',value:45}],hiddenEffects:[{type:'relationship',person:'galina',key:'trust',value:1},{type:'flag',key:'askedOnlyForWaterHungover',value:true}]}];
  prependChoice(S.galinaInside,stateChoice('state_hangover_water_choice','[ЖОСТКИЙ БУДУНЯРА] Похуй, просто дайте води.','hangover','state_hangover_water',{flag:'askedOnlyForWaterHungover'}));

  // Коли баба тільки кличе в хату, герой уже бачить глечик і думає лише про одне.
  S.state_hangover_vooody=copyScene(S.end,'state_hangover_vooody','вооооди');
  S.state_hangover_vooody.text=`Ви дивитесь не на бабу Галю. Не на хату. І навіть не на Євпапія.\n\nВи дивитесь на глечик у неї за спиною.\n\n– Вооооди.\n\nБаба Галя ще секунду дивиться на вас, тоді відходить від дверей.\n\n– Заходь уже, горе.`;
  S.state_hangover_vooody.choices=[{id:'state_hangover_vooody_next',label:'Зайти.',next:'galinaInside',hiddenEffects:[{type:'relationshipKnown',person:'galina',value:true},{type:'flag',key:'vooodyAtGalina',value:true}]}];
  prependChoice(S.end,stateChoice('state_hangover_vooody_choice','[ЖОСТКИЙ БУДУНЯРА] Вооооди.','hangover','state_hangover_vooody',{flag:'vooodyAtGalina'}));

  // ЄБАТОРІУМ: лишаємо вже існуючу дивну пляшечку, але міняємо репліку на нашу.
  if(S.galinaGarlic){
    const old=S.galinaGarlic.choices;
    S.galinaGarlic.choices=s=>{
      const xs=typeof old==='function'?old(s):asArray(old);
      return xs.map(c=>c?.id==='garlic_potion'?{...c,label:'[ЄБАТОРІУМ] Та гірше вже не буде.'}:c);
    };
  }
}

function patchChapter2StateReplies(){
  const S=CHAPTER2_SCENES;

  // СОБАКА-ПОДОЗРЄВАКА на «місцеву лєгенду».
  S.ch2_state_legend=copyScene(S.ch2_legend,'ch2_state_legend','шось тут не так');
  S.ch2_state_legend.text=`Ви дивитесь на Євпапія.\n\nЩе секунду тому він мало очима те сало не жер, а після «місцева лєгенда» різко зробив вигляд, шо стіл його взагалі не цікавить.\n\n– А чого ти так різко перестав дивитись на сало?\n\n– Я?\n\n– Ти.\n\n– Не люблю сало.\n\nВи дивитесь на нього.\n\nВін дивиться на сало.\n\nНу да. Канєшно.`;
  S.ch2_state_legend.choices=[{id:'ch2_state_legend_next',label:'Запамʼятати цю хуйню.',next:'ch2_benchask',hiddenEffects:[{type:'flag',key:'noticedLegendLieByStatus',value:true},{type:'memory',person:'evpapiy',key:'liedAboutSaloAfterLegend',value:true}]}];
  appendChoice(S.ch2_legend,stateChoice('ch2_state_legend_choice','[СОБАКА-ПОДОЗРЄВАКА] А чого він так різко перестав дивитись на сало?','suspicious','ch2_state_legend',{flag:'noticedLegendLieByStatus'}));

  // Втома не дає магічної сили, просто змінює реакцію й сцену.
  S.ch2_state_tired_bench=copyScene(S.ch2_benchask,'ch2_state_tired_bench','сяду і всьо');
  S.ch2_state_tired_bench.text=`– Я сяду. Хто хоче мене вбивати – підходьте сюди самі.\n\nЖінка дивиться на вас, потім на лавку, яку вам уже сунули в руки.\n\n– Сядеш, як донесеш.\n\n– Я попробував.\n\n– Погано попробував.\n\nЗа хвилину ви все одно тягнете лавку.`;
  S.ch2_state_tired_bench.choices=[{id:'ch2_state_tired_bench_next',label:'Тягнути ту срану лавку.',next:'ch2_bench',minutes:8,activity:'work',hiddenEffects:[{type:'flag',key:'complainedTiredAtBench',value:true}]}];
  prependChoice(S.ch2_benchask,stateChoice('ch2_state_tired_bench_choice','[ЗАЄБАВСЯ] Я сяду. Хто хоче мене вбивати – підходьте сюди самі.','tired','ch2_state_tired_bench',{flag:'complainedTiredAtBench'}));

  // Голодний герой за столом бачить тільки стратегічно важливі обʼєкти.
  S.ch2_state_hungry_table=copyScene(S.ch2_table,'ch2_state_hungry_table','сало чи галюцинація');
  S.ch2_state_hungry_table.text=`Ви дивитесь на стіл.\n\n– То сало на столі чи я вже галюциную?\n\nБабця мовчки підсуває тарілку ближче.\n\nО. Справжнє.\n\nВсе інше може почекати.`;
  S.ch2_state_hungry_table.choices=[{id:'ch2_state_hungry_table_next',label:'Жерти.',next:'ch2_supplies',minutes:20,activity:'light',effects:[{type:'need',key:'satiety',value:42},{type:'need',key:'water',value:30}],hiddenEffects:[{type:'flag',key:'hungryFocusedOnSalo',value:true}]}];
  prependChoice(S.ch2_table,stateChoice('ch2_state_hungry_table_choice','[ГОЛОДНИЙ] То сало на столі чи я вже галюциную?','hungry','ch2_state_hungry_table',{flag:'hungryFocusedOnSalo'}));
}

function patchChapter3StateReplies(){
  const S=CHAPTER3_SCENES;

  // ЗЛИЙ – відразу реагує на постать, але це не «правильний» вибір.
  S.ch3_state_angry_hood=copyScene(S.ch3_intro,'ch3_state_angry_hood','не смикай мене');
  S.ch3_state_angry_hood.text=`– Ще раз мене смикнеш – я вже тебе вʼєбу.\n\nПостать навіть не повертає голови.\n\n– Ще раз заговориш – воно тебе вʼєбе перше.\n\nІз сараю знову чути важкий скрегіт.\n\nВи вирішуєте, шо сперечатись можна буде через секунд десять. Якщо буде з ким.`;
  S.ch3_state_angry_hood.choices=[{id:'ch3_state_angry_hood_next',label:'Ладно. Поки мовчати.',next:'ch3_obey',hiddenEffects:[{type:'flag',key:'snappedAtHoodAngry',value:true}]}];
  prependChoice(S.ch3_intro,stateChoice('ch3_state_angry_hood_choice','[ЗЛИЙ] Ще раз мене смикнеш – я вже тебе вʼєбу.','angry','ch3_state_angry_hood',{flag:'snappedAtHoodAngry'}));

  // ОБСЕРУНЬКАВСЯ – пробує делегувати героїзм голубу.
  S.ch3_state_scared_pigeon=copyScene(S.ch3_creature,'ch3_state_scared_pigeon','євпапій, твій вихід');
  S.ch3_state_scared_pigeon.actors=S.ch3_creature?.actors;
  S.ch3_state_scared_pigeon.text=`– Євпапій, іди перший. Ти маленький, тебе не так жалко.\n\nЄвпапій дуже повільно повертає до вас голову.\n\n– Пішов нахуй.\n\n– Я просто предложив.\n\n– А я просто відмовив.\n\nТРУПОСМЕРД тим часом продовжує дуже повільно сунути до вас. Ситуація не покращилась.`;
  S.ch3_state_scared_pigeon.choices=[{id:'ch3_state_scared_pigeon_next',label:'Ладно, самому думати.',next:'ch3_creature',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'offense',value:1},{type:'memory',person:'evpapiy',key:'heroOfferedPigeonFirst',value:true},{type:'flag',key:'usedScaredPigeonLine',value:true}]}];
  prependChoice(S.ch3_creature,stateChoice('ch3_state_scared_pigeon_choice','[ОБСЕРУНЬКАВСЯ ВІД СТРАХУ] Євпапій, іди перший. Ти маленький, тебе не так жалко.','scared','ch3_state_scared_pigeon',{flag:'usedScaredPigeonLine'}));

  // ПІД ГРАДУСОМ – дипломатія рівня діда Толіка.
  S.ch3_state_tipsy=copyScene(S.ch3_creature,'ch3_state_tipsy','дипломатія під градусом');
  S.ch3_state_tipsy.text=`– А може, ми спочатку випʼємо, а потім ти мене лякати будеш?\n\nТРУПОСМЕРД зупиняється.\n\nПостать повільно повертає голову до вас.\n\nЄвпапій теж.\n\n– Шо? – питаєте ви. – Нормальна пропозиція.\n\nТРУПОСМЕРД робить ще один крок.\n\nНу ладно. Переговори не пішли.`;
  S.ch3_state_tipsy.choices=[{id:'ch3_state_tipsy_next',label:'План Б.',next:'ch3_creature',hiddenEffects:[{type:'flag',key:'tipsyNegotiatedWithCreature',value:true},{type:'memory',person:'evpapiy',key:'watchedTipsyDiplomacy',value:true}]}];
  prependChoice(S.ch3_creature,stateChoice('ch3_state_tipsy_choice','[ПІД ГРАДУСОМ] А може, ми спочатку випʼємо, а потім ти мене лякати будеш.','tipsy','ch3_state_tipsy',{flag:'tipsyNegotiatedWithCreature'}));

  // ЄБАТОРІУМ – сумнівна сміливість, яка не дає безкоштовної перемоги.
  S.ch3_state_yebatorium=copyScene(S.ch3_creature,'ch3_state_yebatorium','ех, була не була');
  S.ch3_state_yebatorium.text=`– Ех, була не була.\n\nВи робите крок до ТРУПОСМЕРДА.\n\nПостать поруч дуже тихо каже:\n\n– Ти довбойоб?\n\n– Та гірше вже не буде.\n\n– Буде.\n\nТРУПОСМЕРД теж робить крок до вас.\n\nНу. Аргумент прийнято.`;
  S.ch3_state_yebatorium.choices=[{id:'ch3_state_yebatorium_next',label:'Вернутись до планування.',next:'ch3_creature',hiddenEffects:[{type:'flag',key:'usedYebatoriumAtCreature',value:true}]}];
  prependChoice(S.ch3_creature,{id:'ch3_state_yebatorium_choice',label:'[ЄБАТОРІУМ] Ех, була не була.',next:'ch3_state_yebatorium',kind:'secret',showIf:s=>Boolean(s.unlocks?.yebatorium)&&!s.flags?.usedYebatoriumAtCreature});

  // Підозрєвака після сараю реально дає зачіпку, а не просто +цифру.
  S.ch3_state_suspicious_reset=copyScene(S.ch3_wake_crowd,'ch3_state_suspicious_reset','сарай шось дуже цілий');
  S.ch3_state_suspicious_reset.text=`Ви пригальмовуєте й ще раз дивитесь на сарай.\n\n– А чого сарай цілий, якщо звідти щойно вилізла ця хуйня?\n\nДвері на місці. Замок висить. Навіть біля входу нема такого сліду, ніби звідти хтось виривався.\n\nБаба Галя сильніше стискає вас під лікоть.\n\n– Ходи.\n\n– Та я просто питаю.\n\n– А я просто веду.\n\nОхуєнно поговорили.`;
  S.ch3_state_suspicious_reset.choices=[{id:'ch3_state_suspicious_reset_next',label:'Ладно. Запамʼятати.',next:'ch3_evp_missing',hiddenEffects:[{type:'flag',key:'noticedShedReset',value:true},{type:'memory',person:'galina',key:'dodgedShedQuestion',value:true}]}];
  prependChoice(S.ch3_wake_crowd,stateChoice('ch3_state_suspicious_reset_choice','[СОБАКА-ПОДОЗРЄВАКА] А чого сарай цілий, якщо звідти щойно вилізла ця хуйня?','suspicious','ch3_state_suspicious_reset',{flag:'noticedShedReset'}));
}

function slowStoryXp(){
  // Дрібні сюжетні дії дають 5 XP замість 10. Бої лишаються вагомішими і не чіпаються.
  const scaleEffects=effects=>asArray(effects).map(e=>{
    if(!e||typeof e!=='object')return e;
    if(e.type==='stat'&&Number(e.value)>0)return {...e,value:Number(e.value)*0.5};
    if(e.type==='heroXp'&&Number(e.value)>0)return {...e,value:Math.max(1,Math.round(Number(e.value)*0.5))};
    return e;
  });
  const patchScene=s=>{
    if(!s||typeof s!=='object')return;
    if(typeof s.onEnter==='function'){
      const old=s.onEnter;s.onEnter=state=>scaleEffects(old(state));
    }else if(Array.isArray(s.onEnter))s.onEnter=scaleEffects(s.onEnter);
    const patchChoices=xs=>asArray(xs).map(c=>c?{...c,effects:scaleEffects(c.effects),hiddenEffects:scaleEffects(c.hiddenEffects)}:c);
    if(typeof s.choices==='function'){
      const old=s.choices;s.choices=state=>patchChoices(old(state));
    }else if(Array.isArray(s.choices))s.choices=patchChoices(s.choices);
    if(s.notice){
      const fix=n=>String(n||'').replace(/ДОСВІД\s*\+10/gi,'ДОСВІД +5');
      if(typeof s.notice==='function'){
        const old=s.notice;s.notice=state=>{const n=old(state);return n?{...n,title:fix(n.title),body:fix(n.body)}:n};
      }else s.notice={...s.notice,title:fix(s.notice.title),body:fix(s.notice.body)};
    }
  };
  for(const book of [CHAPTER1_SCENES,CHAPTER2_SCENES,CHAPTER3_SCENES])for(const s of Object.values(book||{}))patchScene(s);
}

function addStateChoiceCss(){
  if(document.querySelector('#patch095dcss'))return;
  const style=document.createElement('style');style.id='patch095dcss';style.textContent=`
    .story-choice.secret{border-color:#6d826f!important;background:linear-gradient(180deg,rgba(61,83,67,.28),rgba(24,31,27,.88))!important}
    .story-choice.secret span:first-child{font-weight:800}
  `;document.head.appendChild(style);
}

function stampVersion(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5d');
}

function apply095d(){
  tuneTemporaryStates();
  makeStatesAppearMoreOften();
  patchChapter1StateReplies();
  patchChapter2StateReplies();
  patchChapter3StateReplies();
  // ВАЖЛИВО: XP масштабуємо в самому кінці, щоб сюди потрапили й нові state-вибори.
  slowStoryXp();
  addStateChoiceCss();
  stampVersion();
}

queueMicrotask(apply095d);
