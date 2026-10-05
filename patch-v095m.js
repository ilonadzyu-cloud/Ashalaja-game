// v0.9.5m – first meeting with Baba Galya's cat in chapter 3.
// Kept deliberately small: one intro node, three reactions, all returning to the existing story.
import {CHAPTER3_SCENES} from './chapter3.js?v=093';

const CAT095M={
  base:'./cat_base_095m.png',
  angry:'./cat_angry_095m.png',
  shocked:'./cat_shocked_095m.png',
  sideeye:'./cat_sideeye_095m.png',
  loaf:'./cat_loaf_095m.png'
};

const H095M={
  base:'./hero_shrug_095.webp',
  annoyed:'./hero_annoyed_095.webp',
  shocked:'./hero_shocked_095.webp'
};

const hut095m={
  background:'./bg_hut.jpg',
  atmosphere:'indoors',
  chapter:3,
  world:[
    {type:'world',key:'environment',value:'indoors'},
    {type:'world',key:'location',value:'хата баби Галі'}
  ]
};

const hero095m=(src=H095M.base)=>({role:'hero layout-hero095k cat-scene-hero095m',src,position:'hero'});
const cat095m=(src=CAT095M.base)=>({role:'npc layout-npc095k cat095m',src,position:'npc'});

function patchCatMeeting(){
  const S=CHAPTER3_SCENES;
  if(!S?.ch3_galina_warning)return;

  // Insert the cat scene immediately before the already existing "Євпапій returns" scene.
  S.ch3_galina_warning.choices=[{id:'galina095_cat_next',label:'Встати й іти.',next:'ch3_cat_intro095m'}];

  S.ch3_cat_intro095m={
    ...hut095m,
    id:'ch3_cat_intro095m',
    caption:'знайомство відбулось',
    actors:[hero095m(),cat095m(CAT095M.loaf)],
    onEnter:[{type:'flag',key:'catMet',value:true}],
    text:`Ви встаєте й робите крок до дверей. Ногою за щось чіпляєтесь.\n– Блядь!\nЛедь не їбетесь об стіл, дивитесь вниз. На підлозі лежить здоровенний кіт. І те гамно риже навіть не поворухнулося. А дивиться на вас так, ніби ви сама прєзрєна людинка на світі. Просто король всіх лохів.\n\n– Баб Галь, а воно завжди ось так лежить посеред хати?\nБаба навіть не обертається.\n– А де йому ше лежати?\nВи дивитесь на кота. Кіт дивиться на вас. Схоже, знайомство відбулось.`,
    choices:[
      {id:'cat095m_polite',label:'– Вибач, шановний.',next:'ch3_cat_polite095m',hiddenEffects:[{type:'flag',key:'catFirstMeeting',value:'polite'}]},
      {id:'cat095m_insult',label:'– Сам винен, шо розлігся посеред хати.',next:'ch3_cat_insult095m',hiddenEffects:[{type:'flag',key:'catFirstMeeting',value:'insult'}]},
      {id:'cat095m_pet',label:'Спробувати погладити.',next:'ch3_cat_pet095m',hiddenEffects:[{type:'flag',key:'catFirstMeeting',value:'petAttempt'}]}
    ]
  };

  S.ch3_cat_polite095m={
    ...hut095m,
    id:'ch3_cat_polite095m',
    caption:'вибачились перед котом',
    actors:[hero095m(),cat095m(CAT095M.base)],
    text:`– Вибач, шановний.\nКіт дивиться на вас тією самою заєбаною пикою. Навіть не моргнув.\nНу ладно. Будемо вважати, шо вибачення прийнято.`,
    choices:[{id:'cat095m_polite_next',label:'Йти далі.',next:'ch3_evp_returns'}]
  };

  S.ch3_cat_insult095m={
    ...hut095m,
    id:'ch3_cat_insult095m',
    caption:'походу, нажили ворога',
    actors:[hero095m(H095M.annoyed),cat095m(CAT095M.angry)],
    text:`– Сам винен, шо розлігся посеред хати.\nКіт повільно примружується. О. Походу, ви щойно нажили собі ще одного ворога.`,
    choices:[{id:'cat095m_insult_next',label:'Йти далі.',next:'ch3_evp_returns'}]
  };

  S.ch3_cat_pet095m={
    ...hut095m,
    id:'ch3_cat_pet095m',
    caption:'пальці ще пригодяться',
    actors:[hero095m(H095M.shocked),cat095m(CAT095M.shocked)],
    text:`Ви тягнете руку. Кіт дивиться на неї так, ніби зараз хтось буде без пальців.\nВи руку забираєте. Ну його нахуй.`,
    choices:[{id:'cat095m_pet_next',label:'Йти далі.',next:'ch3_evp_returns'}]
  };
}

function addCss(){
  if(document.querySelector('#patch095mcss'))return;
  const s=document.createElement('style');
  s.id='patch095mcss';
  s.textContent=`
    /* Cat scenes obey the same clean two-character composition. */
    .stage-image .actor.cat-scene-hero095m{
      left:1%!important;right:auto!important;bottom:0!important;
      width:44%!important;height:91%!important;max-width:none!important;max-height:none!important;
      object-fit:contain!important;object-position:left bottom!important;transform:none!important;
    }
    .stage-image .actor.cat095m{
      left:auto!important;right:3%!important;bottom:2%!important;
      width:42%!important;height:68%!important;max-width:none!important;max-height:none!important;
      object-fit:contain!important;object-position:right bottom!important;transform:none!important;
      z-index:3!important;
    }
    @media(max-width:760px){
      .stage-image .actor.cat-scene-hero095m{left:0!important;width:45%!important;height:91%!important}
      .stage-image .actor.cat095m{right:1%!important;width:44%!important;height:67%!important}
    }
  `;
  document.head.appendChild(s);
}

function warm(){
  for(const src of Object.values(CAT095M)){
    const img=new Image();img.decoding='async';img.loading='eager';img.src=src;
  }
}

function stamp(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5m')}

function apply095m(){patchCatMeeting();addCss();stamp()}
queueMicrotask(apply095m);
