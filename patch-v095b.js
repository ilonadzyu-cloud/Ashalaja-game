import {CHAPTER2_SCENES} from './chapter2.js?v=093';
import {CHAPTER3_SCENES} from './chapter3.js?v=093';
import {ITEM_DEFS} from './data.js?v=093';

const A095B={
  hero:{
    sit:'./hero_sit_095b.webp',
    pee:'./hero_pee_095b.webp',
    scare:'./hero_scare_095b.webp',
    side:'./hero_side_worried_095b.webp',
    head:'./hero_pigeon_head_095b.webp',
    dance:'./hero_creature_dance_095b.webp'
  },
  creature:'./creature_clean_095b.webp',
  pigeon:{
    base:'./pigeon_base_095b.webp',
    gasp:'./pigeon_gasp_095b.webp',
    angry:'./pigeon_angry_095b.webp',
    talk:'./pigeon_talk_095b.webp',
    sideeye:'./pigeon_sideeye_095b.webp',
    confused:'./pigeon_confused_095b.webp',
    perch:'./pigeon_perch_095b.webp',
    salo:'./pigeon_salo_095.webp'
  },
  onion:{
    normal:'./onion_normal_095.webp',
    angry:'./onion_angry_095.webp',
    smelly:'./onion_smelly_095.webp'
  }
};

const sceneCopy=s=>`${String(s?.caption||'')} ${typeof s?.text==='string'?s.text:''}`.toLowerCase();
const hasRole=(a,role)=>String(a?.role||'').split(/\s+/).includes(role);

function pigeonMood(copy){
  if(/сал[оа]|шматок сала|году.*сал/.test(copy))return A095B.pigeon.salo;
  if(/паркан|дошк|сидить собі неподалік/.test(copy))return A095B.pigeon.perch;
  if(/крич|каже|говор|балака|пизд|матюк|реплік/.test(copy))return A095B.pigeon.talk;
  if(/зл|образ|прєзр|презр|не подоба|розізл/.test(copy))return A095B.pigeon.angry;
  if(/бах|ляк|страх|аху|завмира|здриг/.test(copy))return A095B.pigeon.gasp;
  if(/підозр|зирка|коситься|дивиться.*сарай/.test(copy))return A095B.pigeon.sideeye;
  if(/нахиляє голову|не розум|шо за|дивно/.test(copy))return A095B.pigeon.confused;
  return A095B.pigeon.base;
}

function patchSceneActors(book){
  for(const [id,s] of Object.entries(book||{})){
    if(!s||!Array.isArray(s.actors))continue;
    const copy=sceneCopy(s);

    // У сцені, де Євпапій реально сідає на голову, використовуємо один готовий спільний арт.
    if(/реально говорить/.test(copy)){
      s.actors=[{role:'hero combo095b',src:A095B.hero.head,position:'hero'}];
      continue;
    }

    // Сальса з ТРУПОСМЕРДОМ – один спільний арт, щоб вони реально танцювали разом.
    if(id==='ch3_pray095_3'||/сальса/.test(String(s.caption||'').toLowerCase())){
      s.actors=[{role:'hero dance095b',src:A095B.hero.dance,position:'hero'}];
      continue;
    }

    s.actors=s.actors.map(a=>{
      if(!a||typeof a!=='object')return a;
      const src=String(a.src||'').toLowerCase();
      if(hasRole(a,'npc')&&/creature|труп|zomb/.test(src))return {...a,src:A095B.creature};
      if(hasRole(a,'pigeon'))return {...a,src:pigeonMood(copy)};
      if(hasRole(a,'hero')){
        // Біля сараю міняємо позу по самій дії, а не просто одну пику на всю сцену.
        if(/піся|піс(я|ю)|відлити|мочит/.test(copy))return {...a,src:A095B.hero.pee};
        if(/вируб|очух|прийш.*до тями|лежите.*земл|тримаєтесь за голову/.test(copy))return {...a,src:A095B.hero.sit};
        if(/\bбах\b|переляк|шарах|зляк/.test(copy))return {...a,src:A095B.hero.scare};
        if(/насторож|прислух|обертаєт|озираєт/.test(copy))return {...a,src:A095B.hero.side};
      }
      return a;
    });
  }
}

function forceKnownScenes(){
  const S=CHAPTER3_SCENES;
  if(S?.ch3_pray095_2&&Array.isArray(S.ch3_pray095_2.actors))S.ch3_pray095_2.actors=S.ch3_pray095_2.actors.map(a=>hasRole(a,'npc')?{...a,src:A095B.creature}:a);
  if(S?.ch3_pray095_4&&Array.isArray(S.ch3_pray095_4.actors))S.ch3_pray095_4.actors=S.ch3_pray095_4.actors.map(a=>hasRole(a,'npc')?{...a,src:A095B.creature}:a);
  if(S?.ch3_evp_returns)S.ch3_evp_returns.actors=[
    ...(Array.isArray(S.ch3_evp_returns.actors)?S.ch3_evp_returns.actors.filter(a=>!hasRole(a,'pigeon')):[]),
    {role:'pigeon perch095b',src:A095B.pigeon.perch,position:'pigeon'}
  ];
}

const STAT_FLAVOR={
  'сила':'Поки ше не Геракл',
  'уважність':'Навички Шерлока так собі',
  'спритність':'Не навернулись – уже добре'
};

function patchStatFlavors(){
  document.querySelectorAll('.stat-upgrade-card').forEach(card=>{
    const raw=(card.textContent||'').toLowerCase();
    const key=Object.keys(STAT_FLAVOR).find(k=>raw.includes(k));
    if(!key)return;
    const wanted=STAT_FLAVOR[key];
    let target=card.querySelector('.stat-description,.stat-desc,.stat-flavor,.stat-subtitle,.stat-note,.stat-flavor095b');
    if(!target){
      const leaves=[...card.querySelectorAll('p,small,div')].filter(el=>{
        if(el.children.length)return false;
        if(el.classList.contains('stat-level')||el.classList.contains('stat-meter095')||el.classList.contains('stat-flavor095b'))return false;
        const t=(el.textContent||'').trim();
        return t.length>3&&!/(рівень|база|зараз|досвід|xp|очк)/i.test(t);
      });
      target=leaves.at(-1)||null;
    }
    if(target){if(target.textContent!==wanted)target.textContent=wanted;}
    else{
      const el=document.createElement('div');el.className='stat-flavor095b';el.textContent=wanted;
      const meter=card.querySelector('.stat-meter095');
      if(meter)card.insertBefore(el,meter);else card.appendChild(el);
    }
  });
}

function onionSrcFor(el){
  const all=`${el?.textContent||''} ${[...el?.attributes||[]].map(a=>`${a.name}=${a.value}`).join(' ')}`.toLowerCase();
  if(/вонюч|smelly|onion_smelly/.test(all))return A095B.onion.smelly;
  if(/зла цибул|angry|onion_angry/.test(all))return A095B.onion.angry;
  return A095B.onion.normal;
}

function patchOnionEmoji(root=document.body){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];let n;
  while((n=walker.nextNode()))if(n.nodeValue?.includes('🧅'))nodes.push(n);
  for(const node of nodes){
    const parent=node.parentElement;if(!parent)continue;
    const src=onionSrcFor(parent);
    const bits=node.nodeValue.split('🧅');
    const frag=document.createDocumentFragment();
    bits.forEach((bit,i)=>{
      if(i){const img=document.createElement('img');img.className='onion-icon095b';img.src=src;img.alt='цибуля';frag.appendChild(img)}
      if(bit)frag.appendChild(document.createTextNode(bit));
    });
    node.replaceWith(frag);
  }
}

function patchItems(){
  if(ITEM_DEFS.onion)ITEM_DEFS.onion.art=A095B.onion.normal;
  if(ITEM_DEFS.onion_angry)ITEM_DEFS.onion_angry.art=A095B.onion.angry;
  if(ITEM_DEFS.onion_smelly)ITEM_DEFS.onion_smelly.art=A095B.onion.smelly;
}

function addCss(){
  if(document.querySelector('#patch095bcss'))return;
  const style=document.createElement('style');style.id='patch095bcss';style.textContent=`
    .onion-icon095b{width:25px;height:25px;object-fit:contain;vertical-align:-6px;margin-right:5px;filter:none!important}
    .stat-flavor095b{margin-top:4px;color:var(--muted);font-size:.92rem;line-height:1.25}
    .stage-image .actor.combo095b{max-width:54%!important;max-height:96%!important;left:2%!important;right:auto!important;bottom:0!important}
    .stage-image .actor.dance095b{max-width:86%!important;max-height:96%!important;left:7%!important;right:auto!important;bottom:0!important}
    .stage-image .actor.perch095b{max-width:30%!important;max-height:46%!important;right:4%!important;bottom:3%!important}
    @media(max-width:760px){
      .stage-image .actor.combo095b{max-width:57%!important;left:1%!important}
      .stage-image .actor.dance095b{max-width:92%!important;left:4%!important}
      .stage-image .actor.perch095b{max-width:31%!important;right:2%!important}
    }
  `;document.head.appendChild(style);
}

function decorate(){patchStatFlavors();patchOnionEmoji(document.body)}

function apply095b(){
  patchItems();
  patchSceneActors(CHAPTER2_SCENES);
  patchSceneActors(CHAPTER3_SCENES);
  forceKnownScenes();
  addCss();
  // v0.9.5p: keep initial decoration only. No broad MutationObserver on document.body.
  decorate();
}

queueMicrotask(apply095b);
