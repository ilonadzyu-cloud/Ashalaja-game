// v0.9.5u – compact state system + clear ПОХУЇЗМ / АХУЙ mechanics.
// This patch does not rewrite the plot. It trims duplicate physical states,
// keeps the funny narrative states, and makes the two unusual stats understandable.

import {CHAPTER1_SCENES} from './chapter1.js?v=093';
import {CHAPTER2_SCENES} from './chapter2.js?v=093';
import {CHAPTER3_SCENES} from './chapter3.js?v=093';
import {STATUS_DEFS} from './data.js?v=093';
import {STAT_DESCRIPTIONS} from './config.js?v=093';
import {effectiveStat} from './engine.js?v=093';

const ORDER=[
  'hangover','pigeonHumiliated','suspicious','scared',
  'yebatorium','tipsy','skunk','tired'
];

const asArray=x=>Array.isArray(x)?x:[];

function rebuildStatuses095u(){
  const old={...STATUS_DEFS};
  const defs={
    hangover:{
      ...(old.hangover||{}),
      name:'ЖОСТКИЙ БУДУНЯРА',
      blurb:'Другий день після горілки настав. Організм не в захваті.',
      mods:{attention:-2,agility:-1,pofigism:2},
      drainMultipliers:{water:1.25},
      extraEffects:['вода витрачається швидше'],
      remove:'поїсти, попити й трохи прийти до тями.'
    },
    pigeonHumiliated:{
      ...(old.pigeonHumiliated||{}),
      name:'СРАНИЙ ГОЛУБ ВАС ПРИНИЗИВ',
      blurb:'Вас обісрав голуб. От і все.',
      mods:{charisma:-1,pofigism:1},
      remove:'випрати або змінити одяг.'
    },
    suspicious:{
      ...(old.suspicious||{}),
      name:'СОБАКА-ПОДОЗРЄВАКА',
      blurb:'Шось тут не так, і ви вже дивитесь уважніше.',
      mods:{attention:2,charisma:-1},
      durationMinutes:30,
      remove:'сам пройде через 30 ігрових хвилин.'
    },
    scared:{
      ...(old.scared||{}),
      name:'ОБСЕРУНЬКАВСЯ ВІД СТРАХУ',
      blurb:'Страшно капець, зате адреналін працює.',
      mods:{attention:2,agility:1,pofigism:-2,charisma:-1},
      durationMinutes:20,
      remove:'сам пройде через 20 ігрових хвилин.'
    },
    yebatorium:{
      ...(old.yebatorium||{}),
      name:'ОСТАНОВОЧКА ЄБАТОРІУМ',
      blurb:'Нормальна логіка вже не дуже помагає.',
      mods:{attention:1,pofigism:1,ahui:1},
      durationMinutes:30,
      persistentUnlock:'yebatorium',
      extraEffects:['Відкриті [ЄБАТОРІУМ] дії залишаються доступними після завершення стану.'],
      remove:'сам стан пройде через 30 ігрових хвилин; відкриті [ЄБАТОРІУМ] дії залишаться.'
    },
    tipsy:{
      ...(old.tipsy||{}),
      name:'ПІД ГРАДУСОМ',
      blurb:'Язик сміливіший, координація трохи гірша.',
      mods:{pofigism:2,charisma:1,attention:-1,agility:-1},
      durationMinutes:90,
      remove:'сам пройде через 90 ігрових хвилин.'
    },
    skunk:{
      ...(old.skunk||{}),
      name:'ДИКИЙ СКУНС',
      blurb:'Від вас смердить так, що це вже майже бойова механіка.',
      mods:{pofigism:1,charisma:-3},
      remove:'нормально помитись або змінити брудний одяг.'
    },
    tired:{
      ...(old.tired||{}),
      name:'ЗАЄБАВСЯ',
      blurb:'Сил нема навіть ахуєвати.',
      mods:{attention:-1,agility:-1},
      remove:'підняти бадьорість вище 55%.'
    }
  };

  for(const key of Object.keys(STATUS_DEFS))delete STATUS_DEFS[key];
  for(const id of ORDER)STATUS_DEFS[id]=defs[id];
}

function explainStats095u(){
  STAT_DESCRIPTIONS.pofigism='Дозволяє робити стрьомні, гидкі, соромні й ризиковані речі, не зламавшись. Відкриває вибори [ПОХУЇЗМ] і допомагає переживати страх, огиду та крінж.';
  STAT_DESCRIPTIONS.ahui='Показує, наскільки ви вже адаптувались до логіки цього дурдому. Відкриває вибори [АХУЙ] – дивні, але інколи найрозумніші рішення.';
}

function patchPofigismChoice095u(){
  const sc=CHAPTER1_SCENES.waterSearch095k;
  if(!sc)return;
  const old=sc.choices;
  sc.choices=s=>{
    const xs=typeof old==='function'?asArray(old(s)):asArray(old);
    return xs.flatMap(c=>{
      if(c?.id!=='water095k_puddle')return[c];
      if(effectiveStat(s,'pofigism')<3)return[];
      return[{...c,label:'[ПОХУЇЗМ] Напитись з калюжі.'}];
    });
  };
}

function addAhuiChoice095u(){
  const sc=CHAPTER3_SCENES.ch3_wake_crowd;
  const target=CHAPTER3_SCENES.ch3_state_suspicious_reset;
  if(!sc||!target)return;
  const old=sc.choices;
  sc.choices=s=>{
    const xs=typeof old==='function'?asArray(old(s)):asArray(old);
    if(effectiveStat(s,'ahui')<2||s.flags?.noticedShedReset||xs.some(c=>c?.id==='ahui095u_shed'))return xs;
    return[
      {id:'ahui095u_shed',label:'[АХУЙ] Не питати людей. Ще раз глянути на сарай.',next:'ch3_state_suspicious_reset',kind:'secret'},
      ...xs
    ];
  };
}

const STATE_TAGS=[
  '[СОБАКА-ПОДОЗРЄВАКА]','[ОБСЕРУНЬКАВСЯ ВІД СТРАХУ]','[ПІД ГРАДУСОМ]',
  '[ЗАЄБАВСЯ]','[ЖОСТКИЙ БУДУНЯРА]','[СРАНИЙ ГОЛУБ ВАС ПРИНИЗИВ]',
  '[ДИКИЙ СКУНС]','[ЄБАТОРІУМ]'
];

function stateRank(label){
  const i=STATE_TAGS.findIndex(tag=>String(label||'').startsWith(tag));
  return i<0?999:i;
}

function limitStateButtons095u(){
  const patchScene=sc=>{
    if(!sc||!sc.choices)return;
    const old=sc.choices;
    sc.choices=s=>{
      const xs=typeof old==='function'?asArray(old(s)):asArray(old);
      const visibleState=xs
        .filter(c=>stateRank(c?.label)<999&&(!c.showIf||c.showIf(s)))
        .sort((a,b)=>stateRank(a.label)-stateRank(b.label));
      const keep=visibleState[0];
      return xs.filter(c=>{
        if(stateRank(c?.label)>=999)return true;
        if(c.showIf&&!c.showIf(s))return false;
        return c===keep;
      });
    };
  };
  for(const book of [CHAPTER1_SCENES,CHAPTER2_SCENES,CHAPTER3_SCENES])for(const sc of Object.values(book||{}))patchScene(sc);
}

function keepInjuryAsStoryNotState095u(){
  const sc=CHAPTER3_SCENES.ch3_galina;
  if(sc){
    const fake=s=>s?.flags?.shedBattleKnockout&&!s.activeStatuses?.includes('headInjury')
      ?{...s,activeStatuses:[...(s.activeStatuses||[]),'headInjury']}
      :s;
    if(typeof sc.actors==='function'){const old=sc.actors;sc.actors=s=>old(fake(s))}
    if(typeof sc.text==='function'){const old=sc.text;sc.text=s=>old(fake(s))}
  }
  const meal=CHAPTER3_SCENES.ch3_galina_hut;
  if(meal?.notice&&typeof meal.notice==='object'){
    meal.notice={...meal.notice,body:String(meal.notice.body||'').replace('Розбита голова сама від вечері не зажила.','Рана на голові від вечері не зажила.')};
  }
}

function patchMenuCopy095u(){
  const menu=document.querySelector('#menuOverlay');
  if(!menu)return;

  const title=menu.querySelector('.section-title h2')?.textContent?.trim();
  if(title==='Потреби'){
    const card=menu.querySelector('.info-card');
    if(card)card.textContent='Потреби працюють напряму. Низькі здоровʼя, вода й ситість не створюють окремих станів. Бадьорість нижче 35% дає стан «ЗАЄБАВСЯ»; він знімається, коли бадьорість підніметься вище 55%.';
  }
  if(title==='Стани'){
    const card=menu.querySelector('.info-card');
    if(card)card.textContent='На головному екрані показані активні стани. Тут – лише 8 сюжетних станів, які реально змінюють репліки, характеристики або дії.';
  }

  if(title==='Характеристики'){
    menu.querySelectorAll('.stat-upgrade-card').forEach(card=>{
      const label=card.querySelector('.stat-head b')?.textContent?.trim();
      if(!['Похуїзм','Ахуй'].includes(label))return;
      let note=card.querySelector('.stat-mechanic095u');
      if(!note){note=document.createElement('div');note.className='stat-mechanic095u';card.appendChild(note)}
      note.textContent=label==='Похуїзм'
        ?'Відкриває [ПОХУЇЗМ] варіанти – стрьомні, гидкі й ризиковані дії.'
        :'Відкриває [АХУЙ] варіанти – дивні рішення, коли ви вже врубились у логіку цього дурдому.';
    });
  }
}

function addCss095u(){
  if(document.querySelector('#patch095ucss'))return;
  const st=document.createElement('style');st.id='patch095ucss';st.textContent=`
    .stat-mechanic095u{margin-top:8px;padding-top:8px;border-top:1px solid rgba(130,150,132,.22);font-size:.78rem;line-height:1.4;color:#d7d0c3}
  `;document.head.appendChild(st);
}

function installUiHooks095u(){
  const run=()=>setTimeout(patchMenuCopy095u,0);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#menuBtn,#menuOverlay button,[data-stat-upgrade]'))run();
  },true);
  run();
}

function stamp095u(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5u');
}

function apply095u(){
  rebuildStatuses095u();
  explainStats095u();
  patchPofigismChoice095u();
  addAhuiChoice095u();
  limitStateButtons095u();
  keepInjuryAsStoryNotState095u();
  addCss095u();
  installUiHooks095u();
  stamp095u();
}
queueMicrotask(apply095u);
