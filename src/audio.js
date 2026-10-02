/** Licensed real cabin recording, played only after a user gesture. */
export class CabinAudio {
  context=null; gain=null; fade=0; loading=null; active=false; headphones=false;
  musicEnabled=false; musicGain=null; musicLoading=null;
  fxGain=null; fxSource=null; fxKey=null; fxToken=0;
  filter=null; paGain=null; paSource=null; paKey=null; paToken=0; clips=new Map();
  async setActive(active) {
    this.active=active;
    if(!active) {if(this.context?.state==='running')await this.context.suspend();return;}
    if(!this.context) {
      this.context=new AudioContext();
      this.gain=this.context.createGain();this.gain.gain.value=0;this.gain.connect(this.context.destination);
      this.filter=this.context.createBiquadFilter();this.filter.type='lowpass';this.filter.Q.value=.7;
      this.fxGain=this.context.createGain();this.fxGain.gain.value=.6;this.fxGain.connect(this.context.destination);
      this.paGain=this.context.createGain();this.paGain.gain.value=.42;this.paGain.connect(this.context.destination);
      this.loading=(async()=>{
        const response=await fetch('/above-the-clouds-site/assets/audio/cabin-recording-loop.wav');
        if(!response.ok)throw new Error('Cabin recording unavailable');
        const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
        const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.filter);this.filter.connect(this.gain);source.start();
      })();
    }
    // Resume within the click handler, before waiting for the recording fetch.
    await this.context.resume();
    try {await this.loading;} catch(error) {
      await this.context.close();this.context=null;this.gain=null;this.loading=null;this.clips.clear();this.musicGain=null;this.musicLoading=null;throw error;
    }
    if(!this.active){await this.context.suspend();return;}
    this.setHeadphones(this.headphones);
  }
  setHeadphones(enabled){this.headphones=enabled;if(!this.context)return;this.filter.frequency.setTargetAtTime(enabled?850:12000,this.context.currentTime,.3);this.paGain.gain.setTargetAtTime(enabled?.32:.42,this.context.currentTime,.3);this.setFade(this.fade);}
  async setMusic(enabled){
    this.musicEnabled=enabled;
    if(!this.context)return;
    if(enabled&&!this.musicLoading){
      this.musicGain=this.context.createGain();this.musicGain.gain.value=0;this.musicGain.connect(this.context.destination);
      this.musicLoading=(async()=>{
        const buffer=await this.loadClip('/above-the-clouds-site/assets/audio/lounge-original.wav');
        const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.musicGain);source.start();
      })();
    }
    this.updateMusicGain();
    if(this.musicLoading){try{await this.musicLoading;}catch(error){this.musicLoading=null;this.musicEnabled=false;this.updateMusicGain();throw error;}}
    this.updateMusicGain();
  }
  updateMusicGain(){if(this.musicGain&&this.context)this.musicGain.gain.setTargetAtTime((this.musicEnabled?(this.paKey?.07:.18):0)*(1-this.fade),this.context.currentTime,.6);}
  setFade(fraction){this.fade=Math.max(0,Math.min(1,fraction));if(this.gain)this.gain.gain.setTargetAtTime((this.headphones?.11:.65)*(1-this.fade),this.context.currentTime,.3);this.updateMusicGain();if(this.fxGain)this.fxGain.gain.setTargetAtTime((this.headphones?.18:.6)*(1-this.fade),this.context.currentTime,.3);}
  loadClip(path){
    if(!this.context)return Promise.reject(new Error('Audio not enabled'));
    if(!this.clips.has(path))this.clips.set(path,(async()=>{const response=await fetch(path);if(!response.ok)throw new Error('Announcement unavailable');return this.context.decodeAudioData(await response.arrayBuffer());})());
    return this.clips.get(path);
  }
  preloadAnnouncements(airline,route){for(const path of [`/above-the-clouds-site/assets/audio/announcements/${airline}-captain.wav`,'/above-the-clouds-site/assets/audio/takeoff-roll.wav','/above-the-clouds-site/assets/audio/landing-roll.wav'])void this.loadClip(path).catch(()=>{});for(const phase of ['boarding','arrival'])void this.loadClip(`/above-the-clouds-site/assets/audio/announcements/${airline}-${route}-${phase}.wav`).catch(()=>{});}
  stopRunway(){this.fxToken++;this.fxSource?.stop();this.fxSource=null;this.fxKey=null;}
  setRunway(cue,enabled){
    if(!enabled||!cue){if(this.fxKey)this.stopRunway();return;}
    if(this.fxKey===cue.key||!this.context)return;
    this.stopRunway();this.fxKey=cue.key;const token=this.fxToken;
    void this.loadClip(cue.path).then(buffer=>{
      if(token!==this.fxToken||!this.active||cue.offset>=buffer.duration)return;
      const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.fxGain);source.start(0,cue.offset);this.fxSource=source;
    }).catch(()=>{});
  }
  stopAnnouncement(){this.paToken++;this.paSource?.stop();this.paSource=null;this.paKey=null;this.updateMusicGain();}
  setAnnouncement(cue,enabled){
    if(!enabled||!cue){if(this.paKey)this.stopAnnouncement();return;}
    if(this.paKey===cue.key||!this.context)return;
    this.stopAnnouncement();this.paKey=cue.key;this.updateMusicGain();const token=this.paToken;
    void this.loadClip(cue.path).then(buffer=>{
      if(token!==this.paToken||!this.active||cue.offset>=buffer.duration)return;
      const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.paGain);source.start(0,cue.offset);this.paSource=source;
    }).catch(()=>{});
  }
}
