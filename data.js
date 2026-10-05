export const STATUS_DEFS={
  hangover:{
    name:'ЖОСТКИЙ БУДУНЯРА',portrait:'./portrait_base.png',blurb:'Бувало і краще.',
    mods:{attention:-2,agility:-1,pofigism:2},drainMultipliers:{water:1.25},
    extraEffects:['вода витрачається швидше'],remove:'поїсти, попити й трохи прийти до тями.'
  },
  pigeonHumiliated:{
    name:'СРАНИЙ ГОЛУБ ВАС ПРИНИЗИВ',portrait:'./portrait_angry.png',blurb:'Вас обісрав голуб. От і все.',
    mods:{charisma:-1,pofigism:1},remove:'випрати або змінити одяг.'
  },
  yebatorium:{
    name:'ОСТАНОВОЧКА ЄБАТОРІУМ',portrait:'./portrait_ahui.png',
    blurb:'Ви не готові це коментувати.',
    mods:{attention:1,pofigism:1,ahui:1},durationMinutes:30,persistentUnlock:'yebatorium',
    remove:'сам пройде через 30 ігрових хвилин.'
  },
  blessed:{
    name:'СВЯТА ВОДИЧКА ПРАЦЮЄ',portrait:'./portrait_base.png',
    blurb:'Баба Галя явно шось знала.',mods:{},negativeModShield:1,durationMinutes:60,
    extraEffects:['Мінуси до характеристик від хуйових станів стають на 1 слабші.'],
    remove:'ефект сам минає через 60 ігрових хвилин.'
  },
  scared:{
    name:'ОБСЕРУНЬКАВСЯ ВІД СТРАХУ',portrait:'./portrait_worry.png',blurb:'Страшно капець.',
    mods:{attention:2,agility:1,pofigism:-2,charisma:-1},durationMinutes:20,
    remove:'сам пройде через 20 ігрових хвилин.'
  },
  wet:{name:'ПРОМОК',portrait:'./portrait_worry.png',blurb:'Одяг мокрий і це вже починає бісити.',mods:{},remove:'висохнути або змінити мокрий одяг.'},
  cold:{name:'ЗМЕРЗ',portrait:'./portrait_tired.png',blurb:'Пальці вже не дуже слухаються.',mods:{agility:-1},remove:'зігрітись і висохнути.'},
  overheated:{name:'ПЕРЕГРІВ',portrait:'./portrait_tired.png',blurb:'Жарко пиздець.',mods:{attention:-1},remove:'піти в тінь, охолонути й попити.'},
  tired:{name:'ЗАЄБАВСЯ',portrait:'./portrait_tired.png',blurb:'Сил нема навіть ахуєвати.',mods:{attention:-1,agility:-1},remove:'поспати.'},
  hungry:{name:'ГОЛОДНИЙ',portrait:'./portrait_tired.png',blurb:'Їжа зараз була б дуже кстаті.',mods:{attention:-1},remove:'поїсти.'},
  thirsty:{name:'СУШНЯК',portrait:'./portrait_worry.png',blurb:'Пити хочеться пиздець.',mods:{attention:-1},remove:'випити води.'},
  angry:{name:'ЗЛИЙ',portrait:'./portrait_angry.png',blurb:'Настрій когось вʼєбати.',mods:{strength:2,pofigism:1,charisma:-2},remove:'заспокоїтись.'},
  suspicious:{name:'СОБАКА-ПОДОЗРЄВАКА',portrait:'./portrait_suspicious.png',blurb:'Шось тут не так.',mods:{attention:2,charisma:-1},remove:'коли відпустить.'},
  skunk:{name:'ДИКИЙ СКУНС',portrait:'./portrait_tired.png',blurb:'Помитись було б непогано.',mods:{pofigism:1,charisma:-3},remove:'нормально помитись.'},
  cowLicked:{
    name:'ВАС ОБЛИЗАЛА КОРОВА',portrait:'./portrait_base.png',blurb:'',
    mods:{strength:5,attention:5,agility:5,charisma:5,pofigism:5,ahui:5},
    durationMinutes:60,
    remove:'сам пройде через 1 ігрову годину.'
  },
  headInjury:{name:'РОЗБИТА ГОЛОВА',portrait:'./portrait_worry.png',blurb:'Голова гуде, на потилиці кров.',mods:{attention:-1,agility:-1},remove:'рану треба обробити й перевʼязати.'},
  bump:{name:'ШИШКА',portrait:'./portrait_worry.png',blurb:'Могло бути й гірше.',mods:{attention:-1},remove:'сама пройде з часом.'},
  tipsy:{name:'ПІД ГРАДУСОМ',portrait:'./portrait_base.png',blurb:'Ви під градусом.',mods:{pofigism:2,charisma:1,attention:-1,agility:-1},durationMinutes:90,remove:'90 ігрових хвилин після останньої горілки.'}
};

export const CLOTHES={
  modern_shirt:{name:'Сорочка з секонда',slot:'body',armor:0,warmth:0,heatBurden:0,rainProtection:0,note:'Ну сорочка і сорочка.'},
  modern_jacket:{name:'Замизгана куртка вашого діда',slot:'outer',armor:0,warmth:1,heatBurden:0,rainProtection:1,note:'Після голуба стала ще замизганішою.'},
  modern_pants:{name:'Штани потаскані',slot:'legs',armor:0,warmth:1,heatBurden:0,rainProtection:0},
  modern_boots:{name:'Черевички',slot:'feet',armor:0,warmth:1,heatBurden:0,rainProtection:1},
  local_shirt:{name:'Святкова сорочка невідомого покійника',slot:'body',armor:0,warmth:0,heatBurden:0,rainProtection:0,note:'Чия була – баба Галя так і не сказала.'},
  local_vest:{name:'Безрукавка з бабиної шафи',slot:'outer',armor:0,warmth:1,heatBurden:0,rainProtection:0},
  local_pants:{name:'Штани на виріст',slot:'legs',armor:0,warmth:1,heatBurden:0,rainProtection:0},
  boots:{name:'Чоботи для городу',slot:'feet',armor:1,warmth:1,heatBurden:0,rainProtection:2},
  sheepskin:{name:'Кожух вагою з пів Євпапія',slot:'outer',armor:1,warmth:4,heatBurden:3,rainProtection:1,statMods:{agility:-1}},
  leather_vest:{name:'Шкіряна жилетка місцевого авторитета',slot:'outer',armor:2,warmth:1,heatBurden:1,rainProtection:0}
};

export const ITEM_DEFS={
  water:{name:'Вода',icon:'💧',category:'Їжа та напої',stack:5,description:'Звичайна вода.',useEffects:[{type:'need',key:'water',value:30}]},
  salo:{name:'Сало',icon:'🥓',category:'Їжа та напої',stack:5,description:'Можна зʼїсти. А можна підкупити голуба.',useEffects:[{type:'need',key:'satiety',value:25}]},
  vodka:{name:'Горілка',icon:'🍾',category:'Їжа та напої',stack:2,description:'Пахне так, що вже страшно.',useEffects:[{type:'statusAdd',id:'tipsy'}]},
  aspirin:{name:'Аспірин',icon:'💊',category:'Ліки',stack:5,description:'Може трохи помогти від голови.',useEffects:[{type:'statusRemove',id:'hangover'}]},
  medkit:{name:'Аптечка',icon:'🩹',category:'Ліки',stack:2,description:'Коли вже нормально так припекло.',useEffects:[{type:'health',value:25}]},
  knife:{name:'Ніж',icon:'🔪',category:'Зброя',stack:1,description:'Інструмент. І зброя. Залежить, шо ви надумали.'},
  garlic:{name:'Часник',icon:'🧄',category:'Якась хуйня',stack:5,description:'Баба Галя сказала, що згодиться.'},
  onion:{name:'Звичайна цибуля',icon:'🧅',category:'Якась хуйня',stack:5,description:'Звичайна цибуля. В бою можна кинути.'},
  onion_angry:{name:'Зла цибуля',icon:'🧅',category:'Якась хуйня',stack:5,description:'Вгризається й продовжує кусати.'},
  onion_smelly:{name:'Вонюча цибуля',icon:'🧅',category:'Якась хуйня',stack:5,description:'Від неї можна й вирубитись.'},
  old_key:{name:'Старий ключ',icon:'🗝️',category:'Якась хуйня',stack:1,description:'Старий ключ. Від чого – поки незрозуміло.'},
  holy_water:{name:'Свята вода',icon:'✝️',category:'Якась хуйня',stack:3,description:'На годину трохи послаблює мінуси від хуйових станів.',useEffects:[{type:'statusAdd',id:'blessed'}]},
  potion_unknown:{name:'??? Зілля',icon:'🧪',category:'Якась хуйня',stack:3,description:'Ефект: невідомий.',unknown:true}
};

export const WEATHER_PRESETS={
  mild:{label:'Хмарно',icon:'☁️',tempC:16,wind:1,rain:0},
  rain:{label:'Дощ',icon:'🌧️',tempC:11,wind:2,rain:3},
  cold:{label:'Холодно',icon:'🌫️',tempC:4,wind:3,rain:0},
  hot:{label:'Спека',icon:'☀️',tempC:31,wind:1,rain:0}
};
