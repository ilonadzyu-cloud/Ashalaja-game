export const STATUS_DEFS={
  hangover:{name:'ЖОСТКИЙ БУДУНЯРА',blurb:'Бувало і краще.',mods:{attention:-2,agility:-1,pofigism:2},remove:'поїсти, попити й трохи прийти до тями.'},
  pigeonHumiliated:{name:'СРАНИЙ ГОЛУБ ВАС ПРИНИЗИВ',blurb:'Ну буває.',mods:{charisma:-1,pofigism:1},remove:'помитись або змінити обісрану одежину.'},
  dryMouth:{name:'СУШНЯК',blurb:'Сушить.',mods:{attention:-1},remove:'попити.'},
  yebatorium:{name:'ОСТАНОВОЧКА ЄБАТОРІУМ',blurb:'Після такого ви вже готові перевіряти будь-яку хуйню.',mods:{attention:1,pofigism:1,ahui:1},remove:'сам пройде.',persistentUnlock:'yebatorium'},
  scared:{name:'ОБСЕРУНЬКАВСЯ ВІД СТРАХУ',blurb:'Страшно капець.',mods:{attention:2,agility:1,pofigism:-2,charisma:-1},remove:'коли попустить.'},
  wet:{name:'ПРОМОК',blurb:'Одяг мокрий і це вже починає бісити.',mods:{},remove:'висохнути або змінити мокрий одяг.'},
  cold:{name:'ЗМЕРЗ',blurb:'Пальці вже не дуже слухаються.',mods:{agility:-1},remove:'зігрітись і висохнути.'},
  overheated:{name:'ПЕРЕГРІВ',blurb:'Жарко пиздець.',mods:{attention:-1},remove:'піти в тінь, охолонути й попити.'},
  tired:{name:'ЗАЄБАВСЯ',blurb:'Спати вже хочеться.',mods:{attention:-1,agility:-1},remove:'відпочити.'},
  hungry:{name:'ГОЛОДНИЙ',blurb:'Їсти хочеться пиздець.',mods:{strength:-1,attention:-1},remove:'поїсти.'}
};

export const CLOTHES={
  local_shirt:{name:'Місцева сорочка',slot:'body',armor:0,warmth:0,heatBurden:0,rainProtection:0,note:'Люди менше дивляться скоса.'},
  local_jacket:{name:'Місцева куртка',slot:'outer',armor:1,warmth:2,heatBurden:1,rainProtection:1},
  boots:{name:'Грубі чоботи',slot:'feet',armor:1,warmth:1,heatBurden:0,rainProtection:2},
  sheepskin:{name:'Товстий кожух',slot:'outer',armor:1,warmth:4,heatBurden:3,rainProtection:1,statMods:{agility:-1}},
  leather_vest:{name:'Шкіряний жилет',slot:'outer',armor:2,warmth:1,heatBurden:1,rainProtection:0}
};

export const WEATHER_PRESETS={
  mild:{label:'Хмарно',icon:'☁️',tempC:16,wind:1,rain:0},
  rain:{label:'Дощ',icon:'🌧️',tempC:11,wind:2,rain:3},
  cold:{label:'Холодно',icon:'🌫️',tempC:4,wind:3,rain:0},
  hot:{label:'Спека',icon:'☀️',tempC:31,wind:1,rain:0}
};
