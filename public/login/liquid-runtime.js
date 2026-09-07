import { createLiquid } from './liquid-engine.js?v=2-active-gate';

const output = document.querySelector('.hero-liquid-canvas');
const content = document.querySelector('.hero-video-content') || document.querySelector('.hero-media.scroll-video-version');
const pointerTarget = document.querySelector('.hero-sticky');
const heroChapter = document.querySelector('.hero-ai-chapter');

const liquidDefaults = Object.freeze({
  tuningVersion: 2,
  simResolution: 96,
  dyeResolution: 384,
  densityDissipation: 0.96,
  velocityDissipation: 0.93,
  pressure: 0.68,
  pressureIterations: 3,
  curl: 1.1,
  radius: 0.29,
  force: 0.65,
  intensity: 1.8,
  distortion: 0.51,
  blend: 5,
  colorR: 0.43,
  colorG: 0.77,
  colorB: 1,
  rainbow: false,
});

if (output && content && pointerTarget && heroChapter) {
  const source = document.createElement('canvas');
  let liquid;
  let fadeTimer = 0;
  let liquidTuning = { ...liquidDefaults };

  try {
    liquidTuning = { ...liquidTuning, ...JSON.parse(localStorage.getItem('creator-liquid-tuning') || '{}') };
  } catch (_) {}

  // Older saved state belonged to the draft renderer that ignored several
  // controls. Promote it once to the art-directed values shown in the editor,
  // so every slider is the value actually fed to the live WebGL renderer.
  if (liquidTuning.tuningVersion !== liquidDefaults.tuningVersion) {
    liquidTuning = { ...liquidDefaults };
    localStorage.setItem('creator-liquid-tuning', JSON.stringify(liquidTuning));
  }

  const engineOptions = () => ({
    simResolution: liquidTuning.simResolution,
    dyeResolution: liquidTuning.dyeResolution,
    densityDissipation: liquidTuning.densityDissipation,
    velocityDissipation: liquidTuning.velocityDissipation,
    pressure: liquidTuning.pressure,
    pressureIterations: liquidTuning.pressureIterations,
    curl: liquidTuning.curl,
    radius: liquidTuning.radius,
    force: liquidTuning.force,
    intensity: liquidTuning.intensity,
    distortion: liquidTuning.distortion,
    blend: liquidTuning.blend,
    color: [liquidTuning.colorR, liquidTuning.colorG, liquidTuning.colorB],
    rainbow: liquidTuning.rainbow,
  });

  const syncActive = () => {
    const heroOnly = document.querySelector('.hero');
    const rect = (heroOnly || heroChapter).getBoundingClientRect();
    const scrollRange = Math.max((heroOnly || heroChapter).offsetHeight - window.innerHeight, 1);
    const portalProgress = Math.min(1, Math.max(0, -rect.top / scrollRange));
    const active = !document.hidden && rect.bottom > 0 && rect.top < innerHeight && portalProgress < 0.7;
    output.dataset.effectsActive = String(active);
    liquid?.setActive(active);
    if (!active) output.classList.remove('liquid-active');
  };

  const mountLiquid = () => {
    liquid?.destroy();
    // Keep the component arguments and its configurable values separate.
    // The old version passed every option as an element and silently used the
    // engine's blue defaults, which is why the tint could not be tuned.
    liquid = createLiquid({ output, source, content, pointerTarget }, engineOptions());
    syncActive();
  };

  const setLiquidTuning = (changes = {}, persist = true) => {
    const rebuild = 'simResolution' in changes || 'dyeResolution' in changes;
    Object.assign(liquidTuning, changes);
    if (rebuild) mountLiquid();
    else liquid?.setOptions(engineOptions());
    if (persist) localStorage.setItem('creator-liquid-tuning', JSON.stringify(liquidTuning));
    window.dispatchEvent(new CustomEvent('liquid-tuning-change', { detail: { ...liquidTuning } }));
  };

  window.getLiquidTuning = () => ({ ...liquidTuning });
  window.setLiquidTuning = setLiquidTuning;
  window.resetLiquidTuning = () => setLiquidTuning({ ...liquidDefaults });

  const showLiquid = () => {
    if (output.dataset.effectsActive !== 'true') return;
    output.classList.add('liquid-active');
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => output.classList.remove('liquid-active'), 720);
  };

  pointerTarget.addEventListener('pointermove', showLiquid, { passive: true });
  pointerTarget.addEventListener('pointerleave', () => {
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => output.classList.remove('liquid-active'), 220);
  }, { passive: true });
  window.addEventListener('scroll', syncActive, { passive: true });
  window.addEventListener('resize', syncActive, { passive: true });

  document.addEventListener('visibilitychange', syncActive);
  mountLiquid();
  window.dispatchEvent(new CustomEvent('liquid-tuning-ready', { detail: { ...liquidTuning } }));
}
