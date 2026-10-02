export const STATUS_DEFS={
  hangover:{
    name:'ЖОСТКИЙ БУДУНЯРА',
    blurb:'Бувало і краще.',
    mods:{attention:-2,agility:-1,pofigism:2},
    drainMultipliers:{water:1.25},
    extraEffects:['Вода витрачається на 25% швидше.'],
    remove:'поїсти, попити й трохи прийти до тями.'
  },
  pigeonHumiliated:{
    name:'СРАНИЙ ГОЛУБ ВАС ПРИНИЗИВ',
    blurb:'Ну буває.',
    mods:{charisma:-1,pofigism:1},
    remove:'помитись або змінити обісрану одежину.'
  },
  dryMouth:{name:'СУШНЯК',blurb:'Сушить.',mods:{attention:-1},remove:'попити.'},
  yebatorium:{
    name:'ОСТАНОВОЧКА ЄБАТОРІУМ',
    blurb:'Після такого ви вже готові перевіряти будь-яку хуйню.',
    mods:{attention:1,pofigism:1,ahui:1},
    remove:'сам пройде через 30 ігрових хвилин.',
    durationMinutes:30,
    persistentUnlock:'yebatorium'
  },
  scared:{
    name:'ОБСЕРУНЬКАВСЯ ВІД СТРАХУ',
    blurb:'Страшно капець.',
    mods:{attention:2,agility:1,pofigism:-2,charisma:-1},
    durationMinutes:20,
    remove:'сам пройде через 20 ігрових хвилин.'
  },
  wet:{name:'ПРОМОК',blurb:'Одяг мокрий і це вже починає бісити.',mods:{},remove:'висохнути або змінити мокрий одяг.'},
  cold:{name:'ЗМЕРЗ',blurb:'Пальці вже не дуже слухаються.',mods:{agility:-1},remove:'зігрітись і висохнути.'},
  overheated:{name:'ПЕРЕГРІВ',blurb:'Жарко пиздець.',mods:{attention:-1},remove:'піти в тінь, охолонути й попити.'},
  tired:{name:'ЗАЄБАВСЯ',blurb:'Спати вже хочеться.',mods:{attention:-1,agility:-1},remove:'відпочити.'},
  hungry:{name:'ГОЛОДНИЙ',blurb:'Їсти хочеться пиздець.',mods:{strength:-1,attention:-1},remove:'поїсти.'},
  angry:{name:'ЗЛИЙ ЯК СОБАКА',blurb:'Хтось явно дістав.',mods:{strength:1,charisma:-1},remove:'коли попустить.'},
  suspicious:{name:'ШОСЬ ТУТ НЕ ТАК',blurb:'Підозріло.',mods:{attention:1},remove:'коли розберетесь або переключитесь.'},
  skunk:{name:'ДИКИЙ СКУНС',blurb:'Від вас несе так, що люди самі тримають дистанцію.',mods:{charisma:-2},remove:'помитись і змінити одяг.'},
  tipsy:{name:'ПІД ШОФЕ',blurb:'Уже веселіше. Це не значить, що краще.',mods:{pofigism:2,charisma:1,attention:-1},durationMinutes:90,remove:'сам пройде через 90 ігрових хвилин.'}
};

export const CLOTHES={
  modern_shirt:{name:'Ваша сорочка',slot:'body',armor:0,warmth:0,heatBurden:0,rainProtection:0,note:'Те, в чому ви сюди якось приперлись.'},
  modern_jacket:{name:'Ваша куртка',slot:'outer',armor:0,warmth:1,heatBurden:0,rainProtection:1,note:'До зустрічі з голубом була нормальна.'},
  modern_pants:{name:'Ваші штани',slot:'legs',armor:0,warmth:1,heatBurden:0,rainProtection:0},
  modern_boots:{name:'Ваші черевики',slot:'feet',armor:0,warmth:1,heatBurden:0,rainProtection:1},

  local_shirt:{
    name:'Місцева сорочка',slot:'body',armor:0,warmth:0,heatBurden:0,rainProtection:0,
    note:'Люди менше дивляться скоса.'
  },
  local_vest:{name:'Темна безрукавка',slot:'outer',armor:0,warmth:1,heatBurden:0,rainProtection:0},
  local_pants:{name:'Місцеві штани',slot:'legs',armor:0,warmth:1,heatBurden:0,rainProtection:0},
  boots:{name:'Грубі чоботи',slot:'feet',armor:1,warmth:1,heatBurden:0,rainProtection:2},

  sheepskin:{name:'Товстий кожух',slot:'outer',armor:1,warmth:4,heatBurden:3,rainProtection:1,statMods:{agility:-1}},
  leather_vest:{name:'Шкіряний жилет',slot:'outer',armor:2,warmth:1,heatBurden:1,rainProtection:0}
};

export const ITEM_DEFS={
  water:{
    name:'Вода',icon:'💧',category:'Їжа',stack:5,
    description:'Можна випити.',
    useEffects:[{type:'need',key:'water',value:30}]
  },
  salo:{
    name:'Сало',icon:'🥓',category:'Їжа',stack:5,
    description:'Можна зʼїсти.',
    useEffects:[{type:'need',key:'satiety',value:25}]
  },
  vodka:{name:'Водка',icon:'🍾',category:'Їжа',stack:2,description:'Пахне так, що вже страшно.',useEffects:[{type:'statusAdd',id:'tipsy'}]},
  aspirin:{name:'Аспірин',icon:'💊',category:'Медицина',stack:5,description:'Може трохи помогти від голови.'},
  medkit:{name:'Аптечка',icon:'🩹',category:'Медицина',stack:2,description:'На випадок, якщо вже нормально так припече.',useEffects:[{type:'health',value:25}]},
  knife:{name:'Ніж',icon:'🔪',category:'Зброя',stack:1,description:'Інструмент. І зброя. Залежить, шо ви надумали.'},
  garlic:{name:'Часник',icon:'🧄',category:'Якась хуйня',stack:5,description:'Часник.'},
  onion:{name:'Цибуля',icon:'🧅',category:'Якась хуйня',stack:5,description:'Звичайна цибуля. Пока що.'},
  holy_water:{name:'Свята вода',icon:'✝️',category:'Якась хуйня',stack:3,description:'Ну, хай буде.'},
  potion_unknown:{name:'??? Зілля',icon:'🧪',category:'Якась хуйня',stack:3,description:'Ефект: невідомий.',unknown:true}
};

export const WEATHER_PRESETS={
  mild:{label:'Хмарно',icon:'☁️',tempC:16,wind:1,rain:0},
  rain:{label:'Дощ',icon:'🌧️',tempC:11,wind:2,rain:3},
  cold:{label:'Холодно',icon:'🌫️',tempC:4,wind:3,rain:0},
  hot:{label:'Спека',icon:'☀️',tempC:31,wind:1,rain:0}
};
