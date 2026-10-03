import {routes, airlines, createFlight, advance, finish, pause, resume, sceneOf, cabinOf, timingOf, announcementOf, skyOf, createDeparture, issueTicket, scanTicket, advanceDeparture, mapPosition, flightMaps, runwayCueOf, cabinLightOf} from './flight.js?v=985613b21e25';
import {arrivalViews, createArrivalView} from './arrival.js?v=985613b21e25';
import {createGeographicMap} from './map.js?v=985613b21e25';
import {CabinAudio} from './audio.js?v=985613b21e25';
import {createCabin, look, isDark, readFor, requestDrink, requestClear, serveFor} from './cabin.js?v=985613b21e25';
const $=id=>document.getElementById(id), audio=new CabinAudio();
const arrivalView=createArrivalView({screen:$('complete-screen'),section:$('arrival-view'),mount:$('arrival-player'),poster:$('arrival-poster'),status:$('arrival-status'),source:$('arrival-source'),play:$('arrival-play'),next:$('arrival-next'),card:$('destination-card'),toggle:$('arrival-card-toggle'),toolbar:$('arrival-toolbar'),onStreetVolume:value=>{$('arrival-street').value=String(Math.round(value*100));$('arrival-street').setAttribute('aria-valuetext',value?`Street ${Math.round(value*100)}%`:'Street muted');}});
const geographicMap=createGeographicMap({panel:$('flight-progress'),mount:$('geographic-map'),fallback:$('route-map'),status:$('map-load-status'),fit:$('map-fit')});
let departure=createDeparture(), destinationVolume=0, cabinVolume=0, musicVolume=0, audioSync=0;
let flightDuration=120, durationValid=true, durationChoice='2';
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
  $('terminal-ticket').textContent=`Seoul → ${selected.city} · ${flightDuration/60} min`;
  document.body.dataset.route=selected.id;document.body.dataset.airline=airline.id;
  $('journey-marker').textContent=`${airline.flight} ↗ ${selected.city}`;
}
function chooseDuration(){
  const custom=durationChoice==='custom';
  for(const choice of ['2','5','10','custom'])$('length-'+choice).setAttribute('aria-pressed',String(choice===durationChoice));
  $('custom-length-label').hidden=!custom;
  const minutes=Number(custom?$('custom-length').value:durationChoice);
  durationValid=Number.isInteger(minutes)&&minutes>=2&&minutes<=60;
  if(durationValid)flightDuration=minutes*60;
  $('custom-length').setAttribute('aria-invalid',String(custom&&!durationValid));
  $('flight-length-note').hidden=durationValid;
  $('flight-length-note').textContent=durationValid?'':'Choose a whole number from 2 to 60 minutes.';
  $('issue-ticket').disabled=!durationValid;
  updateSelection();
}
for(const choice of ['2','5','10','custom'])$('length-'+choice).addEventListener('click',()=>{durationChoice=choice;chooseDuration();if(choice==='custom')$('custom-length').focus();});
$('custom-length').addEventListener('input',chooseDuration);
document.querySelectorAll('input[name="route"]').forEach(input=>input.addEventListener('change',()=>{selected=routes.find(route=>route.id===input.value);updateSelection();}));
$('cabin-choice').addEventListener('change',()=>{if(departure.stage==='scanning')return;cabinClass=$('cabin-choice').value==='business'?'business':'economy';updateSelection();renderDeparture();$('ticket-seat-edit').open=false;});
$('airline-choice').addEventListener('change',()=>{if(departure.stage==='scanning')return;airline=airlines.find(item=>item.id===$('airline-choice').value);stopVoice();$('preview-note').textContent='An imaginary flight. Leave whenever you like.';updateSelection();renderDeparture();$('ticket-airline-edit').open=false;});
$('voice-preview').addEventListener('click',()=>{if(voice){stopVoice();$('preview-note').textContent='Preview stopped.';}else{playVoice();$('preview-note').textContent=`A little welcome from ${airline.name}.`;voice.addEventListener('ended',()=>{stopVoice();$('preview-note').textContent='An imaginary flight. Leave whenever you like.';},{once:true});}});
async function syncAudio(){
  const token=++audioSync, arrived=Boolean(flight&&!flight.early&&sceneOf(flight)==='complete'&&arrivalViews[selected.id]);
  if(pageEffect)pageEffect.volume=(headphones?.3:.65)*cabinVolume;audio.setCabinVolume(cabinVolume);audio.setMusicVolume(musicVolume);audio.setArrival(arrived);audio.setDestinationVolume(destinationVolume);
  try{await audio.setActive(arrived?destinationVolume>0:Boolean((sound||music)&&flight&&!flight.paused&&sceneOf(flight)!=='complete'));if(token!==audioSync)return;audioFailed=false;}catch{if(token!==audioSync)return;sound=false;destinationVolume=0;audioFailed=true;}
  if(token!==audioSync)return;
  if(!sound||flight?.paused||!flight||sceneOf(flight)==='complete')voice?.pause();
  if(!sound||flight?.paused||!flight||sceneOf(flight)==='complete')pageEffect?.pause();
  audio.setHeadphones(headphones);
  try{await audio.setMusic(arrived?destinationVolume>0:music);if(token!==audioSync)return;musicFailed=false;}catch{if(token!==audioSync)return;music=false;destinationVolume=0;musicFailed=true;}
  renderArrivalVolume();renderMusic();
  if(sound&&flight&&audio.context)audio.preloadAnnouncements(flight.airline,selected.id);
  renderSound();
}
function renderArrivalVolume(){
  $('arrival-volume').value=String(Math.round(destinationVolume*100));
  const label=audioFailed||musicFailed?'Music unavailable':destinationVolume>0?`Music ${Math.round(destinationVolume*100)}%`:'Muted';
  $('arrival-volume').setAttribute('aria-valuetext',label);$('arrival-volume-label').textContent=label;
}
$('arrival-street').addEventListener('input',()=>{const value=Number($('arrival-street').value);arrivalView.setStreetVolume(value/100);$('arrival-street').setAttribute('aria-valuetext',value?`Street ${value}%`:'Street muted');});
$('arrival-volume').addEventListener('input',()=>{destinationVolume=Number($('arrival-volume').value)/100;renderArrivalVolume();void syncAudio();});
function renderMusic(){ $('music-toggle').value=String(Math.round(musicVolume*100));$('music-toggle').setAttribute('aria-valuetext',musicFailed?'Music unavailable':`Music ${Math.round(musicVolume*100)}%`);}
function renderSound(){
  $('sound-toggle').value=String(Math.round(cabinVolume*100));
  $('sound-toggle').setAttribute('aria-valuetext',`Cabin ${Math.round(cabinVolume*100)}%`);
  $('noise-cancel').disabled=!sound;
  $('noise-cancel').setAttribute('aria-pressed',String(headphones));
  $('noise-cancel').setAttribute('aria-label',`Noise cancellation ${headphones?'on':'off'}`);
  $('noise-cancel').setAttribute('title',!sound?'Turn sound on to use noise cancellation':headphones?'Turn noise cancellation off':'Turn noise cancellation on');
  $('mute-all').checked=!(sound||music);$('sound-note').hidden=!audioFailed;
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
function pageSound(){if(!sound||flight.paused)return;pageEffect?.pause();pageEffect=new Audio('/assets/audio/page-turn.wav');pageEffect.volume=(headphones?.3:.65)*cabinVolume;void pageEffect.play().catch(()=>{});}
function tick(now){
  const seconds=Math.max(0,(now-lastTick)/1000);
  if(flight){if(!flight.paused&&!['closing','complete'].includes(sceneOf(flight))){const reading=readFor(cabin,Math.min(seconds,Math.max(0,timingOf(flight).closing-flight.elapsed)));cabin=serveFor(reading.state,seconds);if(reading.turned){bookTurningUntil=now+1800;pageSound();}}flight=advance(flight,seconds);render();}
  else if(!document.hidden){const before=departure.stage;departure=advanceDeparture(departure,seconds);document.body.style.setProperty('--gate-veil',String(departure.stage==='scanning'?Math.min(1,departure.elapsed/.8):0));if(departure.stage==='seated')takeSeat();else if(before!==departure.stage)renderDeparture();}
  lastTick=now;
}
function renderInitialSound(){
  const label=$('initial-sound').checked?'Sound on':'Sound off';
  $('initial-sound-label').textContent=label;$('departure-sound-label').textContent=`♫ ${label}`;
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
  $('initial-sound').disabled=scanning;$('cabin-choice').disabled=scanning;$('airline-choice').disabled=scanning;
  if(scanning){$('ticket-airline-edit').open=false;$('ticket-seat-edit').open=false;$('departure-sound').open=false;}
  $('departure-title').textContent=issued?'A ticket to somewhere new.':'Where shall we go?';
  $('pass-airline').textContent=airline.name;$('pass-city').textContent=selected.city;
  $('pass-airport').textContent={tokyo:'HND',bangkok:'BKK',paris:'CDG'}[selected.id];
  $('pass-seat-label').textContent=`Seat · ${cabinName()}`;
  $('pass-seat').textContent=seatNumber();$('pass-flight').textContent=airline.flight;$('pass-duration').textContent=flightDuration/60+' min';
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
  document.body.dataset.scene=scene;document.body.style.setProperty('--fade',String(Math.max(scene==='closing'?events.fade*.72:events.fade,settling)));audio.setFade(Math.max(events.fade,settling));
  audio.setRunway(runwayCueOf(flight),sound&&!flight.paused);
  audio.setAnnouncement(announcementOf(flight,selected.id),sound&&!flight.paused);
  if(voice)voice.volume=.42*cabinVolume*(1-events.fade);
  $('cabin').dataset.scene=scene;
  const lift=Math.min(1,Math.max(0,(flight.elapsed-timing.takeoff)/(timing.cruise-timing.takeoff)));
  document.body.style.setProperty('--lift',String(lift));
  if(scene!==rendered){
    rendered=scene;
    if(scene==='complete'){
      stopVoice();audio.stopAnnouncement();closeDialogs();$('journey').hidden=true;$('complete-screen').hidden=false;
      destinationVolume=flight.early?0:musicVolume;
      renderArrivalVolume();
      $('complete-kicker').textContent=flight.early?'UNTIL NEXT TIME':`WELCOME TO ${flight.city.toUpperCase()}`;
      $('ending-city').textContent=flight.city;
      $('ending-flight').textContent=`${airline.name} · ${airline.flight} · ${cabinName()} · Seat ${seatNumber()}`;
      $('destination-card').hidden=true;
      $('ending-photo').setAttribute('src',postcards[selected.id]);
      $('ending-photo').setAttribute('alt',`${flight.city} — a little glimpse of the journey ahead`);
      $('complete-title').classList.toggle('sr-only',!flight.early);
      $('completion-note').hidden=!flight.early;
      $('complete-title').textContent=flight.early?'A little pause, just for you.':`Welcome to ${flight.city}. Enjoy your stay.`;
      $('completion-note').textContent=flight.early?'Thank you for spending a little time above the clouds.':'';
      $('complete-title').tabIndex=-1;$('complete-title').focus();void syncAudio();if(flight.early)void arrivalView.show(selected.id,true);else{$('arrival-consent').hidden=false;$('arrival-consent-title').textContent=`Welcome to ${flight.city}.`;$('arrival-welcome-note').textContent=selected.id==='bangkok'?'Your evening is just beginning.':selected.id==='paris'?'Your morning is just beginning.':'Your night is just beginning.';$('arrival-allow').textContent=`Explore ${flight.city} ↗`;$('arrival-consent-title').tabIndex=-1;$('arrival-consent-title').focus();}return;
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
  if(position){if(!$('flight-progress').hidden)void geographicMap.update(flight.city,position.progress);$('map-plane').setAttribute('transform',`translate(${position.x} ${position.y}) rotate(${position.heading})`);$('map-travelled').style.setProperty('stroke-dashoffset',String(100*(1-position.progress)));$('map-remaining').textContent=`${clock(Math.max(0,flight.duration-flight.elapsed))} remaining`;$('map-status').textContent=flight.paused?'Paused':scene==='boarding'?'At the gate':scene==='closing'?`Arriving in ${flight.city}`:'An imaginary route.';}
  else $('flight-progress').hidden=true;
  renderSound();
}
function restart(){
  arrivalView.reset();$('arrival-consent').hidden=true;geographicMap.reset();$('map-view-route').setAttribute('aria-pressed','true');$('map-view-globe').setAttribute('aria-pressed','false');$('cabin-sound').open=false;destinationVolume=0;$('arrival-street').value='0';$('arrival-street').setAttribute('aria-valuetext','Street muted');$('arrival-sound').open=false;
  stopVoice();audio.stopAnnouncement();audio.stopRunway();departure=createDeparture();flight=null;headphones=false;music=false;cabinVolume=0;musicVolume=0;musicFailed=false;sky='';updateSky();bookTurningUntil=0;cabin=createCabin();rendered='';sound=false;audioFailed=false;sipUntil=-1;noticeUntil=8;
  closeDialogs();void syncAudio();resetView();document.body.classList.remove('paused','warm','dim','reading-lit','quiet-rest');delete document.body.dataset.scene;renderWindow();
  document.body.style.removeProperty('--lift');document.body.style.removeProperty('--fade');document.body.style.removeProperty('--gate-veil');
  $('departure').hidden=false;$('journey').hidden=true;$('complete-screen').hidden=true;
  $('flight-progress').hidden=true;$('progress-toggle').setAttribute('aria-expanded','false');
  document.querySelectorAll('#drinks button').forEach(button=>button.setAttribute('aria-pressed','false'));renderDeparture();$('issue-ticket').focus();
}
function takeSeat(){
  document.body.dataset.departure='seated';
  stopVoice();flight=createFlight({city:selected.city,duration:flightDuration,airline:airline.id,cabinClass});lastTick=performance.now();sound=$('initial-sound').checked;cabinVolume=sound?1:0;
  $('departure').hidden=true;$('journey').hidden=false;$('journey-marker').hidden=false;
  $('ticket-seat').textContent=`${seatNumber()} · ${cabinName()} · Window`;$('ticket-city').textContent=selected.city;$('ticket-airline').textContent=airline.name;$('ticket-flight').textContent=airline.flight;$('ticket-duration').textContent=`${flightDuration/60} min`;$('progress-city').textContent=selected.city;
  configureMap();if(cabinClass==='business')cabin={...cabin,welcomeOpen:true,welcomePending:false};resetView();render();$('scene-title').tabIndex=-1;$('scene-title').focus();void syncAudio();
}
$('issue-ticket').addEventListener('click',()=>{if(!durationValid)return;$('departure-sound').open=false;stopVoice();departure=issueTicket();lastTick=performance.now();renderDeparture();$('pass-city').tabIndex=-1;$('pass-city').focus();});
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
$('music-toggle').addEventListener('input',()=>{musicVolume=Number($('music-toggle').value)/100;music=musicVolume>0;renderMusic();void syncAudio();});
function setSound(enabled){sound=enabled;cabinVolume=enabled?1:0;if(!sound){stopVoice();audio.stopAnnouncement();audio.stopRunway();}renderSound();void syncAudio();}
$('sound-toggle').addEventListener('input',()=>{cabinVolume=Number($('sound-toggle').value)/100;sound=cabinVolume>0;if(!sound){stopVoice();audio.stopAnnouncement();audio.stopRunway();}renderSound();void syncAudio();});
$('noise-cancel').addEventListener('click',()=>{if(!sound)return;headphones=!headphones;renderSound();void syncAudio();});
$('mute-all').addEventListener('change',()=>{if($('mute-all').checked){music=false;musicVolume=0;renderMusic();setSound(false);}else setSound(true);});
$('look-left').addEventListener('click',()=>lookSide(-1));
$('look-right').addEventListener('click',()=>lookSide(1));
$('window-open').addEventListener('click',()=>{if(!flight||['closing','complete'].includes(sceneOf(flight)))return;if(cabin.view!=='window'){lookAround('window');return;}cabin.windowZoom=!cabin.windowZoom;render();});
$('view-back').addEventListener('click',()=>lookAround('seat'));
function closeMap(restoreFocus=false){$('flight-progress').hidden=true;$('progress-toggle').setAttribute('aria-expanded','false');if(restoreFocus)$('progress-toggle').focus();}
$('map-close').addEventListener('click',()=>closeMap(true));
for(const view of ['route','globe'])$('map-view-'+view).addEventListener('click',()=>{geographicMap.setView(view);for(const option of ['route','globe'])$('map-view-'+option).setAttribute('aria-pressed',String(view===option));});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(!$('flight-progress').hidden){closeMap(true);return;}
  if($('cabin-sound').open){$('cabin-sound').open=false;$('cabin-sound').querySelector?.('summary')?.focus();return;}
  if(cabin.view!=='seat')lookAround('seat');
});
$('cabin-sound').addEventListener('toggle',()=>{if($('cabin-sound').open)closeMap();});
for(const [trigger,dialog] of [['pocket-open','pocket-dialog'],['exit-open','exit-dialog']])$(trigger).addEventListener('click',()=>{closeMap();$('cabin-sound').open=false;closeDialogs();$(dialog).showModal();});
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
document.addEventListener('touchstart',event=>{if(!flight)return;const control=event.target.closest('button,input,select,dialog,details,#book,#flight-progress');if(control&&control.id!=='window-open')return;const touch=event.touches[0];swipeStart={x:touch.clientX,y:touch.clientY};},{passive:true});
document.addEventListener('touchend',event=>{if(!swipeStart)return;const touch=event.changedTouches[0],dx=touch.clientX-swipeStart.x,dy=touch.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>70&&Math.abs(dy)<60){event.preventDefault();lookSide(dx<0?1:-1);}},{passive:false});
document.addEventListener('keydown',event=>{if(!flight||event.target.closest('button,input,select,textarea,dialog,details,#book,#flight-progress'))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();lookSide(event.key==='ArrowLeft'?-1:1);}});
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
$('progress-toggle').addEventListener('click',()=>{if(!flight||sceneOf(flight)==='closing'||!mapPosition(flight))return;$('cabin-sound').open=false;$('flight-progress').hidden=!$('flight-progress').hidden;$('progress-toggle').setAttribute('aria-expanded',String(!$('flight-progress').hidden));if(!$('flight-progress').hidden)void geographicMap.update(flight.city,mapPosition(flight).progress);});
$('finish-now').addEventListener('click',()=>{tick(performance.now());flight=finish(flight);render();});
$('arrival-allow').addEventListener('click',()=>{if(!flight||flight.early||sceneOf(flight)!=='complete')return;$('arrival-consent').hidden=true;void arrivalView.show(selected.id,false);});
$('arrival-skip').addEventListener('click',()=>{if(!flight||flight.early||sceneOf(flight)!=='complete')return;$('arrival-consent').hidden=true;arrivalView.showPostcard(selected.id);});
document.querySelectorAll('[data-policy-open]').forEach(button=>button.addEventListener('click',()=>{$('privacy-dialog').showModal();}));
$('restart').addEventListener('click',restart);$('exit-restart').addEventListener('click',restart);
$('arrival-consent').hidden=true;chooseDuration();renderDeparture();
