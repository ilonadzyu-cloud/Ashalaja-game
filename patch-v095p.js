// v0.9.5p – WebKit launch hotfix only. No story/content changes.
function stamp095p(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5p')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp095p,{once:true});else queueMicrotask(stamp095p);
