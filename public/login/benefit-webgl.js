import * as THREE from 'three';
import {
  BlendFunction,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass
} from 'postprocessing';

const section = document.querySelector('.grid-optimized-version .benefits');
const canvas = section?.querySelector('.benefit-webgl-bg');

if (section && canvas instanceof HTMLCanvasElement) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  let composer;
  let geometry;
  let material;
  let raf = 0;
  let visible = false;
  let disposed = false;
  let lastTime = performance.now();
  let lastRenderTime = 0;

  const failOpen = () => {
    section.classList.remove('webgl-ready');
    section.classList.add('webgl-fallback');
  };

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power'
    });
    renderer.setClearColor(0xffffff, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) }
    };

    geometry = new THREE.PlaneGeometry(2, 2);
    material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv=uv;
          gl_Position=vec4(position.xy,0.,1.);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uResolution;

        float hash(vec2 p){
          return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
        }

        float noise(vec2 p){
          vec2 i=floor(p);
          vec2 f=fract(p);
          f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
                     mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
        }

        float fbm(vec2 p){
          float value=0.;
          float amplitude=.5;
          for(int i=0;i<4;i++){
            value+=noise(p)*amplitude;
            p=mat2(1.62,1.18,-1.18,1.62)*p+3.7;
            amplitude*=.5;
          }
          return value;
        }

        float softField(vec2 p,vec2 center,vec2 radius){
          vec2 delta=(p-center)/radius;
          return exp(-dot(delta,delta)*1.7);
        }

        void main(){
          float aspect=uResolution.x/max(uResolution.y,1.);
          vec2 p=(vUv-.5)*vec2(aspect,1.);
          float t=uTime*.075;

          vec2 c1=vec2(-.34*aspect+sin(t*.73)*.08,.18+cos(t*.61)*.045);
          vec2 c2=vec2(.29*aspect+cos(t*.57)*.11,-.22+sin(t*.69)*.055);
          vec2 c3=vec2(.05*aspect+sin(t*.43+1.4)*.15,.07+cos(t*.51)*.09);
          float field=softField(p,c1,vec2(.58*aspect,.34));
          field+=softField(p,c2,vec2(.52*aspect,.37))*.82;
          field+=softField(p,c3,vec2(.38*aspect,.24))*.38;

          float texture=fbm(p*1.14+vec2(t,-t*.41));
          float ribbon=exp(-abs(p.y+.07*sin(p.x*1.55+t*1.7))*13.)*.22;
          field=clamp(field*(.82+.18*texture)+ribbon,0.,1.35);

          vec3 pale=vec3(.69,.76,.84);
          vec3 blueGray=vec3(.42,.55,.69);
          vec3 color=mix(pale,blueGray,smoothstep(.18,1.15,field));
          float edge=smoothstep(0.,.13,vUv.x)*smoothstep(0.,.13,1.-vUv.x);
          float strength=clamp(field*(.046+.019*texture)*edge,0.,.088);
          vec3 finalColor=mix(vec3(.995),color,strength);
          gl_FragColor=vec4(finalColor,1.);
        }
      `
    });
    scene.add(new THREE.Mesh(geometry, material));

    composer = new EffectComposer(renderer, {
      depthBuffer: false,
      stencilBuffer: false,
      multisampling: 0
    });
    composer.addPass(new RenderPass(scene, camera));
    const noise = new NoiseEffect({
      blendFunction: BlendFunction.SOFT_LIGHT,
      premultiply: true
    });
    noise.blendMode.opacity.value = .018;
    composer.addPass(new EffectPass(camera, noise));

    const resize = () => {
      if (disposed) return;
      const width = Math.max(1, section.clientWidth);
      const height = Math.max(1, section.clientHeight);
      // This is a deliberately soft field; full Retina resolution adds cost
      // without adding visible fidelity.
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1));
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      uniforms.uResolution.value.set(canvas.width, canvas.height);
    };

    const draw = (now) => {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      if (!reducedMotion.matches && now - lastRenderTime < 32) {
        raf = requestAnimationFrame(draw);
        return;
      }
      const delta = Math.min((now - lastTime) / 1000, 1 / 24);
      lastTime = now;
      lastRenderTime = now;
      if (!reducedMotion.matches) uniforms.uTime.value = now / 1000;
      composer.render(delta);
      if (!reducedMotion.matches) raf = requestAnimationFrame(draw);
    };

    const wake = () => {
      if (!raf && visible && !document.hidden) {
        lastTime = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };

    const intersection = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? false;
      if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else {
        wake();
      }
    }, { rootMargin: '12% 0px' });
    intersection.observe(section);

    const sizeObserver = new ResizeObserver(() => {
      resize();
      wake();
    });
    sizeObserver.observe(section);

    const onMotionChange = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (reducedMotion.matches) uniforms.uTime.value = 0;
      wake();
    };
    reducedMotion.addEventListener?.('change', onMotionChange);
    document.addEventListener('visibilitychange', wake);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      failOpen();
    }, { once: true });

    resize();
    section.classList.add('webgl-ready');

    window.addEventListener('pagehide', () => {
      disposed = true;
      cancelAnimationFrame(raf);
      intersection.disconnect();
      sizeObserver.disconnect();
      reducedMotion.removeEventListener?.('change', onMotionChange);
      document.removeEventListener('visibilitychange', wake);
      composer.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    }, { once: true });
  } catch (error) {
    console.warn('Institution background fallback:', error);
    failOpen();
  }
}
