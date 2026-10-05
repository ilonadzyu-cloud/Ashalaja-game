// v0.9.5h – make Євпапій's ancient-pigeon/cat story mandatory before state replies.
import {CHAPTER1_SCENES} from './chapter1.js?v=096b';

const hasStatus=(s,id)=>Boolean(s?.activeStatuses?.includes(id));

function fixYapOrder(){
  const S=CHAPTER1_SCENES;
  const yap=S.yap;
  if(!yap)return;

  // The original yap text contains the joke about ancient pigeons and Galina's cat.
  // Make that scene mandatory. State-specific replies are offered only AFTER it.
  const afterId='yap_after_state_replies095h';
  S[afterId]={
    ...yap,
    id:afterId,
    caption:'електропізділка все ще активна',
    onEnter:[],
    text:'',
    choices:s=>{
      const out=[];
      if(hasStatus(s,'hangover')&&!s.flags?.usedHangoverShort){
        out.push({
          id:'state_hangover_short_choice_after095h',
          label:'[ЖОСТКИЙ БУДУНЯРА] Можна коротше? Мені і так хуйово.',
          next:'state_hangover_short',
          kind:'secret',
          hiddenEffects:[{type:'flag',key:'usedHangoverShort',value:true}]
        });
      }
      if(hasStatus(s,'pigeonHumiliated')&&!s.flags?.usedPigeonDebtLine){
        out.push({
          id:'state_pigeon_debt_choice_after095h',
          label:'[СРАНИЙ ГОЛУБ ВАС ПРИНИЗИВ] Мовчи, ти мені і так винний за те, шо куртку обісрав.',
          next:'state_pigeon_debt',
          kind:'secret',
          hiddenEffects:[{type:'flag',key:'usedPigeonDebtLine',value:true}]
        });
      }
      out.push({id:'yap_after_state_replies_continue095h',label:'Далі',next:'hub'});
      return out;
    }
  };

  // No state choice can jump out before the original Євпапій monologue has been shown.
  yap.choices=[{id:'yap_story_done095h',label:'Далі',next:afterId}];
}

function stamp(){
  document.querySelectorAll('.version,.howto-version,.game-name span').forEach(el=>el.textContent='v0.9.5h');
}

function apply095h(){fixYapOrder();stamp()}
queueMicrotask(apply095h);
