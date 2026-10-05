// v0.9.5t – restore Ilona's exact stat flavour phrases after every stats render.
// No story, save, battle or scene logic changes.

function fixStatFlavor095t(){
  document.querySelectorAll('.stat-upgrade-card').forEach(card=>{
    const label=(card.querySelector('.stat-head b')?.textContent||'').trim();
    const levelText=(card.querySelector('.stat-level')?.textContent||'');
    const level=Number((levelText.match(/Рівень\s+(\d+)/i)||[])[1]||0);
    const flavor=card.querySelector('.stat-flavor');
    if(!flavor)return;

    if(label==='Сила'){
      flavor.textContent=level>=3
        ? 'Можна підняти Євпапія і не буде грижі'
        : 'Пока ще не Геракл';
    }else if(label==='Уважність'){
      flavor.textContent='Шерлок з вас так собі';
    }else if(label==='Спритність'){
      flavor.textContent='Не навернувся – вже добре';
    }
  });
}

function installStatHooks095t(){
  const run=()=>setTimeout(fixStatFlavor095t,0);
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#menuBtn,#menuOverlay button,[data-stat-upgrade]'))run();
  },true);
  run();
}

function stamp095t(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5t');
}

function apply095t(){
  installStatHooks095t();
  stamp095t();
}
queueMicrotask(apply095t);
