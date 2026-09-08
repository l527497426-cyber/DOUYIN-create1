import React, {useEffect,useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {BorderBeam} from 'border-beam';

function ExperienceButton({label}){
  const buttonRef=useRef(null),position=useRef(.5),destination=useRef(.5);
  const [hover,setHover]=useState(false);
  const [focused,setFocused]=useState(false);
  const [pageActive,setPageActive]=useState(true);
  const [reduced,setReduced]=useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(media.matches);
    const message=event=>{if(event.source===parent&&event.origin===location.origin&&event.data?.type==='ai-page-active'){setPageActive(!!event.data.active);setHover(false);}};
    const blur=()=>setHover(false);
    window.addEventListener('message',message);window.addEventListener('blur',blur);media.addEventListener('change',change);
    return ()=>{window.removeEventListener('message',message);window.removeEventListener('blur',blur);media.removeEventListener('change',change);};
  },[]);
  useEffect(()=>{
    const beam=buttonRef.current?.closest('[data-beam]');
    if(!beam)return;
    // The package animates this registered property; important keeps our eased pointer position in control.
    const key=`--beam-x-${beam.dataset.beam}`;
    beam.style.setProperty(`--beam-w-${beam.dataset.beam}`,'2.3','important');
    // Pointer controls position, so the original automatic edge fade must stay open.
    beam.style.setProperty(`--beam-edge-${beam.dataset.beam}`,'1','important');
    beam.style.setProperty(key,String(position.current),'important');
    if(!pageActive||reduced||!(hover||focused))return;
    let frame=0,last=performance.now();
    const tick=now=>{
      const dt=Math.min((now-last)/1000,.05);last=now;
      position.current+=(destination.current-position.current)*(1-Math.exp(-dt*5));
      beam.style.setProperty(key,String(position.current),'important');
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[hover,focused,pageActive,reduced]);
  const move=e=>{
    if(e.pointerType==='touch')return;
    const rect=e.currentTarget.getBoundingClientRect();
    destination.current=Math.max(.07,Math.min(.93,(e.clientX-rect.left)/rect.width));
    setHover(true);
  };
  return <BorderBeam size="line" colorVariant="colorful" theme="dark" strength={1} brightness={1.8} saturation={1.6} active={pageActive&&(hover||focused)&&!reduced} borderRadius={25} className="experience-original-beam" style={{width:'100%',height:50}}>
    <button ref={buttonRef} className="experience" type="submit" onPointerEnter={move} onPointerMove={move} onPointerLeave={()=>setHover(false)} onPointerCancel={()=>setHover(false)} onFocus={e=>{if(e.currentTarget.matches(':focus-visible')){destination.current=.5;setFocused(true);}}} onBlur={()=>setFocused(false)}>{label}</button>
  </BorderBeam>;
}
export function mountExperienceBeam(){
  document.querySelectorAll('.invite-panel > .experience').forEach(button=>{
    const mount=document.createElement('div');mount.className='experience-react-root';
    const label=button.textContent;button.replaceWith(mount);
    createRoot(mount).render(<ExperienceButton label={label}/>);
  });
}
