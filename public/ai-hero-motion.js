// Local texture refraction, following the login hero's pointer-ripple technique.
export function mountHeroMotion() {
  const host=document.querySelector('.intro');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(!host)return;
  const layers=[];
  let pointer={x:0,y:0},pointerTarget={x:0,y:0},hoverTimer=0,hovering=false,strength=.22,target=.22,frame=0,active=true,last=0;
  const vertex='attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}';
  const fragment=`precision mediump float;
    varying vec2 uv;uniform sampler2D tex;uniform vec2 size,imageSize,mouse,blendCenter;uniform float time,power;
    void main(){
      vec2 delta=uv*size-mouse;float radius=length(delta);
      float falloff=exp(-radius*radius/24000.);
      vec2 direction=delta/max(radius,1.);
      float wave=sin(radius*.055-time*3.2);
      vec2 flow=vec2(sin(uv.y*24.+time*1.8),cos(uv.x*22.-time*1.5));
      vec2 displaced=uv+(direction*wave*4.+flow*1.6)*falloff*power/size;
      float fit=min(size.x/imageSize.x,size.y/imageSize.y);
      vec2 sampleUV=(displaced*size-(size-imageSize*fit)*.5)/(imageSize*fit);
      if(sampleUV.x<0.||sampleUV.y<0.||sampleUV.x>1.||sampleUV.y>1.)gl_FragColor=vec4(0.);
      else {
        vec4 sampleColor=texture2D(tex,sampleUV);
        vec3 base=sampleColor.rgb/max(sampleColor.a,.0001);
        // Centered grayscale Soft Light: change contrast without recoloring the artwork.
        vec2 colorDelta=uv*size-blendCenter;
        vec2 field=colorDelta/180.;
        float phase=field.x*2.4+field.y*1.8
          +sin(field.y*3.2-time*.55)*1.9
          +cos(field.x*2.7+time*.4)*1.3-time*.45;
        float light=.5+.47*sin(phase);
        vec3 curve=mix(((16.*base-12.)*base+4.)*base,sqrt(base),step(vec3(.25),base));
        vec3 blended=light<.5
          ? base-(1.-2.*light)*base*(1.-base)
          : base+(2.*light-1.)*(curve-base);
        vec3 overlay=mix(2.*base*light,1.-2.*(1.-base)*(1.-light),step(vec3(.5),base));
        blended=mix(blended,overlay,.4);
        float amount=exp(-dot(colorDelta,colorDelta)/85000.)*(power>0.?(.6+.4*power):0.);
        gl_FragColor=vec4(mix(base,blended,amount)*sampleColor.a,sampleColor.a);
      }
    }`;
  function start(){if(!frame&&active&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(draw);}
  function draw(now){
    frame=0;
    const dt=Math.min((now-last)/1000||.016,.05);last=now;
    strength+=(target-strength)*(1.-Math.exp(-dt*(target>strength?2.8:4.)));
    const ease=1.-Math.exp(-dt*3.5);
    pointer.x+=(pointerTarget.x-pointer.x)*ease;pointer.y+=(pointerTarget.y-pointer.y)*ease;
    const art=host.querySelector('img.hero-ring').getBoundingClientRect();
    const cx=art.left+art.width/2,cy=art.top+art.height/2;
    const colorX=cx+Math.max(-22,Math.min(22,(pointer.x-cx)*.07));
    const colorY=cy+Math.max(-12,Math.min(12,(pointer.y-cy)*.07));
    for(const layer of layers){
      const {canvas,gl,uniforms}=layer,rect=canvas.getBoundingClientRect();
      const ratio=Math.min(devicePixelRatio||1,1.5);
      const w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio);
      if(!w||!h)continue;
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      gl.uniform2f(uniforms.size,rect.width,rect.height);
      const follow=Math.max(0,(strength-.22)/.78);
      gl.uniform2f(uniforms.mouse,cx+(pointer.x-cx)*follow-rect.left,cy+(pointer.y-cy)*follow-rect.top);
      gl.uniform2f(uniforms.blendCenter,colorX-rect.left,colorY-rect.top);
      gl.uniform1f(uniforms.time,now/1000);
      gl.uniform1f(uniforms.power,reduced.matches?0:strength);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    if(active&&!document.hidden&&!reduced.matches&&(target||strength>.002))start();
  }
  host.querySelectorAll('img.hero-ring,img.hero-person').forEach(img=>{
    const init=()=>{
      const canvas=document.createElement('canvas');
      const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'low-power'});
      if(!gl)return;
      const program=gl.createProgram();
      try{
        for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
          const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
          if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Shader compilation failed');
          gl.attachShader(program,shader);gl.deleteShader(shader);
        }
        gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');
        gl.useProgram(program);
        const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
        const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
        const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        // Premultiply before filtering so transparent texels cannot create dark fringes.
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
        const uniforms=Object.fromEntries(['size','imageSize','mouse','blendCenter','time','power'].map(name=>[name,gl.getUniformLocation(program,name)]));
        gl.uniform2f(uniforms.imageSize,img.naturalWidth,img.naturalHeight);
        canvas.className=img.className;canvas.style.cssText=img.style.cssText;canvas.setAttribute('aria-hidden','true');canvas.dataset.effect='pointer-refraction';
        img.after(canvas);layers.push({canvas,gl,uniforms});draw(performance.now());img.style.visibility='hidden';
        canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();canvas.remove();img.style.visibility='';layers.splice(layers.findIndex(l=>l.canvas===canvas),1);});
      }catch{canvas.remove();gl.getExtension('WEBGL_lose_context')?.loseContext();}
    };
    if(img.complete&&img.naturalWidth)init();else img.addEventListener('load',init,{once:true});
  });
  const release=()=>{clearTimeout(hoverTimer);hoverTimer=0;hovering=false;target=.22;start();};
  host.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||reduced.matches)return;
    pointerTarget={x:event.clientX,y:event.clientY};
    const r=host.querySelector('img.hero-ring').getBoundingClientRect();
    const inside=event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;
    if(!inside){release();return;}
    if(!hovering){
      hovering=true;
      hoverTimer=setTimeout(()=>{hoverTimer=0;if(active&&!document.hidden&&!reduced.matches&&hovering){target=1;start();}},160);
    }
    start();
  });
  host.addEventListener('pointerleave',release);host.addEventListener('pointercancel',release);window.addEventListener('blur',release);
  const stop=()=>{clearTimeout(hoverTimer);hoverTimer=0;hovering=false;cancelAnimationFrame(frame);frame=0;target=strength=0;draw(performance.now());};
  reduced.addEventListener('change',()=>{stop();if(!reduced.matches){target=.22;start();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{target=.22;start();}});
  window.addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='ai-page-active')return;active=!!event.data.active;if(!active)stop();else{target=.22;start();}});
  const resize=new ResizeObserver(()=>{if(!frame)draw(performance.now());});resize.observe(host);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);resize.disconnect();},{once:true});
}
