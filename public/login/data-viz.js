// Finite entrance animations only; hidden tabs and reduced motion stay idle.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Map();
const observer = new IntersectionObserver(entries => {
 for (const entry of entries) {
  const card=entry.target;
  if (!entry.isIntersecting) {
   card.classList.remove('viz-entered');
   if(running.has(card)) cancelAnimationFrame(running.get(card));
   running.delete(card);
   card.querySelectorAll('[data-count]').forEach(el=>el.textContent=el.dataset.count+'%');
   continue;
  }
  card.classList.add('viz-entered');
  const numbers=[...card.querySelectorAll('[data-count]')];
  if(!numbers.length||reduced.matches) continue;
  const start=performance.now();
  const tick=now=>{const t=Math.min(1,(now-start)/1300),e=1-Math.pow(1-t,3);numbers.forEach(el=>el.textContent=Math.round(Number(el.dataset.count)*e)+'%');if(t<1)running.set(card,requestAnimationFrame(tick));else running.delete(card);};
  running.set(card,requestAnimationFrame(tick));
 }
},{threshold:.25});
document.querySelectorAll('.data-viz').forEach(card=>observer.observe(card));
// Pointer updates are event-driven and stop immediately when the pointer leaves.
if(matchMedia('(hover:hover)').matches&&!reduced.matches){
 document.querySelectorAll('.data-viz').forEach(card=>{
  let frame=0,x=.5,y=.35;
  function paint(){frame=0;card.style.setProperty('--mx',`${x*100}%`);card.style.setProperty('--my',`${y*100}%`);card.style.setProperty('--rx',`${(.5-y)*5}deg`);card.style.setProperty('--ry',`${(x-.5)*6}deg`);card.style.setProperty('--dx',`${(x-.5)*8}px`);card.style.setProperty('--dy',`${(y-.5)*6}px`);}
  card.addEventListener('pointermove',event=>{const r=card.getBoundingClientRect();x=(event.clientX-r.left)/r.width;y=(event.clientY-r.top)/r.height;if(!frame)frame=requestAnimationFrame(paint);},{passive:true});
  card.addEventListener('pointerleave',()=>{if(frame)cancelAnimationFrame(frame);frame=0;['--mx','--my','--rx','--ry','--dx','--dy'].forEach(p=>card.style.removeProperty(p));});
 });
}

// CSS transform-only color motion; the existing observer stops hidden cards.
document.querySelectorAll('.data-viz').forEach(card=>{const flow=document.createElement('div');flow.className='viz-color-flow';flow.setAttribute('aria-hidden','true');card.prepend(flow);});
document.addEventListener('visibilitychange',()=>{document.querySelectorAll('.viz-color-flow').forEach(el=>{el.style.animationPlayState=document.hidden?'paused':'running';});});

// Publish backgrounds share the same visibility-controlled color movement.
document.querySelectorAll('.operations-publish-grid .operation-visual').forEach(card=>{card.classList.add('publish-color-shell');const flow=document.createElement('div');flow.className='viz-color-flow';flow.setAttribute('aria-hidden','true');card.prepend(flow);observer.observe(card);});
