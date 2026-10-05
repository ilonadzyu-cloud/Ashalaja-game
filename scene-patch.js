// v0.9.4 – shorter story pages + new hero/creature reaction art.
import {CHAPTER2_SCENES} from './chapter2.js?v=096b';
import {CHAPTER3_SCENES} from './chapter3.js?v=096b';

const H={
  shrug:'./hero_shrug_096.png',
  annoyed:'./hero_angry_096.png',
  laugh:'./hero_laugh_096.png',
  shocked:'./hero_shocked_096.png',
  worried:'./hero_worry_096.png'
};
const C={
  base:'./creature_normal_095f.webp',
  attack:'./creature_attack_095f.webp',
  angry:'./creature_attack_095f.webp',
  garlic:'./creature_garlic_story_095f.webp',
  vodka:'./creature_vodka_095f.webp',
  burn:'./creature_garlic_battle_095f.webp',
  onion:'./creature_smelly_095f.webp',
  critical:'./creature_battle_095c.webp'
};
const hero=(src=H.shrug,position='hero')=>({role:'hero',src,position});
const pigeon=(src='./pigeon_base.png',position='pigeon')=>({role:'pigeon',src,position});
const hood=()=>({role:'npc face-left',src:'./ch2_unknown_v2.png',position:'npc'});
const creature=(src=C.base,position='npc')=>({role:'npc',src,position});
const galina=()=>({role:'npc',src:'./galina_base.png',position:'npc'});

function splitScene(book,id,parts){
  const original=book[id];
  if(!original||!parts?.length)return;
  const base={background:original.background,atmosphere:original.atmosphere,chapter:original.chapter,world:original.world};
  const originalChoices=original.choices;
  const originalNotice=original.notice;
  const originalEnd=original.end;
  parts.forEach((part,i)=>{
    const first=i===0,last=i===parts.length-1;
    const sid=first?id:`${id}_p${i+1}`;
    const next=last?null:`${id}_p${i+2}`;
    const s=first?{...original}:{...base,id:sid,caption:part.caption||original.caption};
    s.id=sid;
    s.caption=part.caption||original.caption;
    s.text=part.text;
    if(part.actors)s.actors=part.actors;
    if(!first){delete s.onEnter;delete s.sfxOnEnter;}
    if(!last){
      s.choices=[{id:`${sid}_next`,label:part.label||'Далі',next}];
      delete s.notice;delete s.end;
    }else{
      s.choices=originalChoices;
      if(originalNotice)s.notice=originalNotice;else delete s.notice;
      if(originalEnd)s.end=originalEnd;else delete s.end;
    }
    book[sid]=s;
  });
}

function patchChapter2(){
  const S=CHAPTER2_SCENES;
  const actorMap={
    ch2_intro:H.shrug,ch2_fence:H.annoyed,ch2_real:H.shocked,ch2_crowd:H.annoyed,
    ch2_legend:H.shrug,ch2_benchask:H.annoyed,ch2_bench:H.worried,ch2_table:H.shrug,
    ch2_supplies:H.laugh,ch2_pee:H.shrug,ch2_bang:H.worried,ch2_bang3:H.shocked,
    ch2_after_bang:H.shocked,ch2_side:H.shrug,ch2_garlic:H.annoyed,ch2_salo:H.annoyed,
    ch2_pigeon_scared:H.shocked,ch2_leave:H.worried,ch2_figure:H.shocked,ch2_end:H.worried
  };
  for(const [id,src] of Object.entries(actorMap)){
    const s=S[id];if(!s)continue;
    const others=(s.actors||[]).filter(a=>a.role!=='hero');
    s.actors=[hero(src),...others];
  }

  splitScene(S,'ch2_fence',[
    {actors:[hero(H.annoyed),pigeon('./pigeon_suspicious.png')],text:`На паркані сидить Євпапій і, судячи з недовольної морди, чекав саме на вас.\n\n– Ти знаєш, я тут подумав…\n\n– О, ти ше тут? Я думав, ти по своїх голубіних справах смотався.`},
    {actors:[hero(H.shrug),pigeon('./pigeon_suspicious.png')],text:`– Сам ти тут здохнеш.\n\n– ХА-ХА. Переживаєш?\n\n– Нє. Просто цікаво.`}
  ]);

  splitScene(S,'ch2_real',[
    {actors:[hero(H.shrug),pigeon('./pigeon_base.png','shoulder')],text:`Євпапій злітає з паркану й сідає вам на голову. Походу, вирішив, що тут тепер його гніздо.\n\nІ тут ви ловите себе на думці, що будуняк уже наче попускає.`},
    {actors:[hero(H.shocked),pigeon('./pigeon_base.png')],text:`До цього ще можна було списати все на ту палену горілку: прокинулись хуй зна де, заговорив голуб – ну мало лі. Але зараз голова вже більш-менш ясна.\n\nВи знімаєте Євпапія з голови й берете в руки. Теплий. Жирний. Справжній.\n\n– Шо робиш, їбанько?`},
    {actors:[hero(H.shocked),pigeon('./pigeon_suspicious.png')],text:`Ви ще секунду дивитесь на нього.\n\nРеально говорить.`}
  ]);

  splitScene(S,'ch2_crowd',[
    {actors:[hero(H.annoyed),pigeon('./pigeon_base.png')],text:`Євпапій клює вас у палець, виривається й відлітає трохи далі. Ви дивитесь йому вслід.\n\nПіздець.\n\nА ще ця жирна падла досі винна вам за куртку.`},
    {actors:[hero(H.shrug),pigeon('./pigeon_base.png')],text:`Ще зранку село виглядало так, ніби всі разом вирішили повмирати по хатах, а тепер майже всі зібрались в одному дворі. Чоловіки тягають лавки, жінки носять миски й глечики, хтось накриває довгий стіл.`},
    {actors:[hero(H.worried)],text:`Після дощу під ногами болото, від хати тягне димом, від столу – їжею.\n\nНароду у дворі дохуя, а тиша стояла така, поки десь за столом хтось не перднув. І навіть тоді ніхто не засміявся.`}
  ]);

  splitScene(S,'ch2_legend',[
    {actors:[hero(H.shrug),pigeon('./pigeon_suspicious.png','shoulder')],text:`Євпапій тим часом уже знову сидить у вас на плечі й дивиться на стіл. Точніше, на сало. Видно, що атмосфера поминок його хвилює значно менше.\n\nОдна з жінок біля столу нарешті помічає вас. Дивиться спочатку на вас, потім трохи вище – на Євпапія.`},
    {actors:[hero(H.shocked),pigeon('./pigeon_suspicious.png','shoulder')],text:`– О, місцева лєгенда. Цього разу до тебе прибився?\n\nЄвпапій перестає дивитись на сало.\n\n– Тааак, – ви повертаєте голову до нього. – А то вже цікаво.`},
    {actors:[hero(H.laugh),pigeon('./pigeon_suspicious.png','shoulder')],text:`– Шо?\n\n– Нічо. Зараз узнаєм, – потираєте руки.`}
  ]);

  splitScene(S,'ch2_benchask',[
    {actors:[hero(H.annoyed),pigeon()],text:`Незалежно від того, що ви вибрали, нормально розпитати не виходить. Жінку гукають від столу, вона відмахується й киває на лавку.\n\n– Нема коли. Раз уже прийшов – бери з того боку.\n\n– Я?`},
    {actors:[hero(H.annoyed),pigeon()],text:`– А хто, я?\n\n– Та я взагалі-то…\n\nВам уже сунуть край лавки в руки.\n\n– Ну заєбісь.\n\n– Шо-шо?\n\n– Кажу, зараз.`}
  ]);

  splitScene(S,'ch2_bench',[
    {actors:[hero(H.worried),pigeon()],text:`Через хвилину ви вже тягаєте лавку на поминки чоловіка, якого навіть не знали.\n\nЄвпапій іде поруч по паркану.\n\n– Помагаєш людям. Молодець.`},
    {actors:[hero(H.annoyed),pigeon()],text:`– Закрий єбало.\n\n– Добра людина.\n\n– Я тебе зараз цією лавкою…\n\n– Та тихо ти. Май повагу. Ти на поминках.`}
  ]);

  splitScene(S,'ch2_table',[
    {actors:[hero(H.shrug)],text:`Коли все більш-менш розставили, бабця, якій ви помогли з лавкою, махає рукою на вільне місце.\n\n– Сідай уже.\n\nОце вже інша справа.`},
    {actors:[hero(H.laugh)],text:`Ви сідаєте за стіл. Перед вами хліб, каша, мʼясо, цибуля, сало, глечики з водою і щось прозоре в пляшці, таке мутне, дай боже шоб то був самогон, але не як та пальонка від діда Толіка.`},
    {actors:[hero(H.shrug)],text:`Бабця підсуває ближче миску й киває в бік сараю.\n\n– Семена поки там оставили. До вечора полежить.\n\n– В сараї?\n\n– Ага. У нас так заведено.\n\nВи не поняли, нашо вам та інформація, але вирішили не забивати собі голову чужими зайобами. Бо сало саме себе не зʼїсть.`}
  ]);

  splitScene(S,'ch2_pee',[
    {actors:[hero(H.shrug)],text:`У дворі людей дохуя, тому ви обходите сарай і стаєте ззаду, де вас хоча б ніхто не бачить.\n\nВи тільки починаєте робити свої справи, як з іншого боку сараю чуєте два голоси. Жіночий і чоловічий.`},
    {actors:[hero(H.worried)],text:`Говорять тихо, але по голосу жінки чути, що вона нормально так нажахана.\n\n– Я дуже боюсь, щоб не було як минулого разу.\n\n– Та тихо ти.\n\n– Ти точно добре закрив?\n\n– Да все добре. Закрив. Ключ сховав.`},
    {actors:[hero(H.shrug)],text:`Вони ще щось тихо говорять між собою, а потім ідуть назад до людей. Ви ще кілька секунд стоїте й думаєте, шо за хуйня тут у них була минулого разу.\n\nНу і похуй. Не ваша хуйня.`}
  ]);

  splitScene(S,'ch2_bang',[
    {actors:[hero(H.worried)],text:`Ви собі далі спокійно відливаєте, коли десь зовсім поруч:\n\nБАХ.\n\nВи завмираєте, але через секунду продовжуєте. Мало лі шо там впало.`},
    {actors:[hero(H.shocked)],text:`Ще раз.\n\nБАХ.\n\nЦього разу сильніше.\n\n– Блядь…`}
  ]);
  if(S.ch2_bang)S.ch2_bang.sfxOnEnter=[{id:'bang',delay:350}];
  if(S.ch2_bang_p2)S.ch2_bang_p2.sfxOnEnter=[{id:'bang',delay:350}];

  splitScene(S,'ch2_after_bang',[
    {actors:[hero(H.shocked),pigeon('./pigeon_suspicious.png')],text:`Євпапій, який до цього десь шарився неподалік, теж завмирає й дивиться в бік сараю.\n\nО.\n\nЗначить, не причулось.`},
    {actors:[hero(H.shrug),pigeon('./pigeon_suspicious.png')],text:`– Екакій.\n\n– Євпапій.\n\n– Метнись кабанчиком до вікна, глянь, шо там робиться.\n\n– Сам глянь.`},
    {actors:[hero(H.annoyed),pigeon('./pigeon_suspicious.png')],text:`– Як я туди вилізу? Воно ж майже під дахом.\n\n– Ну то придумай.\n\n– Я літати не вмію, блядь. А крила тут тільки в тебе.`},
    {actors:[hero(H.worried),pigeon('./pigeon_suspicious.png')],text:`Євпапій дивиться на сарай, потім знову на вас.\n\n– Не хочу.\n\n– Думаєш, я хочу? Мені вже самому стрьомно, шо там за хуйня.\n\n– То не лізь.\n\n– Та вже пізно. Я тепер не засну, поки не пойму, шо там стукає.`}
  ]);

  splitScene(S,'ch2_side',[
    {actors:[hero(H.shrug),pigeon('./pigeon_suspicious.png')],text:`Ви раптом згадуєте про мутну пляшечку баби Галі.\n\n– Шо ти робиш? – Євпапій дивиться вже не на сарай, а на вас.\n\n– Науковий метод.`},
    {actors:[hero(H.laugh),pigeon('./pigeon_suspicious.png')],text:`Ви капаєте одну краплю на стару дошку.\n\nВона тихо шипить.\n\nЗсередини сараю на секунду стає абсолютно тихо.\n\n– Ти щас серйозно хуй зна чим полив чужий сарай?\n\n– Тихо.`},
    {actors:[hero(H.shocked),pigeon('./pigeon_suspicious.png')],text:`На мокрому дереві повільно проступає темний відбиток долоні. Наче хтось притиснув руку до дошки з іншого боку.\n\nБАХ.\n\nВи обоє відскакуєте.\n\n– Метод хуєвий, – каже Євпапій.\n\n– Зато науковий.`}
  ]);

  splitScene(S,'ch2_salo',[
    {actors:[hero(H.shrug),pigeon()],text:`Ви дістаєте шматок сала.\n\nЄвпапій одразу дивиться на руку.\n\n– Глянеш у вікно – твоє.\n\n– Ціле?\n\n– Як повернешся.`},
    {actors:[hero(H.annoyed),pigeon()],text:`– Половину зараз.\n\n– Ти голуб чи рекетир?\n\n– Половину.\n\nВи відриваєте йому шматок.`},
    {actors:[hero(H.worried),pigeon('./pigeon_suspicious.png')],text:`Євпапій ковтає, ще раз дивиться на сарай і все-таки злітає. Підлітає до маленького вікна майже під дахом, сідає на край і заглядає всередину.\n\nКілька секунд нічого не відбувається.\n\nПотім усередині щось різко грюкає.`}
  ]);

  splitScene(S,'ch2_pigeon_scared',[
    {actors:[hero(H.shocked),pigeon('./pigeon_talk.png')],text:`Євпапій аж відскакує від вікна й летить назад так швидко, ніби за ним уже хтось женеться.\n\n– Пішли!\n\n– Шо там?!\n\n– ПІШЛИ!`},
    {actors:[hero(H.worried),pigeon('./pigeon_talk.png')],text:`По ньому видно, що цього разу він не прикалується.\n\nВи навіть не питаєте вдруге. На ходу застібаєте штани й біжите за ним назад до людей.`}
  ]);

  splitScene(S,'ch2_figure',[
    {actors:[hero(H.shocked),hood()],text:s=>`${s.flags?.ignoredShed?'Ви йдете назад до людей.':'Ви біжите назад до людей.'} Минаєте сарай, навіть не дивлячись по сторонах.\n\nІ раптом хтось позаду різко хапає вас за сорочку.\n\n– Стій.\n\nВи аж сіпаєтесь і різко обертаєтесь.`},
    {actors:[hero(H.worried),hood()],text:s=>`Позаду стоїть постать у довгому темному плащі з капюшоном. Голова опущена, капюшон закриває обличчя так, що взагалі нічого не роздивитись.${s.flags?.shedHandprint?`\n\nНа рукаві біля пальців ви помічаєте мутну темну пляму. Дуже схожу на ту, що лишилась на дошці сараю.\n\nОт тепер вам це подобається ще менше.`:''}`}
  ]);
}

function patchChapter3(){
  const S=CHAPTER3_SCENES;
  if(S.ch3_creature)S.ch3_creature.actors=[hero(H.shocked),creature(C.base)];
  if(S.ch3_vodka)S.ch3_vodka.actors=[hero(H.shrug),creature(C.vodka)];
  if(S.ch3_garlic)S.ch3_garlic.actors=[hero(H.shrug),creature(C.garlic)];
  if(S.ch3_garlic_hit)S.ch3_garlic_hit.actors=[hero(H.shocked),creature(C.attack)];
  if(S.ch3_run)S.ch3_run.actors=[hero(H.worried),creature(C.attack)];

  splitScene(S,'ch3_intro',[
    {actors:[hero(H.worried),hood()],text:`Постать тримає вас за сорочку й каже дуже тихо:\n\n– Замри і мовчи. Навіть не дихай.`},
    {actors:[hero(H.shocked),hood()],text:`З сараю за спиною чути, як щось важке шкребеться по дверях.`}
  ]);

  splitScene(S,'ch3_obey',[
    {actors:[hero(H.worried),hood()],text:`Ви завмираєте. Навіть дихати стараєтесь через раз.\n\nШкрябання стає гучнішим. Потім щось важко вдаряється об двері зсередини.`},
    {actors:[hero(H.annoyed),hood()],text:`Постать ще сильніше стискає вашу сорочку.\n\n– От і добре.\n\n– А можна хотя би дихати?\n\n– Нє.\n\n– Заєбісь.`},
    {actors:[hero(H.shocked),hood()],text:`Двері сараю повільно починають відчинятись.`}
  ]);

  splitScene(S,'ch3_turn',[
    {actors:[hero(H.shrug),hood()],text:`Ви, канєшно, робите рівно те, що вам сказали не робити, і різко обертаєтесь.\n\nПостать смикає вас назад за сорочку.\n\n– Я ж сказало не рухатись.\n\n– Я тільки гляну.\n\n– Уже глянув.`},
    {actors:[hero(H.shocked),hood()],text:`Біля дверей сараю щось ворушиться. Видно брудну руку, шматок плеча і голову, яка смикається якось зовсім не по-людськи.\n\nВоно теж вас помічає.\n\n– Блядь.`}
  ]);

  splitScene(S,'ch3_call_pigeon',[
    {actors:[hero(H.worried),pigeon('./pigeon_suspicious.png','shoulder')],text:`– Євпапій…\n\n– Шо?\n\n– Тихо, блядь.\n\nЄвпапій підлітає ближче, визирає з-за вашого плеча й дивиться на сарай.`},
    {actors:[hero(H.annoyed),pigeon('./pigeon_suspicious.png','shoulder')],text:`Кілька секунд мовчить.\n\n– Не рухайся.\n\n– Та ви шо, сьогодні всі договорились?\n\nЄвпапій не відповідає.\n\nІ от це вже трохи напрягає.`}
  ]);

  splitScene(S,'ch3_tell_off',[
    {actors:[hero(H.annoyed),hood()],text:`– Та пусти мене нахуй.\n\nПостать тягне вас назад ще сильніше.\n\n– Мовчи.\n\n– Не командуй мені.`},
    {actors:[hero(H.shocked),hood()],text:`Постать просто закриває вам рот рукою.\n\n– Ще слово – і підеш туди першим.\n\nВи дивитесь на сарай. Потім на руку на своєму роті. І вирішуєте, що ще буквально секунд десять можете потерпіти.`}
  ]);

  splitScene(S,'ch3_vodka',[
    {actors:[hero(H.shrug),creature(C.base)],text:`Ви дістаєте горілку.\n\n– Будеш?\n\nПостать повільно повертає голову до вас.\n\n– Ти довбойоб?`},
    {actors:[hero(H.laugh),creature(C.vodka)],text:`Створіння завмирає. Дивиться на пляшку. Облизує губи й різко вихоплює її з рук.\n\nПʼє жадібно, обливається, аж пританцьовує від щастя.\n\nПлечі розправляються. Очі стають живіші. Воно навіть ніби трохи посвіжішало.`},
    {actors:[hero(H.shocked),creature(C.vodka)],text:`Допиває й кидає пляшку вам під ноги.\n\nКілька секунд дуже уважно дивиться на вас. І шиплячим голосом каже:\n\n– Я прийду ше.\n\nПісля чого різко зйобує в ліс.`},
    {actors:[hero(H.worried),pigeon('./pigeon_suspicious.png')],text:`Ви ще пару секунд дивитесь йому вслід. Євпапій теж.\n\n– От нахуй ти йому показав, де наливають?\n\nПостать нарешті відпускає вашу сорочку та дивиться в бік лісу.\n\n– Тепер воно повернеться.\n\n– Заєбісь, – каже Євпапій.`}
  ]);

  splitScene(S,'ch3_garlic',[
    {actors:[hero(H.shrug),creature(C.base)],text:`– Ну давай, сука. Не підведи.\n\n– Ти шо робиш? – шипить постать.\n\n– Перевіряю народну медицину.\n\nВи кидаєте часник у створіння. Він влучає прямо в груди.`},
    {actors:[hero(H.laugh),creature(C.garlic)],text:`Створіння згинається й шипить, ніби його ошпарили. Від сорочки піднімається легкий дим.\n\n– О, – каже Євпапій.\n\n– Шо «о»?\n\n– Працює.`},
    {actors:[hero(H.annoyed),creature(C.burn)],text:`– ТИ Ж КАЗАВ, ШО ЧАСНИК ХУЙНЯ.\n\n– Я сказав, шо мені його не давати.\n\nСтворіння повільно випрямляється і робить крок до вас.`},
    {actors:[hero(H.worried),creature(C.angry)],text:`Постать тихо каже:\n\n– Тепер воно тебе запамʼятало.\n\n– Заєбісь.`}
  ]);

  splitScene(S,'ch3_garlic_hit',[
    {actors:[hero(H.shocked),creature(C.attack)],text:`Створіння різко кидається вперед. Ви встигаєте відскочити, але воно чіпляє вас за плече й кидає на землю.`},
    {actors:[hero(H.worried),creature(C.angry)],text:`– Нормально? – питає Євпапій.\n\n– Ага. Заєбісь. Відпочиваю.\n\nВи піднімаєтесь. Створіння вже знову йде до вас.`}
  ]);

  splitScene(S,'ch3_ask_pigeon',[
    {actors:[hero(H.shocked),pigeon('./pigeon_talk.png','shoulder')],text:`– Євпапій, шо робити?!\n\nГолуб дивиться на створіння. Потім на вас. Потім знов на створіння.`},
    {actors:[hero(H.annoyed),pigeon('./pigeon_talk.png','shoulder')],text:`– Бий ножем.\n\n– Ти впевнений?\n\n– Канєшно.\n\n– Якщо я здохну, я тебе найду.`}
  ]);

  splitScene(S,'ch3_run',[
    {actors:[hero(H.worried),creature(C.attack)],text:`Ви вирішуєте, що з вас досить.\n\n– Та йдіть ви всі нахуй.\n\nРозвертаєтесь і робите буквально кілька кроків.`},
    {actors:[hero(H.shocked),creature(C.attack)],text:`Ззаду щось різко влітає вам у потилицю.\n\nТемно.\n\nЄвпапій:\n\n– Ну от. А я казав бігти. Правда, трохи раніше.`}
  ]);

  splitScene(S,'ch3_pray',[
    {actors:[hero(H.worried),hood()],text:`Ви заплющуєте очі й починаєте молитись.\n\nПостать нічого не каже.\n\nЩе секунду чути, як створіння важко шарудить зовсім поруч.`},
    {actors:[hero(H.shocked),hood()],text:`Потім звук віддаляється в бік сараю.\n\nЩось глухо вдаряється всередині.\n\nІ все.\n\nТиша.`},
    {actors:[hero(H.shrug),hood()],text:`Ви відкриваєте очі. Створіння вже нема, а двері сараю знову закриті.\n\n– І шо?\n\nПостать дивиться на сарай.\n\n– Пішли.\n\n– А воно?\n\n– Пішли.\n\nНавіть Євпапій цього разу мовчить.`}
  ]);

  splitScene(S,'ch3_wakeup',[
    {actors:[hero(H.worried),pigeon()],text:`Ви приходите до тями від того, що вам тупо важко дихати.\n\nВідкриваєте очі – на грудях сидить Євпапій.\n\n– Злізь.\n\n– О, живий.\n\n– ЗЛІЗЬ, СУКА.`},
    {actors:[hero(H.worried),pigeon()],text:`Євпапій нехотячи злітає. Ви повільно сідаєте під сараєм. Голова гуде, на потилиці щось мокре. Проводите рукою – кров.`},
    {actors:[hero(H.shocked),pigeon()],text:`Сарай перед вами закритий. Наче нічого не сталося.\n\nНожа нема. Постаті нема. Хуйні з сараю нема.`},
    {actors:[hero(H.shrug),pigeon()],text:`Поруч у траві лежить старий ключ.\n\nВи підбираєте його.`}
  ]);

  for(const scene of Object.values(S)){
    const choices=Array.isArray(scene?.choices)?scene.choices:[];
    for(const c of choices)if(c?.battle?.id==='shedCreature'){c.battle.enemyArt=C.base;c.battle.enemyAttackArt=C.attack;}
  }

  splitScene(S,'ch3_galina',[
    {actors:s=>[hero(H.shocked),galina()],text:s=>s.activeStatuses?.includes('headInjury')?`Ви ще крутите ключ у руці, коли з-за рогу зʼявляється баба Галя. Дивиться на вас, на кров на потилиці, на сарай.\n\nОбличчя міняється буквально на секунду, але потім знов стає таким, ніби нічого особливого не сталося.`:`Баба Галя зʼявляється з-за рогу й кілька секунд дивиться на вас, потім на сарай.\n\nОбличчя міняється буквально на секунду, але вона одразу робить вигляд, ніби нічого особливого не сталося.`},
    {actors:[hero(H.annoyed),galina()],text:s=>s.activeStatuses?.includes('headInjury')?`– Баб Галь, шо то було?\n\nВона підходить ближче, бере вас за лікоть і розвертає в бік хати.\n\n– Рану треба перевʼязати.\n\n– Я питаю, шо з сараю вилізло.\n\n– І голову промити.`:`– Баб Галь, шо то було?\n\nВона підходить, бере вас за лікоть і розвертає в бік хати.\n\n– Ходи до хати.\n\n– Я питаю, шо це було.`},
    {actors:[hero(H.worried),galina()],text:s=>s.activeStatuses?.includes('headInjury')?`– Баб Галь.\n\n– Ходи вже.\n\nЄвпапій плететься слідом, але в хату не заходить.`:`– Чула. Ходи вже.\n\nЄвпапій плететься слідом, але в хату не заходить.`}
  ]);
}

export function applyScenePatch094(){
  patchChapter2();
  patchChapter3();
}
