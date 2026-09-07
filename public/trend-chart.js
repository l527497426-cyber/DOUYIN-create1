import {periodSeries,periodDate} from '/analytics-period.js';
// Preview data only; replace this series with the analytics API when connected.
const week = [2400,1600,2100,3900,3200,2200,3600];
// Shape-preserving cubic Hermite interpolation: smooth, without false peaks.
export function smoothTrendPath(points){
  if(!points.length)return '';
  if(points.length===1)return `M${points[0][0]},${points[0][1]}`;
  const slopes=points.slice(1).map((p,i)=>(p[1]-points[i][1])/(p[0]-points[i][0]));
  const tangent=points.map((_,i)=>i===0?slopes[0]:i===points.length-1?slopes.at(-1):slopes[i-1]*slopes[i]<=0?0:2*slopes[i-1]*slopes[i]/(slopes[i-1]+slopes[i]));
  let path=`M${points[0][0]},${points[0][1]}`;
  for(let i=0;i<points.length-1;i++){
    const [x,y]=points[i],[nx,ny]=points[i+1],dx=(nx-x)/3;
    path+=` C${x+dx},${y+tangent[i]*dx} ${nx-dx},${ny-tangent[i+1]*dx} ${nx},${ny}`;
  }
  return path;
}
export function mountTrendChart(host, range) {
  host.classList.add('trend-chart');
  host.innerHTML = `<div class="trend-heading"><span><i></i>播放量</span><span class="trend-readout">近7日趋势</span></div><div class="trend-plot" tabindex="0" role="slider" aria-label="每日播放量，左右方向键查看" aria-valuemin="1" aria-valuemax="7"><svg class="trend-svg" aria-hidden="true"></svg><div class="trend-tip" hidden></div></div><div class="trend-footer"><span>悬停查看 · 拖动对比</span></div>`;
  const plot=host.querySelector('.trend-plot'),svg=host.querySelector('svg'),tip=host.querySelector('.trend-tip'),readout=host.querySelector('.trend-readout');
  let metricTitle="播放量",unit="次",base=week;
  const rangeValues=()=>periodSeries(base,range.selectedIndex===0?7:30);
  let values=week,selected=null,points=[],width=0,locked=false,pendingFrame=0,dragStart=null,dragged=false;
  const top=12,left=0,right=54,bands=3; let H=210,bottom=180;
  const number=n=>n.toLocaleString('zh-CN');
  const date=i=>periodDate(i,values.length);
  function draw(){
    width=plot.clientWidth;H=plot.clientHeight;if(!width||!H)return;bottom=H-30;
    plot.setAttribute('aria-valuemax',values.length);
    plot.setAttribute('aria-valuenow',(selected??values.length-1)+1);
    const peak=Math.max(1,...values),power=10**Math.floor(Math.log10(peak/bands));
    const step=[1,2,5,10].find(n=>n*power>=peak/bands)*power;
    const max=step*bands;
    points=values.map((v,i)=>[left+i*(width-left-right)/(values.length-1),bottom-v/max*(bottom-top)]);
    const line=smoothTrendPath(points);
    let grid='';
    for(let i=0;i<=bands;i++){const y=top+(bottom-top)*i/bands;grid+=`<line class="trend-grid" x1="0" y1="${y}" x2="${width}" y2="${y}"/>${i<bands?`<text class="trend-value-label" x="${width-right+10}" y="${y+17}">${number(max*(bands-i)/bands)}</text>`:""}`;}
    const labelStep=values.length>7?Math.ceil((values.length-1)/Math.max(3,Math.floor((width-left-right)/68))):1;
    for(let i=0;i<values.length;i++){if(i%labelStep!==0&&i!==values.length-1)continue;if(i!==values.length-1&&i>values.length-1-labelStep*.65)continue;const x=points[i][0];grid+=`<line class="trend-grid vertical" x1="${x}" y1="${top}" x2="${x}" y2="${bottom+26}"/><text x="${x}" y="${H-10}" text-anchor="${i===0?'start':i===values.length-1?'end':'middle'}">${date(i)}</text>`;}
    grid+=`<line class="trend-baseline" x1="0" y1="${bottom}" x2="${width}" y2="${bottom}"/>`;
    svg.setAttribute('viewBox',`0 0 ${width} ${H}`);
    svg.innerHTML=`<defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#0aa7ed" stop-opacity=".23"/><stop offset="1" stop-color="#0aa7ed" stop-opacity="0"/></linearGradient></defs>${grid}<path class="trend-area" d="${line} L${points.at(-1)[0]},${bottom} L${left},${bottom} Z" fill="url(#trend-fill)"/><path class="trend-stroke" d="${line}" pathLength="1"/><rect class="trend-range" y="${top}" height="${bottom-top}" width="0"/><g class="trend-selection" visibility="hidden"><line class="trend-cross-x" x1="0" x2="0" y1="${top}" y2="${bottom+26}"/><line class="trend-cross-y" x1="0" x2="${width}" y1="0" y2="0"/><circle r="4"/></g>`;
    if(selected!==null)show(selected);
  }
  function show(i){
    selected=Math.max(0,Math.min(values.length-1,i));
    const [x,y]=points[selected],g=svg.querySelector('.trend-selection');g.setAttribute('visibility','visible');
    const a=g.children[0],b=g.children[1],dot=g.children[2];
    a.style.transform=`translateX(${x}px)`;
    b.style.transform=`translateY(${y}px)`;
    dot.style.transform=`translate(${x}px,${y}px)`;
    tip.hidden=false;tip.innerHTML=`<span>${date(selected)} · ${metricTitle}</span><strong>${number(values[selected])}<small> ${unit}</small></strong>`;
    tip.style.transform=`translate3d(${Math.max(0,Math.min(width-136,x-64))}px,${y<80?y+16:y-66}px,0)`;
    readout.textContent=`${date(selected)}  ${number(values[selected])} ${unit}`;
    plot.setAttribute('aria-valuemax',values.length);plot.setAttribute('aria-valuenow',selected+1);plot.setAttribute('aria-valuetext',`${date(selected)}，${metricTitle} ${values[selected]} ${unit}`);
  }
  function clear(){cancelAnimationFrame(pendingFrame);selected=null;tip.hidden=true;svg.querySelector('.trend-selection')?.setAttribute('visibility','hidden');svg.querySelector('.trend-range')?.setAttribute('width',0);readout.textContent=`近${values.length}日趋势`;}
  const indexAt=e=>Math.max(0,Math.min(values.length-1,Math.round((e.clientX-plot.getBoundingClientRect().left-left)/(width-left-right)*(values.length-1))));
  plot.addEventListener('pointermove',e=>{if(locked&&dragStart===null)return;const index=indexAt(e);cancelAnimationFrame(pendingFrame);pendingFrame=requestAnimationFrame(()=>{show(index);if(dragStart!==null&&index!==dragStart){dragged=true;const start=Math.min(dragStart,index),end=Math.max(dragStart,index),band=svg.querySelector('.trend-range');band.setAttribute('x',points[start][0]);band.setAttribute('width',points[end][0]-points[start][0]);const delta=values[end]-values[start];readout.textContent=`${date(start)}—${date(end)}  ${delta>=0?'+':''}${number(delta)} ${unit}`;tip.innerHTML=`<span>${date(start)}—${date(end)} · ${metricTitle}变化</span><strong>${delta>=0?'+':''}${number(delta)}<small> ${unit}</small></strong>`;}});});
  plot.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragStart=indexAt(e);dragged=false;plot.setPointerCapture(e.pointerId);});
  plot.addEventListener('pointerup',e=>{cancelAnimationFrame(pendingFrame);dragStart=null;if(plot.hasPointerCapture(e.pointerId))plot.releasePointerCapture(e.pointerId);});
  plot.addEventListener('pointercancel',()=>{dragStart=null;locked=false;clear();});
  plot.addEventListener('pointerleave',()=>{if(!locked&&document.activeElement!==plot)clear();});
  plot.addEventListener('click',()=>{locked=dragged||!locked;plot.classList.toggle('is-locked',locked);if(!locked)svg.querySelector('.trend-range').setAttribute('width',0);});
  plot.addEventListener('focus',()=>show(selected??values.length-1));
  plot.addEventListener('blur',()=>{locked=false;plot.classList.remove('is-locked');clear();});
  plot.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End','Escape'].includes(e.key)){e.preventDefault();if(e.key==='Escape'){plot.blur();return;}show(e.key==='Home'?0:e.key==='End'?values.length-1:(selected??0)+(e.key==='ArrowRight'?1:-1));}});
  range.addEventListener('change',()=>{values=rangeValues();locked=false;dragStart=null;dragged=false;plot.classList.remove('is-locked');clear();draw();});
  new ResizeObserver(draw).observe(plot);
  draw();
  return {setMetric(title,series,nextUnit='次'){
    metricTitle=title;base=series;unit=nextUnit;values=rangeValues();
    locked=false;dragStart=null;plot.classList.remove('is-locked');clear();
    host.querySelector('.trend-heading>span:first-child').innerHTML='<i></i>'+title+'';
    plot.setAttribute('aria-label',title+'，左右方向键查看');
    draw();
  }};
}

