import {routes, airlines, createFlight, advance, finish, pause, resume, sceneOf, cabinOf, timingOf, announcementOf, skyOf, createDeparture, issueTicket, scanTicket, advanceDeparture, mapPosition, flightMaps, runwayCueOf, cabinLightOf} from './flight.js?v=b3b544dcd610';
import {CabinAudio} from './audio.js?v=b3b544dcd610';
import {createCabin, look, isDark, readFor, requestDrink, requestClear, serveFor} from './cabin.js?v=b3b544dcd610';
const $=id=>document.getElementById(id), audio=new CabinAudio();
let departure=createDeparture();
let selected=routes[0], airline=airlines[0], cabinClass='economy', flight=null, sound=false, headphones=false, music=false, musicFailed=false, sky='', skyChangedAt=0, cabin=createCabin(), rendered='', lastTick=performance.now(), audioFailed=false, voice=null, noticeUntil=8, sipUntil=-1, controlsUntil=0, pageEffect=null, bookTurningUntil=0;
const clock=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
function stopVoice(){if(voice){voice.pause();voice=null;}$('voice-preview').textContent='Preview voice';$('voice-preview').setAttribute('aria-pressed','false');}
function playVoice(){
  stopVoice();voice=new Audio(`/assets/audio/announcements/${airline.id}-${selected.id}-boarding.wav`);voice.volume=.42;
  const playing=voice;$('voice-preview').textContent='Stop voice';$('voice-preview').setAttribute('aria-pressed','true');
  playing.play().catch(()=>{$('preview-note').textContent='Voice preview is unavailable.';});
}
const postcards={tokyo:'/assets/postcard-tokyo-v19.png',bangkok:'/assets/postcard-bangkok-v19.png',paris:'/assets/postcard-paris-v19.png'};
const skies={
  runway:{path:'/assets/cabin-ground-v3.png',width:1672,height:941,crop:'360 65 430 580'},
  ascent:{path:'/assets/clouds-photo-v5.jpg',width:1760,height:1160,crop:'0 0 1760 1160'},
  'arrival-ground':{path:'/assets/cabin-ground-v3.png',width:1672,height:941,crop:'360 65 430 580'},
  'cloud-sea':{path:'/assets/clouds-photo-v5.jpg',width:1760,height:1160,crop:'0 0 1760 1160'},
  'open-sky':{path:'/assets/clouds-photo-v5.jpg',width:1760,height:1160,crop:'0 0 1760 700'},
  sunset:{path:'/assets/sky-sunset-v15.jpg',width:2048,height:1536,crop:'0 650 640 680'},
  'blue-hour':{path:'/assets/clouds-photo-v5.jpg',width:1760,height:1160,crop:'0 0 1760 1160'}
};
function updateSky(){
  const next=flight?skyOf(flight,selected.id):'runway';
  if(next!==sky){
    const previousKey=sky||(next==='ascent'?'runway':next);
    const previous=sky?{...skies[sky],crop:$('photo-cloud-strip').getAttribute('viewBox')}:skies[previousKey];
    for(const [photo,strip,scene] of [[$('previous-sky-photo'),$('previous-cloud-strip'),previous],[$('sky-photo'),$('photo-cloud-strip'),skies[next]]]){
      photo.setAttribute('href',scene.path);photo.setAttribute('width',scene.width);photo.setAttribute('height',scene.height);
      strip.setAttribute('viewBox',scene.crop);strip.setAttribute('preserveAspectRatio',scene.path===skies.runway.path?'xMidYMax slice':'xMidYMid slice');
    }
    skyChangedAt=sky&&flight?flight.elapsed:-12;sky=next;document.body.dataset.sky=sky;
    document.body.dataset.previousSky=previousKey;
  }
  const blend=sky==='ascent'?(flight.elapsed-timingOf(flight).takeoff)/(timingOf(flight).cruise-timingOf(flight).takeoff):((flight?.elapsed||0)-skyChangedAt)/12;
  document.body.style.setProperty('--sky-mix',String(Math.min(1,Math.max(0,blend))));

}
function configureMap(){
  const {start,control,end,asset,originAnchor,destinationAnchor}=flightMaps[selected.city];
  const path=`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`;
  $('map-title').textContent=`Seoul ↗ ${selected.city}`;
  $('route-map').setAttribute('aria-label',`Illustrative flight route from Seoul to ${selected.city}`);
  $('map-background').setAttribute('href',asset);
  for(const id of ['map-ahead','map-travelled'])$(id).setAttribute('d',path);
  for(const [id,point] of [['map-start',start],['map-end',end]]){
    $(id).setAttribute('cx',point.x);$(id).setAttribute('cy',point.y);
  }
  for(const [id,point,anchor,label] of [['map-origin',start,originAnchor,'Seoul'],['map-destination',end,destinationAnchor,selected.city]]){
    $(id).setAttribute('x',point.x+(anchor==='end'?-12:12));$(id).setAttribute('y',point.y+24);
    $(id).setAttribute('text-anchor',anchor);$(id).textContent=label;
  }
}
const drinkName=drink=>drink.replaceAll('-',' ').replace(/^./,letter=>letter.toUpperCase());
const seatNumber=()=>cabinClass==='business'?'2A':'12A';
const cabinName=()=>cabinClass==='business'?'Business':'Economy';
function updateSelection(){
  document.body.dataset.cabinClass=cabinClass;
  $('terminal-ticket').textContent=`${airline.flight} · Seoul → ${selected.city} · ${selected.duration/60} min · ${cabinName()} · Seat ${seatNumber()}`;
  document.body.dataset.route=selected.id;document.body.dataset.airline=airline.id;
  $('journey-marker').textContent=`${airline.flight} ↗ ${selected.city}`;
}
document.querySelectorAll('input[name="route"]').forEach(input=>input.addEventListener('change',()=>{selected=routes.find(route=>route.id===input.value);updateSelection();}));
$('cabin-choice').addEventListener('change',()=>{cabinClass=$('cabin-choice').value==='business'?'business':'economy';updateSelection();});
$('airline-choice').addEventListener('change',()=>{airline=airlines.find(item=>item.id===$('airline-choice').value);stopVoice();$('preview-note').textContent='An imaginary flight. Leave whenever you like.';updateSelection();});
$('voice-preview').addEventListener('click',()=>{if(voice){stopVoice();$('preview-note').textContent='Preview stopped.';}else{playVoice();$('preview-note').textContent=`A little welcome from ${airline.name}.`;voice.addEventListener('ended',()=>{stopVoice();$('preview-note').textContent='An imaginary flight. Leave whenever you like.';},{once:true});}});
async function syncAudio(){
  try{await audio.setActive(Boolean(sound&&flight&&!flight.paused&&sceneOf(flight)!=='complete'));audioFailed=false;}catch{sound=false;audioFailed=true;}
  if(!sound||flight?.paused||!flight||sceneOf(flight)==='complete')voice?.pause();
  if(!sound||flight?.paused||!flight||sceneOf(flight)==='complete')pageEffect?.pause();
  audio.setHeadphones(headphones);
  try{await audio.setMusic(music);musicFailed=false;}catch{music=false;musicFailed=true;}
  renderMusic();
  if(sound&&flight&&audio.context)audio.preloadAnnouncements(flight.airline,selected.id);
  renderSound();
}
function renderMusic(){ $('music-toggle').setAttribute('aria-pressed',String(music));$('music-toggle').setAttribute('aria-label',music?'Stop lounge music':'Listen to lounge music');$('music-label').textContent=musicFailed?'Try music':music?'Music on':'Music';}
function renderSound(){
  $('sound-toggle').textContent=sound?'Sound on':'Sound off';
  $('sound-toggle').setAttribute('aria-pressed',String(sound));
  $('sound-toggle').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');
  $('sound-toggle').setAttribute('title',sound?'Turn sound off':'Turn sound on');
  $('noise-cancel').disabled=!sound;
  $('noise-cancel').setAttribute('aria-pressed',String(headphones));
  $('noise-cancel').setAttribute('aria-label',`Noise cancellation ${headphones?'on':'off'}`);
  $('noise-cancel').setAttribute('title',!sound?'Turn sound on to use noise cancellation':headphones?'Turn noise cancellation off':'Turn noise cancellation on');
  $('mute-all').checked=!sound;$('sound-note').hidden=!audioFailed;
}

function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());}
function setView(view){cabin=look(cabin,view);document.body.dataset.view=view;$('window-open').setAttribute('aria-pressed',String(view==='window'));$('rest-toggle').setAttribute('aria-pressed',String(view==='rest'));$('view-back').hidden=view==='seat';controlsUntil=performance.now()+4000;}
function resetView(){setView('seat');}
function renderWindow(){
  document.body.dataset.windowZoom=String(cabin.view==='window'&&cabin.windowZoom);
  $('window-open').setAttribute('aria-pressed',String(cabin.view==='window'&&cabin.windowZoom));
  $('window-open').setAttribute('aria-label',cabin.view!=='window'?'Lean toward the window':cabin.windowZoom?'Return to the window seat':'Look closer through the window');
  $('window-hint').textContent=cabin.windowZoom?'Back to window seat ↙':'Look closer ↗';
}

let viewTransition=null;
function lookAround(view){
  if(!flight||sceneOf(flight)==='closing'||sceneOf(flight)==='complete'||view===cabin.view)return;
  const positions={window:0,seat:1,rest:1,table:2};
  document.body.dataset.lookDirection=view==='table'?'down':cabin.view==='table'?'up':positions[view]<positions[cabin.view]?'left':'right';
  const change=()=>{setView(view);render();};
  if(document.startViewTransition){
    document.body.dataset.viewMotion='slide';
    viewTransition?.skipTransition();
    viewTransition=document.startViewTransition(change);
    void viewTransition.finished.catch(()=>{});
  }else change();
}
function lookSide(direction){
  const views=['window','seat','table'],current=cabin.view==='rest'?'seat':cabin.view;
  lookAround(views[Math.max(0,Math.min(2,views.indexOf(current)+direction))]);
}
function pageSound(){if(!sound||flight.paused)return;pageEffect?.pause();pageEffect=new Audio('/assets/audio/page-turn.wav');pageEffect.volume=headphones?.3:.65;void pageEffect.play().catch(()=>{});}
function tick(now){
  const seconds=Math.max(0,(now-lastTick)/1000);
  if(flight){if(!flight.paused&&!['closing','complete'].includes(sceneOf(flight))){const reading=readFor(cabin,Math.min(seconds,Math.max(0,timingOf(flight).closing-flight.elapsed)));cabin=serveFor(reading.state,seconds);if(reading.turned){bookTurningUntil=now+1800;pageSound();}}flight=advance(flight,seconds);render();}
  else if(!document.hidden){const before=departure.stage;departure=advanceDeparture(departure,seconds);document.body.style.setProperty('--gate-veil',String(departure.stage==='scanning'?Math.min(1,departure.elapsed/.8):0));if(departure.stage==='seated')takeSeat();else if(before!==departure.stage)renderDeparture();}
  lastTick=now;
}
function renderInitialSound(){
  const label=$('initial-sound').checked?'Sound on':'Sound off';
  $('initial-sound-label').textContent=label;
  $('initial-sound').setAttribute('aria-label',label);
}
$('initial-sound').addEventListener('change',renderInitialSound);
function renderDeparture(){
  renderInitialSound();
  const issued=departure.stage!=='choose', scanning=departure.stage==='scanning';
  document.body.dataset.departure=departure.stage;
  $('journey-marker').hidden=!issued;
  $('trip-choice').hidden=issued;$('issued-pass').hidden=!issued;
  $('issue-ticket').hidden=issued;$('board').hidden=!['boarding','scanning'].includes(departure.stage);$('board').disabled=departure.stage!=='boarding';
  $('change-flight').hidden=!issued;$('change-flight').disabled=scanning;
  $('initial-sound').disabled=scanning;
  $('departure-title').textContent=issued?'Your journey is on.':'Your next departure.';
  $('pass-airline').textContent=`${airline.name} · ${cabinName()} · From Seoul`;$('pass-city').textContent=selected.city;
  $('pass-seat').textContent=seatNumber();$('pass-flight').textContent=airline.flight;$('pass-duration').textContent=selected.duration/60+' min';
  $('gate-status').textContent=scanning?'✓ Boarding pass accepted':departure.stage==='boarding'?`${airline.flight} to ${selected.city} · Now boarding`:'Boarding shortly · Gate A12';
  $('gate-note').textContent=scanning?`Welcome aboard. Seat ${seatNumber()}, by the window.`:departure.stage==='boarding'?'Your flight is ready. Scan your pass when you like.':'Take a moment by the window. We are getting ready to board.';
  $('board').textContent=scanning?'Welcome aboard…':'Scan & board ↗';
  $('preview-note').hidden=issued;
}

setInterval(()=>tick(performance.now()),100);
function render(){
  if(!flight)return;
  const scene=sceneOf(flight), events=cabinOf(flight), timing=timingOf(flight);
  updateSky();renderWindow();
  document.body.classList.toggle('paused',flight.paused||scene==='complete');
  document.body.classList.toggle('warm',events.warm);document.body.classList.toggle('dim',isDark(cabin));
  document.body.classList.toggle('reading-lit',cabin.readingLight&&cabin.bookOpen&&cabin.view==='table');
  document.body.classList.toggle('quiet-rest',cabin.view==='rest'&&!flight.paused&&scene!=='closing'&&performance.now()>controlsUntil);
  $('wake-rest').hidden=cabin.view!=='rest';
  $('look-left').hidden=cabin.view==='window'||cabin.view==='rest'||scene==='closing';
  $('look-right').hidden=cabin.view==='table'||cabin.view==='rest'||scene==='closing';
  $('look-left').setAttribute('aria-label',cabin.view==='table'?'Look back to your seat':'Look toward the window');
  $('look-right').setAttribute('aria-label',cabin.view==='window'?'Look back to your seat':'Look toward the table');
  // Keep label nodes stable while the flight clock renders: replacing a pressed span loses clicks.
  for(const [id,label] of [['look-left',cabin.view==='table'?'↑ <span>Seat</span>':'← <span>Window</span>'],['look-right',cabin.view==='window'?'<span>Seat</span> →':'<span>Table</span> ↓']]){
    if($(id).innerHTML!==label)$(id).innerHTML=label;
  }
  const reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skyDrift=reducedMotion||['runway','arrival-ground','ascent'].includes(sky)?0:Math.max(0,flight.elapsed-timing.cruise)*1.8%4000;document.body.style.setProperty('--cloud-photo',`${-skyDrift}px`);
  // Fit the whole sky into the glass, rather than sampling the screen's upper corner.
  const business=cabinClass==='business';
  const frame=cabin.view==='window'?(cabin.windowZoom?{x:0,y:0,w:1672,h:941}:business?{x:238,y:0,w:667,h:507}:{x:264,y:0,w:627,h:735}):business?{x:0,y:0,w:170,h:274}:{x:0,y:0,w:131,h:305};
  const scale=Math.max(frame.w/2000,frame.h/1125);
  $('photo-pattern').setAttribute('patternTransform',`translate(${frame.x+frame.w/2-(1000+skyDrift)*scale} ${frame.y+frame.h/2-562.5*scale}) scale(${scale})`);
  const daylight=cabinLightOf(flight,selected.id);
  document.body.style.setProperty('--daylight-warm',String(daylight.warm));
  document.body.style.setProperty('--daylight-night',String(daylight.night));
  document.body.style.setProperty('--cloud-far',`${-(flight.elapsed*.8%900)}px`);
  document.body.style.setProperty('--cloud-near',`${-(flight.elapsed*4.5%1200)}px`);
  const settling=Math.max(0,1-flight.elapsed/1.5);
  document.body.style.setProperty('--boarding-veil',String(settling));
  document.body.dataset.scene=scene;document.body.style.setProperty('--fade',String(Math.max(events.fade,settling)));audio.setFade(Math.max(events.fade,settling));
  audio.setRunway(runwayCueOf(flight),sound&&!flight.paused);
  audio.setAnnouncement(announcementOf(flight,selected.id),sound&&!flight.paused);
  if(voice)voice.volume=.42*(1-events.fade);
  $('cabin').dataset.scene=scene;
  const lift=Math.min(1,Math.max(0,(flight.elapsed-timing.takeoff)/(timing.cruise-timing.takeoff)));
  document.body.style.setProperty('--lift',String(lift));
  if(scene!==rendered){
    rendered=scene;
    if(scene==='complete'){
      stopVoice();audio.stopAnnouncement();closeDialogs();$('journey').hidden=true;$('complete-screen').hidden=false;
      $('complete-kicker').textContent=flight.early?'UNTIL NEXT TIME':`WELCOME TO ${flight.city.toUpperCase()}`;
      $('ending-city').textContent=flight.city;
      $('ending-flight').textContent=`${airline.name} · ${airline.flight} · ${cabinName()} · Seat ${seatNumber()}`;
      $('destination-card').hidden=flight.early;
      $('ending-photo').setAttribute('src',postcards[selected.id]);
      $('ending-photo').setAttribute('alt',`${flight.city} — a little glimpse of the journey ahead`);
      $('complete-title').classList.toggle('sr-only',!flight.early);
      $('completion-note').hidden=!flight.early;
      $('complete-title').textContent=flight.early?'A little pause, just for you.':`Welcome to ${flight.city}. Enjoy your stay.`;
      $('completion-note').textContent=flight.early?'Thank you for spending a little time above the clouds.':'';
      $('complete-title').tabIndex=-1;$('complete-title').focus();void syncAudio();return;
    }
    if(scene==='closing'){pageEffect?.pause();closeDialogs();resetView();$('flight-progress').hidden=true;$('progress-toggle').setAttribute('aria-expanded','false');}
    $('scene-label').textContent=scene.toUpperCase();$('scene-title').textContent=scene==='boarding'?'Your window seat.':scene==='takeoff'?'Here we go.':scene==='cruise'?'Above the clouds.':'Your journey is just beginning.';
    noticeUntil=flight.elapsed+8;
  }
  if(scene==='complete')return;
  const message=scene==='closing'?events.arrived?`Welcome to ${flight.city}. Thank you for flying with us.`:`We have landed in ${flight.city}. Please remain seated.`:scene==='boarding'?announcementOf(flight,selected.id)?.key==='captain'?'This is your captain speaking. Cabin crew, prepare for takeoff.':flight.elapsed>=3?`Welcome aboard ${airline.name}, bound for ${flight.city}.`:`Seat ${seatNumber()}. Settle in.`:scene==='takeoff'?'Here we go.':'Above the clouds.';
  $('announcement').textContent=message;$('announcement').hidden=scene==='cruise'||(cabin.view==='window'&&scene!=='closing')||(scene!=='closing'&&flight.elapsed>=noticeUntil&&announcementOf(flight,selected.id)?.key!=='captain');
  $('belt').dataset.lit=String(events.belt);$('belt').setAttribute('aria-label',`Seat belt sign ${events.belt?'on':'off'}`);$('belt').setAttribute('title',`Seat belt sign ${events.belt?'on':'off'}`);
  const table=cabin.view==='table', drink=cabin.drink;
  if(cabin.welcomePending&&drink)cabin.welcomePending=false;
  const welcome=cabinClass==='business'&&cabin.view==='seat'&&(cabin.welcomeOpen||cabin.welcomePending)&&events.drinks;
  $('welcome-service').hidden=!welcome;
  $('welcome-note').textContent=cabin.welcomePending?`${drinkName(cabin.drinkRequest)}, of course. One moment.`:'Welcome aboard. A drink?';
  for(const id of ['champagne','red-wine','white-wine','water'])$(`welcome-${id}`).disabled=Boolean(cabin.welcomePending);
  $('welcome-skip').hidden=Boolean(cabin.welcomePending);
  $('tray').hidden=!table&&!(cabinClass==='business'&&cabin.view==='seat'&&drink);$('cabin').classList.toggle('table-open',table);
  $('tray-toggle').disabled=scene==='closing';$('window-open').disabled=scene==='closing';$('pocket-open').disabled=false;$('rest-toggle').disabled=scene==='closing';$('cabin-light').disabled=scene==='closing';$('music-toggle').disabled=scene==='closing';
  $('tray-toggle').setAttribute('aria-expanded',String(table));$('tray-toggle').setAttribute('aria-label',table?'Close tray':'Open tray');
  const clearing=cabin.clearingRemaining>0, requesting=Boolean(cabin.drinkRequest)||clearing;
  $('clear-drink').hidden=!cabin.serviceOpen||!drink||requesting||!events.drinks;
  $('drinks').hidden=!cabin.serviceOpen||requesting||!events.drinks;
  $('tray').classList.toggle('service-open',cabin.serviceOpen);
  $('tray').classList.toggle('service-active',cabin.serviceOpen||requesting);
  const crewLabel=requesting?'Cabin crew is on the way':cabin.serviceOpen?'Cancel cabin crew call':'Call cabin crew';
  $('crew-call').setAttribute('aria-label',crewLabel);$('crew-call').setAttribute('title',crewLabel);
  $('crew-call').disabled=requesting||!events.drinks;$('crew-call').setAttribute('aria-expanded',String(cabin.serviceOpen));
  $('service-note').textContent=clearing?'Please clear my drink. Of course — one moment.':requesting?`${drinkName(cabin.drinkRequest)}, please. Of course — one moment.`:cabin.serviceOpen?'What would you like to drink?':'Your tray. A little time for yourself.';
  $('service-note').hidden=!requesting&&!cabin.serviceOpen;
  $('cup').hidden=!drink;$('cup-label').textContent=drinkName(drink);$('cup').dataset.drink=drink;
  $('sip-note').hidden=flight.elapsed>=sipUntil;
  $('cup').setAttribute('aria-label',`Take a sip of ${drink||'your drink'}`);
  $('book-close').hidden=!cabin.bookOpen;$('book').hidden=!cabin.bookOpen;$('book-open').hidden=cabin.bookOpen||cabin.serviceOpen||requesting||!events.drinks;$('tray-menu-close').hidden=cabin.bookOpen;
  $('tray').classList.toggle('reading',cabin.bookOpen);$('cabin').classList.toggle('reading-scene-active',cabin.bookOpen&&table);
  $('book-open').setAttribute('aria-pressed',String(cabin.bookOpen));$('book-open').setAttribute('title',scene==='closing'?'Reading is unavailable during landing':cabin.bookOpen?'Put your book away':'Read at your table');$('book-open').disabled=scene==='closing';
  $('book').dataset.spread=String(cabin.page);
  $('book').classList.toggle('turning',performance.now()<bookTurningUntil);
  $('cabin-light').setAttribute('aria-pressed',String(cabin.cabinDark));$('cabin-light').setAttribute('aria-label',cabin.cabinDark?'Brighten cabin lights':'Dim cabin lights');
  $('pause-toggle').textContent=flight.paused?'Continue flight':'Pause';$('pause-toggle').setAttribute('aria-pressed',String(flight.paused));$('pause-note').hidden=!flight.paused;
  $('progress-toggle').disabled=scene==='closing';
  $('progress-toggle').setAttribute('aria-label',scene!=='closing'?'Show or hide flight map':'Flight map unavailable');$('progress-toggle').setAttribute('title',scene==='closing'?'Map is closed during landing':'Show or hide flight map');
  $('progress-toggle').textContent='Map';$('flight-time').textContent=`${clock(flight.elapsed)} / ${clock(flight.duration)}`;
  $('route-progress').value=flight.elapsed/flight.duration;
  const position=mapPosition(flight);
  if(position){$('map-plane').setAttribute('transform',`translate(${position.x} ${position.y}) rotate(${position.heading})`);$('map-travelled').style.setProperty('stroke-dashoffset',String(100*(1-position.progress)));$('map-remaining').textContent=`${clock(Math.max(0,flight.duration-flight.elapsed))} remaining`;$('map-status').textContent=flight.paused?'Paused':scene==='boarding'?'At the gate':scene==='closing'?`Arriving in ${flight.city}`:'An imaginary route.';}
  else $('flight-progress').hidden=true;
  renderSound();
}
function restart(){
  stopVoice();audio.stopAnnouncement();audio.stopRunway();departure=createDeparture();flight=null;headphones=false;music=false;musicFailed=false;sky='';updateSky();bookTurningUntil=0;cabin=createCabin();rendered='';sound=false;audioFailed=false;sipUntil=-1;noticeUntil=8;
  closeDialogs();void syncAudio();resetView();document.body.classList.remove('paused','warm','dim','reading-lit','quiet-rest');delete document.body.dataset.scene;renderWindow();
  document.body.style.removeProperty('--lift');document.body.style.removeProperty('--fade');document.body.style.removeProperty('--gate-veil');
  $('departure').hidden=false;$('journey').hidden=true;$('complete-screen').hidden=true;$('initial-sound').checked=false;
  $('flight-progress').hidden=true;$('progress-toggle').setAttribute('aria-expanded','false');
  document.querySelectorAll('#drinks button').forEach(button=>button.setAttribute('aria-pressed','false'));renderDeparture();$('issue-ticket').focus();
}
function takeSeat(){
  document.body.dataset.departure='seated';
  stopVoice();flight=createFlight({city:selected.city,duration:selected.duration,airline:airline.id,cabinClass});lastTick=performance.now();sound=$('initial-sound').checked;
  $('departure').hidden=true;$('journey').hidden=false;$('journey-marker').hidden=false;
  $('ticket-seat').textContent=`${seatNumber()} · ${cabinName()} · Window`;$('ticket-city').textContent=selected.city;$('ticket-airline').textContent=airline.name;$('ticket-flight').textContent=airline.flight;$('ticket-duration').textContent=`${selected.duration/60} min`;$('progress-city').textContent=selected.city;
  configureMap();if(cabinClass==='business')cabin={...cabin,welcomeOpen:true,welcomePending:false};resetView();render();$('scene-title').tabIndex=-1;$('scene-title').focus();void syncAudio();
}
$('issue-ticket').addEventListener('click',()=>{stopVoice();departure=issueTicket();lastTick=performance.now();renderDeparture();$('pass-city').tabIndex=-1;$('pass-city').focus();});
$('change-flight').addEventListener('click',()=>{if(departure.stage==='scanning')return;departure=createDeparture();renderDeparture();$('issue-ticket').focus();});
$('board').addEventListener('click',()=>{
  if(flight||departure.stage!=='boarding')return;
  stopVoice();departure=scanTicket(departure);lastTick=performance.now();renderDeparture();
  // Unlock audio in this user gesture, with the cabin held silent until seated.
  if($('initial-sound').checked){audio.setFade(1);void audio.setActive(true).catch(()=>{audioFailed=true;});}
});
$('pause-toggle').addEventListener('click',()=>{tick(performance.now());flight=flight.paused?resume(flight):pause(flight);lastTick=performance.now();render();void syncAudio();if(sound&&!flight.paused&&voice&&!voice.ended)void voice.play().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{
  if(!flight){tick(performance.now());if(document.hidden)stopVoice();return;}
  tick(performance.now());
  if(document.hidden&&!$('keep-background').checked&&sceneOf(flight)!=='complete'){flight=pause(flight);render();void syncAudio();}
});
$('music-toggle').addEventListener('click',()=>{music=!music;if(music)sound=true;renderMusic();renderSound();void syncAudio();});
function setSound(enabled){sound=enabled;if(!sound){stopVoice();audio.stopAnnouncement();audio.stopRunway();}renderSound();void syncAudio();}
$('sound-toggle').addEventListener('click',()=>setSound(!sound));
$('noise-cancel').addEventListener('click',()=>{if(!sound)return;headphones=!headphones;renderSound();void syncAudio();});
$('mute-all').addEventListener('change',()=>setSound(!$('mute-all').checked));
$('look-left').addEventListener('click',()=>lookSide(-1));
$('look-right').addEventListener('click',()=>lookSide(1));
$('window-open').addEventListener('click',()=>{if(!flight||['closing','complete'].includes(sceneOf(flight)))return;if(cabin.view!=='window'){lookAround('window');return;}cabin.windowZoom=!cabin.windowZoom;render();});
$('view-back').addEventListener('click',()=>lookAround('seat'));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&cabin.view!=='seat')lookAround('seat');});
for(const [trigger,dialog] of [['pocket-open','pocket-dialog'],['exit-open','exit-dialog']])$(trigger).addEventListener('click',()=>{closeDialogs();$(dialog).showModal();});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('tray-toggle').addEventListener('click',()=>lookAround(cabin.view==='table'?'seat':'table'));
$('tray-menu-close').addEventListener('click',()=>lookAround('seat'));
document.querySelectorAll('#drinks button').forEach(button=>button.addEventListener('click',()=>{if(!cabinOf(flight).drinks)return;cabin=requestDrink(cabin,button.dataset.drink);document.querySelectorAll('#drinks button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();$('service-note').tabIndex=-1;$('service-note').focus();}));
for(const drink of ['champagne','red-wine','white-wine','water'])$(`welcome-${drink}`).addEventListener('click',()=>{
  if(!flight||cabinClass!=='business'||!cabin.welcomeOpen||!cabinOf(flight).drinks)return;
  cabin=requestDrink({...cabin,welcomeOpen:false,welcomePending:true},drink);render();
});
$('welcome-skip').addEventListener('click',()=>{cabin.welcomeOpen=false;render();});
$('cup').addEventListener('click',()=>{sipUntil=flight.elapsed+3;$('cup').classList.toggle('sipping',true);render();});
$('cup').addEventListener('animationend',()=>$('cup').classList.remove('sipping'));
function putBookAway(){cabin.bookOpen=false;cabin.readingElapsed=0;bookTurningUntil=0;pageEffect?.pause();render();}
$('book-open').addEventListener('click',()=>{if(!flight||!cabinOf(flight).drinks||cabin.view!=='table'||cabin.bookOpen)return;closeDialogs();cabin.serviceOpen=false;cabin.bookOpen=true;cabin.readingElapsed=0;cabin.firstPageTurned=false;lookAround('table');pageSound();render();$('scene-title').focus();});
$('book-close').addEventListener('click',()=>{putBookAway();$('exit-open').focus();});
$('cabin-light').addEventListener('click',()=>{cabin.cabinDark=!cabin.cabinDark;render();});
$('rest-toggle').addEventListener('click',()=>{setView(cabin.view==='rest'?'seat':'rest');render();});
let swipeStart=null;
document.addEventListener('touchstart',event=>{if(!flight)return;const control=event.target.closest('button,input,select,dialog,#book');if(control&&control.id!=='window-open')return;const touch=event.touches[0];swipeStart={x:touch.clientX,y:touch.clientY};},{passive:true});
document.addEventListener('touchend',event=>{if(!swipeStart)return;const touch=event.changedTouches[0],dx=touch.clientX-swipeStart.x,dy=touch.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>70&&Math.abs(dy)<60){event.preventDefault();lookSide(dx<0?1:-1);}},{passive:false});
document.addEventListener('keydown',event=>{if(!flight||event.target.closest('input,select,textarea,dialog,#book'))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();lookSide(event.key==='ArrowLeft'?-1:1);}});
$('wake-rest').addEventListener('click',()=>{controlsUntil=performance.now()+4000;render();});
document.addEventListener('pointermove',()=>{if(cabin.view==='rest')controlsUntil=performance.now()+4000;});
document.addEventListener('focusin',()=>{if(cabin.view==='rest')controlsUntil=performance.now()+4000;});
$('crew-call').addEventListener('click',()=>{
  if(!flight||!cabinOf(flight).drinks||cabin.drinkRequest||cabin.clearingRemaining>0)return;
  cabin.serviceOpen=!cabin.serviceOpen;
  if(cabin.serviceOpen){cabin.bookOpen=false;pageEffect?.pause();bookTurningUntil=0;lookAround('table');}
  render();
});
$('clear-drink').addEventListener('click',()=>{if(!flight||!cabinOf(flight).drinks||!cabin.drink||cabin.drinkRequest||cabin.clearingRemaining>0)return;cabin=requestClear(cabin);sipUntil=-1;render();$('service-note').tabIndex=-1;$('service-note').focus();});
$('progress-toggle').addEventListener('click',()=>{if(!flight||sceneOf(flight)==='closing'||!mapPosition(flight))return;$('flight-progress').hidden=!$('flight-progress').hidden;$('progress-toggle').setAttribute('aria-expanded',String(!$('flight-progress').hidden));});
$('finish-now').addEventListener('click',()=>{tick(performance.now());flight=finish(flight);render();});
$('restart').addEventListener('click',restart);$('exit-restart').addEventListener('click',restart);
updateSelection();renderDeparture();
