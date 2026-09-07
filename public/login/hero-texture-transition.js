/* Original procedural effect, informed by the observed Shopify Winter '26
 * radial, etched dissolve. No reference artwork or shader code is reused.
 * app.js owns scroll and frame selection; this renderer owns only pixels.
 */
(() => {
  const config = Object.freeze({
    center: [.51, .39],
    coarseScale: 7.5,
    turbulence: .17,
    feather: .016,
    edgeWidth: .065,
    maxDpr: 1.25,
    maxWidth: 1920,
  });
  window.createHeroTextureTransition = (fallbackCanvas, invalidate) => {
    if (!fallbackCanvas || new URLSearchParams(location.search).get('transition') === 'classic') return null;
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-texture-transition-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
    if (!gl) return null;
    const shaders = [];
    const textures = [];
    let program, buffer, stopped = false, lastKey = '';
    const parent = fallbackCanvas.parentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const pointerDisabled = new URLSearchParams(location.search).get('aiPointer') === 'off';
    const scene = document.querySelector('.ai-system');
    const pointer = { x:.5, y:.5, tx:.5, ty:.5, energy:0, time:0 };
    let pointerFrame = 0, previousTick = 0, previousInvalidate = 0;
    const tickPointer = now => {
      pointerFrame = 0;
      const dt = Math.min(.05, (now - previousTick) / 1000 || .016);
      previousTick = now;
      pointer.x += (pointer.tx-pointer.x) * (1-Math.exp(-dt*18));
      pointer.y += (pointer.ty-pointer.y) * (1-Math.exp(-dt*18));
      pointer.energy *= Math.exp(-dt*3.5);
      pointer.time += dt;
      if (pointer.energy < .003 || document.hidden || reduced.matches || !finePointer.matches) pointer.energy = 0;
      if (now-previousInvalidate>=33 || pointer.energy===0) {
        previousInvalidate=now;lastKey='';invalidate();
      }
      if (pointer.energy > 0) pointerFrame = requestAnimationFrame(tickPointer);
    };
    const clearPointer = () => {
      cancelAnimationFrame(pointerFrame); pointerFrame=0; pointer.energy=0;
      lastKey=''; invalidate();
    };
    const movePointer = event => {
      if (stopped || pointerDisabled || reduced.matches || !finePointer.matches || event.pointerType === 'touch' || !scene) return;
      const bounds = scene.getBoundingClientRect();
      if (!scene.classList.contains('scene-entered') || event.clientY < bounds.top || event.clientY > bounds.bottom
        || event.target.closest?.('button,a,input,.capability-prompt,.capability-display')) return;
      const box = canvas.getBoundingClientRect();
      const x = (event.clientX-box.left)/box.width, y = 1-(event.clientY-box.top)/box.height;
      const speed = Math.min(1, Math.hypot(x-pointer.tx,y-pointer.ty)*18);
      if (!pointer.energy) {pointer.x=x;pointer.y=y;}
      pointer.tx=x;pointer.ty=y;pointer.energy=Math.min(1,pointer.energy+.12+speed*.45);
      if (!pointerFrame) {previousTick=performance.now();pointerFrame=requestAnimationFrame(tickPointer);}
    };
    window.addEventListener('pointermove',movePointer,{passive:true});
    window.addEventListener('blur',clearPointer);
    document.addEventListener('visibilitychange',clearPointer);
    reduced.addEventListener('change',clearPointer);
    finePointer.addEventListener('change',clearPointer);
    const vertex = `attribute vec2 position;
      varying vec2 uv;
      void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
    const fragment = `precision highp float;
      varying vec2 uv;
      uniform sampler2D outgoing;
      uniform sampler2D incoming;
      uniform vec2 resolution, sourceSize, targetSize, origin;
      uniform float progress, coarseScale, turbulence, feather, edgeWidth, reduceMotion;
      uniform vec2 pointerPosition;
      uniform float pointerEnergy, pointerTime;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);
      }
      float fbm(vec2 p){
        float n=0.,a=.5;
        for(int i=0;i<4;i++){n+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.07+13.2;a*=.5;}
        return n;
      }
      vec2 cover(vec2 p,vec2 imageSize){
        vec2 scale=resolution/imageSize;
        return (p-.5)*scale/max(scale.x,scale.y)+.5;
      }
      float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
      void main(){
        vec2 refracted=uv;
        vec2 pointerAspect=vec2(resolution.x/resolution.y,1.);
        vec2 delta=(uv-pointerPosition)*pointerAspect;
        float pointerRadius=length(delta);
        float falloff=exp(-pointerRadius*pointerRadius/0.025);
        float ripple=sin(pointerRadius*38.-pointerTime*3.);
        float strength=pointerEnergy*smoothstep(.9,1.,progress)*(1.-reduceMotion);
        refracted += (delta/ max(pointerRadius,.001))/pointerAspect * falloff * ripple * .018 * strength;
        vec2 aUV=cover(uv,sourceSize),bUV=cover(clamp(refracted,0.,1.),targetSize);
        vec3 a=texture2D(outgoing,aUV).rgb,b=texture2D(incoming,bUV).rgb;
        // A soft, line-aware icy glow follows the same decaying pointer field.
        vec2 glowTexel=vec2(3.)/targetSize;
        vec3 bloom=(texture2D(incoming,bUV+vec2(glowTexel.x,0.)).rgb
          +texture2D(incoming,bUV-vec2(glowTexel.x,0.)).rgb
          +texture2D(incoming,bUV+vec2(0.,glowTexel.y)).rgb
          +texture2D(incoming,bUV-vec2(0.,glowTexel.y)).rgb)*.25;
        float glowField=exp(-pointerRadius*pointerRadius/.05)*strength;
        b += vec3(.48,.78,1.)*(luma(b)*.75+luma(bloom)*1.4)*glowField;
        b += vec3(.025,.055,.09)*glowField;
        if(progress<=0.){gl_FragColor=vec4(a,0.);return;}
        if(progress>=1.){gl_FragColor=vec4(b,1.);return;}
        if(reduceMotion>.5){gl_FragColor=vec4(b,step(.5,progress));return;}
        vec2 p=vec2(uv.x,1.-uv.y);
        vec2 aspect=vec2(resolution.x/min(resolution.x,resolution.y),resolution.y/min(resolution.x,resolution.y));
        vec2 q=(p-origin)*aspect;
        float radius=length(q);
        float farthest=length(max(origin,1.-origin)*aspect);
        vec2 domain=q*coarseScale;
        vec2 warp=vec2(fbm(domain+4.7),fbm(domain-8.3));
        float cloud=fbm(domain+warp*2.2);
        float fine=noise(q*165.);
        float grain=hash(floor(p*resolution));
        float field=radius+(cloud-.48)*turbulence+(fine-.5)*.025+(grain-.5)*.009;
        float front=mix(-.16,farthest+.20,progress);
        float distanceToEdge=field-front;
        float reveal=1.-smoothstep(-feather,feather,distanceToEdge);
        // Etch the outgoing image near the advancing edge; its own detail
        // supplies the contours instead of a generic luminous ring.
        vec2 texel=1.6/sourceSize;
        float dx=luma(texture2D(outgoing,aUV+vec2(texel.x,0.)).rgb)-luma(texture2D(outgoing,aUV-vec2(texel.x,0.)).rgb);
        float dy=luma(texture2D(outgoing,aUV+vec2(0.,texel.y)).rgb)-luma(texture2D(outgoing,aUV-vec2(0.,texel.y)).rgb);
        float contour=clamp(length(vec2(dx,dy))*5.,0.,1.);
        float band=1.-smoothstep(edgeWidth*.22,edgeWidth,abs(distanceToEdge));
        float previewBand=(1.-smoothstep(0.,edgeWidth*3.,distanceToEdge))*step(0.,distanceToEdge);
        float envelope=smoothstep(0.,.08,progress)*(1.-smoothstep(.86,1.,progress));
        vec3 etched=mix(a,vec3(luma(a)*.52),previewBand*.7*envelope);
        etched+=vec3(.68,.78,.80)*contour*previewBand*.56*envelope;
        vec3 color=mix(etched,b,reveal);
        float flecks=smoothstep(.72,.96,grain)*(.18+.82*fine);
        color+=vec3(.76,.86,.87)*band*(.045+flecks*.34+contour*.24)*envelope;
        // Match the original source at the start; never flash a full frame.
        gl_FragColor=vec4(color,smoothstep(0.,.055,progress));
      }`;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      parent.classList.remove('texture-transition-ready');
      canvas.remove();
      textures.forEach(texture => gl.deleteTexture(texture));
      shaders.forEach(shader => gl.deleteShader(shader));
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      cancelAnimationFrame(pointerFrame);
      window.removeEventListener('pointermove',movePointer);
      window.removeEventListener('blur',clearPointer);
      document.removeEventListener('visibilitychange',clearPointer);
      reduced.removeEventListener('change',clearPointer);
      finePointer.removeEventListener('change',clearPointer);
      reduced.removeEventListener('change', invalidate);
      window.removeEventListener('pagehide', onPageHide);
    };
    const onPageHide = event => { if (!event.persisted) stop(); };
    try {
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const uniforms = Object.fromEntries(['outgoing','incoming','resolution','sourceSize','targetSize','origin','progress','coarseScale','turbulence','feather','edgeWidth','reduceMotion','pointerPosition','pointerEnergy','pointerTime'].map(name => [name, gl.getUniformLocation(program,name)]));
      for (let i=0;i<2;i++) {
        const texture = gl.createTexture();
        textures.push(texture);
        gl.activeTexture(gl.TEXTURE0+i);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.uniform1i(uniforms.outgoing,0);
      gl.uniform1i(uniforms.incoming,1);
      gl.uniform2f(uniforms.origin,...config.center);
      ['coarseScale','turbulence','feather','edgeWidth'].forEach(key=>gl.uniform1f(uniforms[key],config[key]));
      const previousImages = [null,null];
      canvas.addEventListener('webglcontextlost', event => { event.preventDefault();stop();invalidate(); }, {once:true});
      reduced.addEventListener('change', invalidate);
      window.addEventListener('pagehide',onPageHide);
      fallbackCanvas.after(canvas);
      return {
        paint(source,target,progress) {
          if (stopped) return false;
          if (!source?.naturalWidth || !target?.naturalWidth) return false;
          try {
            const bounds = fallbackCanvas.getBoundingClientRect();
            const dpr = Math.min(devicePixelRatio || 1,progress>=.99 ? 1 : config.maxDpr,(progress>=.99 ? 1440 : config.maxWidth)/Math.max(1,bounds.width));
            const width = Math.max(1,Math.round(bounds.width*dpr));
            const height = Math.max(1,Math.round(bounds.height*dpr));
            const key = `${width}:${height}:${progress}:${source.src}:${target.src}:${reduced.matches}`;
            if (key === lastKey) return true;
            if (canvas.width!==width || canvas.height!==height) {canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
            [source,target].forEach((image,index)=>{
              if (previousImages[index]===image) return;
              gl.activeTexture(gl.TEXTURE0+index);
              gl.bindTexture(gl.TEXTURE_2D,textures[index]);
              gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
              previousImages[index]=image;
            });
            gl.uniform2f(uniforms.resolution,width,height);
            gl.uniform2f(uniforms.sourceSize,source.naturalWidth,source.naturalHeight);
            gl.uniform2f(uniforms.targetSize,target.naturalWidth,target.naturalHeight);
            gl.uniform1f(uniforms.progress,progress);
            gl.uniform1f(uniforms.reduceMotion,reduced.matches?1:0);
            const sceneBounds = scene?.getBoundingClientRect();
            const visible = sceneBounds && sceneBounds.bottom > 0 && sceneBounds.top < innerHeight;
            gl.uniform2f(uniforms.pointerPosition,pointer.x,pointer.y);
            gl.uniform1f(uniforms.pointerEnergy,visible ? pointer.energy : 0);
            gl.uniform1f(uniforms.pointerTime,pointer.time);
            canvas.dataset.pointerEnergy=(visible ? pointer.energy : 0).toFixed(3);
            gl.drawArrays(gl.TRIANGLES,0,6);
            parent.classList.add('texture-transition-ready');
            canvas.dataset.progress=progress.toFixed(3);
            lastKey=key;
            return true;
          } catch (error) {stop();invalidate();return false;}
        },
        destroy:stop,
      };
    } catch (error) {stop();return null;}
  };
})();
