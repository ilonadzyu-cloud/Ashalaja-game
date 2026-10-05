// v0.9.5k – chapter 1 logic cleanup, stable stage layout, Galina onion gift,
// custom garlic art, wake mourner art, and the requested shop assortment.
import {CHAPTER1_SCENES} from './chapter1.js?v=096b';
import {CHAPTER2_SCENES} from './chapter2.js?v=096b';
import {CHAPTER3_SCENES} from './chapter3.js?v=096b';
import {ITEM_DEFS} from './data.js?v=096b';

const A095K={
  garlic:{cool:'./garlic_cool_095k.webp',angry:'./garlic_angry_095k.webp'},
  wake:{bowl:'./wake_woman_bowl_095k.webp',idle:'./wake_woman_idle_095k.webp'}
};
const asArray=x=>Array.isArray(x)?x:[];
const hasRole=(a,role)=>String(a?.role||'').split(/\s+/).includes(role);
const itemCount=(s,id)=>(s?.inventory||[]).filter(x=>x.id===id).reduce((n,x)=>n+Number(x.qty||0),0);

function addClass(a,cls){
  const set=new Set(String(a?.role||'').split(/\s+/).filter(Boolean));set.add(cls);return {...a,role:[...set].join(' ')};
}
function replacePigeonPosition(scene,positionClass){
  if(!scene)return;
  const patch=xs=>asArray(xs).map(a=>hasRole(a,'pigeon')?addClass({...a,position:positionClass},positionClass):a);
  const old=scene.actors;
  scene.actors=typeof old==='function'?(s=>patch(old(s))):patch(old);
}
function wrapChoices(scene,fn){
  if(!scene)return;const old=scene.choices;
  scene.choices=s=>fn(typeof old==='function'?asArray(old(s)):asArray(old),s);
}
function mergeEnter(scene,fn){
  if(!scene)return;const old=scene.onEnter;
  scene.onEnter=s=>[...(typeof old==='function'?asArray(old(s)):asArray(old)),...asArray(fn(s))];
}

function patchChapter1WaterLogic(){
  const S=CHAPTER1_SCENES;
  if(S.hub){
    S.hub.text=s=>`Перед вами сільська хатина й криниця.\n\n${s.flags?.knowsPigeonName?'Євпапій':'Голуб'} теж нікуди не дівся.`;
    wrapChoices(S.hub,(xs,s)=>{
      const out=[];
      for(const c of xs){
        if(c?.id==='hub_well')out.push({...c,label:'Шукати воду.',next:'waterSearch095k'});
        else if(c?.id==='hub_puddle')continue;
        else out.push(c);
      }
      return out;
    });
    S.waterSearch095k={
      ...S.hub,id:'waterSearch095k',caption:'де тут вода',
      text:`Ви оглядаєтесь, де тут можна попити. Біля хати є криниця. Трохи далі на дорозі після дощу лишилась калюжа.`,
      choices:s=>{
        const out=[{id:'water095k_well',label:'Піти до криниці.',next:'well',minutes:5,activity:'walk'}];
        if(!s.flags?.donePuddle)out.push({id:'water095k_puddle',label:'Напитись з калюжі.',next:'puddle'});
        out.push({id:'water095k_back',label:'Передумати.',next:'hub'});return out;
      }
    };
  }
  if(S.puddle){
    S.puddle.text=`Ви присідаєте біля калюжі.\n\nЄвпапій дивиться на вас так, ніби навіть у нього є якісь стандарти.\n\n– Ти серйозно?\n\n– А шо?\n\n– Та нічо. Пий.\n\nВода мутна, холодна, і бридка на смак.\n\nЄвпапій мовчить секунд п’ять.\n\n– Тут собака зранку сцяла.\n\nСука.`;
  }
  // State replies should lead to the same broader water search, not pretend the only option is the well.
  for(const id of ['state_hangover_short','state_pigeon_debt']){
    const sc=S[id];if(!sc||!Array.isArray(sc.choices))continue;
    sc.choices=sc.choices.map(c=>({...c,label:'Шукати воду.',next:'waterSearch095k'}));
  }
}

function patchPigeonHandText(){
  const C1=CHAPTER1_SCENES,C2=CHAPTER2_SCENES,C3=CHAPTER3_SCENES;
  if(C1.shoulder){
    if(typeof C1.shoulder.text==='string')C1.shoulder.text=C1.shoulder.text.replace('сідає на плече','сідає вам на руку');
    replacePigeonPosition(C1.shoulder,'pigeon-hand095k');
  }
  if(C2.ch2_legend){
    if(typeof C2.ch2_legend.text==='string')C2.ch2_legend.text=C2.ch2_legend.text.replace('сидить у вас на плечі','сидить у вас на руці');
    replacePigeonPosition(C2.ch2_legend,'pigeon-hand095k');
  }
  // These scenes never say that he sits on the shoulder, so keep him at the normal right-side slot.
  replacePigeonPosition(C3.ch3_call_pigeon,'pigeon-right095k');
  replacePigeonPosition(C3.ch3_ask_pigeon,'pigeon-right095k');
}

function patchGalinaGift(){
  const S=CHAPTER1_SCENES;
  const sc=S.galinaHolyWater;if(!sc)return;
  sc.caption='цибульний набір';
  sc.text=`Баба Галя вже ніби збирається відпустити вас, але потім передумує й дістає ще дві цибулини.\n\nОдну таку злу на єбало, шо ви навіть питати не хочете. Друга пахне так, що Євпапій з надвору ображено кашляє.\n\n– І це забери.\n\n– На шо мені дві цибулі?\n\n– Згодяться.\n\n– Вони ж ненормальні.\n\n– Тим більше згодяться.\n\nНу ладно.`;
  sc.onEnter=s=>{
    const out=[];
    if(!itemCount(s,'onion_angry'))out.push({type:'itemAdd',id:'onion_angry',qty:1});
    if(!itemCount(s,'onion_smelly'))out.push({type:'itemAdd',id:'onion_smelly',qty:1});
    out.push({type:'flag',key:'galinaOnions095k',value:true});
    return out;
  };
  sc.notice={title:'ОТРИМАНО: ЦИБУЛЯ ×2',body:'Зла цибуля ×1 · Вонюча цибуля ×1'};
  sc.choices=[{id:'galina095k_onions_next',label:'Забрати й піти.',next:'ch2_intro'}];

  // Old saves that reached chapter 2 with the former holy-water gift get converted once.
  mergeEnter(CHAPTER2_SCENES.ch2_intro,s=>{
    if(s.flags?.onionGiftMigration095k||!s.flags?.holyWaterGift)return[];
    const out=[{type:'flag',key:'onionGiftMigration095k',value:true},{type:'itemRemove',id:'holy_water',qty:1}];
    if(!itemCount(s,'onion_angry'))out.push({type:'itemAdd',id:'onion_angry',qty:1});
    if(!itemCount(s,'onion_smelly'))out.push({type:'itemAdd',id:'onion_smelly',qty:1});
    return out;
  });
}

function patchWakeWoman(){
  const S=CHAPTER3_SCENES;
  const addWake=(scene,src,cls)=>{
    if(!scene)return;const old=scene.actors;
    const adder=xs=>{
      const arr=asArray(xs).filter(a=>!String(a?.role||'').includes('wake-woman095k'));
      arr.push({role:`npc wake-woman095k ${cls}`,src,position:'npc'});return arr;
    };
    scene.actors=typeof old==='function'?(s=>adder(old(s))):adder(old);
  };
  addWake(S.ch3_wake_crowd,A095K.wake.bowl,'wake-bowl095k');
  addWake(S.ch3_evp_missing,A095K.wake.idle,'wake-idle095k');
}

function normaliseSceneActorRoles(){
  const normalise=(xs)=>{
    const arr=asArray(xs).map(a=>{
      if(!a||typeof a!=='object')return a;
      if(hasRole(a,'hero'))return addClass(a,'layout-hero095k');
      if(hasRole(a,'pigeon'))return addClass(a,'layout-pigeon095k');
      if(hasRole(a,'npc'))return addClass(a,'layout-npc095k');
      return a;
    });
    const npcs=arr.filter(a=>hasRole(a,'npc'));
    if(npcs.length>1){
      let seen=0;
      return arr.map(a=>hasRole(a,'npc')?addClass(a,seen++===0?'npc-near095k':'npc-far095k'):a);
    }
    return arr;
  };
  for(const book of [CHAPTER1_SCENES,CHAPTER2_SCENES,CHAPTER3_SCENES]){
    for(const scene of Object.values(book||{})){
      if(!scene||!scene.actors)continue;const old=scene.actors;
      scene.actors=typeof old==='function'?(s=>normalise(old(s))):normalise(old);
    }
  }
}

function patchGarlicDefs(){
  if(!ITEM_DEFS.garlic)return;
  ITEM_DEFS.garlic.art=A095K.garlic.cool;
  ITEM_DEFS.garlic.icon=`<img class="garlic-inline095k" src="${A095K.garlic.cool}" alt="часник">`;
  ITEM_DEFS.garlic.description='Часник. У бою можна кинути. ТРУПОСМЕРДу дуже не подобається.';
}

function iconHtml095k(id){
  const d=ITEM_DEFS[id];
  if(id==='garlic')return `<img class="shop-art095k" src="${A095K.garlic.cool}" alt="часник">`;
  if(id==='onion')return `<img class="shop-art095k" src="./onion_normal_095.webp" alt="цибуля">`;
  return `<span class="shop-emoji095k">${d?.icon||''}</span>`;
}
function patchShop(){
  const grid=document.querySelector('.shop-grid');
  if(!grid||grid.dataset.shop095k==='1')return;
  const bridge=grid.querySelector('[data-buy]');
  if(!bridge||typeof bridge.onclick!=='function')return;
  grid.dataset.shop095k='1';
  const items=[['salo',4],['water',4],['vodka',8],['garlic',4],['onion',2]];
  grid.innerHTML=items.map(([id,price])=>`<article class="item-card shop-item095k"><div class="item-icon">${iconHtml095k(id)}</div><div class="item-copy"><b>${ITEM_DEFS[id].name}</b><span>${price} мон.</span><button type="button" data-buy095k="${id}" data-price095k="${price}">Купити</button></div></article>`).join('');
  grid.querySelectorAll('[data-buy095k]').forEach(btn=>btn.onclick=async()=>{
    bridge.dataset.buy=btn.dataset.buy095k;bridge.dataset.price=btn.dataset.price095k;await bridge.onclick();
  });
}

function replaceGarlicEmoji(root=document){
  root.querySelectorAll?.('.item-card').forEach(card=>{
    if(!/часник/i.test(card.textContent||''))return;const icon=card.querySelector('.item-icon');if(!icon)return;
    if(icon.querySelector('img.garlic-card095k'))return;
    icon.innerHTML=`<img class="garlic-card095k" src="${A095K.garlic.cool}" alt="часник">`;
  });
  root.querySelectorAll?.('.quick-slot:not(.empty)').forEach(btn=>{
    if(!/часник/i.test(btn.textContent||''))return;if(btn.querySelector('img.garlic-quick095k'))return;
    const qty=(btn.textContent.match(/×\s*\d+/)||[''])[0];
    btn.innerHTML=`<img class="garlic-quick095k" src="${A095K.garlic.cool}" alt="часник"> <span>Часник</span>${qty?` <b>${qty}</b>`:''}`;
  });
  const battle=document.querySelector('#battleTestOverlay');
  if(battle){
    const walker=document.createTreeWalker(battle,NodeFilter.SHOW_TEXT);const nodes=[];let n;
    while((n=walker.nextNode()))if(n.nodeValue?.includes('🧄'))nodes.push(n);
    for(const node of nodes){
      const bits=node.nodeValue.split('🧄'),frag=document.createDocumentFragment();
      bits.forEach((bit,i)=>{if(i){const img=document.createElement('img');img.className='garlic-battle095k';img.src=A095K.garlic.angry;img.alt='часник';frag.appendChild(img)}if(bit)frag.appendChild(document.createTextNode(bit))});
      node.replaceWith(frag);
    }
  }
}

function syncStageClass(){
  const stage=document.querySelector('#stageImage');if(!stage)return;
  const actors=[...stage.querySelectorAll('.actor')];
  const hasP=actors.some(a=>a.classList.contains('pigeon'));
  const npcs=actors.filter(a=>a.classList.contains('npc')).length;
  stage.classList.toggle('has-pigeon095k',hasP);
  stage.classList.toggle('multi-npc095k',npcs>1);
  actors.forEach(a=>{
    if(a.classList.contains('hero'))a.classList.add('layout-hero095k');
    if(a.classList.contains('pigeon'))a.classList.add('layout-pigeon095k');
    if(a.classList.contains('npc'))a.classList.add('layout-npc095k');
  });
}

function addCss(){
  if(document.querySelector('#patch095kcss'))return;
  const s=document.createElement('style');s.id='patch095kcss';s.textContent=`
    .garlic-inline095k,.garlic-battle095k{width:28px;height:28px;object-fit:contain;vertical-align:-7px;margin-right:4px}
    .garlic-card095k,.shop-art095k{width:48px;height:48px;object-fit:contain;display:block;margin:auto}
    .garlic-quick095k{width:24px;height:24px;object-fit:contain;vertical-align:middle;flex:0 0 auto}
    .shop-emoji095k{font-size:2rem;line-height:1}

    /* Stable story-stage slots: hero left, everybody else right. */
    .stage-image .actor.layout-hero095k:not(.dance095b):not(.dance095f):not(.combo095b){
      left:2%!important;right:auto!important;bottom:0!important;width:42%!important;height:90%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:left bottom!important;transform:none!important;
    }
    .stage-image .actor.layout-pigeon095k:not(.pigeon-hand095k):not(.pigeon-head095k){
      left:auto!important;right:3%!important;bottom:4%!important;width:23%!important;height:36%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:right bottom!important;transform:none!important;
    }
    .stage-image .actor.layout-npc095k{
      left:auto!important;right:4%!important;bottom:0!important;width:38%!important;height:88%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:right bottom!important;transform:none!important;
    }
    .stage-image.has-pigeon095k .actor.layout-npc095k{right:17%!important;width:34%!important}
    .stage-image.multi-npc095k .actor.layout-npc095k.npc-near095k{right:20%!important;width:31%!important}
    .stage-image.multi-npc095k .actor.layout-npc095k.npc-far095k{right:1%!important;width:27%!important}
    .stage-image .actor.layout-pigeon095k.pigeon-hand095k{
      left:29%!important;right:auto!important;bottom:37%!important;width:18%!important;height:23%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center bottom!important;transform:none!important;z-index:4!important;
    }
    .stage-image .actor.layout-pigeon095k.pigeon-head095k{
      left:18%!important;right:auto!important;bottom:63%!important;width:18%!important;height:22%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;transform:none!important;z-index:4!important;
    }
    .stage-image .actor.wake-woman095k{filter:none!important}

    /* In combat the enemy owns the centre and never looks like a tiny far-away sticker. */
    #battleTestOverlay .battle-figure{display:flex!important;align-items:flex-end!important;justify-content:center!important;overflow:visible!important}
    #battleTestOverlay .battle-figure [data-enemy-art]{position:static!important;width:72%!important;height:94%!important;max-width:390px!important;max-height:94%!important;object-fit:contain!important;object-position:center bottom!important;margin:0 auto!important;transform:none!important}

    @media(max-width:760px){
      .stage-image .actor.layout-hero095k:not(.dance095b):not(.dance095f):not(.combo095b){width:43%!important;height:90%!important;left:1%!important}
      .stage-image .actor.layout-pigeon095k:not(.pigeon-hand095k):not(.pigeon-head095k){width:24%!important;height:37%!important;right:2%!important}
      .stage-image .actor.layout-npc095k{width:39%!important;height:89%!important;right:2%!important}
      .stage-image.has-pigeon095k .actor.layout-npc095k{right:18%!important;width:34%!important}
      .stage-image.multi-npc095k .actor.layout-npc095k.npc-near095k{right:20%!important;width:31%!important}
      .stage-image.multi-npc095k .actor.layout-npc095k.npc-far095k{right:0!important;width:27%!important}
      .stage-image .actor.layout-pigeon095k.pigeon-hand095k{left:29%!important;bottom:36%!important;width:19%!important;height:24%!important}
      #battleTestOverlay .battle-figure [data-enemy-art]{width:78%!important;max-width:330px!important;height:95%!important}
    }
  `;document.head.appendChild(s);
}

function installObservers(){
  // v0.9.5p: WebKit-safe. No MutationObserver on the live game DOM.
  const run=()=>{patchShop();replaceGarlicEmoji(document);syncStageClass()};
  run();
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-tab="shop"],#menuBtn,.quick-slot')) setTimeout(run,0);
  },{passive:true});
}
function warm(){for(const src of [A095K.garlic.cool,A095K.garlic.angry,A095K.wake.bowl,A095K.wake.idle]){const i=new Image();i.src=src}}
function stamp(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5k')}

function apply095k(){
  patchChapter1WaterLogic();patchPigeonHandText();patchGalinaGift();patchWakeWoman();patchGarlicDefs();normaliseSceneActorRoles();addCss();warm();installObservers();stamp();
}
queueMicrotask(apply095k);
