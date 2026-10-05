import {CHAPTER2_SCENES} from './chapter2.js?v=096b';
import {CHAPTER3_SCENES} from './chapter3.js?v=096b';
import {ITEM_DEFS,STATUS_DEFS} from './data.js?v=096b';

const A={
  hero:{
    shrug:'./hero_shrug_095.webp',annoyed:'./hero_annoyed_095.webp',laugh:'./hero_laugh_095.webp',
    shocked:'./hero_shocked_095.webp',worried:'./hero_worried_095.webp',injured:'./hero_injured_095.webp'
  },
  pigeon:{smug:'./pigeon_smug_095.webp',salo:'./pigeon_salo_095.webp',fly:'./pigeon_attack_095.webp'}
};
const hero=(src=A.hero.shrug,position='hero')=>({role:'hero',src,position});
const pigeon=(src=A.pigeon.smug,position='pigeon')=>({role:'pigeon',src,position});
const hood=()=>({role:'npc face-left',src:'./ch2_unknown_v2.png',position:'npc'});
const creature=(src='./creature_normal_095f.webp',position='npc')=>({role:'npc',src,position});
const galina=()=>({role:'npc',src:'./galina_base.png',position:'npc'});
const bg=n=>`./${n}`;
const shed={background:bg('ch2_shed.jpg'),atmosphere:'village',chapter:3,world:[{type:'world',key:'environment',value:'outdoors'},{type:'world',key:'location',value:'біля сараю'}]};
const yard={background:bg('ch2_wake_yard.jpg'),atmosphere:'village',chapter:3,world:[{type:'world',key:'environment',value:'outdoors'},{type:'world',key:'location',value:'двір з поминками'}]};
const hut={background:bg('bg_hut.jpg'),atmosphere:'indoors',chapter:3,world:[{type:'world',key:'environment',value:'indoors'},{type:'world',key:'location',value:'хата баби Галі'}]};

function remapActor(a){
  if(!a||typeof a!=='object')return a;
  const src=String(a.src||'');
  if(a.role==='hero'){
    if(/injured/i.test(src))return {...a,src:A.hero.injured};
    if(/shocked|scared/i.test(src))return {...a,src:A.hero.shocked};
    if(/annoyed|angry/i.test(src))return {...a,src:A.hero.annoyed};
    if(/laugh/i.test(src))return {...a,src:A.hero.laugh};
    if(/worried|worry|tired/i.test(src))return {...a,src:A.hero.worried};
    return {...a,src:A.hero.shrug};
  }
  if(a.role==='pigeon'){
    if(/talk|attack/i.test(src))return {...a,src:A.pigeon.fly};
    if(/base/i.test(src))return {...a,src:A.pigeon.smug};
    return {...a,src:A.pigeon.smug};
  }
  return a;
}
function remapBook(book){
  for(const s of Object.values(book)){
    if(Array.isArray(s?.actors))s.actors=s.actors.map(remapActor);
  }
}
function hasOldKey(s){return (s.inventory||[]).some(x=>x.id==='old_key'&&Number(x.qty||0)>0)}

function patchStatusCarry(){
  const end=CHAPTER2_SCENES.ch2_end;
  if(end&&Array.isArray(end.onEnter))end.onEnter=end.onEnter.filter(e=>!(e?.type==='statusAdd'&&e?.id==='scared'));
}

function patchPrayer(){
  const S=CHAPTER3_SCENES;
  S.ch3_pray={
    ...shed,id:'ch3_pray',caption:'молитись своєму богу',actors:[hero(A.hero.worried),creature()],
    text:`Ну а шо ще робити? Бити покійника ви вже якось морально не готові, домовлятись із ним теж виглядає як хуйова ідея.\n\nТому ви починаєте молитися. Спочатку тихо, бо почуваєтесь трохи довбойобом, а потім уже розходитеся й починаєте співать, як ото було на юбілеї в діда Толіка.`,
    choices:[{id:'pray095_1',label:'Далі',next:'ch3_pray095_2'}]
  };
  S.ch3_pray095_2={
    ...shed,id:'ch3_pray095_2',caption:'і воно, сука, працює',actors:[hero(A.hero.shocked),creature()],
    text:`І воно, сука, працює. Трупосмерд завмирає просто перед вами. Ще секунду тому ця засмальцьована хуйня дуже повільно сунула у вашу сторону, а тепер стоїть і дивиться.\n\nА потім воно починає молитися разом із вами. Тими самими словами, тільки трохи пізніше, ніби повторює за вами. Ви замовкаєте. Воно теж.\n\n– Піздєц.`,
    choices:[{id:'pray095_2',label:'Далі',next:'ch3_pray095_3'}]
  };
  S.ch3_pray095_3={
    ...shed,id:'ch3_pray095_3',caption:'сальса',actors:[hero(A.hero.laugh),creature()],
    text:`Кілька секунд ви просто дивитесь одне на одного. Потім повільно підіймаєте руку. Трупосмерд підіймає свою. Опускаєте – він теж опускає. Ви вже більше з цікавості робите маленький крок назад, і ця хуйня теж відступає на крок.\n\nВи входите в кураж. Страх потроху відступає, і починається сальса. Крок вліво – трупосмерд вліво. Крок вправо – він за вами. Ви махнули рукою – він махнув.\n\nЄвпапій на диво мовчить і просто слідкує за цим цирком.`,
    choices:[{id:'pray095_3',label:'Далі',next:'ch3_pray095_4'}]
  };
  S.ch3_pray095_4={
    ...shed,id:'ch3_pray095_4',caption:'ахуєнна діскотєка',actors:[hero(A.hero.shocked),creature()],
    text:`І тут десь неподалік раптом дзвенить дзвіночок.\n\nТрупосмерд на мить завмирає, різко повертає голову на звук, а тоді зривається з місця й несеться в сторону лісу так, ніби всі ці пів години просто прикидався дохлим.\n\nВи ще секунду стоїте з піднятою рукою.\n\n– Ахуєнна діскотєка.`,
    choices:[{id:'pray095_4',label:'Далі',next:'ch3_pray095_key'}]
  };
  S.ch3_pray095_key={
    ...shed,id:'ch3_pray095_key',caption:'а тепер питання',actors:[hero(A.hero.shrug),pigeon(A.pigeon.smug)],
    onEnter:s=>hasOldKey(s)?[{type:'flag',key:'prayerShedKeySeen',value:true}]:[{type:'itemAdd',id:'old_key',qty:1},{type:'flag',key:'prayerShedKeySeen',value:true}],
    text:s=>`Ви повертаєтесь до постаті, бо питань у вас багацько, але поруч нікого нема. Постать зʼїбалась так само тихо, як появилась.\n\n${hasOldKey(s)?'Двері сараю замкнені, ніби нічого не сталось.':'Двері сараю замкнені, ніби нічого не сталось.'}\n\n– Нє, – кажете ви. – Навіть не начинай.\n\n– Ключ забери, може нада буде. Он лежить під замком прям.\n\nІ справді. Під дверима валяється якийсь старий ключ. Чи він вам треба? А хуй його знає. Але ви його, канєшно, забираєте.`,
    notice:{title:'ОТРИМАНО: ДИВНИЙ КЛЮЧ',body:'Від чого він – поки хуй його знає.'},
    choices:[{id:'pray095_key_next',label:'Далі',next:'ch3_galina'}]
  };
}

function patchFinale(){
  const S=CHAPTER3_SCENES;
  S.ch3_galina={
    ...yard,id:'ch3_galina',caption:'баба галя',actors:s=>[hero(s.activeStatuses?.includes('headInjury')?A.hero.injured:A.hero.shocked),galina()],
    onEnter:s=>hasOldKey(s)?[]:[{type:'itemAdd',id:'old_key',qty:1},{type:'flag',key:'keyFoundBeforeGalina',value:true}],
    text:s=>`${s.flags?.keyFoundBeforeGalina?'Біля входу в сарай на землі лежить якийсь старий ключ. Чи вам він треба? А хуй його знає. Ви підбираєте його й ховаєте в кишеню.\n\n':''}${s.activeStatuses?.includes('headInjury')?'Ви ще не дуже впевнено стоїте на ногах, коли вас хтось бере під руку.':'І тут вас хтось бере під руку. Ви вже майже готові знову ахуєвати, але то баба Галя.'}\n\nНа всі ваші «а шо це було?», «а хто це був?» і «ви взагалі бачили, шо тут робиться?» вона не відповідає ні слова. Просто веде вас кудись через двір. Походу до себе в хату, але то не точно.`,
    choices:[{id:'galina095_yard',label:'Далі',next:'ch3_wake_crowd'}]
  };
  S.ch3_wake_crowd={
    ...yard,id:'ch3_wake_crowd',caption:'а всім похуй',actors:[hero(A.hero.shocked),galina()],
    onEnter:[{type:'heroXp',value:10},{type:'flag',key:'wakeCrowdAhuied',value:true}],
    text:`Баба вас ігнорує та веде під руку. Ви проходите мимо людей на поминках і ахуєваєте. Всі сидять, їдять, бздять, говорять про якусь побутову хуйню, хтось наливає, хтось уже ригає десь збоку, і ніхто взагалі не реагує на те, шо буквально кілька хвилин тому відбувалось поруч.\n\nНіхто не питає, шо там було, чого щось бахкало і звідки взялась та засмальцьована хуйня. Сарай теж стоїть собі цілий, двері на місці, замок висить, ніби ніхуя там сьогодні й не було.`,
    notice:{title:'АХУЙ',body:'ДОСВІД +10'},
    choices:[{id:'galina095_bird',label:'Далі',next:'ch3_evp_missing'}]
  };
  S.ch3_evp_missing={
    ...yard,id:'ch3_evp_missing',caption:'екакій десь дівся',actors:[hero(A.hero.shrug),galina()],
    text:`Баба Галя веде вас далі, а ви машинально шукаєте очима Євпапія. Ще хвилину тому той крутився десь поруч, а тепер його нема. Ні на паркані, ні під ногами, ні над головою. Просто зʼїбався.\n\n– Екакій, блять, хоч би попрощався.\n\nБаба Галя навіть не повертається. Чи то не почула, чи то не бачить сенсу шось розказувати мужику, який свариться з жирним голубом.\n\nЯк він літає взагалі тими куцими крильцями? – подумали ви.`,
    choices:[{id:'galina095_hut',label:'Зайти в хату.',next:'ch3_galina_hut'}]
  };
  S.ch3_galina_hut={
    ...hut,id:'ch3_galina_hut',caption:'бабусіта накриває поляну',actors:[hero(A.hero.shrug),galina()],
    onEnter:[
      {type:'health',value:100},{type:'need',key:'satiety',value:100},{type:'need',key:'water',value:100},{type:'statusRemove',id:'hungry'},
      {type:'flag',key:'galinaFedAfterShed',value:true}
    ],
    text:`У хаті бабусіта садить вас за стіл і починає накривати поляну. Картопля, мʼясо, сало, хліб, соління, потім ще щось наливає в кухоль і підсуває ближче. Ви дивитесь на неї з підозрою, але після всього пережитого похуй + похуй, їсти треба.\n\nЇсте ви довго й нормально, бо баба Галя докладає ще, не питаючи.`,
    notice:{title:'ВИ НОРМАЛЬНО ПОЇЛИ',body:'Здоровʼя відновлено · голод знято · вода й ситість відновлені.'},
    choices:[{id:'galina095_talk',label:'Далі',next:'ch3_galina_warning'}]
  };
  S.ch3_galina_warning={
    ...hut,id:'ch3_galina_warning',caption:'слухай бабусіту',actors:[hero(A.hero.worried),galina()],
    text:`Баба Галя ще трохи порається біля столу, а потім каже так, ніби між іншим:\n\n– І до вертаних більше не лізь.\n\n– До кого?\n\n– До покійних, шо назад вертаються. Побачив такого – обійшов і пішов далі.\n\nВи вже відкриваєте рот, але вона перебиває:\n\n– Ти дивись мені, синку, по-доброму кажу. До церкви не ходи, з попом не балакай. І сьогодні ти нічого не чув і не бачив.\n\nВи перестаєте жувати.\n\n– А якшо бачив?\n\nБаба Галя дивиться на вас поверх кухля.\n\n– Значить, забудеш.`,
    choices:[{id:'galina095_out',label:'Далі',next:'ch3_evp_returns'}]
  };
  S.ch3_evp_returns={
    ...yard,id:'ch3_evp_returns',caption:'ну канєшно',actors:[hero(A.hero.annoyed),pigeon(A.pigeon.smug)],
    text:`Через кілька хвилин баба Галя випускає вас надвір. Ви робите пару кроків і бачите Євпапія. Сидить собі неподалік, чистить крило й виглядає так, ніби весь цей час був страшно зайнятий важливими голубиними справами.\n\n– Ти де був?\n\nЄвпапій перестає чиститись і дивиться на вас.\n\n– Гуляв.\n\n– Ага. Канєшно.\n\nВін ще раз зиркає на бабину хату, але нічого не каже. І от це вам подобається найменше. Бо за весь сьогоднішній день Євпапій ще ні разу не мовчав там, де можна було щось пизданути.`,
    notice:{title:'КІНЕЦЬ ПОТОЧНОЇ ЧАСТИНИ ГЛАВИ 3',body:'Усе, що ви встигли наробити, збережено.'},
    end:true,choices:[]
  };
}

function patchArtAndUi(){
  remapBook(CHAPTER2_SCENES);remapBook(CHAPTER3_SCENES);
  const style=document.createElement('style');style.id='patch095css';style.textContent=`
    .stage-image .actor{height:auto!important;width:auto!important;object-fit:contain!important;object-position:bottom center!important;background:transparent!important}
    .stage-image .actor.hero{max-width:48%!important;max-height:88%!important;left:2%!important;bottom:0!important}
    .stage-image .actor.npc{max-width:46%!important;max-height:88%!important;right:3%!important;bottom:0!important}
    .stage-image .actor.pigeon{max-width:25%!important;max-height:42%!important;right:7%!important;bottom:4%!important}
    .stage-image .actor.shoulder{max-width:16%!important;max-height:25%!important;left:31%!important;right:auto!important;bottom:48%!important}
    @media(max-width:760px){.stage-image .actor.hero{max-width:52%!important;left:0!important}.stage-image .actor.npc{max-width:48%!important;right:1%!important}.stage-image .actor.pigeon{max-width:26%!important;right:4%!important}}
    .stat-meter095{display:flex;gap:4px;margin-top:8px;align-items:flex-end}.stat-meter095 i{display:block;width:13px;height:24px;border-radius:4px;border:1px solid #3a4840;background:#e8e2d4}.stat-meter095 i.buff{background:#5ca769}.stat-meter095 i.debuff{background:#ba514b;opacity:.95}.stat-meter095 small{margin-left:6px;color:var(--muted)}
  `;document.head.appendChild(style);

  const decorateStats=()=>{
    document.querySelectorAll('.stat-upgrade-card').forEach(card=>{
      if(card.querySelector('.stat-meter095'))return;
      const txt=card.querySelector('.stat-level')?.textContent||'';
      const base=Number(txt.match(/Рівень\s+(\d+)/)?.[1]||0);
      const mod=Number(txt.match(/стани\s+([+-]?\d+)/)?.[1]||0);
      const meter=document.createElement('div');meter.className='stat-meter095';
      for(let i=0;i<base;i++){const p=document.createElement('i');meter.appendChild(p)}
      if(mod>0)for(let i=0;i<mod;i++){const p=document.createElement('i');p.className='buff';meter.appendChild(p)}
      if(mod<0)for(let i=0;i<Math.abs(mod);i++){const p=document.createElement('i');p.className='debuff';meter.appendChild(p)}
      card.appendChild(meter);
    });
  };
  // v0.9.5p: one-shot only. Runtime body observers were causing a WebKit render freeze.
  decorateStats();
}

function patchItems(){
  // Арти вже вирізані й лежать окремими файлами; назви залишаємо стабільними для наступних сцен.
  ITEM_DEFS.onion.art='./onion_normal_095.webp';
  ITEM_DEFS.onion_angry.art='./onion_angry_095.webp';
  ITEM_DEFS.onion_smelly.art='./onion_smelly_095.webp';
  STATUS_DEFS.scared.blurb='Страшно капець. Але попустить.';
}



// v0.9.5n: first meeting with Baba Galya's cat is merged into the core story patch
// instead of loading as a separate late module. This keeps startup simple and deterministic.
const CAT095N={
  base:'./cat_base_095m.png',
  angry:'./cat_angry_095m.png',
  shocked:'./cat_shocked_095m.png',
  sideeye:'./cat_sideeye_095m.png',
  loaf:'./cat_loaf_095m.png'
};
function patchCatMeeting095n(){
  const S=CHAPTER3_SCENES;
  if(!S?.ch3_galina_warning)return;
  S.ch3_galina_warning.choices=[{id:'galina095_cat_next',label:'Встати й іти.',next:'ch3_cat_intro095n'}];
  const cat=(src=CAT095N.base)=>({role:'npc cat095n',src,position:'npc'});
  const catScene=(id,caption,heroSrc,catSrc,text,choices)=>({
    ...hut,id,caption,actors:[hero(heroSrc),cat(catSrc)],text,choices
  });
  S.ch3_cat_intro095n=catScene(
    'ch3_cat_intro095n','знайомство відбулось',A.hero.shrug,CAT095N.loaf,
    `Ви встаєте й робите крок до дверей. Ногою за щось чіпляєтесь.\n\n– Блядь!\n\nЛедь не їбетесь об стіл, дивитесь вниз. На підлозі лежить здоровенний кіт. І те гамно риже навіть не поворухнулося.\n\nА дивиться на вас так, ніби ви сама прєзрєна людинка на світі. Просто король всіх лохів.\n\n– Баб Галь, а воно завжди ось так лежить посеред хати?\n\nБаба навіть не обертається.\n\n– А де йому ше лежати?\n\nВи дивитесь на кота. Кіт дивиться на вас. Схоже, знайомство відбулось.`,
    [
      {id:'cat095n_polite',label:'– Вибач, шановний.',next:'ch3_cat_polite095n',hiddenEffects:[{type:'flag',key:'catFirstMeeting',value:'polite'},{type:'flag',key:'catMet',value:true}]},
      {id:'cat095n_insult',label:'– Сам винен, шо розлігся посеред хати.',next:'ch3_cat_insult095n',hiddenEffects:[{type:'flag',key:'catFirstMeeting',value:'insult'},{type:'flag',key:'catMet',value:true}]},
      {id:'cat095n_pet',label:'Спробувати погладити.',next:'ch3_cat_pet095n',hiddenEffects:[{type:'flag',key:'catFirstMeeting',value:'petAttempt'},{type:'flag',key:'catMet',value:true}]}
    ]
  );
  S.ch3_cat_polite095n=catScene(
    'ch3_cat_polite095n','вибачились перед котом',A.hero.shrug,CAT095N.base,
    `– Вибач, шановний.\n\nКіт дивиться на вас тією самою заєбаною пикою. Навіть не моргнув.\n\nНу ладно. Будемо вважати, шо вибачення прийнято.`,
    [{id:'cat095n_polite_next',label:'Йти далі.',next:'ch3_evp_returns'}]
  );
  S.ch3_cat_insult095n=catScene(
    'ch3_cat_insult095n','походу, нажили ворога',A.hero.annoyed,CAT095N.angry,
    `– Сам винен, шо розлігся посеред хати.\n\nКіт повільно примружується. О. Походу, ви щойно нажили собі ще одного ворога.`,
    [{id:'cat095n_insult_next',label:'Йти далі.',next:'ch3_evp_returns'}]
  );
  S.ch3_cat_pet095n=catScene(
    'ch3_cat_pet095n','пальці ще пригодяться',A.hero.shocked,CAT095N.shocked,
    `Ви тягнете руку. Кіт дивиться на неї так, ніби зараз хтось буде без пальців.\n\nВи руку забираєте. Ну його нахуй.`,
    [{id:'cat095n_pet_next',label:'Йти далі.',next:'ch3_evp_returns'}]
  );
}
function patchCatUi095n(){
  if(document.querySelector('#patch095ncatcss'))return;
  const style=document.createElement('style');style.id='patch095ncatcss';style.textContent=`
    .stage-image .actor.cat095n{left:auto!important;right:3%!important;bottom:2%!important;width:42%!important;height:68%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:right bottom!important;transform:none!important;z-index:3!important}
    @media(max-width:760px){.stage-image .actor.cat095n{right:1%!important;width:44%!important;height:67%!important}}
  `;document.head.appendChild(style);
  for(const src of Object.values(CAT095N)){const img=new Image();img.decoding='async';img.src=src}
}

function stamp095(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5')}

function apply095(){
  patchStatusCarry();patchPrayer();patchFinale();patchCatMeeting095n();patchItems();patchArtAndUi();patchCatUi095n();stamp095();
}

// ui-v085.js спочатку накладає v0.9.4, а цей патч уже поверх нього.
queueMicrotask(apply095);
