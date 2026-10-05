// v0.9.5o – Safari/WebKit stage-render freeze hotfix.
// The actual loop fix lives in the replaced patch-v095i.js and patch-v095k.js.
function stamp095o(){document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5o')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp095o,{once:true});else queueMicrotask(stamp095o);
