const SETTINGS_KEY='des-ne-tam-audio-settings-v1';

const DEFAULTS={
  enabled:true,
  master:0.8,
  music:0.45,
  effects:0.75
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
    this.masterGain=null;
    this.musicGain=null;
    this.effectsGain=null;
    this.unlocked=false;
    this.ambient=null;
    this.music=null;
    this.registry={
      music:{},
      ambient:{},
      effects:{}
    };
  }

  async unlock(){
    if(this.unlocked)return true;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(!Ctx)return false;

      if(!this.ctx){
        this.ctx=new Ctx();
        this.masterGain=this.ctx.createGain();
        this.musicGain=this.ctx.createGain();
        this.effectsGain=this.ctx.createGain();

        this.musicGain.connect(this.masterGain);
        this.effectsGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.applyVolumes();
      }

      if(this.ctx.state==='suspended')await this.ctx.resume();
      this.unlocked=this.ctx.state==='running';
      return this.unlocked;
    }catch{
      return false;
    }
  }

  applyVolumes(){
    if(!this.ctx)return;
    const now=this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.settings.enabled?this.settings.master:0,now,.01);
    this.musicGain.gain.setTargetAtTime(this.settings.music,now,.01);
    this.effectsGain.gain.setTargetAtTime(this.settings.effects,now,.01);
  }

  setEnabled(value){
    this.settings.enabled=Boolean(value);
    saveSettings(this.settings);
    this.applyVolumes();
  }

  setVolume(kind,value){
    if(!['master','music','effects'].includes(kind))return;
    this.settings[kind]=clamp(value);
    saveSettings(this.settings);
    this.applyVolumes();
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
      audio.volume=clamp(this.settings.master*this.settings.effects*volume);
      await audio.play();
      return true;
    }catch{
      return false;
    }
  }

  async playLoop(kind,id,{volume=1}={}){
    if(!['music','ambient'].includes(kind))return false;
    if(!this.settings.enabled)return false;
    const ok=await this.unlock();
    if(!ok)return false;

    const src=this.registry[kind][id];
    if(!src)return false;

    this.stopLoop(kind);
    try{
      const audio=new Audio(src);
      audio.loop=true;
      audio.preload='auto';
      const channel=kind==='music'?this.settings.music:this.settings.effects;
      audio.volume=clamp(this.settings.master*channel*volume);
      await audio.play();
      this[kind]=audio;
      return true;
    }catch{
      return false;
    }
  }

  stopLoop(kind){
    const audio=this[kind];
    if(audio){
      try{audio.pause();audio.currentTime=0}catch{}
      this[kind]=null;
    }
  }

  stopAll(){
    this.stopLoop('music');
    this.stopLoop('ambient');
  }

  async testEffect(){
    if(!this.settings.enabled)return false;
    const ok=await this.unlock();
    if(!ok)return false;

    try{
      const osc=this.ctx.createOscillator();
      const gain=this.ctx.createGain();
      osc.type='sine';
      osc.frequency.setValueAtTime(420,this.ctx.currentTime);
      gain.gain.setValueAtTime(0,this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(
        0.06*this.settings.master*this.settings.effects,
        this.ctx.currentTime+0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.0001,this.ctx.currentTime+0.12);
      osc.connect(gain);
      gain.connect(this.effectsGain);
      osc.start();
      osc.stop(this.ctx.currentTime+0.13);
      return true;
    }catch{
      return false;
    }
  }
}

export const audioManager=new AudioManager();
