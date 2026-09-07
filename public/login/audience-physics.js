// Small, sleeping rigid-body world with pointer constraints for the five labels.
const card=document.querySelector('.audience-viz');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(card&&!reduced.matches){
 const tags=[...card.querySelectorAll('.viz-pill')];
 let visible=false,frame=0,engine,items=[],last=0,elapsed=0,acc=0,library,drag=null;
 const load=()=>library??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('./assets/data-viz/matter.min.js',import.meta.url).href;s.onload=()=>resolve(window.Matter);s.onerror=reject;document.head.append(s);});
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function release(){if(!drag)return;const M=window.Matter;M.Composite.remove(engine.world,drag.constraint);if(drag.el.hasPointerCapture(drag.id))drag.el.releasePointerCapture(drag.id);drag.el.classList.remove('is-dragging');drag=null;}
 function reset(){stop();release();if(engine){window.Matter.Engine.clear(engine);engine=null;}card.classList.remove('physics-active');tags.forEach(el=>el.style.removeProperty('transform'));}
 function wake(){if(!engine||!visible||document.hidden)return;elapsed=0;last=performance.now();if(!frame)frame=requestAnimationFrame(tick);card.dataset.physicsState='moving';}
 function tick(now){
  if(!visible||document.hidden)return stop();const M=window.Matter;
  acc+=Math.min(40,now-last);last=now;
  while(acc>=1000/60){
   for(const {b} of items){
    // A gentle settling bias prevents narrow capsules balancing upright.
    const a=Math.atan2(Math.sin(b.angle),Math.cos(b.angle));
    if(!drag&&b.position.y>card.clientHeight*.45&&Math.abs(a)>.65){M.Sleeping.set(b,false);M.Body.setAngularVelocity(b,b.angularVelocity*.82-a*.009);}
   }
   M.Engine.update(engine,1000/60);acc-=1000/60;elapsed+=1000/60;
  }
  items.forEach(({el,b,bw,bh})=>el.style.transform=`translate(${b.position.x-bw/2}px,${b.position.y-bh/2}px) rotate(${b.angle}rad)`);
  if(drag||(elapsed<12000&&!items.every(({b})=>b.isSleeping)))frame=requestAnimationFrame(tick);else{frame=0;card.dataset.physicsState='settled';}
 }
 function start(M){
  reset();const w=card.clientWidth,h=card.clientHeight;if(!w||!h)return;
  const {Engine,Bodies,Body,Composite}=M;engine=Engine.create({enableSleeping:true});engine.gravity.y=1.35;
  card.classList.add('physics-active');const edge=10;
  Composite.add(engine.world,[Bodies.rectangle(w/2,h+40-edge,w+100,80,{isStatic:true}),Bodies.rectangle(-40+edge,h/2,80,h*5,{isStatic:true}),Bodies.rectangle(w+40-edge,h/2,80,h*5,{isStatic:true})]);
  const order=[3,4,0,1,2],xs=[.28,.77,.32,.58,.64],angles=[-.03,.04,-.22,.28,-.24];
  items=order.map((index,i)=>{const el=tags[index],bw=el.offsetWidth,bh=el.offsetHeight;
   const b=Bodies.rectangle(Math.max(bw/2+edge,Math.min(w-bw/2-edge,w*xs[i])),-bh/2-i*95,bw,bh,{chamfer:{radius:Math.min(bh/2-1,18)},restitution:.24,friction:.38,frictionStatic:.5,frictionAir:.025,sleepThreshold:45});
   Body.setAngle(b,angles[i]);Composite.add(engine.world,b);return{el,b,bw,bh};});
  acc=0;wake();
 }
 function point(e){const r=card.getBoundingClientRect();return{x:Math.max(10,Math.min(card.clientWidth-10,(e.clientX-r.left)*card.clientWidth/r.width)),y:Math.max(10,Math.min(card.clientHeight-10,(e.clientY-r.top)*card.clientHeight/r.height))};}
 tags.forEach(el=>{
  el.addEventListener('pointerdown',e=>{if(!engine||e.button!==0||drag)return;const item=items.find(i=>i.el===el);if(!item)return;e.preventDefault();e.stopPropagation();const M=window.Matter,p=point(e);M.Sleeping.set(item.b,false);
   const constraint=M.Constraint.create({bodyB:item.b,pointB:{x:p.x-item.b.position.x,y:p.y-item.b.position.y},pointA:p,length:0,stiffness:.16,damping:.15});
   M.Composite.add(engine.world,constraint);drag={constraint,el,id:e.pointerId};el.setPointerCapture(e.pointerId);el.classList.add('is-dragging');wake();
  });
  el.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId){drag.constraint.pointA=point(e);e.stopPropagation();}});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,e=>{if(drag?.id===e.pointerId){const active=drag;drag=null;window.Matter.Composite.remove(engine.world,active.constraint);active.el.classList.remove('is-dragging');if(active.el.hasPointerCapture(e.pointerId))active.el.releasePointerCapture(e.pointerId);wake();}});
 });
 new IntersectionObserver(async entries=>{visible=entries[0].isIntersecting;if(!visible){reset();return;}try{const M=await load();if(visible&&!document.hidden)start(M);}catch{reset();}},{threshold:.35}).observe(card);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){release();stop();}else if(visible)wake();});
 let timer;new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(visible)load().then(start);},150);}).observe(card);
}
