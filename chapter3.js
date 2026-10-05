import {ITEM_DEFS} from './data.js?v=096b';

const img=n=>`./${n}`;
const hero=(name='ch2_hero_scared.png',position='hero')=>({role:'hero',src:img(name),position});
const pigeon=(name='pigeon_base.png',position='pigeon')=>({role:'pigeon',src:img(name),position});
const hood=()=>({role:'npc face-left',src:img('ch2_unknown_v2.png'),position:'npc'});
const creature=(name='creature_normal_095f.webp',position='npc')=>({role:'npc',src:img(name),position});
const galina=()=>({role:'npc',src:img('galina_base.png'),position:'npc'});
const shed={background:img('ch2_shed.jpg'),atmosphere:'village',chapter:3,world:[{type:'world',key:'environment',value:'outdoors'},{type:'world',key:'location',value:'біля сараю'}]};

function itemCount(state,id){return(state.inventory||[]).filter(x=>x.id===id).reduce((n,x)=>n+Number(x.qty||0),0)}
function canFit(state,id,qty=1){const def=ITEM_DEFS[id];if(!def)return false;let left=qty;for(const slot of state.inventory||[]){if(slot.id!==id||slot.qty>=def.stack)continue;left-=Math.min(left,def.stack-slot.qty);if(left<=0)return true}return left<=Math.max(0,16-(state.inventory||[]).length)*def.stack}

export const CHAPTER3_START='ch3_intro';

export const CHAPTER3_SCENES={
  ch3_intro:{
    ...shed,id:'ch3_intro',caption:'КРАЩЕ СЦЯТИ В ТУАЛЕТІ',actors:[hero(),hood()],
    onEnter:[{type:'flag',key:'chapter3Started',value:true}],
    text:`Постать тримає вас за сорочку й каже дуже тихо:

– Замри і мовчи. Навіть не дихай.

З сараю за спиною чути, як щось важке шкребеться по дверях.`,
    notice:{title:'НЕБЕЗПЕКА: ???',body:''},
    choices:[
      {id:'ch3_obey',label:'Послухати постать.',next:'ch3_obey'},
      {id:'ch3_turn',label:'Різко обернутись.',next:'ch3_turn'},
      {id:'ch3_call_pigeon',label:'Покликати Євпапія.',next:'ch3_call_pigeon'},
      {id:'ch3_tell_off',label:'Послати постать нахуй.',next:'ch3_tell_off'}
    ]
  },

  ch3_obey:{
    ...shed,id:'ch3_obey',caption:'не дихати',actors:[hero(),hood()],
    text:`Ви завмираєте. Навіть дихати стараєтесь через раз.

Шкрябання стає гучнішим. Потім щось важко вдаряється об двері зсередини. Постать ще сильніше стискає вашу сорочку.

– От і добре.

– А можна хотя би дихати?

– Нє.

– Заєбісь.

Двері сараю повільно починають відчинятись.`,
    choices:[{id:'ch3_obey_next',label:'…',next:'ch3_creature'}]
  },

  ch3_turn:{
    ...shed,id:'ch3_turn',caption:'ну канєшно',actors:[hero(),hood()],
    onEnter:[{type:'stat',key:'ahui',value:1}],
    text:`Ви, канєшно, робите рівно те, що вам сказали не робити, і різко обертаєтесь.

Постать смикає вас назад за сорочку.

– Я ж сказало не рухатись.

– Я тільки гляну.

– Уже глянув.

Біля дверей сараю щось ворушиться. Видно брудну руку, шматок плеча і голову, яка смикається якось зовсім не по-людськи.

Воно теж вас помічає.

– Блядь.`,
    notice:{title:'ДОСВІД +10',body:''},
    choices:[{id:'ch3_turn_next',label:'…',next:'ch3_creature'}]
  },

  ch3_call_pigeon:{
    ...shed,id:'ch3_call_pigeon',caption:'євпапій',actors:[hero('ch2_hero_side.png'),pigeon('pigeon_suspicious.png','shoulder')],
    text:`– Євпапій…

– Шо?

– Тихо, блядь.

Євпапій підлітає ближче, визирає з-за вашого плеча й дивиться на сарай.

Кілька секунд мовчить.

– Не рухайся.

– Та ви шо, сьогодні всі договорились?

Євпапій не відповідає.

І от це вже трохи напрягає.`,
    choices:[{id:'ch3_call_next',label:'…',next:'ch3_creature'}]
  },

  ch3_tell_off:{
    ...shed,id:'ch3_tell_off',caption:'не командуй',actors:[hero('ch2_hero_tired.png'),hood()],
    onEnter:[{type:'stat',key:'pofigism',value:1}],
    text:`– Та пусти мене нахуй.

Постать тягне вас назад ще сильніше.

– Мовчи.

– Не командуй мені.

Постать просто закриває вам рот рукою.

– Ще слово – і підеш туди першим.

Ви дивитесь на сарай. Потім на руку на своєму роті. І вирішуєте, що ще буквально секунд десять можете потерпіти.`,
    notice:{title:'ДОСВІД +10',body:''},
    choices:[{id:'ch3_tell_next',label:'…',next:'ch3_creature'}]
  },

  ch3_creature:{
    ...shed,id:'ch3_creature',caption:'воно вилізло',actors:[hero(),creature('creature_normal_095f.webp')],
    text:`З темряви повільно вилазить щось брудне, засмальцьоване, вонюче і потне. Вилитий дід Толік після триденного юбілею.`,
    choices:s=>{
      const out=[];
      if(itemCount(s,'vodka')>0)out.push({id:'ch3_vodka',label:'Дати горілку.',next:'ch3_vodka'});
      if(itemCount(s,'garlic')>0)out.push({id:'ch3_garlic',label:'Кинути часник.',next:'ch3_garlic'});
      out.push({id:'ch3_run',label:'Уйобувать.',next:'ch3_run'});
      out.push({id:'ch3_ask_pigeon',label:'Послухати Євпапія.',next:'ch3_ask_pigeon'});
      if(s.unlocks?.prayer||s.flags?.prayerUnlocked)out.push({id:'ch3_pray',label:'Молитись своєму богу.',next:'ch3_pray'});
      return out;
    }
  },

  ch3_vodka:{
    ...shed,id:'ch3_vodka',caption:'ну будеш?',actors:[hero('ch2_hero_side.png'),creature('creature_vodka_095f.webp')],
    onEnter:[{type:'itemRemove',id:'vodka',qty:1},{type:'relationship',person:'creature',key:'attitude',value:5},{type:'flag',key:'creatureVodkaFriend',value:true},{type:'flag',key:'creatureRescueAvailable',value:true}],
    text:`Ви дістаєте горілку.

– Будеш?

Постать повільно повертає голову до вас.

– Ти довбойоб?

Створіння завмирає. Дивиться на пляшку. Облизує губи й різко вихоплює її з рук.

Пʼє жадібно, обливається, аж пританцьовує від щастя.

Плечі розправляються. Очі стають живіші. Воно навіть ніби трохи посвіжішало. Допиває й кидає пляшку вам під ноги.

Кілька секунд дуже уважно дивиться на вас. І шиплячим голосом каже:

– Я прийду ше.

Після чого різко зйобує в ліс. Ви ще пару секунд дивитесь йому вслід. Євпапій теж.

– От нахуй ти йому показав, де наливають?

Постать нарешті відпускає вашу сорочку та дивиться в бік лісу.

– Тепер воно повернеться.

– Заєбісь, – каже Євпапій.`,
    choices:[{id:'ch3_vodka_pause',label:'Далі',next:'ch3_galina'}]
  },

  ch3_garlic:{
    ...shed,id:'ch3_garlic',caption:'народна медицина',actors:[hero('ch2_hero_side.png'),creature('creature_garlic_story_095f.webp')],
    onEnter:[{type:'itemRemove',id:'garlic',qty:1},{type:'flag',key:'creatureGarlicUsed',value:true}],
    text:`– Ну давай, сука. Не підведи.

– Ти шо робиш? – шипить постать.

– Перевіряю народну медицину.

Ви кидаєте часник у створіння. Він влучає прямо в груди.

Створіння згинається й шипить, ніби його ошпарили. Від сорочки піднімається легкий дим.

– О, – каже Євпапій.

– Шо «о»?

– Працює.

– ТИ Ж КАЗАВ, ШО ЧАСНИК ХУЙНЯ.

– Я сказав, шо мені його не давати.

Створіння повільно випрямляється і робить крок до вас.

Постать тихо каже:

– Тепер воно тебе запамʼятало.

– Заєбісь.`,
    notice:{title:'СТВОРІННЯ / ЗДОРОВʼЯ 80/100',body:''},
    choices:[{id:'ch3_garlic_hit',label:'…',next:'ch3_garlic_hit'}]
  },

  ch3_garlic_hit:{
    ...shed,id:'ch3_garlic_hit',caption:'ну от',actors:[hero('ch2_hero_scared.png'),creature('creature_attack_095f.webp')],
    onEnter:[{type:'damage',amount:10,ignoreArmor:true}],
    text:`Створіння різко кидається вперед. Ви встигаєте відскочити, але воно чіпляє вас за плече й кидає на землю.

– Нормально? – питає Євпапій.

– Ага. Заєбісь. Відпочиваю.

Ви піднімаєтесь. Створіння вже знову йде до вас.`,
    notice:{title:'ЗДОРОВʼЯ -10',body:''},
    choices:[{id:'ch3_battle_from_garlic',label:'ПОЧИНАЄТЬСЯ БІЙ',battle:{id:'shedCreature',enemyHp:80,nextOnKnockout:'ch3_wakeup',nextOnLose:'ch3_dead'}}]
  },

  ch3_ask_pigeon:{
    ...shed,id:'ch3_ask_pigeon',caption:'дуже корисна порада',actors:[hero('ch2_hero_scared.png'),pigeon('pigeon_talk.png','shoulder')],
    text:`– Євпапій, шо робити?!

Голуб дивиться на створіння. Потім на вас. Потім знов на створіння.

– Бий ножем.

– Ти впевнений?

– Канєшно.

– Якщо я здохну, я тебе найду.`,
    choices:[{id:'ch3_battle_from_pigeon',label:'ПОЧИНАЄТЬСЯ БІЙ',battle:{id:'shedCreature',enemyHp:100,nextOnKnockout:'ch3_wakeup',nextOnLose:'ch3_dead'}}]
  },

  ch3_run:{
    ...shed,id:'ch3_run',caption:'погана ідея',actors:[hero('ch2_hero_scared.png'),creature('creature_attack_095f.webp')],
    onEnter:[{type:'health',value:-100},{type:'flag',key:'diedRunningFromShed',value:true}],
    text:`Ви вирішуєте, що з вас досить.

– Та йдіть ви всі нахуй.

Розвертаєтесь і робите буквально кілька кроків.

Ззаду щось різко влітає вам у потилицю.

Темно.

Євпапій:

– Ну от. А я казав бігти. Правда, трохи раніше.`,
    notice:{title:'ЗДОРОВʼЯ 0 · ВИ ЗДОХЛИ',body:'Може, наступного разу не варто повертатись спиною до хуйні, про яку ви нічого не знаєте.'},
    choices:[{id:'ch3_dead_again',label:'…',next:'ch3_dead'}]
  },

  ch3_pray:{
    ...shed,id:'ch3_pray',caption:'молитва',actors:[hero('ch2_hero_scared.png'),hood()],
    onEnter:[{type:'flag',key:'creatureKilledByPrayer',value:true}],
    text:`Ви заплющуєте очі й починаєте молитись.

Постать нічого не каже.

Ще секунду чути, як створіння важко шарудить зовсім поруч. Потім звук віддаляється в бік сараю.

Щось глухо вдаряється всередині.

І все.

Тиша.

Ви відкриваєте очі. Створіння вже нема, а двері сараю знову закриті.

– І шо?

Постать дивиться на сарай.

– Пішли.

– А воно?

– Пішли.

Навіть Євпапій цього разу мовчить.`,
    choices:[{id:'ch3_pray_pause',label:'Далі',next:'ch3_galina'}]
  },

  ch3_wakeup:{
    ...shed,id:'ch3_wakeup',caption:'очухались',actors:[hero('hero_injured_096.png'),pigeon('pigeon_base.png')],
    onEnter:s=>{
      const out=[{type:'statusAdd',id:'headInjury'},{type:'flag',key:'shedKnifeDestroyed',value:true},{type:'flag',key:'shedBattleKnockout',value:true}];
      if(itemCount(s,'knife')>0)out.push({type:'itemRemove',id:'knife',qty:1});
      if(canFit(s,'old_key'))out.push({type:'itemAdd',id:'old_key',qty:1});
      return out;
    },
    text:`Ви приходите до тями від того, що вам тупо важко дихати.

Відкриваєте очі – на грудях сидить Євпапій.

– Злізь.

– О, живий.

– ЗЛІЗЬ, СУКА.

Євпапій нехотячи злітає. Ви повільно сідаєте під сараєм. Голова гуде, на потилиці щось мокре. Проводите рукою – кров.

Сарай перед вами закритий. Наче нічого не сталося.

Ножа нема. Постаті нема. Хуйні з сараю нема.

Поруч у траві лежить старий ключ.

Ви підбираєте його.`,
    notice:{title:'ОТРИМАНО: СТАРИЙ КЛЮЧ',body:'НІЖ ЗНИЩЕНО'},
    choices:[{id:'ch3_key_next',label:'Далі',next:'ch3_galina'}]
  },

  ch3_galina:{
    ...shed,id:'ch3_galina',caption:'баба галя',actors:s=>[hero(s.activeStatuses?.includes('headInjury')?'hero_injured_096.png':'ch2_hero_local.png'),galina()],
    onEnter:[{type:'flag',key:'chapter3PreviewEnd',value:true}],
    text:s=>s.activeStatuses?.includes('headInjury')?`Ви ще крутите ключ у руці, коли з-за рогу зʼявляється баба Галя. Дивиться на вас, на кров на потилиці, на сарай. Обличчя міняється буквально на секунду, але потім знов стає таким, ніби нічого особливого не сталося.

– Баб Галь, шо то було?

Вона підходить ближче, бере вас за лікоть і розвертає в бік хати.

– Рану треба перевʼязати.

– Я питаю, шо з сараю вилізло.

– І голову промити.

– Баб Галь.

– Ходи вже.

Євпапій плететься слідом, але в хату не заходить.`:`Баба Галя зʼявляється з-за рогу й кілька секунд дивиться на вас, потім на сарай. Обличчя міняється буквально на секунду, але вона одразу робить вигляд, ніби нічого особливого не сталося.

– Баб Галь, шо то було?

Вона підходить, бере вас за лікоть і розвертає в бік хати.

– Ходи до хати.

– Я питаю, шо це було.

– Чула. Ходи вже.

Євпапій плететься слідом, але в хату не заходить.`,
    notice:{title:'ПРОДОВЖЕННЯ ТРЕТЬОЇ ГЛАВИ БУДЕ...',body:'Усе, що ви встигли наробити, збережено.'},
    end:true,choices:[]
  },

  ch3_dead:{
    ...shed,id:'ch3_dead',caption:'ну все',actors:[],
    text:`ВИ ЗДОХЛИ.`,
    notice:{title:'КІНЕЦЬ',body:'Це проходження можна почати заново або завантажити ручний сейв.'},
    end:true,choices:[]
  },

  ch3_branch_pending:{
    ...shed,id:'ch3_branch_pending',caption:'ця гілка ще росте',actors:[hero(),pigeon('pigeon_base.png')],
    text:`На цьому місці третя глава поки обривається.`,
    notice:{title:'ПРОДОВЖЕННЯ ТРЕТЬОЇ ГЛАВИ БУДЕ...',body:'Це ше може вилізти боком.'},
    end:true,choices:[]
  }
};

export function getChapter3Scene(state){const id=state?.story?.sceneId||state?.scene||CHAPTER3_START;return CHAPTER3_SCENES[id]||null}
