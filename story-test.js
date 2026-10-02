import {itemCount} from './engine.js';

/*
  Правило сюжетних вузлів:
  після вибору текст повинен відповідати САМЕ зробленій дії.
  Кілька пасивних шматків тексту обʼєднуємо до наступного реального рішення.
*/
export function coreActions(state){
  const actions=[
    {
      id:'watch_evpapiy',
      title:'[УВАЖНІСТЬ] Подивитись на Євпапія.',
      minutes:0,
      effects:[
        {type:'stat',key:'attention',value:1},
        {type:'relationshipDiscover',person:'evpapiy',key:'trust'}
      ],
      afterText:'Євпапій якось дуже різко перестає дивитись на сало. Жінку тим часом гукають від столу, і момент обривається.'
    },
    {
      id:'ask_legend',
      title:'Спитати жінку, шо значить «місцева лєгенда».',
      minutes:0,
      hiddenEffects:[{type:'relationship',person:'evpapiy',key:'offense',value:1}],
      afterText:'Жінка вже відкриває рот, але її гукають від столу. Вона відмахується й киває вам на лавку.'
    },
    {
      id:'walk_well',
      title:'Піти до криниці.',
      minutes:5,
      activity:'walk',
      afterText:'Ви доходите до криниці.'
    },
    {
      id:'carry_bench',
      title:'Потягти лавку.',
      minutes:5,
      activity:'work',
      effects:[{type:'stat',key:'strength',value:1}],
      afterText:'Лавку дотаскали.'
    },
    {
      id:'pigeon_bite',
      title:'Євпапій клюнув у палець.',
      minutes:0,
      effects:[{type:'damage',amount:1,ignoreArmor:true,label:'Здоровʼя'}],
      afterText:'Боляче рівно настільки, щоб ви ще раз згадали, яка він падла.'
    },
    {
      id:'unlock_yeb',
      title:'Отримати «ОСТАНОВОЧКА ЄБАТОРІУМ».',
      minutes:0,
      effects:[{type:'statusAdd',id:'yebatorium'}],
      afterText:'Після такого нормальні рішення вже не здаються єдиними.'
    },
    {
      id:'rest',
      title:'Перепочити.',
      minutes:30,
      activity:'rest',
      afterText:'Трохи відпочили.'
    }
  ];

  // Сало є реальною річчю: дія доступна тільки якщо воно є,
  // витрачає 1 шматок і бонус стосунків за цю сцену не фармиться повторно.
  if(itemCount(state,'salo')>0 && !state.flags.evpapiySaloGiven){
    actions.splice(5,0,{
      id:'salo_social',
      title:'Дати Євпапію сало.',
      minutes:0,
      hiddenEffects:[
        {type:'itemRemove',id:'salo',qty:1},
        {type:'relationship',person:'evpapiy',key:'trust',value:2},
        {type:'relationship',person:'evpapiy',key:'offense',value:-1},
        {type:'flag',key:'evpapiySaloGiven',value:true}
      ],
      afterText:'Євпапій сало взяв. По морді хуй поймеш, вдячний він чи просто вважає це належним.'
    });
  }

  if(state.unlocks.yebatorium){
    actions.splice(actions.length-1,0,{
      id:'yeb_knock',
      title:'[ЄБАТОРІУМ] Постукати у відповідь.',
      minutes:1,
      activity:'light',
      effects:[{type:'stat',key:'ahui',value:1}],
      hiddenEffects:[{type:'flag',key:'knockedBackAtShed',value:true}],
      afterText:'Тук-тук. Кілька секунд тиша. Потім зсередини – тук. Тук. Тук.'
    });
  }
  return actions;
}
