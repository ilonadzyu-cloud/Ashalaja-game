// v0.9.5n – startup hotfix/version stamp.
function stamp095n(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5n')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp095n,{once:true});else queueMicrotask(stamp095n);
