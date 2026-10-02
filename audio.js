const SETTINGS_KEY='des-ne-tam-audio-settings-v1';

const DEFAULTS={
  enabled:true,
  master:0.8,
  ambient:0.58,
  music:0.45,
  effects:0.75
};

const ATMOSPHERES={
  silent:{layers:[],dogs:null},
  village:{
    layers:[['village',0.58]],
    dogs:{min:14000,max:30000,volume:0.38}
  },
  hut:{
    layers:[['village',0.10],['fireplace',0.78]],
    dogs:{min:28000,max:48000,volume:0.20}
  },
  rain:{
    layers:[['village',0.14],['rain',0.82]],
    dogs:{min:32000,max:52000,volume:0.14}
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
      music:clamp(parsed.music ?? DEFAULTS.music),
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
    this.music=null;
    this.ambientLayers=new Map();
    this.currentAtmosphere='silent';
    this.dogTimer=null;

    this.registry={
      music:{},
      ambient:{
        village:'./village-ambient.mp3',
        fireplace:'./fireplace-loop.mp3',
        rain:'./rain-loop.mp3'
      },
      effects:{
        dogs:'./dogs-distant.mp3',
        wings:'./pigeon-wings.mp3',
        bang:'./shed-bang.mp3',
        ui:'./ui-click.mp3'
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

  volumeFor(kind,localVolume=1){
    if(!this.settings.enabled)return 0;
    const channel=kind==='music'
      ?this.settings.music
      :kind==='ambient'
        ?this.settings.ambient
        :this.settings.effects;
    return clamp(this.settings.master*channel*localVolume);
  }

  refreshVolumes(){
    for(const entry of this.ambientLayers.values()){
      entry.audio.volume=this.volumeFor('ambient',entry.localVolume);
    }
    if(this.music){
      this.music.audio.volume=this.volumeFor('music',this.music.localVolume);
    }
  }

  setEnabled(value){
    this.settings.enabled=Boolean(value);
    saveSettings(this.settings);

    if(!this.settings.enabled){
      this.stopAll();
      return;
    }

    this.setAtmosphere(this.currentAtmosphere);
  }

  setVolume(kind,value){
    if(!['master','ambient','music','effects'].includes(kind))return;
    this.settings[kind]=clamp(value);
    saveSettings(this.settings);
    this.refreshVolumes();
  }

  getSettings(){
    return {...this.settings};
  }

  register(kind,id,src){
    if(!this.registry[kind])return false;
    this.registry[kind][id]=src;
    return true;
  }

  async playEffect(id,{volume=1}={}){
    if(!this.settings.enabled)return false;
    const ok=await this.unlock();
    if(!ok)return false;

    const src=this.registry.effects[id];
    if(!src)return false;

    try{
      const audio=new Audio(src);
      audio.preload='auto';
      audio.volume=this.volumeFor('effects',volume);
      await audio.play();
      return true;
    }catch{
      return false;
    }
  }

  async playAmbientLayer(id,localVolume=1){
    if(!this.settings.enabled)return false;
    const src=this.registry.ambient[id];
    if(!src)return false;

    const existing=this.ambientLayers.get(id);
    if(existing){
      existing.localVolume=localVolume;
      existing.audio.volume=this.volumeFor('ambient',localVolume);
      return true;
    }

    try{
      const audio=new Audio(src);
      audio.loop=true;
      audio.preload='auto';
      audio.volume=this.volumeFor('ambient',localVolume);
      await audio.play();
      this.ambientLayers.set(id,{audio,localVolume});
      return true;
    }catch{
      return false;
    }
  }

  stopAmbientLayer(id){
    const entry=this.ambientLayers.get(id);
    if(!entry)return;
    try{
      entry.audio.pause();
      entry.audio.currentTime=0;
    }catch{}
    this.ambientLayers.delete(id);
  }

  stopAmbient(){
    for(const id of [...this.ambientLayers.keys()])this.stopAmbientLayer(id);
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

    const tick=()=>{
      const wait=Math.floor(config.min+Math.random()*(config.max-config.min));
      this.dogTimer=setTimeout(async()=>{
        if(
          this.settings.enabled &&
          this.currentAtmosphere!=='silent' &&
          document.visibilityState!=='hidden'
        ){
          await this.playEffect('dogs',{volume:config.volume});
        }
        tick();
      },wait);
    };

    tick();
  }

  async setAtmosphere(name='silent'){
    const profile=ATMOSPHERES[name]||ATMOSPHERES.silent;
    this.currentAtmosphere=name;
    this.clearDogTimer();
    this.stopAmbient();

    if(!this.settings.enabled||name==='silent')return true;
    const ok=await this.unlock();
    if(!ok)return false;

    let started=false;
    for(const [id,volume] of profile.layers){
      const layerOk=await this.playAmbientLayer(id,volume);
      started=started||layerOk;
    }
    this.scheduleDogs(profile.dogs);
    return started;
  }

  async playMusic(id,{volume=1}={}){
    if(!this.settings.enabled)return false;
    const src=this.registry.music[id];
    if(!src)return false;
    const ok=await this.unlock();
    if(!ok)return false;

    this.stopMusic();
    try{
      const audio=new Audio(src);
      audio.loop=true;
      audio.preload='auto';
      audio.volume=this.volumeFor('music',volume);
      await audio.play();
      this.music={audio,localVolume:volume};
      return true;
    }catch{
      return false;
    }
  }

  stopMusic(){
    if(!this.music)return;
    try{
      this.music.audio.pause();
      this.music.audio.currentTime=0;
    }catch{}
    this.music=null;
  }

  stopAll(){
    this.clearDogTimer();
    this.stopAmbient();
    this.stopMusic();
  }

  async testEffect(){
    return this.playEffect('ui',{volume:0.9});
  }
}

export const audioManager=new AudioManager();
