import {land} from './earth-land.js?v=985613b21e25';
import {geoOrthographic,geoPath,geoArea} from './geo-projection.js?v=985613b21e25';
// D3 uses clockwise small spherical polygons. Normalize upstream GeoJSON winding.
export const earthGeometry={type:'MultiPolygon',coordinates:land.map(ring=>{
 const polygon={type:'Polygon',coordinates:[ring]};
 return [geoArea(polygon)>2*Math.PI?[...ring].reverse():ring];
})};
// Geographic display for simulated flights; never real aircraft tracking.
const origin=[37.5665,126.9780];
const destinations={Tokyo:[35.6762,139.6503],Bangkok:[13.7563,100.5018],Paris:[48.8566,2.3522]};
export function routeCoordinate(city,fraction){
  const end=destinations[city];if(!end)return null;
  const t=Math.max(0,Math.min(1,fraction)),rad=Math.PI/180;
  const vector=([lat,lon])=>[Math.cos(lat*rad)*Math.cos(lon*rad),Math.cos(lat*rad)*Math.sin(lon*rad),Math.sin(lat*rad)];
  const a=vector(origin),b=vector(end),angle=Math.acos(Math.min(1,Math.max(-1,a.reduce((sum,v,i)=>sum+v*b[i],0))));
  const u=Math.sin((1-t)*angle)/Math.sin(angle),v=Math.sin(t*angle)/Math.sin(angle);
  const p=a.map((n,i)=>u*n+v*b[i]);
  return [Math.atan2(p[2],Math.hypot(p[0],p[1]))/rad,Math.atan2(p[1],p[0])/rad];
}

// Heading is the tangent of the projected route, rather than a compass bearing
// applied to a differently oriented screen. No CSS angle interpolation at ±180°.
export function routeHeading(city, fraction, center){
  const rad=Math.PI/180,lat0=center[0]*rad,lon0=center[1]*rad;
  const point=t=>{const [lat,lon]=routeCoordinate(city,t),p=lat*rad,l=lon*rad-lon0;return [Math.cos(p)*Math.sin(l),-(Math.cos(lat0)*Math.sin(p)-Math.sin(lat0)*Math.cos(p)*Math.cos(l))];};
  const a=point(Math.max(0,fraction-.005)),b=point(Math.min(1,fraction+.005));
  return Math.atan2(b[1]-a[1],b[0]-a[0]);
}
// Route fits the complete path; Globe keeps a consistent curved-earth scale.
export function mapFrame(city,view,width,height,progress){
  const center=routeCoordinate(city,view==='globe'?.25+.5*progress:.5);
  if(view==='globe')return {center,radius:Math.min(width*.47,height*.66),cx:width*.5,cy:height*.69};
  const projection=geoOrthographic().rotate([-center[1],-center[0]]).translate([0,0]).scale(1);
  const points=Array.from({length:129},(_,i)=>{const [lat,lon]=routeCoordinate(city,i/128);return projection([lon,lat]);});
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const radius=Math.min((width-140)/Math.max(maxX-minX,.01),(height-90)/Math.max(maxY-minY,.01));
  return {center,radius,cx:width*.5-radius*(minX+maxX)*.5,cy:height*.5-radius*(minY+maxY)*.5};
}

export function createGeographicMap({panel,mount,fallback,status,fit}){
  let canvas=null,context=null,city=null,progress=0,lastFrame=-1,center=null,view='route';
  const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(){
    const width=mount.clientWidth||440,height=mount.clientHeight||320,dpr=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
    const ctx=context;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const frame=mapFrame(city,view,width,height,progress),target=frame.center;
    if(!center||view==='route'||reduced())center=target;else center=center.map((v,i)=>v+(target[i]-v)*.04);
    const rad=Math.PI/180,lat0=center[0]*rad,lon0=center[1]*rad;
    const {radius,cx,cy}=frame;
    const project=([lat,lon])=>{
      const p=lat*rad,l=lon*rad-lon0,x=Math.cos(p)*Math.sin(l),y=Math.cos(lat0)*Math.sin(p)-Math.sin(lat0)*Math.cos(p)*Math.cos(l),z=Math.sin(lat0)*Math.sin(p)+Math.cos(lat0)*Math.cos(p)*Math.cos(l);
      return {x:cx+radius*x,y:cy-radius*y,z};
    };
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#080f20');sky.addColorStop(1,'#10243a');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    for(let i=0;i<90;i++){ctx.fillStyle=`rgba(197,220,240,${.1+(i%5)*.08})`;ctx.fillRect((i*139.13)%width,(i*73.91)%height,i%7===0?1.5:1,i%7===0?1.5:1);}
    const halo=ctx.createRadialGradient(cx,cy,radius*.97,cx,cy,radius*1.07);halo.addColorStop(0,'#3679b2aa');halo.addColorStop(.5,'#3e83b466');halo.addColorStop(1,'#388cbe00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,radius*1.07,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.clip();
    const sea=ctx.createRadialGradient(cx-radius*.4,cy-radius*.6,0,cx,cy,radius*1.2);sea.addColorStop(0,'#21476b');sea.addColorStop(.6,'#123454');sea.addColorStop(1,'#040f20');ctx.fillStyle=sea;ctx.fillRect(0,0,width,height);
    // Clip on the sphere before projecting. Clamping hidden vertices to the
    // circle made far-side continents incorrectly fill the visible ocean.
    const projection=geoOrthographic().rotate([-center[1],-center[0]])
      .translate([cx,cy]).scale(radius).clipAngle(90).clipExtent([[0,0],[width,height]]).precision(.3);
    ctx.beginPath();geoPath(projection,ctx)(earthGeometry);
    ctx.fillStyle='#425d6d';ctx.fill();ctx.strokeStyle='#91a4ad88';ctx.lineWidth=.55;ctx.stroke();
    // Decorative light clusters around major cities, not satellite imagery.
    for(const point of [[37.56,126.97],[35.67,139.65],[13.75,100.5],[48.85,2.35],[31.23,121.47],[39.9,116.4],[22.3,114.17],[1.35,103.82],[51.5,-.12],[55.75,37.62],[28.61,77.2],[41.01,28.97]]){
      for(let i=0;i<18;i++){const p=project([point[0]+Math.sin(i*2.4)*.8,point[1]+Math.cos(i*1.7)*1.1]);if(p.z<=0)continue;ctx.fillStyle=i%3===0?'#ffe5aa':'#d8b57d88';ctx.fillRect(p.x,p.y,1.1,1.1);}
    }
    const shade=ctx.createLinearGradient(cx-radius,cy-radius,cx+radius,cy+radius);shade.addColorStop(0,'#02091600');shade.addColorStop(1,'#01081788');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);ctx.restore();
    const line=(start,end,color,dashed=false)=>{
      ctx.beginPath();let open=false;for(let i=0;i<=128;i++){const p=project(routeCoordinate(city,start+(end-start)*i/128));if(p.z<0){open=false;continue;}if(!open){ctx.moveTo(p.x,p.y);open=true;}else ctx.lineTo(p.x,p.y);}
      ctx.strokeStyle=color;ctx.lineWidth=dashed?2:2.4;ctx.setLineDash(dashed?[4,5]:[]);ctx.stroke();ctx.setLineDash([]);
    };
    line(0,1,'#d3e2efaa',true);line(0,progress,'#f2d5a0');
    ctx.font='13px SourceSans, sans-serif';ctx.textBaseline='middle';
    for(const [name,t] of [['Seoul',0],[city,1]]){const p=project(routeCoordinate(city,t));if(p.z<0)continue;ctx.beginPath();ctx.arc(p.x,p.y,2.7,0,Math.PI*2);ctx.fillStyle='#f7ead0';ctx.fill();ctx.fillStyle='#eef1ee';ctx.textAlign=t===0?'right':'left';ctx.shadowColor='#020817';ctx.shadowBlur=4;ctx.fillText(name,p.x+(t===0?-9:9),p.y+13);ctx.shadowBlur=0;}
    const p=project(routeCoordinate(city,progress));
    if(p.z>=0){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(routeHeading(city,progress,center));ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(2,-2);ctx.lineTo(-4,-10);ctx.lineTo(-6,-10);ctx.lineTo(-3,-2);ctx.lineTo(-9,-2);ctx.lineTo(-11,-5);ctx.lineTo(-12,0);ctx.lineTo(-11,5);ctx.lineTo(-9,2);ctx.lineTo(-3,2);ctx.lineTo(-6,10);ctx.lineTo(-4,10);ctx.lineTo(2,2);ctx.closePath();ctx.fillStyle='#fff6e1';ctx.shadowColor='#d4e9ff';ctx.shadowBlur=7;ctx.fill();ctx.restore();}
  }
  return {
    setView(next){if(!['route','globe'].includes(next)||next===view)return;view=next;center=null;lastFrame=-1;if(canvas&&!panel.hidden){canvas.setAttribute('aria-label',`${view==='route'?'Route':'Globe'} view: simulated flight from Seoul to ${city}, ${Math.round(progress*100)} percent along the route`);draw();}},
    reset(){view='route';canvas?.remove();canvas=null;context=null;center=null;city=null;lastFrame=-1;mount.hidden=true;fallback.style.removeProperty('display');fit.hidden=true;},
    update(nextCity,fraction){
      if(panel.hidden||!destinations[nextCity]||typeof window==='undefined')return;
      if(!canvas){canvas=document.createElement('canvas');canvas.setAttribute('role','img');mount.replaceChildren(canvas);context=canvas.getContext('2d');}
      if(city!==nextCity)center=null;city=nextCity;progress=fraction;
      mount.hidden=false;fallback.style.setProperty('display','none');fit.hidden=true;
      canvas.setAttribute('aria-label',`${view==='route'?'Route':'Globe'} view: simulated flight from Seoul to ${city}, ${Math.round(progress*100)} percent along the route`);
      status.textContent='Simulated flight';
      const now=performance.now();if(now-lastFrame<80)return;lastFrame=now;draw();
    }
  };
}
