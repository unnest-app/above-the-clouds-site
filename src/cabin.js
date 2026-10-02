// Four subtle printed-page variations for the ambient book.
export const pages = Object.freeze([0,1,2,3]);
export function createCabin(){return {view:'seat',windowZoom:false,drink:'',drinkRequest:'',servingRemaining:0,clearingRemaining:0,serviceOpen:false,bookOpen:false,autoPages:true,firstPageTurned:false,page:0,readingLight:true,cabinDark:false};}
export function requestDrink(state,drink){return {...state,drink:'',drinkRequest:drink,servingRemaining:2,clearingRemaining:0,serviceOpen:false};}
export function requestClear(state){return state.drink?{...state,clearingRemaining:2,serviceOpen:false}:state;}
export function serveFor(state,seconds){
  if(state.clearingRemaining>0){const remaining=Math.max(0,state.clearingRemaining-Math.max(0,seconds));return {...state,clearingRemaining:remaining,drink:remaining?state.drink:''};}
  if(!state.drinkRequest)return state;
  const remaining=Math.max(0,state.servingRemaining-Math.max(0,seconds));
  return remaining>0?{...state,servingRemaining:remaining}:{...state,drink:state.drinkRequest,drinkRequest:'',servingRemaining:0};
}
export function look(state,view){return {...state,view,windowZoom:view===state.view?state.windowZoom:false};}
export function turnPage(state,direction){return {...state,page:Math.max(0,Math.min(pages.length-1,state.page+direction))};}
export function isDark(state){return state.cabinDark||state.view==='rest';}

export function readFor(state,seconds){
  if(state.view!=='table'||!state.bookOpen||!state.autoPages)return {state,elapsed:state.readingElapsed||0,turned:false};
  let elapsed=(state.readingElapsed||0)+Math.max(0,seconds),firstPageTurned=Boolean(state.firstPageTurned),turns=0;
  if(!firstPageTurned&&elapsed>=3){elapsed-=3;firstPageTurned=true;turns=1;}
  if(firstPageTurned){turns+=Math.floor(elapsed/30);elapsed%=30;}
  return {state:{...state,firstPageTurned,readingElapsed:elapsed,page:(state.page+turns)%pages.length},elapsed,turned:turns>0};
}
