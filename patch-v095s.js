// v0.9.5s – character visibility + item discovery + immersive UI labels.
// No story rewrite: this patch only restores visual actors, item knowledge states and UI wording.
import {ITEM_DEFS} from './data.js?v=093';

const UNKNOWN_IDS=['garlic','onion','onion_angry','onion_smelly','potion_unknown'];
const KNOWN={
  garlic:{category:'Зброя',description:'ТРУПОСМЕРДу дуже не подобається.'},
  onion:{category:'Зброя',name:'Дивна цибуля',description:'Після кидка ворог погано бачить 1 хід.'},
  onion_angry:{category:'Зброя',description:'Вгризається й продовжує кусати.'},
  onion_smelly:{category:'Зброя',description:'Від неї можна й вирубитись.'}
};
let activeRun095s=null;

function setUnknown095s(){
  for(const id of UNKNOWN_IDS){
    const d=ITEM_DEFS[id];if(!d)continue;
    d.category='Якась хуйня';
    d.description='???';
  }
  if(ITEM_DEFS.onion)ITEM_DEFS.onion.name='Дивна цибуля';
  if(ITEM_DEFS.potion_unknown){ITEM_DEFS.potion_unknown.name='??? Зілля';ITEM_DEFS.potion_unknown.unknown=true}
}

function applyKnown095s(state){
  setUnknown095s();
  const flags=state?.flags||{};
  for(const [id,meta] of Object.entries(KNOWN)){
    if(!flags[`itemKnown095s_${id}`])continue;
    const d=ITEM_DEFS[id];if(!d)continue;
    Object.assign(d,meta);
  }
}

function readLocalRun095s(run){
  if(!run)return null;
  try{
    const raw=localStorage.getItem(`des-ne-tam-v3:run:${run}:auto`);
    return raw?JSON.parse(raw):null;
  }catch{return null}
}

function syncRunKnowledge095s(){
  if(!activeRun095s){setUnknown095s();return}
  applyKnown095s(readLocalRun095s(activeRun095s));
}

function detectRun095s(target){
  const card=target?.closest?.('.run-card');
  if(card){const m=(card.textContent||'').match(/Проходження\s+(\d+)/i);if(m)activeRun095s=Number(m[1])}
  const manual=target?.closest?.('[data-start-manual]');
  if(manual){const m=String(manual.dataset.startManual||'').match(/^(\d+):/);if(m)activeRun095s=Number(m[1])}
}

function patchImmersionLabels095s(root=document){
  const scopes=[];
  for(const sel of ['#menuOverlay','#battleTestOverlay']){const el=root.querySelector?.(sel)||document.querySelector(sel);if(el)scopes.push(el)}
  for(const scope of scopes){
    const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);const nodes=[];let n;
    while((n=walker.nextNode()))nodes.push(n);
    for(const node of nodes){
      const t=node.nodeValue||'';
      if(t.includes('ГЕРОЙ · РІВЕНЬ'))node.nodeValue=t.replaceAll('ГЕРОЙ · РІВЕНЬ','ВИ · РІВЕНЬ');
      else if(t.includes('Тут – усе, що герой уже відкрив.'))node.nodeValue=t.replaceAll('Тут – усе, що герой уже відкрив.','Тут – усе, що ви вже відкрили.');
      else if(t.trim()==='ГЕРОЙ')node.nodeValue=t.replace('ГЕРОЙ','ВИ');
      else if(t.trim()==='Герой')node.nodeValue=t.replace('Герой','Ви');
    }
    scope.querySelectorAll?.('img[alt="Герой"],img[alt="герой"]').forEach(img=>img.alt='Ви');
  }
}

function addCss095s(){
  if(document.querySelector('#patch095scss'))return;
  const s=document.createElement('style');s.id='patch095scss';s.textContent=`
    /* v095l used to hide Євпапій globally. Participating actors are visible again. */
    .stage-image .actor.pigeon{display:block!important}
  `;document.head.appendChild(s);
}

function installSafeHooks095s(){
  // No MutationObserver: these are simple click hooks so Safari does not get another render loop.
  document.addEventListener('click',e=>{
    detectRun095s(e.target);
    const menu=e.target.closest?.('#menuBtn');
    if(menu)syncRunKnowledge095s();
    if(e.target.closest?.('#beginGameBtn'))setTimeout(syncRunKnowledge095s,60);
    if(e.target.closest?.('#menuOverlay button,#menuBtn'))setTimeout(()=>patchImmersionLabels095s(document),0);
  },true);
}

function stamp095s(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5s')}
function apply095s(){setUnknown095s();addCss095s();patchImmersionLabels095s(document);installSafeHooks095s();stamp095s()}
queueMicrotask(apply095s);
