const SETTINGS_KEY='des-ne-tam-audio-settings-v1';
const FADE_MS=2200;

const DEFAULTS={
  enabled:true,
  master:0.8,
  ambient:0.48,
  effects:0.72
};

// Pinned public mirrors of verified CC0 source material.
// Exact source/license records are in AUDIO-LICENSES.txt.
const AUDIO_URLS={
  village:'https://raw.githubusercontent.com/BrenoBertucci/Terrarium/4a246854926a120616dd1f2ae50da20672886a23/assets/audio/birds.ogg',
  fireplace:'https://raw.githubusercontent.com/BrenoBertucci/Terrarium/4a246854926a120616dd1f2ae50da20672886a23/assets/audio/fire.ogg',
  rain:'https://raw.githubusercontent.com/BrenoBertucci/Terrarium/4a246854926a120616dd1f2ae50da20672886a23/assets/audio/rain.ogg',
  dogs:'https://raw.githubusercontent.com/OlegYazvin/Friendly-Freya/c9a03ccbf847afd576d81a8283f17e7b3635d6e3/godot/assets/audio/dog_barking_mono.wav',
  wings:'https://raw.githubusercontent.com/moraguma/GamutoWare/55cbf165067c549d2e4a5ec7da6e4b5ce1845988/microjogos/2023S1/projeto_vinicius_carvalho/recursos/sons/wings_flap_large.ogg',
  bang:'https://raw.githubusercontent.com/drwhut/tabletop-club/a4fb379b0f4af1f066bf378bd652d8be90d64e32/game/Sounds/WoodHeavy/impactWood_heavy_001.ogg',
  ui:'https://raw.githubusercontent.com/AreOlsen/DungeonWarrior/8a06bc7572344d479446883811572fed7784ca30/src/main/resources/audio/sfx/click.wav'
};

const ATMOSPHERES={
  silent:{layers:[],dogs:null},
  village:{
    layers:[['village',0.42]],
    dogs:{min:55000,max:120000,volume:0.20}
  },
  hut:{
    layers:[['village',0.06],['fireplace',0.62]],
    dogs:{min:100000,max:180000,volume:0.08}
  },
  rain:{
    layers:[['village',0.05],['rain',0.64]],
    dogs:{min:120000,max:210000,volume:0.06}
  }
};

function clamp(v,a=0,b=1){
  return Math.max(a,Math.min(b,Number(v)));
}

function loadSettings(){
  try{
    const raw=localStorage.getItem(SETTINGS_KEY);
    if(!raw)return {...DEFAULTS};
    const parsed=JSON.parse(raw);
    return {
      enabled:parsed.enabled!==false,
      master:clamp(parsed.master ?? DEFAULTS.master),
      ambient:clamp(parsed.ambient ?? DEFAULTS.ambient),
      effects:clamp(parsed.effects ?? DEFAULTS.effects)
    };
  }catch{
    return {...DEFAULTS};
  }
}

function saveSettings(settings){
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch{}
}

class AudioManager{
  constructor(){
    this.settings=loadSettings();
    this.ctx=null;
    this.unlocked=false;
    this.currentAtmosphere='silent';
    this.ambientLayers=new Map();
    this.activeEffects=new Map();
    this.dogTimer=null;

    this.registry={
      ambient:{
        village:AUDIO_URLS.village,
        fireplace:AUDIO_URLS.fireplace,
        rain:AUDIO_URLS.rain
      },
      effects:{
        dogs:{src:AUDIO_URLS.dogs,channel:'ambient'},
        wings:{src:AUDIO_URLS.wings,channel:'effects'},
        bang:{src:AUDIO_URLS.bang,channel:'effects'},
        ui:{src:AUDIO_URLS.ui,channel:'effects'}
      }
    };
  }

  async unlock(){
    if(this.unlocked)return true;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(Ctx){
        if(!this.ctx)this.ctx=new Ctx();
        if(this.ctx.state==='suspended')await this.ctx.resume();
        this.unlocked=this.ctx.state==='running';
      }else{
        this.unlocked=true;
      }
      return this.unlocked;
    }catch{
      return false;
    }
  }

  volumeFor(channel,localVolume=1){
    if(!this.settings.enabled)return 0;
    const channelVolume=channel==='ambient'
      ? this.settings.ambient
      : this.settings.effects;
    return clamp(this.settings.master*channelVolume*localVolume);
  }

  clearFade(entry){
    if(entry?.fadeTimer){
      clearInterval(entry.fadeTimer);
      entry.fadeTimer=null;
    }
  }

  fadeEntry(entry,target,ms=FADE_MS,{stopAfter=false,onDone=null}={}){
    if(!entry?.audio)return;
    this.clearFade(entry);

    const audio=entry.audio;
    const from=Number.isFinite(audio.volume)?audio.volume:0;
    const to=clamp(target);
    const started=Date.now();

    if(ms<=0||Math.abs(from-to)<0.002){
      audio.volume=to;
      if(stopAfter&&to===0){
        try{audio.pause();audio.currentTime=0}catch{}
      }
      if(onDone)onDone();
      return;
    }

    entry.fadeTimer=setInterval(()=>{
      const p=Math.min(1,(Date.now()-started)/ms);
      audio.volume=clamp(from+(to-from)*p);
      if(p>=1){
        this.clearFade(entry);
        if(stopAfter&&to===0){
          try{audio.pause();audio.currentTime=0}catch{}
        }
        if(onDone)onDone();
      }
    },40);
  }

  async setEnabled(value){
    this.settings.enabled=Boolean(value);
    saveSettings(this.settings);

    if(!this.settings.enabled){
      this.stopAll();
      return true;
    }

    const ok=await this.unlock();
    if(!ok)return false;
    return this.setAtmosphere(this.currentAtmosphere);
  }

  setVolume(kind,value){
    if(!['master','ambient','effects'].includes(kind))return;
    this.settings[kind]=clamp(value);
    saveSettings(this.settings);
    this.refreshVolumes();
  }

  refreshVolumes(){
    for(const entry of this.ambientLayers.values()){
      this.fadeEntry(entry,this.volumeFor('ambient',entry.localVolume),160);
    }
    for(const entry of this.activeEffects.values()){
      entry.audio.volume=this.volumeFor(entry.channel,entry.localVolume);
    }
  }

  getSettings(){
    return {...this.settings};
  }

  randomizeStart(audio){
    const apply=()=>{
      try{
        if(Number.isFinite(audio.duration)&&audio.duration>6){
          audio.currentTime=Math.random()*(audio.duration-2);
        }
      }catch{}
    };
    if(audio.readyState>=1)apply();
    else audio.addEventListener('loadedmetadata',apply,{once:true});
  }

  async ensureAmbientLayer(id,localVolume){
    const src=this.registry.ambient[id];
    if(!src)return false;

    let entry=this.ambientLayers.get(id);
    if(entry){
      entry.localVolume=localVolume;
      this.fadeEntry(entry,this.volumeFor('ambient',localVolume),FADE_MS);
      return true;
    }

    try{
      const audio=new Audio(src);
      audio.loop=true;
      audio.preload='auto';
      audio.volume=0;
      this.randomizeStart(audio);

      entry={audio,localVolume,fadeTimer:null};
      this.ambientLayers.set(id,entry);
      await audio.play();
      this.fadeEntry(entry,this.volumeFor('ambient',localVolume),FADE_MS);
      return true;
    }catch{
      this.ambientLayers.delete(id);
      return false;
    }
  }

  fadeOutAmbientLayer(id){
    const entry=this.ambientLayers.get(id);
    if(!entry)return;
    this.fadeEntry(entry,0,FADE_MS,{
      stopAfter:true,
      onDone:()=>{
        if(this.ambientLayers.get(id)===entry){
          this.ambientLayers.delete(id);
        }
      }
    });
  }

  clearDogTimer(){
    if(this.dogTimer){
      clearTimeout(this.dogTimer);
      this.dogTimer=null;
    }
  }

  scheduleDogs(config){
    this.clearDogTimer();
    if(!config||!this.settings.enabled)return;

    const scheduleNext=()=>{
      if(!this.settings.enabled)return;
      const wait=Math.floor(config.min+Math.random()*(config.max-config.min));
      this.dogTimer=setTimeout(async()=>{
        if(
          this.settings.enabled &&
          this.currentAtmosphere!=='silent' &&
          document.visibilityState!=='hidden'
        ){
          await this.playEffect('dogs',{volume:config.volume});
        }
        scheduleNext();
      },wait);
    };

    scheduleNext();
  }

  async setAtmosphere(name='silent'){
    const profile=ATMOSPHERES[name]||ATMOSPHERES.silent;
    this.currentAtmosphere=name;
    this.clearDogTimer();

    const wanted=new Map(profile.layers);
    for(const id of [...this.ambientLayers.keys()]){
      if(!wanted.has(id))this.fadeOutAmbientLayer(id);
    }

    if(!this.settings.enabled||name==='silent'){
      return true;
    }

    const ok=await this.unlock();
    if(!ok)return false;

    let started=false;
    for(const [id,volume] of profile.layers){
      const layerOk=await this.ensureAmbientLayer(id,volume);
      started=started||layerOk;
    }

    this.scheduleDogs(profile.dogs);
    return started;
  }

  async playEffect(id,{volume=1,allowOverlap=false}={}){
    if(!this.settings.enabled)return false;

    const def=this.registry.effects[id];
    if(!def)return false;

    const existing=this.activeEffects.get(id);
    if(existing&&!allowOverlap&&!existing.audio.paused&&!existing.audio.ended){
      return true;
    }

    const ok=await this.unlock();
    if(!ok)return false;

    try{
      const audio=new Audio(def.src);
      audio.preload='auto';

      const entry={
        audio,
        channel:def.channel||'effects',
        localVolume:volume
      };

      audio.volume=this.volumeFor(entry.channel,entry.localVolume);

      const cleanup=()=>{
        if(this.activeEffects.get(id)===entry){
          this.activeEffects.delete(id);
        }
      };
      audio.addEventListener('ended',cleanup,{once:true});
      audio.addEventListener('error',cleanup,{once:true});

      this.activeEffects.set(id,entry);
      await audio.play();
      return true;
    }catch{
      this.activeEffects.delete(id);
      return false;
    }
  }

  stopEffects(){
    for(const entry of this.activeEffects.values()){
      try{
        entry.audio.pause();
        entry.audio.currentTime=0;
      }catch{}
    }
    this.activeEffects.clear();
  }

  stopAmbientNow(){
    for(const entry of this.ambientLayers.values()){
      this.clearFade(entry);
      try{
        entry.audio.pause();
        entry.audio.currentTime=0;
      }catch{}
    }
    this.ambientLayers.clear();
  }

  stopAll(){
    this.clearDogTimer();
    this.stopEffects();
    this.stopAmbientNow();
  }

  async testEffect(){
    return this.playEffect('ui',{volume:0.9});
  }
}

export const audioManager=new AudioManager();
