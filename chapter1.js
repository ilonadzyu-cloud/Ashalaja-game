import {itemCount} from './engine.js?v=060';
import {ITEM_DEFS} from './data.js?v=060';

const A='./';
const img=name=>A+name;
const hero=(name,position='hero')=>({role:'hero',src:img(name),position});
const pigeon=(name,position='pigeon')=>({role:'pigeon',src:img(name),position});
const galina=(name='galina_base.png')=>({role:'npc',src:img(name),position:'npc'});

const knowsName=s=>Boolean(s.flags.knowsPigeonName);
const bird=s=>knowsName(s)?'Євпапій':'голуб';
const birdAcc=s=>knowsName(s)?'Євпапія':'голуба';
const birdCap=s=>knowsName(s)?'Євпапій':'Голуб';

function canFit(state,id,qty=1){
  const def=ITEM_DEFS[id];if(!def)return false;
  let left=qty;
  for(const slot of state.inventory||[]){
    if(slot.id!==id||slot.qty>=def.stack)continue;
    left-=Math.min(left,def.stack-slot.qty);
    if(left<=0)return true;
  }
  const free=Math.max(0,16-(state.inventory||[]).length);
  return left<=free*def.stack;
}

const localOutfitEffects=[
  {type:'clothesAdd',id:'local_shirt',equip:true},
  {type:'clothesAdd',id:'local_vest',equip:true},
  {type:'clothesAdd',id:'local_pants',equip:true},
  {type:'clothesAdd',id:'boots',equip:true},
  {type:'statusRemove',id:'pigeonHumiliated'},
  {type:'flag',key:'localClothes',value:true}
];

const outside={background:img('bg.jpg'),atmosphere:'village'};
const inside={background:img('bg_hut.jpg'),atmosphere:'hut',stageTone:'hut'};

export const CHAPTER1_START='intro';

export const CHAPTER1_SCENES={
  intro:{
    ...outside,id:'intro',caption:'десь не там',hud:img('portrait_base.png'),
    actors:[hero('man_base.png')],
    text:`Останнє, що ви пам’ятаєте – рибалка. Риба не клювала, комари вас жерли так, ніби то їх остання вечеря. Потім для доброго настрою пішла пляшечка. За нею ше одна, потім ше одна… А далі вже провал.

До тями ви приходите вже зранку наступного дня. Після дощу сиро, навколо туман, від землі тягне вологою, а в роті страшний сушняк. Поруч сільська хитина, біля неї криниця, а у вікні світиться жовте світло.

І тут вам на плече падає щось тепле.`,
    choices:[{id:'intro_next',label:'Далі',next:'poop'}]
  },

  poop:{
    ...outside,id:'poop',caption:'біля хати',hud:img('portrait_angry.png'),
    actors:[hero('man_angry.png'),pigeon('pigeon_base.png')],
    onEnter:[
      {type:'statusAdd',id:'pigeonHumiliated'},
      {type:'flag',key:'metPigeon',value:true},
      {type:'flag',key:'modernJacketPooped',value:true},
      {type:'relationshipKnown',person:'evpapiy',value:true},
      {type:'memory',person:'evpapiy',key:'poopedOnHero',value:true}
    ],
    text:`Ви дивитесь на куртку – там свіжа біло-зелена купа.

Сука.

Біля вас сидить голуб. Жирний, упітаний, наглий. Жирна падла на двох тонких лапках. Дивиться прямо на вас і навіть не думає зйобувати.`,
    choices:[
      {id:'poop_stone',label:'Кинути в нього каменюкою.',next:'stone',effects:[{type:'stat',key:'agility',value:1}],hiddenEffects:[{type:'relationship',person:'evpapiy',key:'trust',value:-2},{type:'relationship',person:'evpapiy',key:'offense',value:2},{type:'relationshipDiscover',person:'evpapiy',key:'trust'},{type:'relationshipDiscover',person:'evpapiy',key:'offense'},{type:'memory',person:'evpapiy',key:'threwStone',value:true}],meta:['Спритність +1','Ставлення голуба погіршиться']},
      {id:'poop_money',label:'Нічого не робити. Баба казала, то до грошей.',next:'money',effects:[{type:'stat',key:'pofigism',value:1}],hiddenEffects:[{type:'relationship',person:'evpapiy',key:'trust',value:1},{type:'relationshipDiscover',person:'evpapiy',key:'trust'},{type:'memory',person:'evpapiy',key:'sparedAfterPoop',value:true}],meta:['Похуїзм +1']},
      {id:'poop_remember',label:'Сказати: «Я тебе запам’ятав».',next:'remember',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'trust',value:1},{type:'relationshipDiscover',person:'evpapiy',key:'trust'},{type:'memory',person:'evpapiy',key:'mutualRemember',value:true}],meta:['Голуб це запамʼятає']},
      {id:'poop_curse',label:'Глянути скоса та проклясти на три покоління вперед.',next:'curse',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'offense',value:1},{type:'relationshipDiscover',person:'evpapiy',key:'offense'},{type:'memory',person:'evpapiy',key:'cursedFamily',value:true}],meta:['Голуб це запамʼятає']}
    ]
  },

  stone:{
    ...outside,id:'stone',caption:'десь мимо',hud:img('portrait_base.png'),actors:[hero('man_base.png')],
    sfxOnEnter:[{id:'wings',delay:650}],
    text:`Ви хватаєте камінь і вже збираєтесь нормально зарядити в ту наглу морду, але жосткий будуняра робить своє. Нога їде по мокрій землі, вас веде вбік, і камінь летить мимо.

Голуб різко зривається з місця й зйобує за хату.

– Косий.`,
    choices:[{id:'stone_walk',label:'Йти далі',next:'village',minutes:5,activity:'walk'}]
  },

  money:{
    ...outside,id:'money',caption:'біля хати',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_base.png')],
    sfxOnEnter:[{id:'wings',delay:1200}],
    text:`Ви дивитесь на плече, потім на голуба. Згадуєте слова баби й вирішуєте нічого не робити.

– Ладно. Хуй з тобою.

Голуб роздуває груди.

– Мудре рішення.

І злітає за хату.`,
    choices:[{id:'money_walk',label:'Йти далі',next:'village',minutes:5,activity:'walk'}]
  },

  remember:{
    ...outside,id:'remember',caption:'біля хати',hud:img('portrait_angry.png'),actors:[hero('man_angry.png'),pigeon('pigeon_tilt.png')],
    sfxOnEnter:[{id:'wings',delay:1200}],
    text:`– Я тебе запам’ятав.

Голуб нахиляє голову набік і кілька секунд дуже пристально на вас дивиться.

– Я теж тебе запамʼятав.

І різко зривається з місця й летить геть.`,
    choices:[{id:'remember_walk',label:'Йти далі',next:'village',minutes:5,activity:'walk'}]
  },

  curse:{
    ...outside,id:'curse',caption:'біля хати',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_base.png')],
    sfxOnEnter:[{id:'wings',delay:1200}],
    text:`Ви дивитесь на нього скоса й подумки проклинаєте всю його голубину родню на три покоління вперед.

Голуб пару секунд дивиться на вас.

– І тобі всього доброго.

І зйобує за хату.`,
    choices:[{id:'curse_walk',label:'Йти далі',next:'village',minutes:5,activity:'walk'}]
  },

  village:{
    ...outside,id:'village',caption:'дивне село',hud:img('portrait_base.png'),actors:[hero('man_base.png'),pigeon('pigeon_base.png')],
    text:`Ранок, після дощу ще туман. Навколо тихо, людей не видно – ше рано, тільки десь за дворами гавкають собаки.

Може, це сон. А може, горілку в діда Толіка все-таки не треба було брати.

Через пару хвилин ви знову бачите того засраного голуба.`,
    choices:[
      {id:'village_ignore',label:'Робити вигляд, шо ви сліпий.',next:'voice',effects:[{type:'stat',key:'pofigism',value:1}],hiddenEffects:[{type:'memory',person:'evpapiy',key:'ignoredSecondMeeting',value:true}],meta:['Похуїзм +1']},
      {id:'village_talk',label:'Шо ти хочеш, блядь?',next:'voice',hiddenEffects:[{type:'memory',person:'evpapiy',key:'spokeSecondMeeting',value:true}]},
      {id:'village_chase',label:'Прогнати сраного сталкера.',next:'voice',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'offense',value:1},{type:'relationshipDiscover',person:'evpapiy',key:'offense'},{type:'memory',person:'evpapiy',key:'chasedSecondMeeting',value:true}],meta:['Голуб образиться']}
    ]
  },

  voice:{
    ...outside,id:'voice',caption:'знову він',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_tilt.png')],
    text:`– Шановний, ти не туди йдеш.`,
    choices:[{id:'voice_next',label:'Далі',next:'shoulder'}]
  },

  shoulder:{
    ...outside,id:'shoulder',caption:'остановочка єбаторіум',hud:img('portrait_ahui.png'),actors:[hero('man_ahui.png'),pigeon('pigeon_talk.png','shoulder')],
    sfxOnEnter:[{id:'wings',delay:120}],
    onEnter:[
      {type:'statusAdd',id:'yebatorium'},
      {type:'unlock',key:'yebatorium',value:true},
      {type:'flag',key:'metPigeon',value:true},
      {type:'relationshipKnown',person:'evpapiy',value:true},
      {type:'companionFact',person:'evpapiy',text:'Говорить. Це вже точно не будуняк.'}
    ],
    text:`Ви зупиняєтесь і озираєтесь.

Голуб підлітає до вас, сідає на плече й каже:

– Я до тебе говорю, шановний.

Ви дивитесь на нього.

Нє. Не причулось.`,
    choices:[
      {id:'shoulder_no_lie',label:'Не пизди.',next:'meet',hiddenEffects:[{type:'memory',person:'evpapiy',key:'engagedWithTalkingPigeon',value:true}]},
      {id:'shoulder_who',label:'Ти хто, блять?',next:'meet',hiddenEffects:[{type:'memory',person:'evpapiy',key:'engagedWithTalkingPigeon',value:true}]},
      {id:'shoulder_leave',label:'Мовчки відійти. Може, попустить.',next:'nameless',hiddenEffects:[{type:'memory',person:'evpapiy',key:'ignoredIntroduction',value:true}]}
    ]
  },

  nameless:{
    ...outside,id:'nameless',caption:'сраний сталкер',hud:img('portrait_tired.png'),actors:[hero('man_tired.png'),pigeon('pigeon_talk.png')],
    onEnter:[
      {type:'companion',person:'evpapiy',known:true,active:true,name:'Голуб',state:'Іде за вами'},
      {type:'companionFact',person:'evpapiy',text:'Говорить і чомусь вирішив іти за вами.'}
    ],
    text:`Ви мовчки йдете далі, роблячи вигляд, шо говорящого голуба не існує.

Він теж мовчить.

Секунд п’ять.

Потім починає пиздіти знову.`,
    choices:[{id:'nameless_next',label:'Далі',next:'yap'}]
  },

  meet:{
    ...outside,id:'meet',caption:'Євпапій. Для вас – Екакій.',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_talk.png')],
    onEnter:[
      {type:'flag',key:'knowsPigeonName',value:true},
      {type:'memory',person:'evpapiy',key:'knowsName',value:true},
      {type:'companion',person:'evpapiy',known:true,active:true,name:'Євпапій',state:'Іде за вами'},
      {type:'companionFact',person:'evpapiy',text:'Каже, що його звати Євпапій.'}
    ],
    text:`– Євпапій.

– Шо?

– Євпапій.

– Екакій?

Голуб дивиться на вас.

– Єв-па-пій.

– Ага. Екакій.

– Шановний, ти тугий?

От їбанько. Голуб не тільки говорить, але ще й хамить.`,
    choices:[{id:'meet_next',label:'Далі',next:'yap'}]
  },

  yap:{
    ...outside,id:'yap',caption:'електропізділка активна',hud:img('portrait_tired.png'),actors:[hero('man_tired.png'),pigeon('pigeon_talk.png')],
    text:s=>`Ви ще секунд п’ять дивитесь на ${birdAcc(s)} в надії, шо його електропізділка нарешті закриється. Але нє.

Він уже встиг розказати, шо походить від якихось там древніх голубів, учора кіт Галини чуть його не з’їв, ото був файтинг…

– І шо ти зробив?

– Дав пизди.

– Коту?

– Нє. Втік.

У вас починає боліти голова, а сушняк спокою не дає.

Ви бачите, що біля тої хати є криниця.

Треба шось робити.`,
    onEnter:[{type:'relationshipDiscover',person:'evpapiy',key:'bullshit'}],
    choices:[{id:'yap_next',label:'Далі',next:'hub'}]
  },

  hub:{
    ...outside,id:'hub',caption:'сільська хитина',hud:img('portrait_base.png'),actors:[hero('man_base.png'),pigeon('pigeon_base.png')],
    text:s=>`Перед вами сільська хитина, криниця й калюжа на дорозі.

${birdCap(s)} теж нікуди не дівся.`,
    choices:s=>{
      const out=[{id:'hub_well',label:'Піти до криниці.',next:'well',minutes:5,activity:'walk'}];
      if(!s.flags.doneWhere)out.push({id:'hub_where',label:'Запитати голуба, де ви.',next:'where'});
      if(!s.flags.donePuddle)out.push({id:'hub_puddle',label:'Напитись з калюжі.',next:'puddle',meta:['Вода +15%','Здоровʼя -10%','Похуїзм +1']});
      if(!s.flags.doneWhy)out.push({id:'hub_why',label:knowsName(s)?'Спитати, чого Екакій взагалі говорить.':'Спитати, чого цей голуб взагалі говорить.',next:'why',meta:['Ахуй +1']});
      out.push({id:'hub_rest',label:'Перепочити',next:'hub',minutes:30,activity:'rest'});
      return out;
    }
  },

  where:{
    ...outside,id:'where',caption:'корисна інформація',hud:img('portrait_angry.png'),actors:[hero('man_angry.png'),pigeon('pigeon_tilt.png')],
    onEnter:[{type:'flag',key:'doneWhere',value:true}],
    text:`– Де я взагалі?

– В селі.

– Я бачу, шо в селі.

– То нахуя питаєш?

– Я тебе зараз вʼєбу.`,
    choices:[{id:'where_back',label:'Назад',next:'hub'}]
  },

  puddle:{
    ...outside,id:'puddle',caption:'дуже розумне рішення',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_suspicious.png')],
    onEnter:[
      {type:'flag',key:'donePuddle',value:true},
      {type:'flag',key:'drankPuddle',value:true},
      {type:'flag',key:'dogPeedThere',value:true},
      {type:'need',key:'water',value:15},
      {type:'health',value:-10},
      {type:'stat',key:'pofigism',value:1},
      {type:'memory',person:'evpapiy',key:'sawHeroDrinkPuddle',value:true}
    ],
    text:s=>`Ви дивитесь на калюжу.

${birdCap(s)} теж.

Ви присідаєте.

– Я б не пив.

– Чого?

– Та пий.

Ви дивитесь на нього.

${knowsName(s)?'– Екакій.':'– Голуб.'}

– Шо?

– Там шо?

– Я не знаю.

– А нахуй тоді не пити?

– Виглядає хуйово.

Ви набираєте воду в долоні й п’єте.

Холодна. Бридка.

${birdCap(s)} мовчить.

– Шо?

– Нічо.`,
    flash:'Вода +15% · Здоровʼя -10% · Похуїзм: прогрес +1',
    choices:[{id:'puddle_back',label:'Назад',next:'hub'}]
  },

  why:{
    ...outside,id:'why',caption:'питання до реальності',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_tilt.png')],
    onEnter:[{type:'flag',key:'doneWhy',value:true},{type:'stat',key:'ahui',value:1}],
    text:s=>knowsName(s)?`– Екакій.

– Євпапій.

– Чого ти говориш?

– Бо вмію.

– Ти ж голуб.

Євпапій дивиться на себе.

– Ага.`:`– Чого ти говориш?

– Бо вмію.

– Ти ж голуб.

Голуб дивиться на себе.

– Ага.`,
    flash:'Ахуй: прогрес +1',
    choices:[{id:'why_back',label:'Назад',next:'hub'}]
  },

  well:{
    ...outside,id:'well',caption:'біля криниці',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_serious.png')],
    sfxOnEnter:[{id:'wings',delay:1700}],
    onEnter:[{type:'companion',person:'evpapiy',known:true,active:true,state:'Тримається трохи осторонь'},{type:'relationshipDiscover',person:'evpapiy',key:'greed'}],
    text:s=>`– А в тій хаті нормальні люди?

– Місцеві.

Ви дивитесь на нього.

– Я спитав, нормальні?

– Я почув.

${birdCap(s)} відлітає трохи далі.

Ви йдете до криниці, а він лишається осторонь.

– А ти чого там?

– Мені й тут добре.

Ви зупиняєтесь.

Голуб мовчить.`,
    notice:s=>({title:`${knowsName(s)?'ЄВПАПІЙ':'ГОЛУБ'} ЩОСЬ ЗНАЄ`,body:'Ця жирна падла явно знає більше, ніж каже.'}),
    choices:s=>{
      const out=[];
      if(itemCount(s,'salo')>0)out.push({id:'well_salo',label:'Дати сало.',next:'wellSalo',hiddenEffects:[{type:'itemRemove',id:'salo',qty:1},{type:'relationship',person:'evpapiy',key:'trust',value:1},{type:'relationshipDiscover',person:'evpapiy',key:'trust'},{type:'memory',person:'evpapiy',key:'bribedAtWell',value:true}],meta:['Сало -1','Довіра +1']});
      if(itemCount(s,'knife')>0)out.push({id:'well_knife',label:'Пригрозити ножем.',next:'wellKnife',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'trust',value:-1},{type:'relationship',person:'evpapiy',key:'offense',value:2},{type:'relationshipDiscover',person:'evpapiy',key:'trust'},{type:'relationshipDiscover',person:'evpapiy',key:'offense'},{type:'memory',person:'evpapiy',key:'threatenedAtWell',value:true}],meta:['Довіра -1','Образа +2']});
      out.push({id:'well_ignore',label:'Забити й підійти до криниці.',next:'end'});
      return out;
    }
  },

  wellSalo:{
    ...outside,id:'wellSalo',caption:'сало вирішує питання',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_talk.png')],
    text:s=>`Ви дістаєте сало.

${birdCap(s)} одразу підлітає ближче.

– Кажи.

– В хату можеш іти. Але очі відкриті тримай.

– А конкретніше?

– Сала було мало.`,
    choices:[{id:'well_salo_end',label:'Підійти до криниці',next:'end'}]
  },

  wellKnife:{
    ...outside,id:'wellKnife',caption:'дуже дипломатично',hud:img('portrait_angry.png'),actors:[hero('man_angry.png'),pigeon('pigeon_serious.png')],
    sfxOnEnter:[{id:'wings',delay:1800}],
    text:s=>`Ви трохи показуєте ніж.

– А тепер говори.

${birdCap(s)} дивиться на ніж. Потім на вас.

– Ти мені серйозно ножем угрожаєш?

– Ага.

– От їбанько.

Він відлітає ще далі.

– Сам іди.`,
    choices:[{id:'well_knife_end',label:'Підійти до криниці',next:'end'}]
  },

  end:{
    ...outside,id:'end',caption:'сільська хитина',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),galina()],
    onEnter:[{type:'relationshipKnown',person:'galina',value:true}],
    text:s=>`Ви тільки нахиляєтесь до криниці, як двері сільської хитини риплять.

На порозі зʼявляється невисока літня жінка в хустці. Дивиться на вас, потім на ${birdAcc(s)}.

– Оце з тобою?

Ви дивитесь на ${birdAcc(s)}.

– Нє, нє.

Жінка усміхається.

– Хочеш в хату? Заходь. Але оце не пущу.

Вона відступає від дверей.

– Ходи-но. Їсти дам. Вид у тебе недобрий.`,
    choices:[
      {id:'end_enter',label:'Зайти. Їжа є їжа.',next:'galinaInside',hiddenEffects:[{type:'relationship',person:'galina',key:'trust',value:1},{type:'relationshipDiscover',person:'galina',key:'trust'}]},
      {id:'end_ask_pigeon',label:'Спитати, чого вона не пускає голуба.',next:'galinaPigeon'},
      {id:'end_watch',label:'Не спішити. Спочатку придивитись до неї.',next:'galinaWatch',effects:[{type:'stat',key:'attention',value:1}],hiddenEffects:[{type:'flag',key:'watchGalina',value:true}],meta:['Уважність +1']}
    ]
  },

  galinaPigeon:{
    ...outside,id:'galinaPigeon',caption:'сільська хитина',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),galina()],
    text:s=>`– А чого його не пускаєте?

Баба Галя ще раз дивиться в бік ${birdAcc(s)}.

– Не люблю я голубів. Хай надворі сидить, нічого йому не станеться.

– Ага.

– Ходи вже, чоловіче. Їсти стигне.`,
    choices:[{id:'galina_pigeon_enter',label:'Зайти',next:'galinaInside'}]
  },

  galinaWatch:{
    ...outside,id:'galinaWatch',caption:'сільська хитина',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),galina()],
    text:`Ви не спішите й кілька секунд просто дивитесь на неї.

Баба Галя стоїть спокійно, усміхається й терпляче чекає.

– Ну? Заходити будеш чи при криниці житимеш?

В голосі ні злості, ні страху. Просто чекає.`,
    choices:[{id:'galina_watch_enter',label:'Зайти',next:'galinaInside'}]
  },

  galinaInside:{
    ...inside,id:'galinaInside',caption:'сільська хитина',hud:img('portrait_tired.png'),actors:[hero('man_tired.png','hutHero'),galina()],
    onEnter:[
      {type:'companion',person:'evpapiy',known:true,active:false,state:'Чекає надворі'},
      {type:'world',key:'location',value:'хата баби Галі'},
      {type:'world',key:'environment',value:'indoors'}
    ],
    text:`У хаті тепло. Піч потріскує, на столі вже стоять хліб, сало, цибуля й глечик води.

– Сідай-но, – каже баба Галя. – Їж. Бо вид у тебе недобрий.

Вона підсуває вам їжу так, ніби ви тут не хуй зна звідки взялися.`,
    choices:[
      {id:'inside_meal',label:'Поїсти й напитися.',next:'galinaClothes',minutes:15,activity:'dialogue',effects:[{type:'need',key:'satiety',value:30},{type:'need',key:'water',value:35},{type:'statusRemove',id:'hangover'}],hiddenEffects:[{type:'relationship',person:'galina',key:'trust',value:1},{type:'relationshipDiscover',person:'galina',key:'trust'},{type:'memory',person:'galina',key:'fedHero',value:true}],meta:['Ситість +30%','Вода +35%','Будуняра знято']},
      {id:'inside_water',label:'Взяти тільки воду.',next:'galinaClothes',minutes:10,activity:'dialogue',effects:[{type:'need',key:'water',value:35}],hiddenEffects:[{type:'memory',person:'galina',key:'heroRefusedFood',value:true}],meta:['Вода +35%']},
      {id:'inside_watch',label:'Поки не їсти. Дивитись, шо вона робить.',next:'galinaClothes',minutes:5,activity:'dialogue',effects:[{type:'stat',key:'attention',value:1}],hiddenEffects:[{type:'flag',key:'watchGalina',value:true}],meta:['Уважність +1']}
    ]
  },

  galinaClothes:{
    ...inside,id:'galinaClothes',caption:'сільська хитина',hud:img('portrait_tired.png'),actors:[hero('man_tired.png','hutHero'),galina()],
    text:`Баба Галя ще раз оглядає вас з голови до ніг.

– А одежина в тебе чудна. Не гоже так селом ходити.

Вона дістає просту світлу сорочку, темну безрукавку, штани й старі чоботи.

– На. Чоловіча одежина. На тебе, може, й сяде.`,
    choices:[
      {id:'clothes_take',label:'Взяти й подякувати.',next:'galinaTakeClothes',hiddenEffects:[{type:'relationship',person:'galina',key:'trust',value:1},{type:'relationshipDiscover',person:'galina',key:'trust'}]},
      {id:'clothes_owner',label:'Спитати, чий одяг.',next:'galinaClothesOwner',hiddenEffects:[{type:'memory',person:'galina',key:'askedAboutClothesOwner',value:true}]},
      {id:'clothes_joke',label:'Сказати, шо ви й так нормально виглядаєте.',next:'galinaClothesJoke'}
    ]
  },

  galinaTakeClothes:{
    ...inside,id:'galinaTakeClothes',caption:'сільська хитина',hud:img('portrait_tired.png'),actors:[hero('man_tired.png','hutHero'),galina()],
    text:`– Дякую.

– Бери вже. Не мені ж його носити.

Баба Галя кладе одяг поруч.`,
    choices:[{id:'take_change',label:'Переодягнутись',next:'galinaChanged',minutes:5,activity:'dialogue',hiddenEffects:localOutfitEffects,meta:['Місцевий прикид']}]
  },

  galinaClothesOwner:{
    ...inside,id:'galinaClothesOwner',caption:'сільська хитина',hud:img('portrait_tired.png'),actors:[hero('man_tired.png','hutHero'),galina()],
    text:`– А чий це одяг?

– Був чоловічий.

– Я поняв. Чий?

Баба Галя поправляє край фартуха.

– Тепер твій буде.

І кладе одежину поруч.`,
    choices:[{id:'owner_change',label:'Переодягнутись',next:'galinaChanged',minutes:5,activity:'dialogue',hiddenEffects:localOutfitEffects,meta:['Місцевий прикид']}]
  },

  galinaClothesJoke:{
    ...inside,id:'galinaClothesJoke',caption:'сільська хитина',hud:img('portrait_tired.png'),actors:[hero('man_tired.png','hutHero'),galina()],
    text:`– Та я й так нормально виглядаю.

Баба Галя дивиться на вас.

Довго.

– Не гоже брехати в чужій хаті.

Одяг вона все одно кладе вам у руки.`,
    choices:[{id:'joke_change',label:'Переодягнутись',next:'galinaChanged',minutes:5,activity:'dialogue',hiddenEffects:localOutfitEffects,meta:['Місцевий прикид']}]
  },

  galinaChanged:{
    ...inside,id:'galinaChanged',caption:'сільська хитина',hud:img('portrait_base.png'),actors:[hero('man_local.png','hutHero'),galina()],
    text:`Одяг трохи чужий і сидить так собі, але тепер ви хоча б менше вибиваєтесь.

Борода, волосся й морда після будуняри нікуди не ділись.`,
    choices:[{id:'changed_next',label:'Далі',next:'galinaMurderScene'}]
  },

  galinaMurderScene:{
    ...inside,id:'galinaMurderScene',caption:'сільська хитина',hud:img('portrait_base.png'),
    actors:s=>[hero('man_local.png','hutHero'),galina(s.flags.watchGalina?'galina_grimace.png':'galina_base.png')],
    onEnter:s=>[
      {type:'flag',key:'murderKnown',value:true},
      ...(s.flags.watchGalina?[{type:'stat',key:'attention',value:1},{type:'flag',key:'galinaGrimaceSeen',value:true},{type:'memory',person:'galina',key:'grimacedAtMurderTopic',value:true}]:[])
    ],
    text:s=>s.flags.watchGalina?`За вікном усе ще тихо.

– А чого в селі нікого нема? – питаєте ви.

На мить баба Галя кривиться. Так швидко, що якби ви до того за нею не придивлялись, то й не помітили б.

– Люд по хатах сидить. Ніч недобра була.

– Шо сталося?

– Чоловіка коло річки знайшли. Мертвого.

– Убили?

– Видко, що не сам ліг.

– А хто?

– Коли б відали, то не шепотілись би по кутках.`:`За вікном усе ще тихо.

– А чого в селі нікого нема? – питаєте ви.

– Люд по хатах сидить, – каже баба Галя. – Ніч недобра була.

– Шо сталося?

– Чоловіка коло річки знайшли. Мертвого.

– Убили?

– Видко, що не сам ліг.

– А хто?

– Коли б відали, то не шепотілись би по кутках.`,
    flash:s=>s.flags.watchGalina?'Уважність: прогрес +1':'',
    choices:[
      {id:'murder_victim',label:'Спитати, кого вбили.',next:'galinaVictim'},
      {id:'murder_leave',label:'Не лізти поки далі.',next:'galinaGarlic',hiddenEffects:[{type:'relationship',person:'galina',key:'trust',value:1},{type:'relationshipDiscover',person:'galina',key:'trust'}]},
      {id:'murder_calm',label:'Спитати, чого вона так спокійно про це говорить.',next:'galinaCalm'}
    ]
  },

  galinaVictim:{
    ...inside,id:'galinaVictim',caption:'сільська хитина',hud:img('portrait_base.png'),actors:[hero('man_local.png','hutHero'),galina()],
    text:`– Кого вбили?

Баба Галя зітхає.

– Семена, мельникового небожа. Молодий був. Язик мав довгий, та смерті за те не дають.

– А як убили?

– Сього не відаю.

Відповідає вона швидко.`,
    onEnter:[{type:'flag',key:'knowsVictimName',value:true},{type:'memory',person:'galina',key:'saidVictimWasSemen',value:true}],
    choices:[{id:'victim_next',label:'Далі',next:'galinaGarlic'}]
  },

  galinaCalm:{
    ...inside,id:'galinaCalm',caption:'сільська хитина',hud:img('portrait_base.png'),actors:[hero('man_local.png','hutHero'),galina()],
    text:`– А ви шось дуже спокійно про це говорите.

Баба Галя дивиться на вас без усмішки.

– А криком мертвого піднімеш?

Потім знов береться за посуд.`,
    onEnter:[{type:'memory',person:'galina',key:'askedWhyCalm',value:true}],
    choices:[{id:'calm_next',label:'Далі',next:'galinaGarlic'}]
  },

  galinaGarlic:{
    ...inside,id:'galinaGarlic',caption:'сільська хитина',hud:img('portrait_base.png'),actors:[hero('man_local.png','hutHero'),galina()],
    text:`Перед тим як ви підводитесь, баба Галя кладе на стіл головку часнику.

– І се візьми.

– На шо?

– Згодиться.

– А конкретніше?

– Як згодиться – сам поймеш.`,
    choices:s=>{
      const out=[];
      if(s.unlocks.yebatorium&&!s.flags.galinaPotion&&canFit(s,'potion_unknown'))out.push({id:'garlic_potion',label:'[ЄБАТОРІУМ] Попросити ще якусь дивну хуйню на дорогу.',next:'galinaPotion',kind:'secret',meta:['??? зілля +1']});
      out.push({id:'garlic_take',label:'Взяти часник.',next:'galinaExit',requiresSpace:'garlic',hiddenEffects:[{type:'itemAdd',id:'garlic',qty:1},{type:'flag',key:'garlicGift',value:true},{type:'relationship',person:'galina',key:'trust',value:1},{type:'relationshipDiscover',person:'galina',key:'trust'},{type:'memory',person:'galina',key:'acceptedGarlic',value:true}],meta:['Часник +1']});
      out.push({id:'garlic_refuse',label:'Не брати.',next:'galinaExit',hiddenEffects:[{type:'flag',key:'refusedGarlic',value:true},{type:'memory',person:'galina',key:'refusedGarlic',value:true}]});
      return out;
    }
  },

  galinaPotion:{
    ...inside,id:'galinaPotion',caption:'сільська хитина',hud:img('portrait_base.png'),actors:[hero('man_local.png','hutHero'),galina()],
    onEnter:[{type:'itemAdd',id:'potion_unknown',qty:1},{type:'flag',key:'galinaPotion',value:true},{type:'memory',person:'galina',key:'gaveUnknownPotion',value:true}],
    text:`– А ше шось таке маєте?

Баба Галя дивиться на вас.

– Яке «таке»?

– Ну… шоб я сам не знав, нашо воно мені.

Вона мовчки дістає маленьку пляшечку з мутною рідиною.

– На.

– А шо це?

– Як треба буде – поймеш.`,
    notice:{title:'ОТРИМАНО: ??? ЗІЛЛЯ',body:'Ефект: невідомий. Здавалося б, тут мала б працювати Харизма. Але не в нашому случаї.'},
    choices:[{id:'potion_back',label:'Назад',next:'galinaGarlic'}]
  },

  galinaExit:{
    ...outside,id:'galinaExit',caption:'біля сільської хитини',hud:img('portrait_base.png'),actors:[hero('man_local.png'),pigeon('pigeon_base.png')],
    onEnter:[
      {type:'companion',person:'evpapiy',known:true,active:true,state:'Знову з вами'},
      {type:'world',key:'location',value:'біля сільської хитини'},
      {type:'world',key:'environment',value:'outdoors'}
    ],
    text:s=>`Ви виходите надвір уже в чужій одежині.

${birdCap(s)} сидить неподалік і дивиться на вас.

Ви дивитесь на нього.

Він – на вас.

Поки ніхто нічого не каже.`,
    choices:[{id:'exit_end',label:'Далі',next:'chapter1End'}]
  },

  chapter1End:{
    ...outside,id:'chapter1End',caption:'кінець глави 1',hud:img('portrait_base.png'),actors:[hero('man_local.png'),pigeon('pigeon_base.png')],
    onEnter:[{type:'flag',key:'chapter1Complete',value:true}],
    text:`Глава 1 завершена.`,
    notice:{title:'ПРОДОВЖЕННЯ БУДЕ',body:'Усі ваші вибори, стани, предмети, стосунки й те, що персонажі про вас запамʼятали, збережені.'},
    end:true,
    choices:[]
  }
};

export function getChapter1Scene(state){
  const id=state?.story?.sceneId||state?.scene||CHAPTER1_START;
  return CHAPTER1_SCENES[id]||CHAPTER1_SCENES[CHAPTER1_START];
}

export function resolveSceneValue(value,state){
  return typeof value==='function'?value(state):value;
}
