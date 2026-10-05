// v0.9.5i – preload stage art so visuals pop in together without stagger.
const P095I_ASSETS=[
  './creature_attack_095f.webp','./creature_battle_095c.webp','./creature_bullshit_095f.webp','./creature_clean_095b.webp',
  './creature_dance_095f.webp','./creature_garlic_battle_095f.webp','./creature_garlic_story_095f.webp','./creature_hit_095f.webp',
  './creature_normal_095c.webp','./creature_normal_095f.webp','./creature_smelly_095f.webp','./creature_vodka_095f.webp',
  './galina_base.png','./hero_annoyed_095.webp','./hero_creature_dance_095b.webp','./hero_injured_095.webp','./hero_laugh_095.webp',
  './hero_pee_095b.webp','./hero_pigeon_head_095b.webp','./hero_scare_095b.webp','./hero_shocked_095.webp','./hero_shrug_095.webp',
  './hero_side_worried_095b.webp','./hero_sit_095b.webp','./hero_worried_095.webp','./man_base.png',
  './onion_angry_095.webp','./onion_normal_095.webp','./onion_smelly_095.webp',
  './pigeon_angry_095b.webp','./pigeon_attack_095.webp','./pigeon_base_095b.webp','./pigeon_confused_095b.webp','./pigeon_gasp_095b.webp',
  './pigeon_perch_095b.webp','./pigeon_salo_095.webp','./pigeon_serious.png','./pigeon_sideeye_095b.webp','./pigeon_smug_095.webp',
  './pigeon_talk_095b.webp','./wake_table_095c.webp','./ch2_unknown_v2.png','./creature_normal_095f.webp','./hero-face.png'
];

const loaded095i=new Map();
function loadArt095i(src){
  if(!src || /^data:/.test(src)) return Promise.resolve();
  if(loaded095i.has(src)) return loaded095i.get(src);
  const p=new Promise(resolve=>{
    const img=new Image();
    img.decoding='async';
    img.loading='eager';
    const done=()=>{
      if(typeof img.decode==='function') img.decode().catch(()=>{}).finally(resolve);
      else resolve();
    };
    img.onload=done;
    img.onerror=resolve;
    img.src=src;
    if(img.complete) done();
  });
  loaded095i.set(src,p);
  return p;
}
function urlsFromBg095i(value=''){
  return [...String(value).matchAll(/url\((['"]?)(.*?)\1\)/g)].map(m=>m[2]).filter(Boolean);
}
function addCss095i(){
  if(document.querySelector('#patch095icss')) return;
  const style=document.createElement('style');
  style.id='patch095icss';
  style.textContent=`
    .stage-image,.stage-image .actor,.stage-image img{
      transition:none!important;animation:none!important;
    }
    .stage-image.sync-pending095i{
      opacity:0!important;
    }
  `;
  document.head.appendChild(style);
}
function eagerizeStage095i(stage){
  stage.querySelectorAll('img').forEach(img=>{
    try{img.loading='eager';img.decoding='sync';img.fetchPriority='high';}catch(e){}
  });
}
function installStageSync095i(){
  const stage=document.querySelector('#stageImage');
  if(!stage || stage.dataset.sync095i==='1') return;
  stage.dataset.sync095i='1';
  let tick=0;
  let raf=0;
  let queueRaf=0;
  const sync=()=>{
    const my=++tick;
    stage.classList.add('sync-pending095i');
    eagerizeStage095i(stage);
    const urls=new Set();
    urlsFromBg095i(getComputedStyle(stage).backgroundImage).forEach(u=>urls.add(u));
    stage.querySelectorAll('img').forEach(img=>{ if(img.currentSrc||img.src) urls.add(img.currentSrc||img.src); });
    Promise.all([...urls].map(loadArt095i)).finally(()=>{
      if(my!==tick) return;
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        if(my!==tick) return;
        stage.classList.remove('sync-pending095i');
      });
    });
  };
  const queue=()=>{
    cancelAnimationFrame(queueRaf);
    queueRaf=requestAnimationFrame(()=>{queueRaf=0;sync()});
  };
  // Do not observe the stage class attribute: sync() itself adds/removes
  // sync-pending095i, and observing that class creates a self-triggering loop.
  new MutationObserver(queue).observe(stage,{childList:true,subtree:true,attributes:true,attributeFilter:['style','src']});
  stage.addEventListener('load',queue,true);
  queue();
}
function warmup095i(){ Promise.allSettled(P095I_ASSETS.map(loadArt095i)); }
function stamp095i(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5i');
}
function apply095i(){ addCss095i(); /* v0.9.5p: stage preload/sync disabled to prevent WebKit freeze */ stamp095i(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply095i,{once:true});
else queueMicrotask(apply095i);
