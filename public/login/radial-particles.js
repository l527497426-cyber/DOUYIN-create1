const sections = document.querySelectorAll('.grid-optimized-version .ai-system, .grid-optimized-version .operations');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const palette = ['37,244,238', '112,174,255', '151,219,255', '190,157,255', '255,137,177'];

const seeded = (seed) => {
  let value = seed >>> 0;
  return () => ((value = Math.imul(value ^ (value >>> 15), 1 | value) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;
};

sections.forEach((section, sectionIndex) => {
  const field = document.createElement('div');
  field.className = 'radial-particle-field';
  field.setAttribute('aria-hidden', 'true');
  const random = seeded(8128 + sectionIndex * 97);

  for (let index = 0; index < 300; index += 1) {
    const dot = document.createElement('i');
    const angle = random() * Math.PI * 2;
    const distance = 24 + random() * 48;
    const start = 2 + random() * 12;
    dot.style.setProperty('--sx', `${(Math.cos(angle) * start).toFixed(2)}vw`);
    dot.style.setProperty('--sy', `${(Math.sin(angle) * start).toFixed(2)}vh`);
    dot.style.setProperty('--dx', `${(Math.cos(angle) * distance).toFixed(2)}vw`);
    dot.style.setProperty('--dy', `${(Math.sin(angle) * distance).toFixed(2)}vh`);
    dot.style.setProperty('--size', `${(1.2 + random() * 2.6).toFixed(1)}px`);
    dot.style.setProperty('--alpha', (0.22 + random() * 0.28).toFixed(2));
    dot.style.setProperty('--dot-color', palette[Math.floor(random() * palette.length)]);
    dot.style.setProperty('--duration', `${(10 + random() * 9).toFixed(1)}s`);
    dot.style.setProperty('--delay', `${(-random() * 18).toFixed(1)}s`);
    if (reducedMotion) dot.style.animationPlayState = 'paused';
    field.appendChild(dot);
  }

  section.prepend(field);
});
