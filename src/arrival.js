// Embedded originals only: no video downloads or locally hosted copies.
const clip=(videoId,start,label,title,creator)=>Object.freeze({videoId,start,label,title,creator,url:`https://www.youtube.com/watch?v=${videoId}`});
export const arrivalViews = Object.freeze({
  tokyo:{city:'Tokyo',clips:[
    clip('29faxSAZXrc',0,'Rainy streets','Tokyo rainy night in 100 minutes','Rambalac'),
    clip('29faxSAZXrc',300,'City lights','Tokyo rainy night in 100 minutes','Rambalac')
  ]},
  bangkok:{city:'Bangkok',clips:[
    clip('KpV3zCnn8eM',925,'By the river','Bangkok old town and riverside at sunset','VISUAL THAILAND'),
    clip('KB6q17rXnJI',1135,'Canal-side streets','Bangkok: Chinatown to Khaosan Road','POPtravel'),
    clip('3hyCw4Auhjg',515,'Talat Noi alleys','Talat Noi in Bangkok: Legendary Classic Neighborhood','JWINTHAI'),
    clip('hVMT9DFBiXw',106,'Around Wat Arun','Wat Arun Walking Tour','HP Walking Tours')
  ]},
  paris:{city:'Paris',clips:[
    clip('e3hlRihWB58',1280,'By the Eiffel Tower','Paris morning walk by the Seine','walking around'),
    clip('Qh_XGUJdMJ8',1420,'Montmartre morning','Sunrise in Montmartre','City Walker 4k POV'),
    clip('JQJzz70Dt2c',0,'Île Saint-Louis','Quiet morning on Île Saint-Louis','Global Silent Walks')
  ]}
});
let apiPromise;
function loadPlayerAPI(){
  if(typeof window==='undefined')return Promise.reject(new Error('Player unavailable'));
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(apiPromise)return apiPromise;
  apiPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const fail=()=>{clearTimeout(timeout);script.remove();apiPromise=null;reject(new Error('Player unavailable'));};
    const timeout=setTimeout(fail,20000);
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve(window.YT);};
    script.src='https://www.youtube.com/iframe_api';script.onerror=fail;
    document.head.appendChild(script);
  });
  return apiPromise;
}
export function createArrivalView({screen,section,mount,poster,status,source,play,card,toggle,toolbar,next,onStreetVolume=()=>{}},loadAPI=loadPlayerAPI){
  let player=null,generation=0,timer,volumeTimer,cardOpen=false,activeRoute=null,streetVolume=0,ready=false,userPaused=false,moment=0,offerPlayView=null;
  const setPlayLabel=label=>{
    play.textContent=label;play.setAttribute('aria-label',label);
    play.dataset.icon=label==='Pause view'?'pause':'play';
  };
  const syncStreet=()=>{
    if(!player||!ready)return;
    player.setVolume(Math.round(streetVolume*100));
    if(streetVolume>0&&!cardOpen)player.unMute();else player.mute();
  };
  const captureStreet=()=>{
    if(!player||!ready||cardOpen)return;
    const level=player.getVolume?.(),muted=player.isMuted?.();
    if(typeof level!=='number'||typeof muted!=='boolean')return;
    streetVolume=muted?0:Math.max(0,Math.min(1,level/100));onStreetVolume(streetVolume);
  };
  const reset=()=>{
    generation++;offerPlayView=null;clearTimeout(timer);clearInterval(volumeTimer);player?.destroy();player=null;ready=false;streetVolume=0;
    userPaused=false;moment=0;next.hidden=true;next.disabled=true;source.hidden=true;mount.replaceChildren?.();section.hidden=true;play.hidden=true;
    screen.classList.toggle('with-arrival',false);screen.classList.toggle('postcard-open',false);cardOpen=false;toolbar.hidden=true;screen.dataset.arrivalPlayback='idle';delete screen.dataset.arrivalError;delete screen.dataset.arrivalRevealed;toggle.setAttribute('aria-expanded','false');toggle.textContent='Your postcard';
  };
  toggle.addEventListener('click',()=>{
    captureStreet();cardOpen=!cardOpen;screen.classList.toggle('postcard-open',cardOpen);
    card.hidden=!cardOpen;section.hidden=cardOpen;toggle.setAttribute('aria-expanded',String(cardOpen));
    toggle.textContent=cardOpen?'Back to the view':'Your postcard';
    if(cardOpen){clearTimeout(timer);player?.mute();player?.pauseVideo();play.hidden=true;next.hidden=true;}else if(player){next.hidden=false;play.hidden=false;setPlayLabel(userPaused?'Resume view':'Pause view');syncStreet();if(!userPaused)player.playVideo();}else{void controller.show(activeRoute,false,moment,streetVolume);}
  });
  play.addEventListener('click',()=>{
    if(!player){void controller.show(activeRoute,false,moment,streetVolume);return;}
    if(screen.dataset.arrivalPlayback==='playing'){userPaused=true;player.pauseVideo();}
    else{userPaused=false;syncStreet();player.playVideo();}
  });
  const selectedClip=()=>arrivalViews[activeRoute]?.clips[moment];
  const syncSource=()=>{const chosen=selectedClip();if(!chosen)return;source.href=`${chosen.url}&t=${chosen.start}s`;source.textContent=`${chosen.creator} · YouTube ↗`;source.title=`${chosen.title} — ${chosen.creator} · YouTube`;source.setAttribute('aria-label',`Video by ${chosen.creator} on YouTube (opens in a new tab)`);if(player)player.getIframe().title=chosen.title;};
  next.addEventListener('click',()=>{
    const view=arrivalViews[activeRoute];if(cardOpen||!view)return;
    captureStreet();const previous=selectedClip();moment=(moment+1)%view.clips.length;userPaused=false;
    if(!player||!ready){void controller.show(activeRoute,false,moment,streetVolume);return;}
    const chosen=selectedClip();clearTimeout(timer);screen.dataset.arrivalPlayback='loading';delete screen.dataset.arrivalError;
    syncSource();status.textContent=`${view.city} · ${chosen.label}`;setPlayLabel('Play view');syncStreet();
    timer=setTimeout(()=>offerPlayView?.('view-start-timeout'),8000);
    if(previous.videoId===chosen.videoId){player.seekTo(chosen.start,true);player.playVideo();}
    else player.loadVideoById({videoId:chosen.videoId,startSeconds:chosen.start});
  });
  if(typeof document!=='undefined')document.addEventListener?.('visibilitychange',()=>{
    if(document.hidden&&player&&ready&&!cardOpen){userPaused=true;player.pauseVideo();}
  });
  const controller={
    reset,
    setStreetVolume(value){streetVolume=Math.min(1,Math.max(0,Number(value)||0));syncStreet();},
    async show(route,early,index=0,volume=0){
      const alreadyRevealed=screen.dataset.arrivalRevealed==='true'&&activeRoute===route;
      reset();activeRoute=route;const view=early?null:arrivalViews[route];
      if(view&&alreadyRevealed)screen.dataset.arrivalRevealed='true';
      moment=view?index%view.clips.length:0;streetVolume=volume;
      card.hidden=Boolean(view)||Boolean(early);
      if(!view)return;
      const current=generation;
      screen.classList.toggle('with-arrival',true);toolbar.hidden=false;section.hidden=false;poster.hidden=true;screen.dataset.arrivalPlayback='loading';
      poster.setAttribute('src',`/assets/postcard-${route}-v19.png`);poster.setAttribute('alt',view.city);
      mount.hidden=true;setPlayLabel('Play view');source.hidden=false;syncSource();
      status.textContent=`A little longer. Then, ${view.city}.`;
      const fallback=(reason)=>{
        if(current!==generation)return;
        clearTimeout(timer);clearInterval(volumeTimer);player?.destroy();player=null;mount.hidden=true;poster.hidden=false;play.hidden=false;setPlayLabel('Try the view again');next.hidden=cardOpen;next.disabled=false;
        screen.dataset.arrivalRevealed='true';screen.dataset.arrivalPlayback='failed';screen.dataset.arrivalError=String(reason||'unknown');status.textContent='The street view is unavailable. Your postcard is here.';
      };
      const offerPlay=(reason)=>{
        if(current!==generation||cardOpen)return;
        clearTimeout(timer);screen.dataset.arrivalPlayback='blocked';
        screen.dataset.arrivalError=reason;play.hidden=false;setPlayLabel('Play view');
        status.textContent='Press play to enjoy the view.';
      };
      offerPlayView=offerPlay;
      try{
        const YT=await loadAPI();if(current!==generation||cardOpen)return;
        const target=document.createElement('div');mount.replaceChildren(target);
        // The film fills the background; the postcard opens as a separate view.
        poster.hidden=true;mount.hidden=false;
        player=new YT.Player(target,{
          host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',videoId:selectedClip().videoId,
          playerVars:{autoplay:1,mute:1,controls:0,disablekb:0,start:selectedClip().start,loop:0,playsinline:1,rel:0,origin:window.location.origin},
          events:{
            onReady:event=>{
              if(current!==generation)return;ready=true;clearTimeout(timer);next.hidden=cardOpen;next.disabled=false;syncStreet();
              volumeTimer=setInterval(captureStreet,500);
              if(!cardOpen){timer=setTimeout(()=>offerPlay('start-timeout'),8000);event.target.playVideo();}
            },
            onStateChange:event=>{
              if(current!==generation)return;
              if(event.data===0&&!cardOpen){event.target.seekTo(selectedClip().start,true);syncStreet();event.target.playVideo();}
              if(event.data===1&&(cardOpen||document.hidden)){if(document.hidden)userPaused=true;event.target.pauseVideo();return;}
              if(event.data===1){userPaused=false;screen.dataset.arrivalRevealed='true';screen.dataset.arrivalPlayback='playing';delete screen.dataset.arrivalError;clearTimeout(timer);play.hidden=cardOpen;setPlayLabel('Pause view');status.textContent=`${view.city} · ${selectedClip().label}`;}
              if(event.data===2&&(userPaused||cardOpen||screen.dataset.arrivalPlayback!=='loading')){if(!cardOpen)userPaused=true;clearTimeout(timer);screen.dataset.arrivalPlayback='paused';play.hidden=cardOpen;setPlayLabel('Resume view');status.textContent='The view is paused.';}
            },
            onAutoplayBlocked:()=>offerPlay('autoplay-blocked'),
            onError:event=>fallback(event.data)
          }
        });
        syncSource();
        player.getIframe().setAttribute('referrerpolicy','strict-origin-when-cross-origin');
        timer=setTimeout(()=>ready?offerPlay('start-timeout'):fallback('player-load-timeout'),20000);
      }catch{fallback('api-unavailable');}
    }
  };
  return controller;
}
