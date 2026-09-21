import * as THREE from 'three';

// Small, demand-rendered 3D scene. All surfaces write camera-space depth.
// The disc gather is a real-depth post-process approximation, not path tracing.
const display = document.querySelector('.capability-display');
const shell = display?.querySelector('.capability-cube-shell');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width:851px)');
if (shell && desktop.matches && new URLSearchParams(location.search).get('stage') !== 'css') {
  let renderer, target, observer, resizeObserver, raf=0, disposed=false, visible=false;
  let progress=Number(document.querySelector('.ai-system').dataset.scrollProgress||0);
  let px=0, py=0, tx=0, ty=0, lastDraw=0, draws=0, slow=0, ratio=1.5;
  const textures=[], geometries=[], materials=[];
  const canvas=document.createElement('canvas');
  canvas.className='capability-depth-canvas'; canvas.setAttribute('aria-hidden','true');
  const scene=new THREE.Scene(), group=new THREE.Group(); scene.add(group); group.position.y=.12;
  const camera=new THREE.PerspectiveCamera(26,1,.1,30); camera.position.z=7.4;
  const postScene=new THREE.Scene(), postCamera=new THREE.Camera();
  const request=()=>{if(!raf&&!disposed&&visible&&!document.hidden) raf=requestAnimationFrame(draw);};
  function rounded(w,h,r) {
    const s=new THREE.Shape(),x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const g=new THREE.ShapeGeometry(s,6);geometries.push(g);
    const uv=g.attributes.uv,pos=g.attributes.position;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+w/2)/w,(pos.getY(i)+h/2)/h);
    return g;
  }
  const stop=()=>{
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);raf=0;
    observer?.disconnect();resizeObserver?.disconnect();
    window.removeEventListener('pointermove',pointer);window.removeEventListener('blur',resetPointer);
    document.removeEventListener('visibilitychange',visibility);desktop.removeEventListener('change',responsive);
    motion.removeEventListener('change',resetPointer);window.removeEventListener('pagehide',pagehide);
    delete window.updateCapabilityStage;display.classList.remove('depth-stage-ready');
    canvas.remove();target?.dispose();textures.forEach(x=>x.dispose());geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());renderer?.dispose();
  };
  function pointer(e){
    if(!visible||motion.matches||e.pointerType==='touch')return;
    const r=display.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){resetPointer();return;}
    tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;request();
  }
  function resetPointer(){if(tx===0&&ty===0&&px===0&&py===0)return;tx=ty=0;request();}
  function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();}
  function responsive(){if(!desktop.matches)stop();}
  function pagehide(e){if(!e.persisted)stop();}
  function resize(){
    if(disposed)return;
    const r=shell.getBoundingClientRect();if(r.width<1||r.height<1)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,ratio,640/Math.max(r.width,r.height)));
    renderer.setSize(r.width,r.height,false);target.setSize(canvas.width,canvas.height);
    camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
    postMaterial.uniforms.pixel.value.set(1/canvas.width,1/canvas.height);request();
  }
  let postMaterial;
  function draw(now){
    raf=0;if(disposed||!visible||document.hidden)return;
    if(now-lastDraw<16){request();return;}lastDraw=now;
    const start=performance.now();
    px+=(tx-px)*.2;py+=(ty-py)*.2;
    if(Math.abs(tx-px)<.001)px=tx;if(Math.abs(ty-py)<.001)py=ty;
    group.rotation.set(THREE.MathUtils.degToRad(7+py*5),THREE.MathUtils.degToRad(-8-progress*72+px*6),0);
    group.updateMatrixWorld(true);
    // Focus stays on the nearest display surface; both faces transition through
    // the focus range at a turn boundary, without a discontinuous focus jump.
    let nearest=30;
    group.children.forEach(face=>{const v=new THREE.Vector3();face.getWorldPosition(v);nearest=Math.min(nearest,camera.position.z-v.z);});
    postMaterial.uniforms.focus.value=nearest;
    renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.clear();renderer.render(postScene,postCamera);
    display.classList.add('depth-stage-ready');
    canvas.dataset.draws=String(++draws);canvas.dataset.focus=nearest.toFixed(3);
    canvas.dataset.resolution=`${canvas.width}x${canvas.height}`;
    // Submission-time guard, not a GPU benchmark. Only lower quality, no oscillation.
    if(performance.now()-start>10)slow++;else slow=Math.max(0,slow-1);
    if(slow>12&&ratio>0.8){ratio=.8;postMaterial.uniforms.radius.value=3.;canvas.dataset.quality='economy';resize();slow=0;}
    if(px!==tx||py!==ty)request();
  }
  try {
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power',premultipliedAlpha:false});
    renderer.debug.onShaderError=()=>{throw new Error("Stage shader compilation failed");};
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
    target.samples=2;
    target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    group.scale.setScalar(1.10);
    const geo=rounded(2,2,.13),frameGeo=rounded(2.12,2.12,.17);
    const light=new THREE.HemisphereLight(0xddeaff,0x303847,2.2);scene.add(light);
    const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(-3,5,6);scene.add(key);
    const loader=new THREE.TextureLoader();
    display.querySelectorAll('.cube-face img').forEach((img,i)=>{
      const face=new THREE.Group();const a=i*Math.PI*2/5,r=2.12/(2*Math.tan(Math.PI/5))+.14;
      face.position.set(Math.sin(a)*r,0,Math.cos(a)*r);face.rotation.y=a;group.add(face);
      const frameMat=new THREE.MeshStandardMaterial({color:0xb8c9df,metalness:.18,roughness:.24,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide});materials.push(frameMat);
      face.add(new THREE.Mesh(frameGeo,frameMat));
      const texture=loader.load(img.src,t=>{
        if(disposed)return;
        const aspect=t.image.width/t.image.height;
        if(aspect>1){t.repeat.x=1/aspect;t.offset.x=(1-t.repeat.x)/2;}else{t.repeat.y=aspect;t.offset.y=(1-aspect)/2;}
        request();
      });texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
      const mat=new THREE.MeshBasicMaterial({map:texture});materials.push(mat);
      const media=new THREE.Mesh(geo,mat);media.position.z=.008;face.add(media);
      // Give the cards an actual back surface. It still writes depth, so rear
      // artwork is visible through gaps and naturally occluded by front faces.
      const backMat=new THREE.MeshBasicMaterial({map:texture,color:0xa4aebb});materials.push(backMat);
      const back=new THREE.Mesh(geo,backMat);back.position.z=-.008;back.rotation.y=Math.PI;face.add(back);
    });
    postMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{color:{value:target.texture},depth:{value:target.depthTexture},pixel:{value:new THREE.Vector2()},focus:{value:6.3},radius:{value:5.}},vertexShader:`varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position,1.);}`,fragmentShader:`
      precision highp float;varying vec2 vUv;uniform sampler2D color,depth;uniform vec2 pixel;uniform float focus,radius;
      float viewDepth(vec2 p){float d=texture2D(depth,p).x;return (.1*30.)/(30.-d*(30.-.1));}
      float coc(float z){return clamp((abs(z-focus)-.30)*5.,0.,radius);}
      void main(){vec4 c=texture2D(color,vUv);float z=viewDepth(vUv),r=coc(z);
        if(r<.1){gl_FragColor=c;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          return;
        }
        // Premultiplied accumulation avoids dark edges around transparent canvas.
        vec3 sum=c.rgb*c.a;float alpha=c.a,weight=1.;
        for(int i=0;i<16;i++){
          float a=float(i)*2.399963;float d=sqrt((float(i)+.5)/16.);
          vec2 p=vUv+vec2(cos(a),sin(a))*d*max(r,1.)*pixel;
          vec4 s=texture2D(color,p);float sz=viewDepth(p);
          float w=sz<z-.12?clamp(coc(sz)/max(r,1.),0.,1.):1.;
          sum+=s.rgb*s.a*w;alpha+=s.a*w;weight+=w;
        }
        vec3 rgb=alpha>.001?sum/alpha:vec3(0.);gl_FragColor=vec4(rgb,alpha/weight);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});materials.push(postMaterial);
    const quadGeo=new THREE.PlaneGeometry(2,2);geometries.push(quadGeo);postScene.add(new THREE.Mesh(quadGeo,postMaterial));
    renderer.compile(scene,camera);renderer.compile(postScene,postCamera);
    shell.append(canvas);
    window.updateCapabilityStage=p=>{if(Math.abs(progress-p)>0.00001){progress=p;request();}};
    observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)request();else{cancelAnimationFrame(raf);raf=0;}},{threshold:0});observer.observe(display);
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(shell);resize();
    window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('blur',resetPointer);
    document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',resetPointer);
    desktop.addEventListener('change',responsive);window.addEventListener('pagehide',pagehide);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();},{once:true});
  } catch(error){console.warn('3D stage unavailable; retaining CSS fallback.',error);stop();}
}
