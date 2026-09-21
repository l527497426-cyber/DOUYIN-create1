import { MODE_DRAWS, resolvePreset } from './vendor/thinking-orbs/dist/engine.es.js';

const canvas = document.querySelector('.composing-orb');

if (canvas) {
  const context = canvas.getContext('2d');
  const preset = resolvePreset('composing', 64);
  const drawMode = MODE_DRAWS[preset.mode];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let visible = true;
  let frame = 0;
  const startedAt = performance.now();

  canvas.width = 64 * dpr;
  canvas.height = 64 * dpr;

  const draw = (now) => {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, 64, 64);
    const elapsed = reducedMotion ? 1.25 : (now - startedAt) / 1000 * preset.speed;
    drawMode(context, 64, elapsed, false, preset.opts);
    if (visible && !reducedMotion) frame = requestAnimationFrame(draw);
  };

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && !document.hidden;
    if (visible && !frame) frame = requestAnimationFrame(draw);
    if (!visible && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden && canvas.getBoundingClientRect().bottom > 0;
    if (visible && !frame) frame = requestAnimationFrame(draw);
  });

  visibilityObserver.observe(canvas);
  frame = requestAnimationFrame(draw);
}
