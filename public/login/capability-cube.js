const display = document.querySelector('.grid-optimized-version .story-middle .capability-display');
const cube = display?.querySelector('.capability-cube');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (display && cube) {
  let current = 0;
  let turn = 0;
  let turningTimer = 0;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let pointerFrame = 0;

  // Media owns optical blur; the face wrapper retains its 3D geometry.
  window.setCapabilityDepth = (progress) => {
    if (window.updateCapabilityStage) { window.updateCapabilityStage(progress); return; }
    cube.querySelectorAll('.cube-face[data-panel]').forEach(face => {
      const angle = (Number(face.dataset.panel)-progress) * 2*Math.PI/5;
      const depth = (1-Math.cos(angle))/2;
      face.style.setProperty('--face-blur', `${(depth*7).toFixed(2)}px`);
      face.style.setProperty('--face-light', String(1-depth*.24));
    });
  };
  window.setCapabilityDepth(Number(document.querySelector('.ai-system')?.dataset.scrollProgress || 0));

  const resize = () => {
    const { width, height } = display.getBoundingClientRect();
    const size = Math.max(1, Math.min(width, height) * .9);
    display.style.setProperty('--cube-depth', `${size / (2 * Math.tan(Math.PI / 5))}px`);
    display.style.setProperty('--cube-size', `${size}px`);
    display.style.setProperty('--cube-half-height', `${size / 2}px`);
  };

  const renderPointer = () => {
    pointerFrame = 0;
    pointer.x += (pointer.targetX - pointer.x) * .12;
    pointer.y += (pointer.targetY - pointer.y) * .12;
    display.style.setProperty('--cube-tilt-y', `${pointer.x.toFixed(2)}deg`);
    display.style.setProperty('--cube-tilt-x', `${pointer.y.toFixed(2)}deg`);
    if (Math.abs(pointer.targetX - pointer.x) > .02 || Math.abs(pointer.targetY - pointer.y) > .02) {
      pointerFrame = requestAnimationFrame(renderPointer);
    }
  };

  const requestPointerRender = () => {
    if (!pointerFrame) pointerFrame = requestAnimationFrame(renderPointer);
  };

  window.animateCapabilityNav = (index) => {
    const button = document.querySelector(`.capability-nav [data-capability="${index}"]`);
    const orb = document.querySelector('.capability-nav .composing-orb');
    const targets = [orb, button?.querySelector('strong'), button?.querySelector('small')].filter(Boolean);
    targets.forEach((target, targetIndex) => {
      const isOrb = target === orb;
      target.animate([
        { opacity: 0, transform: isOrb ? 'translateY(calc(-50% + 14px)) scale(.84)' : 'translateY(22px) scale(1)', filter: 'blur(7px)' },
        { opacity: 1, transform: isOrb ? 'translateY(-50%) scale(1)' : 'translateY(0) scale(1)', filter: 'blur(0)' }
      ], {
        duration: 620,
        delay: targetIndex * 55,
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'both'
      });
    });
  };

  window.addEventListener('pointermove', (event) => {
    if (window.updateCapabilityStage || reducedMotion || event.pointerType === 'touch') return;
    pointer.targetX = (event.clientX / Math.max(innerWidth, 1) - .5) * 14;
    pointer.targetY = (event.clientY / Math.max(innerHeight, 1) - .5) * -10;
    requestPointerRender();
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
    requestPointerRender();
  });

  window.setCapabilityTexture = (next) => {
    if (display.closest('.ai-scroll-linked')) return;
    if (!Number.isFinite(next) || next === current) return;
    // All five items occupy identical side faces of a regular pentagonal stage.
    turn = next * -72;
    current = next;
    window.setCapabilityDepth(next);
    display.style.setProperty('--cube-turn', `${turn}deg`);
    display.style.setProperty('--cube-pose-x', '-5deg');
    display.style.setProperty('--cube-shadow-scale', '1');
    display.querySelectorAll('[data-cube-backdrop]').forEach((image) => {
      image.classList.toggle('active', Number(image.dataset.cubeBackdrop) === next);
    });
    display.classList.add('cube-turning');
    clearTimeout(turningTimer);
    turningTimer = setTimeout(() => display.classList.remove('cube-turning'), 920);
  };

  new ResizeObserver(resize).observe(display);
  resize();
}
