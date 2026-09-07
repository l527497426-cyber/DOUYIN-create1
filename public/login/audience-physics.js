// Five DOM capsules, simulated only while entering the visible card.
const card=document.querySelector('.audience-viz');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(card&&!reduced.matches){
 const tags=[...card.querySelectorAll('.viz-pill')];
 let visible=false,frame=0,engine,items=[],last=0,elapsed=0,acc=0,library;
 const load=()=>library??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('./assets/data-viz/matter.min.js',import.meta.url).href;s.onload=()=>resolve(window.Matter);s.onerror=reject;document.head.append(s);});
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function reset(){stop();if(engine){window.Matter.Engine.clear(engine);engine=null;}card.classList.remove('physics-active');tags.forEach(el=>el.style.removeProperty('transform'));}
 function start(M){
  reset();const w=card.clientWidth,h=card.clientHeight;if(!w||!h)return;
  const {Engine,Bodies,Body,Composite}=M;engine=Engine.create({enableSleeping:true});engine.gravity.y=1.35;
  card.classList.add('physics-active');
  const edge=10;
  Composite.add(engine.world,[Bodies.rectangle(w/2,h+40-edge,w+100,80,{isStatic:true}),Bodies.rectangle(-40+edge,h/2,80,h*5,{isStatic:true}),Bodies.rectangle(w+40-edge,h/2,80,h*5,{isStatic:true})]);
  const order=[3,4,0,1,2],xs=[.28,.77,.32,.63,.76],angles=[-.03,.04,-.22,.28,-.38];
  items=order.map((index,i)=>{const el=tags[index],bw=el.offsetWidth,bh=el.offsetHeight;
   const b=Bodies.rectangle(Math.max(bw/2+edge,Math.min(w-bw/2-edge,w*xs[i])),-bh/2-i*95,bw,bh,{chamfer:{radius:Math.min(bh/2-1,18)},restitution:.24,friction:.55,frictionStatic:.85,frictionAir:.018,sleepThreshold:45});
   Body.setAngle(b,angles[i]);Composite.add(engine.world,b);return{el,b,bw,bh};});
  elapsed=0;acc=0;last=performance.now();
  const draw=()=>items.forEach(({el,b,bw,bh})=>el.style.transform=`translate(${b.position.x-bw/2}px,${b.position.y-bh/2}px) rotate(${b.angle}rad)`);
  function tick(now){if(!visible||document.hidden)return stop();acc+=Math.min(40,now-last);last=now;while(acc>=1000/60){Engine.update(engine,1000/60);acc-=1000/60;elapsed+=1000/60;}draw();if(elapsed<9000&&!items.every(({b})=>b.isSleeping))frame=requestAnimationFrame(tick);else{frame=0;card.dataset.physicsState='settled';}}
  card.dataset.physicsState='falling';draw();frame=requestAnimationFrame(tick);
 }
 new IntersectionObserver(async entries=>{visible=entries[0].isIntersecting;if(!visible){reset();return;}try{const M=await load();if(visible&&!document.hidden)start(M);}catch{reset();}},{threshold:.35}).observe(card);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(visible)load().then(start);});
 let timer;new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(visible)load().then(start);},150);}).observe(card);
}
