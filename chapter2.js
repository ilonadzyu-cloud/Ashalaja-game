import {ITEM_DEFS} from './data.js?v=093';
import {effectiveStat} from './engine.js?v=093';

const img=n=>`./${n}`;
const hero=(name='ch2_hero_local.png',position='hero')=>({role:'hero',src:img(name),position});
const pigeon=(name='pigeon_base.png',position='pigeon')=>({role:'pigeon',src:img(name),position});
const hood=()=>({role:'npc',src:img('ch2_unknown_v2.png'),position:'npc'});
const yard={background:img('ch2_wake_yard.jpg'),atmosphere:'village',chapter:2,world:[{type:'world',key:'environment',value:'outdoors'},{type:'world',key:'location',value:'двір з поминками'}]};
const shed={background:img('ch2_shed.jpg'),atmosphere:'village',chapter:2,world:[{type:'world',key:'environment',value:'outdoors'},{type:'world',key:'location',value:'за сараєм'}]};
const table={background:img('ch2_table.jpg'),atmosphere:'village',chapter:2,world:[{type:'world',key:'environment',value:'outdoors'},{type:'world',key:'location',value:'за поминальним столом'}]};

function itemCount(state,id){return(state.inventory||[]).filter(x=>x.id===id).reduce((n,x)=>n+Number(x.qty||0),0)}
function canFit(state,id,qty=1){const def=ITEM_DEFS[id];if(!def)return false;let left=qty;for(const slot of state.inventory||[]){if(slot.id!==id||slot.qty>=def.stack)continue;left-=Math.min(left,def.stack-slot.qty);if(left<=0)return true}return left<=Math.max(0,16-(state.inventory||[]).length)*def.stack}
const knowsName=s=>Boolean(s.flags.knowsPigeonName);
const bird=s=>knowsName(s)?'Євпапій':'голуб';

export const CHAPTER2_START='ch2_intro';

export const CHAPTER2_SCENES={
  ch2_intro:{
    ...yard,id:'ch2_intro',caption:'поминки, які вам ні туди ні сюди',
    actors:[hero('ch2_hero_local.png')],
    onEnter:[
      {type:'statusRemove',id:'hangover'},
      {type:'flag',key:'shopUnlocked',value:true},
      {type:'flag',key:'mapUnlocked',value:true},
      {type:'flag',key:'chapter2Started',value:true},
      {type:'companion',person:'evpapiy',known:true,active:true,state:'Знову з вами'}
    ],
    text:`Ви виходите від баби Галі в модних місцевих лахах. Сорочка трохи завелика, чоботи давлять, зате куртки з голубиним гівном на вас уже нема, а це вже хоч якийсь прогрес.`,
    notice:{title:'ЖОСТКИЙ БУДУНЯРА – ЗНЯТО',body:'ВІДКРИТО: КРАМНИЧКА · ВІДКРИТО: ШМОТКИ · МІСЦЕВИЙ ПРИКИД – люди менше дивляться скоса.'},
    choices:[{id:'ch2_intro_next',label:'Далі',next:'ch2_fence'}]
  },

  ch2_fence:{
    ...yard,id:'ch2_fence',caption:'Євпапій дочекався',actors:[hero('ch2_hero_side.png'),pigeon('pigeon_suspicious.png')],
    text:`На паркані сидить Євпапій і, судячи з недовольної морди, чекав саме на вас.

– Ти знаєш, я тут подумав…

– О, ти ше тут? Я думав, ти по своїх голубіних справах смотався.

– Сам ти тут здохнеш.

– ХА-ХА. Переживаєш?

– Нє. Просто цікаво.`,
    choices:[{id:'ch2_fence_next',label:'Далі',next:'ch2_real'}]
  },

  ch2_real:{
    ...yard,id:'ch2_real',caption:'реально говорить',actors:[hero('ch2_hero_pigeon_head.png')],
    onEnter:[{type:'stat',key:'ahui',value:1},{type:'memory',person:'evpapiy',key:'heroFinallyBelieved',value:true}],
    text:`Євпапій злітає з паркану й сідає вам на голову. Походу, вирішив, що тут тепер його гніздо.

І тут ви ловите себе на думці, що будуняк уже наче попускає. До цього ще можна було списати все на ту палену горілку: прокинулись хуй зна де, заговорив голуб – ну мало лі. Але зараз голова вже більш-менш ясна.

Ви знімаєте Євпапія з голови й берете в руки. Теплий. Жирний. Справжній.

– Шо робиш, їбанько?

Ви ще секунду дивитесь на нього.

Реально говорить.`,
    notice:{title:'ДОСВІД +10',body:'Отримано за сюжетну дію.'},
    choices:[{id:'ch2_real_next',label:'Далі',next:'ch2_crowd'}]
  },

  ch2_crowd:{
    ...yard,id:'ch2_crowd',caption:'поминки',actors:[hero('ch2_hero_side.png'),pigeon('pigeon_base.png')],
    onEnter:[{type:'damage',amount:1,ignoreArmor:true},{type:'flag',key:'pigeonPeckedFinger',value:true}],
    text:`Євпапій клює вас у палець, виривається й відлітає трохи далі. Ви дивитесь йому вслід.

Піздець.

А ще ця жирна падла досі винна вам за куртку.

Ще зранку село виглядало так, ніби всі разом вирішили повмирати по хатах, а тепер майже всі зібрались в одному дворі. Чоловіки тягають лавки, жінки носять миски й глечики, хтось накриває довгий стіл. Після дощу під ногами болото, від хати тягне димом, від столу – їжею.

Народу у дворі дохуя, а тиша стояла така, поки десь за столом хтось не перднув. І навіть тоді ніхто не засміявся.`,
    choices:[{id:'ch2_crowd_next',label:'Далі',next:'ch2_legend'}]
  },

  ch2_legend:{
    ...yard,id:'ch2_legend',caption:'місцева лєгенда',actors:[hero('ch2_hero_side.png'),pigeon('pigeon_suspicious.png','shoulder')],
    text:`Євпапій тим часом уже знову сидить у вас на плечі й дивиться на стіл. Точніше, на сало. Видно, що атмосфера поминок його хвилює значно менше.

Одна з жінок біля столу нарешті помічає вас. Дивиться спочатку на вас, потім трохи вище – на Євпапія.

– О, місцева лєгенда. Цього разу до тебе прибився?

Євпапій перестає дивитись на сало.

– Тааак, – ви повертаєте голову до нього. – А то вже цікаво.

– Шо?

– Нічо. Зараз узнаєм, – потираєте руки.`,
    choices:[
      {id:'legend_ask',label:'Спитати жінку, шо значить «місцева лєгенда».',next:'ch2_benchask',hiddenEffects:[{type:'flag',key:'askedLocalLegend',value:true},{type:'memory',person:'evpapiy',key:'askedAboutLegend',value:true}]},
      {id:'legend_tease',label:'Підʼїбати Євпапія: «Ну шо, звєзда місцева?»',next:'ch2_benchask',hiddenEffects:[{type:'relationship',person:'evpapiy',key:'offense',value:1},{type:'memory',person:'evpapiy',key:'teasedAsLegend',value:true}]},
      {id:'legend_attention',label:'[УВАЖНІСТЬ] Подивитись на Євпапія. Він якось дуже різко перестав дивитись на сало.',showIf:s=>effectiveStat(s,'attention')>=3,next:'ch2_benchask',effects:[{type:'stat',key:'attention',value:1}],hiddenEffects:[{type:'flag',key:'noticedPigeonLegendReaction',value:true}]},
      {id:'legend_pofig',label:'Зробити вигляд, шо вам похуй.',next:'ch2_benchask',effects:[{type:'stat',key:'pofigism',value:1}],hiddenEffects:[{type:'memory',person:'evpapiy',key:'ignoredLegendComment',value:true}]}
    ]
  },

  ch2_benchask:{
    ...yard,id:'ch2_benchask',caption:'раз уже прийшов',actors:[hero('ch2_hero_tired.png'),pigeon('pigeon_base.png')],
    text:`Незалежно від того, що ви вибрали, нормально розпитати не виходить. Жінку гукають від столу, вона відмахується й киває на лавку.

– Нема коли. Раз уже прийшов – бери з того боку.

– Я?

– А хто, я?

– Та я взагалі-то…

Вам уже сунуть край лавки в руки.

– Ну заєбісь.

– Шо-шо?

– Кажу, зараз.`,
    choices:[{id:'bench_carry',label:'Тягнути лавку.',next:'ch2_bench',minutes:10,activity:'work',hiddenEffects:[{type:'flag',key:'helpedCarryBench',value:true}]}]
  },

  ch2_bench:{
    ...yard,id:'ch2_bench',caption:'добра людина',actors:[hero('ch2_hero_tired.png'),pigeon('pigeon_base.png')],
    onEnter:[{type:'stat',key:'strength',value:1}],
    text:`Через хвилину ви вже тягаєте лавку на поминки чоловіка, якого навіть не знали.

Євпапій іде поруч по паркану.

– Помагаєш людям. Молодець.

– Закрий єбало.

– Добра людина.

– Я тебе зараз цією лавкою…

– Та тихо ти. Май повагу. Ти на поминках.`,
    notice:{title:'ЛАВКУ ДОТАСКАЛИ',body:'ДОСВІД +10'},
    choices:[{id:'bench_done',label:'Сісти вже нарешті.',next:'ch2_table'}]
  },

  ch2_table:{
    ...table,id:'ch2_table',caption:'оце вже інша справа',actors:[hero('ch2_hero_local.png')],
    text:`Коли все більш-менш розставили, бабця, якій ви помогли з лавкою, махає рукою на вільне місце.

– Сідай уже.

Оце вже інша справа.

Ви сідаєте за стіл. Перед вами хліб, каша, мʼясо, цибуля, сало, глечики з водою і щось прозоре в пляшці, таке мутне, дай боже шоб то був самогон, але не як та пальонка від діда Толіка.

Бабця підсуває ближче миску й киває в бік сараю.

– Семена поки там оставили. До вечора полежить.

– В сараї?

– Ага. У нас так заведено.

Ви не поняли, нашо вам та інформація, але вирішили не забивати собі голову чужими зайобами. Бо сало саме себе не зʼїсть.`,
    choices:[{id:'table_eat',label:'Їсти.',next:'ch2_supplies',minutes:20,activity:'light',effects:[{type:'need',key:'satiety',value:35},{type:'need',key:'water',value:35}]}]
  },

  ch2_supplies:{
    ...table,id:'ch2_supplies',caption:'стратегічний запас',actors:[hero('ch2_hero_side.png')],
    onEnter:s=>{
      const e=[];
      if(canFit(s,'water'))e.push({type:'itemAdd',id:'water',qty:1});
      if(canFit(s,'salo'))e.push({type:'itemAdd',id:'salo',qty:1});
      return e;
    },
    text:`Ви сидите за столом і поки їсте та пʼєте, у ваші кармани абсолютно випадково падає бутилка води та шматок сала.

Не крадіжка. Чиста випадковість.

Коли вже нормально так наїлись і напились, ви розумієте, що добре було би відлити.`,
    notice:{title:'СТРАТЕГІЧНИЙ ЗАПАС',body:'💧 Вода ×1 · 🥓 Сало ×1'},
    choices:[{id:'supplies_pee',label:'Піти відлити.',next:'ch2_pee',minutes:5,activity:'walk'}]
  },

  ch2_pee:{
    ...shed,id:'ch2_pee',caption:'за сараєм',actors:[hero('ch2_hero_side.png')],
    onEnter:[{type:'flag',key:'heardShedConversation',value:true}],
    text:`У дворі людей дохуя, тому ви обходите сарай і стаєте ззаду, де вас хоча б ніхто не бачить.

Ви тільки починаєте робити свої справи, як з іншого боку сараю чуєте два голоси. Жіночий і чоловічий. Говорять тихо, але по голосу жінки чути, що вона нормально так нажахана.

– Я дуже боюсь, щоб не було як минулого разу.

– Та тихо ти.

– Ти точно добре закрив?

– Да все добре. Закрив. Ключ сховав.

Вони ще щось тихо говорять між собою, а потім ідуть назад до людей. Ви ще кілька секунд стоїте й думаєте, шо за хуйня тут у них була минулого разу.

Ну і похуй. Не ваша хуйня.`,
    choices:[{id:'pee_next',label:'Спокійно досцяти.',next:'ch2_bang'}]
  },

  ch2_bang:{
    ...shed,id:'ch2_bang',caption:'бах',actors:[hero('ch2_hero_side.png')],sfxOnEnter:[{id:'bang',delay:350},{id:'bang',delay:1350}],
    onEnter:[{type:'flag',key:'heardShedBang',value:true}],
    text:`Ви собі далі спокійно відливаєте, коли десь зовсім поруч:

БАХ.

Ви завмираєте, але через секунду продовжуєте. Мало лі шо там впало.

Ще раз.

БАХ.

Цього разу сильніше.

– Блядь…`,
    choices:[{id:'bang_wait',label:'…',next:'ch2_bang3'}]
  },

  ch2_bang3:{
    ...shed,id:'ch2_bang3',caption:'бах',actors:[hero('ch2_hero_scared.png')],sfxOnEnter:[{id:'bang',delay:350}],
    text:`І ще один удар, уже нормально так.

БАХ.`,
    choices:[{id:'bang3_next',label:'Блядь…',next:'ch2_after_bang'}]
  },

  ch2_after_bang:{
    ...shed,id:'ch2_after_bang',caption:'це вже не причулось',actors:[hero('ch2_hero_scared.png'),pigeon('pigeon_suspicious.png')],
    onEnter:[{type:'statusAdd',id:'scared'}],
    text:`Євпапій, який до цього десь шарився неподалік, теж завмирає й дивиться в бік сараю.

О.

Значить, не причулось.

– Екакій.

– Євпапій.

– Метнись кабанчиком до вікна, глянь, шо там робиться.

– Сам глянь.

– Як я туди вилізу? Воно ж майже під дахом.

– Ну то придумай.

– Я літати не вмію, блядь. А крила тут тільки в тебе.

Євпапій дивиться на сарай, потім знову на вас.

– Не хочу.

– Думаєш, я хочу? Мені вже самому стрьомно, шо там за хуйня.

– То не лізь.

– Та вже пізно. Я тепер не засну, поки не пойму, шо там стукає.`,
    choices:s=>{
      const out=[];
      if(itemCount(s,'salo')>0)out.push({id:'bang_salo',label:'Дати Євпапію сало.',next:'ch2_salo'});
      if(itemCount(s,'garlic')>0)out.push({id:'bang_garlic',label:'Спробувати дати Євпапію часник.',next:'ch2_garlic'});
      if(itemCount(s,'potion_unknown')>0&&s.unlocks?.yebatorium&&!s.flags?.usedDrop)out.push({id:'bang_side',label:'[ЄБАТОРІУМ] Зробити одну дуже сумнівну хуюшку.',next:'ch2_side',kind:'secret'});
      out.push({id:'bang_leave',label:'Та ну його нахуй. Вернутись до людей.',next:'ch2_leave'});
      return out;
    }
  },

  ch2_side:{
    ...shed,id:'ch2_side',caption:'науковий метод',actors:[hero('ch2_hero_side.png'),pigeon('pigeon_suspicious.png')],
    onEnter:[{type:'flag',key:'usedDrop',value:true},{type:'flag',key:'shedHandprint',value:true},{type:'stat',key:'attention',value:1}],
    text:`Ви раптом згадуєте про мутну пляшечку баби Галі.

– Шо ти робиш? – Євпапій дивиться вже не на сарай, а на вас.

– Науковий метод.

Ви капаєте одну краплю на стару дошку.

Вона тихо шипить.

Зсередини сараю на секунду стає абсолютно тихо.

– Ти щас серйозно хуй зна чим полив чужий сарай?

– Тихо.

На мокрому дереві повільно проступає темний відбиток долоні. Наче хтось притиснув руку до дошки з іншого боку.

БАХ.

Ви обоє відскакуєте.

– Метод хуєвий, – каже Євпапій.

– Зато науковий.`,
    notice:{title:'ВИ ШОСЬ ПОБАЧИЛИ',body:'ДОСВІД +10'},
    choices:s=>{
      const out=[];
      if(itemCount(s,'salo')>0)out.push({id:'side_salo',label:'Ладно. Тепер дати Євпапію сало.',next:'ch2_salo'});
      if(itemCount(s,'garlic')>0)out.push({id:'side_garlic',label:'А може часник?',next:'ch2_garlic'});
      out.push({id:'side_leave',label:'Все, досить науки. Вернутись до людей.',next:'ch2_leave'});
      return out;
    }
  },

  ch2_garlic:{
    ...shed,id:'ch2_garlic',caption:'часник не прокатив',actors:[hero('ch2_hero_tired.png'),pigeon('pigeon_suspicious.png')],
    onEnter:[{type:'relationship',person:'evpapiy',key:'offense',value:1},{type:'memory',person:'evpapiy',key:'offeredGarlicAtShed',value:true}],
    text:`Ви дістаєте часник і показуєте Євпапію.

Він дивиться на часник. Потім на вас.

– Ти серйозно?

– А шо?

– Іди нахуй зі своїм часником.`,
    notice:{title:'ЧАСНИК НЕ ПРОКАТИВ',body:''},
    choices:s=>{
      const out=[];
      if(itemCount(s,'salo')>0)out.push({id:'garlic_salo',label:'Ладно. Дати сало.',next:'ch2_salo'});
      out.push({id:'garlic_leave',label:'Та ну його нахуй. Вернутись до людей.',next:'ch2_leave'});
      return out;
    }
  },

  ch2_salo:{
    ...shed,id:'ch2_salo',caption:'голуб-рекетир',actors:[hero('ch2_hero_side.png'),pigeon('pigeon_base.png')],
    onEnter:[{type:'itemRemove',id:'salo',qty:1},{type:'relationship',person:'evpapiy',key:'trust',value:1},{type:'memory',person:'evpapiy',key:'bribedForShed',value:true}],
    text:`Ви дістаєте шматок сала.

Євпапій одразу дивиться на руку.

– Глянеш у вікно – твоє.

– Ціле?

– Як повернешся.

– Половину зараз.

– Ти голуб чи рекетир?

– Половину.

Ви відриваєте йому шматок.

Євпапій ковтає, ще раз дивиться на сарай і все-таки злітає. Підлітає до маленького вікна майже під дахом, сідає на край і заглядає всередину.

Кілька секунд нічого не відбувається.

Потім усередині щось різко грюкає.`,
    choices:[{id:'salo_next',label:'Далі',next:'ch2_pigeon_scared'}]
  },

  ch2_pigeon_scared:{
    ...shed,id:'ch2_pigeon_scared',caption:'пішли',actors:[hero('ch2_hero_scared.png'),pigeon('pigeon_talk.png')],
    text:`Євпапій аж відскакує від вікна й летить назад так швидко, ніби за ним уже хтось женеться.

– Пішли!

– Шо там?!

– ПІШЛИ!

По ньому видно, що цього разу він не прикалується.

Ви навіть не питаєте вдруге. На ходу застібаєте штани й біжите за ним назад до людей.`,
    choices:[{id:'pigeon_run',label:'Бігти.',next:'ch2_figure',minutes:2,activity:'walk',hiddenEffects:[{type:'flag',key:'pigeonSawInsideShed',value:true}]}]
  },

  ch2_leave:{
    ...shed,id:'ch2_leave',caption:'чужі проблеми',actors:[hero('ch2_hero_tired.png')],
    onEnter:[{type:'flag',key:'ignoredShed',value:true}],
    text:`Та ну його нахуй. Ви досцяєте, застібаєтесь і йдете назад до людей. Чужий труп, чужий сарай, чужі проблеми.`,
    choices:[{id:'leave_people',label:'Вернутись до людей.',next:'ch2_figure',minutes:3,activity:'walk'}]
  },

  ch2_figure:{
    ...shed,id:'ch2_figure',caption:'стій',actors:[hero('ch2_hero_scared.png'),hood()],
    text:s=>`${s.flags?.ignoredShed?'Ви йдете назад до людей.':'Ви біжите назад до людей.'} Минаєте сарай, навіть не дивлячись по сторонах.

І раптом хтось позаду різко хапає вас за сорочку.

– Стій.

Ви аж сіпаєтесь і різко обертаєтесь.

Позаду стоїть постать у довгому темному плащі з капюшоном. Голова опущена, капюшон закриває обличчя так, що взагалі нічого не роздивитись.${s.flags?.shedHandprint?`\n\nНа рукаві біля пальців ви помічаєте мутну темну пляму. Дуже схожу на ту, що лишилась на дошці сараю.\n\nОт тепер вам це подобається ще менше.`:''}`,
    choices:[{id:'figure_next',label:'…',next:'ch2_end'}]
  },

  ch2_end:{
    ...shed,id:'ch2_end',caption:'кінець глави 2',actors:[hero('ch2_hero_scared.png'),hood()],
    onEnter:[{type:'flag',key:'chapter2Complete',value:true},{type:'statusAdd',id:'scared'}],
    text:`Глава 2 завершена.`,
    notice:{title:'ГЛАВА 3 ВІДКРИТА',body:'Усе, що ви встигли наробити, збережено.'},
    choices:[{id:'ch2_to_ch3',label:'ГЛАВА 3. КРАЩЕ СЦЯТИ В ТУАЛЕТІ',next:'ch3_intro'}]
  }
};

export function getChapter2Scene(state){const id=state?.story?.sceneId||state?.scene||CHAPTER2_START;return CHAPTER2_SCENES[id]||null}
