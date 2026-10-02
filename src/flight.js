import {boardingLengths,captainLengths} from './announcement-timing.js?v=b3b544dcd610';
// Names, routes and durations remain prototype proposals.
export const routes = Object.freeze([
  {id:'tokyo', city:'Tokyo', mood:'Dusk above the clouds', duration:300},
  {id:'bangkok', city:'Bangkok', mood:'A warm summer night', duration:600},
  {id:'paris', city:'Paris', mood:'The first light of morning', duration:900}
]);
export const airlines = Object.freeze([
  {id:'cloudline', name:'Cloudline', voice:'a-heart', flight:'CL 01'},
  {id:'blue-hour', name:'Blue Hour', voice:'b-emma', flight:'BH 02'}
]);
export const proposal = Object.freeze({ name:'Above the Clouds', city:'Tokyo', destination:'TOKYO', seat:'12A', flight:'CLOUD 01', takeoff:30, cruise:75, service:0, sunset:195, dim:285, closing:450, arrivalAnnouncement:452, end:480 });
export function createFlight(options = {}) {return {elapsed:0, paused:false, early:false, cabinClass:options.cabinClass==='business'?'business':'economy', city:options.city || proposal.city, airline:options.airline || 'cloudline', duration:options.duration || proposal.end};}
export function speechTiming(state){
  const boardingEnd=3+(boardingLengths[`${state.airline}-${state.city.toLowerCase()}-boarding`]||18);
  const captainStart=boardingEnd+1;
  return {boardingEnd,captainStart,captainEnd:captainStart+(captainLengths[state.airline]||6)};
}
export function timingOf(state) {
  if (state.duration === proposal.end) return proposal;
  return {takeoff:Math.max(30,speechTiming(state).captainEnd+1), cruise:Math.max(Math.min(75,state.duration*.15),speechTiming(state).captainEnd+15), sunset:state.duration*.4, dim:state.duration*.6, closing:state.duration-30, arrivalAnnouncement:state.duration-28, end:state.duration};
}
export function skyOf(state,route){
  const timing=timingOf(state);
  if(state.elapsed<timing.takeoff)return 'runway';
  if(state.elapsed<timing.cruise)return 'ascent';
  if(state.elapsed>=timing.closing-20)return 'arrival-ground';
  const progress=state.elapsed/state.duration;
  if(route==='paris')return progress<.4?'blue-hour':progress<.72?'cloud-sea':'open-sky';
  if(route==='bangkok')return progress<.3?'cloud-sea':progress<.6?'open-sky':'blue-hour';
  return progress<.34?'cloud-sea':progress<.55?'open-sky':progress<.82?'sunset':'blue-hour';
}
// Shared light changes with the active clock, without changing the passenger's view.
export function cabinLightOf(state,route){
  const timing=timingOf(state);
  const p=Math.min(1,Math.max(0,(state.elapsed-timing.cruise)/(timing.closing-timing.cruise)));
  if(route==='paris')return {warm:.04*p,night:.24*(1-p)};
  if(route==='bangkok')return {warm:.04,night:.12+.15*p};
  return {warm:Math.sin(p*Math.PI)*.14,night:Math.max(0,(p-.65)/.35)*.22};
}
export function announcementOf(state,route){
  if(state.early||state.elapsed>=state.duration)return null;
  const arrival=timingOf(state).arrivalAnnouncement;
  const speech=speechTiming(state);
  const phase=state.elapsed>=arrival?'arrival':state.elapsed>=speech.captainStart&&state.elapsed<speech.captainEnd?'captain':state.elapsed>=3&&state.elapsed<speech.boardingEnd?'boarding':null;
  if(!phase)return null;
  return {key:phase,path:`/assets/audio/announcements/${state.airline}-${phase==='captain'?'captain':`${route}-${phase}`}.wav`,offset:state.elapsed-(phase==='boarding'?3:phase==='captain'?speech.captainStart:arrival)};
}
export function sceneOf(state) {
  const timing = timingOf(state);
  if(state.elapsed>=timing.end)return 'complete';
  if(state.elapsed>=timing.closing)return 'closing';
  if(state.elapsed>=timing.cruise)return 'cruise';
  if(state.elapsed>=timing.takeoff)return 'takeoff';
  return 'boarding';
}
export function advance(state, seconds) {if(state.paused||sceneOf(state)==='complete')return state;return {...state,elapsed:Math.min(state.duration,state.elapsed+Math.max(0,seconds))};}
export function finish(state) {if(sceneOf(state)==='complete')return state;return {...state,elapsed:state.duration,paused:false,early:true};}
export function pause(state) {return {...state,paused:true};}
export function resume(state) {return {...state,paused:false};}
export function cabinOf(state) {
  const scene=sceneOf(state), timing=timingOf(state);
  return {belt:['boarding','takeoff','closing'].includes(scene),drinks:!['closing','complete'].includes(scene),warm:state.elapsed>=timing.sunset,dim:state.elapsed>=timing.dim,closing:scene==='closing',arrived:scene==='closing'&&state.elapsed>=timing.arrivalAnnouncement,fade:Math.min(1,Math.max(0,(state.elapsed-timing.closing)/30))};
}

// Departure stays in one terminal. The scan opens when boarding is ready.
export function createDeparture(){return {stage:'choose',elapsed:0};}
export function issueTicket(){return {stage:'waiting',elapsed:0};}
export function scanTicket(state){return state.stage==='boarding'?{stage:'scanning',elapsed:0}:state;}
export function advanceDeparture(state,seconds){
  if(['choose','seated'].includes(state.stage))return state;
  const elapsed=state.elapsed+Math.max(0,seconds);
  const stage=state.stage==='scanning'?(elapsed>=.8?'seated':'scanning'):(elapsed>=3?'boarding':'waiting');
  return {...state,elapsed,stage};
}

// Illustrative routes share Seoul as their origin and follow each flight's own clock.
export const flightMaps = Object.freeze({
  Tokyo:{asset:'/assets/east-asia-map-v22.svg',start:{x:159.6,y:154.4},control:{x:284,y:96},end:{x:413.8,y:199.4},originAnchor:'end',destinationAnchor:'start'},
  Bangkok:{asset:'/assets/bangkok-map-v36.svg',start:{x:381.01,y:82.5},control:{x:220,y:100},end:{x:65.56,y:270.77},originAnchor:'start',destinationAnchor:'end'},
  Paris:{asset:'/assets/paris-map-v36.svg',start:{x:503.92,y:201.59},control:{x:280,y:70},end:{x:38.65,y:153.61},originAnchor:'end',destinationAnchor:'start'}
});
export function mapPosition(state){
  const route=flightMaps[state.city];
  if(!route||state.early)return null;
  const timing=timingOf(state);
  const progress=Math.min(1,Math.max(0,(state.elapsed-timing.takeoff)/(timing.arrivalAnnouncement-timing.takeoff)));
  const {start,control,end}=route;
  const t=progress,u=1-t;
  const x=u*u*start.x+2*u*t*control.x+t*t*end.x,y=u*u*start.y+2*u*t*control.y+t*t*end.y;
  const dx=2*u*(control.x-start.x)+2*t*(end.x-control.x),dy=2*u*(control.y-start.y)+2*t*(end.y-control.y);
  return {progress,x,y,heading:Math.atan2(dy,dx)*180/Math.PI};
}

export function runwayCueOf(state){
  if(state.early||state.elapsed>=state.duration)return null;
  const timing=timingOf(state);
  const start=state.elapsed>=timing.closing-8?timing.closing-8:timing.takeoff;
  const landing=start===timing.closing-8;
  if(state.elapsed<start||state.elapsed>=start+(landing?8:12))return null;
  const key=landing?'landing-roll':'takeoff-roll';
  return {key,path:`/assets/audio/${key}.wav`,offset:state.elapsed-start};
}
