// v0.9.5e – restore Ilona's exact stat flavour lines.
const EXACT_STAT_FLAVOR_095E = {
  'Сила': 'Поки ше не Геракл',
  'Уважність': 'Навички Шерлока так собі',
  'Спритність': 'Не навернулись – уже добре'
};

function fixExactStatFlavor095e(){
  document.querySelectorAll('.stat-upgrade-card').forEach(card=>{
    const label=(card.querySelector('.stat-head b')?.textContent||'').trim();
    const wanted=EXACT_STAT_FLAVOR_095E[label];
    if(!wanted)return;
    const el=card.querySelector('.stat-flavor');
    if(el && el.textContent!==wanted)el.textContent=wanted;
  });
}

function stamp095e(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5e');
}

function apply095e(){
  fixExactStatFlavor095e();
  stamp095e();
  // v0.9.5p: no live MutationObserver. The exact labels are applied when this patch loads.
}

queueMicrotask(apply095e);
