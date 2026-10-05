import {ITEM_DEFS} from './data.js?v=096b';

const img=n=>`./${n}`;
const hero=(name='man_base.png',position='hero')=>({role:'hero',src:img(name),position});
const pigeon=(name='pigeon_base.png',position='pigeon')=>({role:'pigeon',src:img(name),position});
const galina=(name='galina_base.png')=>({role:'npc',src:img(name),position:'npc'});
const knowsName=s=>Boolean(s.flags.knowsPigeonName);
const bird=s=>knowsName(s)?'Євпапій':'голуб';
const birdAcc=s=>knowsName(s)?'Євпапія':'голуба';
const birdCap=s=>knowsName(s)?'Євпапій':'Голуб';

function itemCount(state,id){return(state.inventory||[]).filter(x=>x.id===id).reduce((n,x)=>n+Number(x.qty||0),0)}
function canFit(state,id,qty=1){const def=ITEM_DEFS[id];if(!def)return false;let left=qty;for(const slot of state.inventory||[]){if(slot.id!==id||slot.qty>=def.stack)continue;left-=Math.min(left,def.stack-slot.qty);if(left<=0)return true}return left<=Math.max(0,16-state.inventory.length)*def.stack}

const localOutfitEffects=[
 {type:'clothesAdd',id:'local_shirt',equip:true},{type:'clothesAdd',id:'local_vest',equip:true},{type:'clothesAdd',id:'local_pants',equip:true},{type:'clothesAdd',id:'boots',equip:true},
 {type:'statusRemove',id:'pigeonHumiliated'},{type:'flag',key:'localClothes',value:true}
];
const outside={background:img('bg.jpg'),atmosphere:'village',world:[{type:'world',key:'environment',value:'outdoors'}]};
const inside={background:img('bg_hut.jpg'),atmosphere:'hut',stageTone:'hut',world:[{type:'world',key:'environment',value:'indoors'}]};
export const CHAPTER1_START='intro';

export const CHAPTER1_SCENES={
 intro:{...outside,id:'intro',caption:'десь не там',hud:img('portrait_base.png'),actors:[hero()],text:`Останнє, що ви пам’ятаєте – рибалка. Риба не клювала, комари вас жерли так, ніби то їх остання вечеря. Потім для доброго настрою пішла пляшечка. За нею ше одна, потім ше одна… А далі вже провал.

До тями ви приходите вже зранку наступного дня. Після дощу сиро, навколо туман, від землі тягне вологою, а в роті страшний сушняк. Поруч сільська хатина, біля неї криниця, а у вікні світиться жовте світло.

І тут вам на плече падає щось тепле.`,choices:[{id:'intro_next',label:'Далі',next:'poop'}]},

 poop:{...outside,id:'poop',caption:'біля хати',hud:img('portrait_angry.png'),actors:[hero('man_angry.png'),pigeon()],onEnter:[{type:'statusAdd',id:'pigeonHumiliated'},{type:'flag',key:'metPigeon',value:true},{type:'flag',key:'modernJacketPooped',value:true},{type:'relationshipKnown',person:'evpapiy',value:true},{type:'memory',person:'evpapiy',key:'poopedOnHero',value:true}],text:`Ви дивитесь на куртку – там свіжа біло-зелена купа.

Сука.

Біля вас сидить голуб. Жирний, упітаний, наглий. Жирна падла на двох тонких лапках. Дивиться прямо на вас і навіть не думає зйобувати.`,choices:[
  {id:'poop_stone',label:'Кинути в нього каменюкою.',next:'stone',effects:[{type:'stat',key:'agility',value:1}],hiddenEffects:[{type:'relationship',person:'evpapiy',key:'trust',value:-2},{type:'relationship',person:'evpapiy',key:'offense',value:2},{type:'memory',person:'evpapiy',key:'threwStone',value:true}]},
  {id:'poop_money',label:'Нічого не робити. Баба казала, то до грошей.',next:'money',effects:[{type:'stat',key:'pofigism',value:1}],hiddenEffects:[{type:'relationship',person:'evpapiy',key:'trust',value:1},{type:'memory',person:'evpapiy',key:'sparedAfterPoop',value:true}]},
  {id:'poop_remember',label:'Сказати: «Я тебе запам’ятав».',next:'remember',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'trust',value:1},{type:'memory',person:'evpapiy',key:'mutualRemember',value:true}]},
  {id:'poop_curse',label:'Глянути скоса та проклясти на три покоління вперед.',next:'curse',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'offense',value:1},{type:'memory',person:'evpapiy',key:'cursedFamily',value:true}]}
 ]},
 stone:{...outside,id:'stone',caption:'десь мимо',hud:img('portrait_base.png'),actors:[hero()],sfxOnEnter:[{id:'wings',delay:650}],text:`Ви хватаєте камінь і вже збираєтесь нормально зарядити в ту наглу морду, але жосткий будуняра робить своє. Нога їде по мокрій землі, вас веде вбік, і камінь летить мимо.

Голуб різко зривається з місця й зйобує за хату.

– Косий.`,choices:[{id:'stone_walk',label:'Йти далі',next:'village',minutes:5,activity:'walk'}]},
 money:{...outside,id:'money',caption:'біля хати',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon()],sfxOnEnter:[{id:'wings',delay:1000}],text:`Ви дивитесь на плече, потім на голуба. Згадуєте слова баби й вирішуєте нічого не робити.

– Ладно. Хуй з тобою.

Голуб роздуває груди.

– Мудре рішення.

І злітає за хату.`,choices:[{id:'money_walk',label:'Йти далі',next:'village',minutes:5,activity:'walk'}]},
 remember:{...outside,id:'remember',caption:'біля хати',hud:img('portrait_angry.png'),actors:[hero('man_angry.png'),pigeon('pigeon_tilt.png')],sfxOnEnter:[{id:'wings',delay:1000}],text:`– Я тебе запам’ятав.

Голуб нахиляє голову набік і кілька секунд дуже пристально на вас дивиться.

– Я теж тебе запамʼятав.

І різко зривається з місця й летить геть.`,choices:[{id:'remember_walk',label:'Йти далі',next:'village',minutes:5,activity:'walk'}]},
 curse:{...outside,id:'curse',caption:'біля хати',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon()],sfxOnEnter:[{id:'wings',delay:1000}],text:`Ви дивитесь на нього скоса й подумки проклинаєте всю його голубину родню на три покоління вперед.

Голуб пару секунд дивиться на вас.

– І тобі всього доброго.

І зйобує за хату.`,choices:[{id:'curse_walk',label:'Йти далі',next:'village',minutes:5,activity:'walk'}]},

 village:{...outside,id:'village',caption:'ранок після дощу',hud:img('portrait_base.png'),actors:[hero(),pigeon()],text:`Ранок, після дощу ще туман. Навколо тихо, людей не видно – ше рано, тільки десь за дворами гавкають собаки.

Може, це сон. А може, горілку в діда Толіка все-таки не треба було брати.

Через пару хвилин ви знову бачите того засраного голуба.`,choices:[
  {id:'village_ignore',label:'Робити вигляд, шо ви сліпий.',next:'voice',effects:[{type:'stat',key:'pofigism',value:1}]},
  {id:'village_talk',label:'Шо ти хочеш, блядь?',next:'voice'},
  {id:'village_chase',label:'Прогнати сраного сталкера.',next:'voice',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'offense',value:1}]}
 ]},
 voice:{...outside,id:'voice',caption:'знову він',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_tilt.png')],text:`– Шановний, ти не туди йдеш.`,choices:[{id:'voice_next',label:'Далі',next:'shoulder'}]},
 shoulder:{...outside,id:'shoulder',caption:'остановочка єбаторіум',hud:img('portrait_ahui.png'),actors:[hero('man_ahui.png'),pigeon('pigeon_talk.png','shoulder')],sfxOnEnter:[{id:'wings',delay:120}],onEnter:[{type:'statusAdd',id:'yebatorium'},{type:'unlock',key:'yebatorium',value:true},{type:'relationshipKnown',person:'evpapiy',value:true},{type:'companionFact',person:'evpapiy',text:'Говорить. Це вже точно не будуняк.'}],text:`Ви зупиняєтесь і озираєтесь.

Голуб підлітає до вас, сідає на плече й каже:

– Я до тебе говорю, шановний.

Ви дивитесь на нього.

Нє. Не причулось.`,choices:[
  {id:'shoulder_no_lie',label:'Не пизди.',next:'meet'},
  {id:'shoulder_who',label:'Ти хто, блять?',next:'meet'},
  {id:'shoulder_leave',label:'Мовчки відійти. Може, попустить.',next:'nameless'}
 ]},
 nameless:{...outside,id:'nameless',caption:'сраний сталкер',hud:img('portrait_tired.png'),actors:[hero('man_tired.png'),pigeon('pigeon_talk.png')],onEnter:[{type:'companion',person:'evpapiy',known:true,active:true,name:'Голуб',state:'Іде за вами'}],text:`Ви мовчки йдете далі, роблячи вигляд, шо говорящого голуба не існує.

Він теж мовчить.

Секунд п’ять.

Потім починає пиздіти знову.`,choices:[{id:'nameless_next',label:'Далі',next:'yap'}]},
 meet:{...outside,id:'meet',caption:'Євпапій. Для вас – Екакій.',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_talk.png')],onEnter:[{type:'flag',key:'knowsPigeonName',value:true},{type:'companion',person:'evpapiy',known:true,active:true,name:'Євпапій',state:'Іде за вами'},{type:'memory',person:'evpapiy',key:'knowsName',value:true}],text:`– Євпапій.

– Шо?

– Євпапій.

– Екакій?

Голуб дивиться на вас.

– Єв-па-пій.

– Ага. Екакій.

– Шановний, ти тугий?

От їбанько. Голуб не тільки говорить, але ще й хамить.`,choices:[{id:'meet_next',label:'Далі',next:'yap'}]},
 yap:{...outside,id:'yap',caption:'електропізділка активна',hud:img('portrait_tired.png'),actors:[hero('man_tired.png'),pigeon('pigeon_talk.png')],text:s=>`Ви ще секунд п’ять дивитесь на ${birdAcc(s)} в надії, шо його електропізділка нарешті закриється. Але нє.

Він уже встиг розказати, шо походить від якихось там древніх голубів, учора кіт Галини чуть його не з’їв, ото був файтинг…

– І шо ти зробив?

– Дав пизди.

– Коту?

– Нє. Втік.

У вас починає боліти голова, а сушняк спокою не дає.

Ви бачите, що біля тої хати є криниця.

Треба шось робити.`,choices:[{id:'yap_next',label:'Далі',next:'hub'}]},

 hub:{...outside,id:'hub',caption:'сільська хатина',hud:img('portrait_base.png'),actors:[hero(),pigeon()],text:s=>`Перед вами сільська хатина, криниця й калюжа на дорозі.

${birdCap(s)} теж нікуди не дівся.`,choices:s=>{
  const out=[{id:'hub_well',label:'Піти до криниці.',next:'well',minutes:5,activity:'walk'}];
  if(!s.flags.doneWhere)out.push({id:'hub_where',label:'Запитати голуба, де ви.',next:'where'});
  if(!s.flags.donePuddle)out.push({id:'hub_puddle',label:'Напитись з калюжі.',next:'puddle'});
  if(!s.flags.doneWhy)out.push({id:'hub_why',label:'Спитати, чого він взагалі говорить.',next:'why'});
  out.push({id:'hub_rest',label:'Сісти й трохи перепочити.',next:'hub',minutes:30,activity:'rest'});return out
 }},
 where:{...outside,id:'where',caption:'географія для початківців',hud:img('portrait_angry.png'),actors:[hero('man_angry.png'),pigeon()],onEnter:[{type:'flag',key:'doneWhere',value:true}],text:`– Де я взагалі?

– В селі.

– Я бачу, шо в селі.

– То нахуя питаєш?

– Я тебе зараз вʼєбу.`,choices:[{id:'where_back',label:'Назад',next:'hub'}]},
 puddle:{...outside,id:'puddle',caption:'смак природи',hud:img('portrait_ahui.png'),actors:[hero('man_ahui.png'),pigeon('pigeon_suspicious.png')],onEnter:[{type:'flag',key:'donePuddle',value:true},{type:'flag',key:'drankPuddle',value:true},{type:'flag',key:'dogPeedThere',value:true},{type:'stat',key:'pofigism',value:1},{type:'need',key:'water',value:15},{type:'health',value:-10}],text:`Ви присідаєте біля калюжі.

Євпапій дивиться на вас так, ніби навіть у нього є якісь стандарти.

– Ти серйозно?

– А шо?

– Та нічо. Пий.

Вода мутна, холодна й на смак така, ніби в ній уже хтось жив.

Євпапій мовчить секунд п’ять.

– Тут собака зранку сцяла.

Сука.`,choices:[{id:'puddle_back',label:'Назад',next:'hub'}]},
 why:{...outside,id:'why',caption:'нормальне питання',hud:img('portrait_ahui.png'),actors:[hero('man_ahui.png'),pigeon('pigeon_talk.png')],onEnter:[{type:'flag',key:'doneWhy',value:true},{type:'stat',key:'ahui',value:1}],text:`– А чого ти взагалі говориш?

Голуб дивиться на вас.

– Ротом.

Ви мовчите.

– Шановний, ти сьогодні прям сипеш вопросами.

Піздець.`,choices:[{id:'why_back',label:'Назад',next:'hub'}]},

 well:{...outside,id:'well',caption:'біля криниці',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_serious.png')],notice:{title:'ЄВПАПІЙ ЩОСЬ ЗНАЄ',body:'Ця жирна падла явно знає більше, ніж каже.'},text:`– А в тій хаті нормальні люди?

– Місцеві.

– Дуже корисно.

– Я стараюсь.

Ви дивитесь на хату.

– А ти сам чого не йдеш?

– Мені й тут добре.`,choices:s=>{
  const out=[];if(itemCount(s,'salo')>0)out.push({id:'well_salo',label:'Дати Євпапію сало, хай нормально скаже.',next:'wellSalo',hiddenEffects:[{type:'itemRemove',id:'salo',qty:1},{type:'relationship',person:'evpapiy',key:'trust',value:1}]});
  if(itemCount(s,'knife')>0)out.push({id:'well_knife',label:'Трохи показати ніж.',next:'wellKnife',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'trust',value:-1},{type:'relationship',person:'evpapiy',key:'offense',value:2}]});
  out.push({id:'well_ignore',label:'Та ну його. Нахилитись до криниці.',next:'end'});return out
 }},
 wellSalo:{...outside,id:'wellSalo',caption:'сало вирішує',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),pigeon('pigeon_serious.png')],text:`Ви дістаєте сало.

Євпапій одразу підлітає ближче.

– Кажи.

– В хату можеш іти. Але очі відкриті тримай.

– А конкретніше?

– Сала було мало.`,choices:[{id:'salo_next',label:'До криниці',next:'end'}]},
 wellKnife:{...outside,id:'wellKnife',caption:'дипломатія',hud:img('portrait_angry.png'),actors:[hero('man_angry.png'),pigeon('pigeon_suspicious.png')],text:`Ви трохи показуєте ніж.

– А тепер говори.

Євпапій дивиться на ніж. Потім на вас.

– Ти мені серйозно ножем угрожаєш?

– Ага.

– От їбанько.

Він відлітає ще далі.

– Сам іди.`,choices:[{id:'knife_next',label:'До криниці',next:'end'}]},
 end:{...outside,id:'end',caption:'гостинність',hud:img('portrait_base.png'),actors:[hero(),pigeon()],text:`Ви тільки нахиляєтесь до криниці, як двері сільської хатини риплять.

На порозі зʼявляється невисока літня жінка в хустці. Дивиться на вас, потім на Євпапія.

– Оце з тобою?

Ви дивитесь на Євпапія.

– Нє, нє.

Жінка усміхається.

– Хочеш в хату? Заходь. Але оце не пущу.

Вона відступає від дверей.

– Ходи-но. Їсти дам. Вид у тебе недобрий.`,choices:[
  {id:'galina_enter',label:'Зайти. Їжа є їжа.',next:'galinaInside',hiddenEffects:[{type:'relationshipKnown',person:'galina',value:true},{type:'relationship',person:'galina',key:'trust',value:1}]},
  {id:'galina_pigeon',label:'Спитати, чого вона не пускає голуба.',next:'galinaPigeon',hiddenEffects:[{type:'relationshipKnown',person:'galina',value:true}]},
  {id:'galina_watch',label:'Не спішити. Спочатку придивитись.',next:'galinaWatch',effects:[{type:'stat',key:'attention',value:1}],hiddenEffects:[{type:'flag',key:'watchGalina',value:true},{type:'relationshipKnown',person:'galina',value:true}]}
 ]},
 galinaPigeon:{...outside,id:'galinaPigeon',caption:'на порозі',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),galina(),pigeon()],text:`– А чого його не пускаєте?

Баба Галя ще раз дивиться в бік Євпапія.

– Не люблю я голубів. Хай надворі сидить, нічого йому не станеться.

– Ага.

– Ходи вже, чоловіче. Їсти стигне.`,choices:[{id:'pigeon_enter',label:'Зайти',next:'galinaInside'}]},
 galinaWatch:{...outside,id:'galinaWatch',caption:'на порозі',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),galina()],text:`Ви не спішите й кілька секунд просто дивитесь на неї.

Баба Галя стоїть спокійно, усміхається й терпляче чекає.

– Нема шо думати. Синку, заходь. В хаті тепло, сало, вода є. Заходь, заходь.

В голосі ні злості, ні страху. Просто чекає.`,choices:[{id:'watch_enter',label:'Зайти',next:'galinaInside'}]},

 galinaInside:{...inside,id:'galinaInside',caption:'сільська хатина',hud:img('portrait_base.png'),actors:[hero(),galina()],onEnter:[{type:'world',key:'location',value:'у хаті баби Галі'},{type:'world',key:'environment',value:'indoors'},{type:'companion',person:'evpapiy',active:false,state:'Лишився надворі'}],text:`У хаті тепло. Піч потріскує, на столі вже стоять хліб, сало, цибуля й глечик води.

– Сідай-но, – каже баба Галя. – Їж. Бо вид у тебе недобрий.

Вона підсуває вам їжу так, ніби ви тут не хуй зна звідки взялися.`,choices:[
  {id:'inside_eat',label:'Поїсти й напитися.',next:'galinaClothes',minutes:15,activity:'light',effects:[{type:'need',key:'satiety',value:30},{type:'need',key:'water',value:35},{type:'statusRemove',id:'hangover'}],hiddenEffects:[{type:'relationship',person:'galina',key:'trust',value:1}]},
  {id:'inside_water',label:'Тільки води.',next:'galinaClothes',minutes:10,activity:'light',effects:[{type:'need',key:'water',value:35}]},
  {id:'inside_watch',label:'Не їсти. Подивитись за нею.',next:'galinaClothes',minutes:5,activity:'light',effects:[{type:'stat',key:'attention',value:1}],hiddenEffects:[{type:'flag',key:'watchGalina',value:true}]}
 ]},
 galinaClothes:{...inside,id:'galinaClothes',caption:'модний приговор',hud:img('portrait_base.png'),actors:[hero(),galina()],text:`Баба Галя ще раз оглядає вас з голови до ніг.

– А одежина в тебе чудна. Не гоже так селом ходити.

Вона дістає просту світлу сорочку, темну безрукавку, штани й старі чоботи.

– На. Чоловіча одежина. На тебе, може, й сяде.`,choices:[
  {id:'clothes_take',label:'Взяти й подякувати.',next:'galinaTakeClothes',hiddenEffects:[{type:'relationship',person:'galina',key:'trust',value:1}]},
  {id:'clothes_owner',label:'Спитати, чий це одяг.',next:'galinaClothesOwner'},
  {id:'clothes_joke',label:'Сказати, шо ви й так нормально виглядаєте.',next:'galinaClothesJoke'}
 ]},
 galinaTakeClothes:{...inside,id:'galinaTakeClothes',caption:'бабин гардероб',hud:img('portrait_base.png'),actors:[hero(),galina()],text:`– Дякую.

– Бери вже. Не мені ж його носити.

Баба Галя кладе одяг поруч.`,choices:[{id:'take_change',label:'Переодягнутись',next:'galinaChanged',minutes:5,activity:'light',hiddenEffects:localOutfitEffects}]},
 galinaClothesOwner:{...inside,id:'galinaClothesOwner',caption:'дуже конкретна відповідь',hud:img('portrait_suspicious.png'),actors:[hero('man_suspicious.png'),galina()],text:`– А чий це одяг?

– Був чоловічий.

– Я поняв. Чий?

Баба Галя поправляє край фартуха.

– Тепер твій буде.

І кладе одежину поруч.`,choices:[{id:'owner_change',label:'Переодягнутись',next:'galinaChanged',minutes:5,activity:'light',hiddenEffects:localOutfitEffects}]},
 galinaClothesJoke:{...inside,id:'galinaClothesJoke',caption:'не гоже брехати',hud:img('portrait_base.png'),actors:[hero(),galina()],text:`– Та я й так нормально виглядаю.

Баба Галя дивиться на вас.

Довго.

– Не гоже брехати в чужій хаті.

Одяг вона все одно кладе вам у руки.`,choices:[{id:'joke_change',label:'Переодягнутись',next:'galinaChanged',minutes:5,activity:'light',hiddenEffects:localOutfitEffects}]},
 galinaChanged:{...inside,id:'galinaChanged',caption:'місцевий дрескод',hud:img('portrait_base.png'),actors:[hero('man_local.png','hutHero'),galina()],text:`Одяг трохи чужий і сидить так собі, але тепер ви хоча б менше вибиваєтесь.

Борода, волосся й морда після будуняри нікуди не ділись.`,choices:[{id:'changed_next',label:'Далі',next:'galinaMurderScene'}]},
 galinaMurderScene:{...inside,id:'galinaMurderScene',caption:'ніч недобра була',hud:img('portrait_suspicious.png'),actors:s=>[hero('man_local.png','hutHero'),galina(s.flags?.watchGalina?'galina_grimace.png':'galina_base.png')],text:s=>s.flags.watchGalina?`За вікном усе ще тихо.

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

– Коли б відали, то не шепотілись би по кутках.`,onEnter:s=>s.flags.watchGalina?[{type:'stat',key:'attention',value:1}]:[],choices:[
  {id:'murder_victim',label:'Спитати, кого вбили.',next:'galinaVictim'},
  {id:'murder_stop',label:'Не лізти поки далі.',next:'galinaGarlic',hiddenEffects:[{type:'relationship',person:'galina',key:'trust',value:1}]},
  {id:'murder_calm',label:'Спитати, чого вона така спокійна.',next:'galinaCalm'}
 ]},
 galinaVictim:{...inside,id:'galinaVictim',caption:'Семен',hud:img('portrait_suspicious.png'),actors:[hero('man_local.png','hutHero'),galina()],text:`– Кого вбили?

Баба Галя зітхає.

– Семена, мельникового небожа. Молодий був. Язик мав довгий, та смерті за те не дають.

– А як убили?

– Сього не відаю.

Відповідає вона швидко.`,choices:[{id:'victim_next',label:'Далі',next:'galinaGarlic'}]},
 galinaCalm:{...inside,id:'galinaCalm',caption:'спокій баби Галі',hud:img('portrait_suspicious.png'),actors:[hero('man_local.png','hutHero'),galina()],text:`– А ви шось дуже спокійно про це говорите.

Баба Галя дивиться на вас без усмішки.

– А криком мертвого піднімеш?
`,choices:[{id:'calm_next',label:'Далі',next:'galinaGarlic'}]},

 galinaGarlic:{...inside,id:'galinaGarlic',caption:'на дорогу',hud:img('portrait_base.png'),actors:[hero('man_local.png','hutHero'),galina()],text:`Перед тим як ви підводитесь, баба Галя кладе на стіл головку часнику.

– І се візьми.

– На шо?

– Згодиться.

– А конкретніше?

– Як згодиться – сам поймеш.`,choices:s=>{
  const out=[];if(s.unlocks.yebatorium&&!s.flags.galinaPotion&&canFit(s,'potion_unknown'))out.push({id:'garlic_potion',label:'[ЄБАТОРІУМ] Попросити ще якусь дивну хуйню на дорогу.',next:'galinaPotion',kind:'secret'});
  if(canFit(s,'garlic'))out.push({id:'garlic_take',label:'Взяти часник.',next:'galinaHolyWater',hiddenEffects:[{type:'itemAdd',id:'garlic',qty:1},{type:'flag',key:'garlicGift',value:true},{type:'relationship',person:'galina',key:'trust',value:1}]});
  out.push({id:'garlic_refuse',label:'Не брати.',next:'galinaHolyWater',hiddenEffects:[{type:'flag',key:'refusedGarlic',value:true}]});return out
 }},
 galinaPotion:{...inside,id:'galinaPotion',caption:'ну попросили',hud:img('portrait_ahui.png'),actors:[hero('man_local.png','hutHero'),galina()],onEnter:[{type:'itemAdd',id:'potion_unknown',qty:1},{type:'flag',key:'galinaPotion',value:true}],text:`– А ше шось таке маєте?

Баба Галя дивиться на вас.

– Яке «таке»?

– Ну… шоб я сам не знав, нашо воно мені.

Вона мовчки дістає маленьку пляшечку з мутною рідиною.

– На.

– А шо це?

– Як треба буде – поймеш.`,notice:{title:'ОТРИМАНО: ??? ЗІЛЛЯ',body:'Ефект: невідомий.'},choices:[{id:'potion_back',label:'Назад',next:'galinaGarlic'}]},
 galinaHolyWater:{...inside,id:'galinaHolyWater',caption:'і це ще не все',hud:img('portrait_base.png'),actors:[hero('man_local.png','hutHero'),galina()],text:`Баба Галя вже ніби збирається відпустити вас, але потім шось згадує й дістає ще одну маленьку пляшечку.

– І святу воду візьми.

– А це вже на шо?

– Від усякої погані.

– Дуже конкретно.

– Як припре – згадаєш.`,choices:s=>{
  const out=[];if(canFit(s,'holy_water'))out.push({id:'holy_take',label:'Взяти святу воду.',next:'ch2_intro',hiddenEffects:[{type:'itemAdd',id:'holy_water',qty:1},{type:'flag',key:'holyWaterGift',value:true},{type:'relationship',person:'galina',key:'trust',value:1}]});out.push({id:'holy_refuse',label:'Не брати.',next:'ch2_intro',hiddenEffects:[{type:'flag',key:'refusedHolyWater',value:true}]});return out
 }},

};

export function getChapter1Scene(state){const id=state?.story?.sceneId||state?.scene||CHAPTER1_START;return CHAPTER1_SCENES[id]||CHAPTER1_SCENES[CHAPTER1_START]}
export function resolveSceneValue(value,state){return typeof value==='function'?value(state):value}
