const root = document.documentElement;
const layer = document.querySelector('.login-layer');
const trigger = document.querySelector('.login-trigger');
const loginModalBackdrop = document.querySelector('.login-modal-backdrop');
const loginModalClose = document.querySelector('.login-modal-close');
const loginModalBackgrounds = [...document.querySelectorAll('.topbar, main, .site-footer')];
const loginModalInertState = new Map();
const loginModalReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const loginLayerAnchor = document.createComment('login-layer-home');
layer?.parentNode?.insertBefore(loginLayerAnchor, layer);
const hero = document.querySelector('.hero');
let autoOpened = true;
let lenis;
let loginModalState = 'closed';
let loginModalOpener = null;
let loginLayerWasOpen = true;
let loginModalCloseTimer = 0;
const HERO_LINE_TRANSITION_SPAN = .22;

const motionDefaults = Object.freeze({
  heroExitStart: .38,
  heroExitDuration: .48,
  // Foreground should dissolve, not travel away like a separate page.
  heroExitDistance: .16,
  // Each physical scroll point advances 1.5× further through the film.
  heroFrameSpeed: 1.5,
  scrollLerp: .1,
  // Leave a real closing beat for the film before the drawing takes over.
  maskStart: .65,
  lineDraftSpeed: 1,
  maskExpansion: 1.85,
  maskFeather: 60,
  // The AI foreground now waits for the drawing to settle instead of racing
  // ahead of the visual handoff.
  // Hero foreground finishes at 86% (.38 + .48); this 10vh handoff places
  // the AI scene at its sticky composition exactly at that point.
  aiContentAdvance: 10,
  aiContentFade: .95,
  aiTitleX: 124,
  aiTitleY: 84,
  aiNavX: -22,
  aiNavY: -6,
  aiOrbX: -4,
  aiOrbY: 116,
  aiDividerX: -22,
  aiDividerY: -4,
  aiDividerScale: 0.98,
  aiCubeX: 12,
  aiCubeY: 0,
  aiCopyX: 0,
  // 右侧整组从左侧球/标签的视觉中线起，避免标签漂在画面上方。
  aiCopyY: 360,
  // The right story rail is the only non-sticky column in the AI scene. Give
  // that rail a local inertial follower so it crosses the reading line with
  // the same calm weight as the sticky composition around it.
  aiCopyDampingLambda: 6.5,
  aiCopyMaxLag: 88,
});
let motionTuning = { ...motionDefaults };
try {
  const savedTuning = JSON.parse(localStorage.getItem('creator-motion-tuning') || '{}');
  motionTuning = { ...motionTuning, ...savedTuning };
  // Retire the former leftward sphere offset while preserving custom tuning.
  if (savedTuning.aiOrbX === -28 || savedTuning.aiOrbX === 0) motionTuning.aiOrbX = motionDefaults.aiOrbX;
  if (savedTuning.aiOrbY === 96) motionTuning.aiOrbY = motionDefaults.aiOrbY;
  // 本次把编辑器收敛为 AI 画面布局；旧版保存的位置不再适用新的对齐基准。
    if (savedTuning.layoutEditorVersion !== 2) {
      Object.assign(motionTuning, {
      aiTitleX: motionDefaults.aiTitleX,
      aiTitleY: motionDefaults.aiTitleY,
      aiNavX: motionDefaults.aiNavX,
      aiNavY: motionDefaults.aiNavY,
      aiCubeX: motionDefaults.aiCubeX,
      aiCubeY: motionDefaults.aiCubeY,
      aiCopyX: motionDefaults.aiCopyX,
      aiCopyY: motionDefaults.aiCopyY,
        layoutEditorVersion: 2,
      });
    }

    // 将本次确认的左侧／中间布局固化为新的基准，避免旧的编辑器缓存覆盖它。
    // 右侧内容与首屏动效参数仍沿用用户当前已保存的值。
    if (savedTuning.layoutEditorVersion !== 3) {
      Object.assign(motionTuning, {
        aiTitleX: motionDefaults.aiTitleX,
        aiTitleY: motionDefaults.aiTitleY,
        aiNavX: motionDefaults.aiNavX,
        aiNavY: motionDefaults.aiNavY,
        aiOrbX: motionDefaults.aiOrbX,
        aiOrbY: motionDefaults.aiOrbY,
        aiDividerX: motionDefaults.aiDividerX,
        aiDividerY: motionDefaults.aiDividerY,
        aiDividerScale: motionDefaults.aiDividerScale,
        aiCubeX: motionDefaults.aiCubeX,
        aiCubeY: motionDefaults.aiCubeY,
        layoutEditorVersion: 3,
      });
    }
    // 立方体向右微调；输入框不跟随这个布局位移。
    if (savedTuning.layoutEditorVersion !== 4) {
      Object.assign(motionTuning, {
        aiCubeX: motionDefaults.aiCubeX,
        layoutEditorVersion: 4,
      });
    }
    // Refine only the cube anchor for the latest composition. The prompt has
    // its own centre-column anchor and intentionally remains untouched.
    if (savedTuning.layoutEditorVersion !== 5) {
      Object.assign(motionTuning, {
        aiCubeX: motionDefaults.aiCubeX,
        aiCubeY: motionDefaults.aiCubeY,
        layoutEditorVersion: 5,
      });
    }
    // Re-time the shared first/second-scene handoff. Frame playback is faster,
    // while the visual transition completes before the AI foreground arrives.
    if (savedTuning.layoutEditorVersion !== 6) {
      Object.assign(motionTuning, {
        heroFrameSpeed: motionDefaults.heroFrameSpeed,
        maskStart: motionDefaults.maskStart,
        lineDraftSpeed: motionDefaults.lineDraftSpeed,
        layoutEditorVersion: 6,
      });
    }
    // Keep the faster film, but restore the line drawing's own closing beat
    // and let the next screen enter only after that handoff is established.
    if (savedTuning.layoutEditorVersion !== 7) {
      Object.assign(motionTuning, {
        maskStart: motionDefaults.maskStart,
        lineDraftSpeed: motionDefaults.lineDraftSpeed,
        aiContentAdvance: motionDefaults.aiContentAdvance,
        layoutEditorVersion: 7,
      });
    }
    if (savedTuning.layoutEditorVersion !== 8) {
      Object.assign(motionTuning, {
        aiContentAdvance: motionDefaults.aiContentAdvance,
        layoutEditorVersion: 8,
      });
    }
    if (savedTuning.layoutEditorVersion !== 9) {
      Object.assign(motionTuning, {
        heroExitDistance: motionDefaults.heroExitDistance,
        layoutEditorVersion: 9,
      });
    }
    // The editorial progression uses a calmer inertial follow. Keep the
    // global smooth-scroll driver on one clock while reducing its catch-up
    // rate instead of layering another wheel interceptor on top.
    if (savedTuning.layoutEditorVersion !== 10) {
      Object.assign(motionTuning, {
        scrollLerp: motionDefaults.scrollLerp,
        layoutEditorVersion: 10,
      });
    }
    // The AI stage now lands on the true viewport centre. Clear the historic
    // cube lift so saved editor values cannot pull the new media upward again.
    if (savedTuning.layoutEditorVersion !== 11) {
      Object.assign(motionTuning, {
        aiCubeY: motionDefaults.aiCubeY,
        layoutEditorVersion: 11,
      });
    }
} catch (_) {}
const applyMotionTuning = (changes = {}, persist = true) => {
  Object.assign(motionTuning, changes);
  root.style.setProperty('--ai-title-x', `${motionTuning.aiTitleX}px`);
  root.style.setProperty('--ai-title-y', `${motionTuning.aiTitleY}px`);
  root.style.setProperty('--ai-nav-x', `${motionTuning.aiNavX}px`);
  root.style.setProperty('--ai-nav-y', `${motionTuning.aiNavY}px`);
  root.style.setProperty('--ai-orb-x', `${motionTuning.aiOrbX}px`);
  root.style.setProperty('--ai-orb-y', `${motionTuning.aiOrbY}px`);
  root.style.setProperty('--ai-divider-x', `${motionTuning.aiDividerX}px`);
  root.style.setProperty('--ai-divider-y', `${motionTuning.aiDividerY}px`);
  root.style.setProperty('--ai-divider-scale', motionTuning.aiDividerScale);
  root.style.setProperty('--ai-cube-x', `${motionTuning.aiCubeX}px`);
  root.style.setProperty('--ai-cube-y', `${motionTuning.aiCubeY}px`);
  root.style.setProperty('--ai-copy-x', `${motionTuning.aiCopyX}px`);
  root.style.setProperty('--ai-copy-y', `${motionTuning.aiCopyY}px`);
  root.style.setProperty('--ai-content-advance', `${motionTuning.aiContentAdvance}vh`);
  root.style.setProperty('--ai-content-fade', `${motionTuning.aiContentFade}s`);
  if (lenis?.options) lenis.options.lerp = motionTuning.scrollLerp;
  if (persist) localStorage.setItem('creator-motion-tuning', JSON.stringify(motionTuning));
  window.dispatchEvent(new Event('scroll'));
};
window.getMotionTuning = () => ({ ...motionTuning });
window.setMotionTuning = applyMotionTuning;
applyMotionTuning({}, false);

// Keep the AI rail heading on one line at every desktop width. CSS establishes
// the preferred display size; this only reduces it when its real text width
// exceeds the available rail width.
function fitAiRailTitle() {
  const title = document.querySelector('.ai-system .story-left .system-head h2');
  if (!title) return;
  const fit = () => {
    title.style.removeProperty('font-size');
    const available = title.parentElement?.clientWidth || 0;
    const natural = title.scrollWidth;
    if (!available || natural <= available) return;
    const current = parseFloat(getComputedStyle(title).fontSize) || 52;
    const next = Math.max(28, Math.floor(current * (available / natural) * .985));
    title.style.setProperty('font-size', `${next}px`, 'important');
  };
  new ResizeObserver(fit).observe(title.parentElement);
  requestAnimationFrame(fit);
}
fitAiRailTitle();

// Same smooth-scroll engine and public parameters used by TwelveLabs Jockey.
if (
  typeof Lenis !== 'undefined' &&
  matchMedia('(pointer:fine)').matches &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  lenis = new Lenis({
    lerp: .1,
    duration: 1.2,
    smoothWheel: true,
    wheelMultiplier: 1,
    autoRaf: true,
  });
  lenis.options.lerp = motionTuning.scrollLerp;
}

function splitHeroTitle() {
  const title = document.querySelector('.hero h1');
  let index = 0;
  [...title.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const fragment = document.createDocumentFragment();
    [...node.textContent].forEach((char) => {
      const span = document.createElement('span');
      span.className = 'split-char';
      span.style.setProperty('--char-index', index++);
      span.textContent = char;
      fragment.appendChild(span);
    });
    node.replaceWith(fragment);
  });
  requestAnimationFrame(() => title.classList.add('motion-ready'));
}

splitHeroTitle();

function initHeroPointerFollow() {
  const stage = document.querySelector('.hero-stage');
  const media = document.querySelector('.hero-media.single-image');
  if (!stage || !media || !matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const current = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let frame = 0;

  const render = () => {
    current.x += (target.x - current.x) * .075;
    current.y += (target.y - current.y) * .075;
    media.style.setProperty('--hero-pointer-x', `${current.x.toFixed(2)}px`);
    media.style.setProperty('--hero-pointer-y', `${current.y.toFixed(2)}px`);
    if (Math.abs(target.x - current.x) > .02 || Math.abs(target.y - current.y) > .02) {
      frame = requestAnimationFrame(render);
    } else {
      frame = 0;
    }
  };

  const startRender = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  stage.addEventListener('pointermove', (event) => {
    const bounds = stage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    target.x = x * -18;
    target.y = y * -12;
    startRender();
  }, { passive: true });

  stage.addEventListener('pointerleave', () => {
    target.x = 0;
    target.y = 0;
    startRender();
  });
}

initHeroPointerFollow();

// 彩色首屏与线稿首屏共用同一张视觉画布：整体轻微跟随鼠标，切换时不会错位。
function initScrollHeroPointerParallax() {
  const media = document.querySelector('.shared-visual-stage .hero-media.scroll-video-version');
  if (!media || !matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const current = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let frame = 0;
  const render = () => {
    frame = 0;
    current.x += (target.x - current.x) * .1;
    current.y += (target.y - current.y) * .1;
    media.style.setProperty('--hero-film-parallax-x', `${current.x.toFixed(2)}px`);
    media.style.setProperty('--hero-film-parallax-y', `${current.y.toFixed(2)}px`);
    if (Math.abs(target.x - current.x) > .05 || Math.abs(target.y - current.y) > .05) frame = requestAnimationFrame(render);
  };
  const requestRender = () => { if (!frame) frame = requestAnimationFrame(render); };
  window.addEventListener('pointermove', (event) => {
    target.x = (event.clientX / Math.max(innerWidth, 1) - .5) * 20;
    target.y = (event.clientY / Math.max(innerHeight, 1) - .5) * 14;
    requestRender();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => {
    target.x = 0;
    target.y = 0;
    requestRender();
  });
}

initScrollHeroPointerParallax();

function initHeroFrameSequence() {
  const sequence = document.querySelector('.hero-frame-sequence');
  if (!sequence || !hero) return;

  const lineSequence = document.querySelector('.hero-line-sequence');
  const lineSoftEdge = document.querySelector('.hero-line-soft-edge');
  const lineTransitionCanvas = document.querySelector('.hero-line-transition-canvas');

  const frameCount = Number(sequence.dataset.frameCount) || 96;
  const desktopFrameFolder = sequence.dataset.frameFolder || './assets/hero-frames-webp';
  const mobileFrameFolder = sequence.dataset.mobileFrameFolder || './assets/hero-frames-webp-mobile';
  const frameFolder = matchMedia('(max-width: 850px)').matches
    ? mobileFrameFolder
    : desktopFrameFolder;
  const framePath = (index) => `${frameFolder}/frame-${String(index + 1).padStart(3, '0')}.webp`;
  const frames = Array.from({ length: frameCount }, (_, index) => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = index < 10 ? 'high' : 'low';
    image.src = framePath(index);
    return image;
  });
  const lineFrameCount = Number(lineSequence?.dataset.frameCount) || 0;
  const lineFrameFolder = lineSequence?.dataset.frameFolder;
  const lineFrames = lineSequence && lineFrameFolder
    ? Array.from({ length: lineFrameCount }, (_, index) => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = index < 12 ? 'high' : 'low';
      image.src = `${lineFrameFolder}/frame-${String(index + 1).padStart(3, '0')}.webp`;
      return image;
    })
    : [];
  sequence.src = frames[0].src;
  if (lineFrames.length) {
    lineSequence.src = lineFrames[0].src;
    if (lineSoftEdge) lineSoftEdge.src = lineFrames[0].src;
  }
  let targetIndex = 0;
  let displayedIndex = 0;
  let displayedLineIndex = 0;
  let targetLineIndex = 0;
  let frame = 0;
  const maskCanvas = document.createElement('canvas');
  let textureTransition;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const paintLineTransition = (image, reveal, points, rawProgress) => {
    if (textureTransition?.paint(frames[displayedIndex], image, rawProgress)) return;
    if (!lineTransitionCanvas || !image?.naturalWidth) return;
    const bounds = lineTransitionCanvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (lineTransitionCanvas.width !== pixelWidth || lineTransitionCanvas.height !== pixelHeight) {
      lineTransitionCanvas.width = pixelWidth;
      lineTransitionCanvas.height = pixelHeight;
      maskCanvas.width = pixelWidth;
      maskCanvas.height = pixelHeight;
    }
    const context = lineTransitionCanvas.getContext('2d');
    const maskContext = maskCanvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!reveal) return;

    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = (width - drawWidth) / 2;
    const drawY = (height - drawHeight) / 2;
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    if (reveal >= .995) return;

    maskContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    maskContext.clearRect(0, 0, width, height);
    maskContext.filter = `blur(${Math.round(motionTuning.maskFeather * dpr)}px)`;
    maskContext.fillStyle = '#000';
    maskContext.beginPath();
    points.forEach((point, index) => {
      const x = point.x / 100 * width;
      const y = point.y / 100 * height;
      if (index) maskContext.lineTo(x, y);
      else maskContext.moveTo(x, y);
    });
    maskContext.closePath();
    maskContext.fill();
    maskContext.filter = 'none';
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(maskCanvas, 0, 0);
    context.globalCompositeOperation = 'source-over';
  };

  const updateFrame = () => {
    frame = 0;
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(1, hero.offsetHeight - innerHeight);
    const progress = clamp(-rect.top / travel, 0, 1);
    // 前景内容在彩色视频接近收束时离场，给末帧与线稿首帧留出纯画面的衔接区。
    // 让首屏前景从更早的位置缓慢离场，并在蒙板启动前自然收束。
    // Give the texture a clear media-only stage: finish the foreground exit
    // before the dissolve begins. The comparison mode retains the old timing.
    const foregroundDuration = textureTransition
      ? Math.max(.01, Math.min(motionTuning.heroExitDuration, motionTuning.maskStart - motionTuning.heroExitStart))
      : motionTuning.heroExitDuration;
    const contentExitRaw = clamp((progress - motionTuning.heroExitStart) / foregroundDuration, 0, 1);
    const contentExit = contentExitRaw * contentExitRaw * (3 - 2 * contentExitRaw);
    const contentOpacity = 1 - contentExit;
    root.style.setProperty('--hero-copy-scroll-y', `${(-innerHeight * motionTuning.heroExitDistance * contentExit).toFixed(1)}px`);
    root.style.setProperty('--hero-login-scroll-y', `${(-innerHeight * motionTuning.heroExitDistance * .96 * contentExit).toFixed(1)}px`);

    // The hero loop owns only the media transition. AI foreground visibility
    // is owned by the scene observer below, so two scroll runtimes cannot
    // compete over the same opacity/transform state.
    // Classic comparison retains the former last-frame hold. The new version
    // overlaps the last 12 colour frames with the incoming moving line film.
    const filmSettleProgress = Math.max(.01, Math.min(1, motionTuning.maskStart));
    const settledFrameSpeed = Math.max(motionTuning.heroFrameSpeed, 1 / filmSettleProgress);
    const rawFrameProgress = clamp(progress * settledFrameSpeed, 0, 1);
    const frameSettleStart = .82;
    const settleT = clamp((rawFrameProgress - frameSettleStart) / (1 - frameSettleStart), 0, 1);
    const settledTail = settleT + settleT * settleT - settleT * settleT * settleT;
    let frameProgress = rawFrameProgress <= frameSettleStart
      ? rawFrameProgress
      : frameSettleStart + (1 - frameSettleStart) * settledTail;
    if (textureTransition) {
      const tailStart = Math.max(0, (frameCount - 13) / (frameCount - 1));
      const overlapSpan = HERO_LINE_TRANSITION_SPAN * .65;
      const overlap = clamp((progress - filmSettleProgress) / overlapSpan, 0, 1);
      // Hermite tail matches the incoming velocity and settles to zero speed,
      // avoiding a perceptible speed step at the start of the dissolve.
      const slope = Math.min(3, tailStart / filmSettleProgress * overlapSpan / (1 - tailStart));
      const tail = overlap * overlap * (3 - 2 * overlap) + slope * overlap * (1 - overlap) ** 2;
      frameProgress = progress < filmSettleProgress
        ? progress / filmSettleProgress * tailStart
        : tailStart + (1 - tailStart) * tail;
    }
    targetIndex = Math.round(frameProgress * (frameCount - 1));
    if (targetIndex !== displayedIndex) {
      const requestedIndex = targetIndex;
      const targetFrame = frames[requestedIndex];
      const commit = () => {
        if (targetIndex === requestedIndex) {
          sequence.src = targetFrame.src;
          displayedIndex = requestedIndex;
        }
      };
      if (targetFrame.complete && targetFrame.naturalWidth) commit();
      else targetFrame.addEventListener('load', commit, { once: true });
    }

    if (!lineFrames.length) return;
    const heroTop = window.scrollY + rect.top;
    // 线稿首帧对应彩色视频末帧，起点及节奏由编辑器保持可调。
    const transitionStart = heroTop + travel * motionTuning.maskStart;
    // This is a self-contained settling window, not a tail that leaks into
    // the next screen. By the time AI content enters, the line drawing is at
    // its final frame and mask state.
    const transitionDuration = Math.max(1, travel * HERO_LINE_TRANSITION_SPAN);
    const revealProgress = clamp((window.scrollY - transitionStart) / transitionDuration, 0, 1);
    const lineProgress = clamp(revealProgress * motionTuning.lineDraftSpeed, 0, 1);
    const easedReveal = Math.pow(lineProgress, .72);
    const maskReveal = Math.pow(clamp(revealProgress * motionTuning.maskExpansion, 0, 1), .62);
    const lineIndex = Math.round(easedReveal * (lineFrameCount - 1));
    targetLineIndex = lineIndex;
    const lineFrame = lineFrames[lineIndex];
    const commitLine = () => {
      if (targetLineIndex === lineIndex) {
        lineSequence.src = lineFrame.src;
        if (lineSoftEdge) lineSoftEdge.src = lineFrame.src;
        displayedLineIndex = lineIndex;
      }
    };
    if (lineIndex !== displayedLineIndex) {
      if (lineFrame.complete && lineFrame.naturalWidth) commitLine();
      else lineFrame.addEventListener('load', commitLine, { once: true });
    }

    const centerX = 51;
    const centerY = 39;
    const canvasPoints = Array.from({ length: 22 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 22;
      const wobble = .76 + (((index * 37) % 11) / 10) * .37;
      const radius = maskReveal * 180 * wobble;
      return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
    });
    const organicPoints = canvasPoints.map((point) => `${point.x.toFixed(2)}% ${point.y.toFixed(2)}%`).join(',');
    const organicClip = revealProgress ? `polygon(${organicPoints})` : 'circle(0% at 51% 39%)';
    lineSequence.style.clipPath = organicClip;
    if (lineSoftEdge) lineSoftEdge.style.clipPath = organicClip;
    paintLineTransition(lineFrame?.naturalWidth ? lineFrame : lineFrames[displayedLineIndex], maskReveal, canvasPoints, revealProgress);
    root.style.setProperty('--hero-shade-opacity', String(1 - maskReveal));
    root.style.setProperty('--hero-copy-transition-opacity', String(Math.min(contentOpacity, 1 - easedReveal)));
    const loginOpacity = Math.min(contentOpacity, 1 - clamp((easedReveal - .12) / .58, 0, 1));
    root.style.setProperty('--hero-login-transition-opacity', String(loginOpacity));
    // Foreground exits in the same scroll window as its translation: a soft
    // defocus keeps the copy and login card from popping away abruptly.
    const copyOpacity = Math.min(contentOpacity, 1 - easedReveal);
    root.style.setProperty('--hero-copy-exit-blur', `${(1 - copyOpacity) * 16}px`);
    root.style.setProperty('--hero-login-exit-blur', `${(1 - loginOpacity) * 18}px`);
    root.style.setProperty('--hero-login-pointer-events', loginOpacity < .08 ? 'none' : 'auto');
  };

  const requestUpdate = () => {
    if (!frame) frame = requestAnimationFrame(updateFrame);
  };

  textureTransition = window.createHeroTextureTransition?.(lineTransitionCanvas, requestUpdate);
  // A requested frame may finish loading after scrolling stops (especially
  // on a deep-link refresh). Repaint on readiness, not only on the next wheel.
  [...frames, ...lineFrames].forEach(image => {
    if (!image.complete) image.addEventListener('load', requestUpdate, { once: true });
  });
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', requestUpdate);
    window.removeEventListener('resize', requestUpdate);
    [...frames, ...lineFrames].forEach(image => image.removeEventListener('load', requestUpdate));
    textureTransition?.destroy();
  });
  requestUpdate();
}

initHeroFrameSequence();

function setAiSceneEntered(scene, entered) {
  scene.classList.toggle('scene-entered', entered);
  scene.classList.toggle('story-ready', entered);
  scene.classList.toggle('ai-lines-entered', entered);
}

// The hero and AI foreground share one explicit handoff point. The line film
// settles first, then the AI group plays in place. The existing sticky runway
// supplies reading dwell without stopping Lenis, blocking wheel input or
// snapping the document back to an earlier scroll position.
const aiVisibilityScene = document.querySelector('.grid-optimized-version .ai-system');
if (aiVisibilityScene) {
  document.body.classList.add('motion-runtime-ready');
  const syncAiVisibility = () => {
    const heroRect = hero.getBoundingClientRect();
    const travel = Math.max(1, hero.offsetHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, -heroRect.top / travel));
    // Begin UI entry once the second film is established, rather than waiting
    // for the whole texture dissolve to finish. CSS supplies a short delay.
    const entryStart = motionTuning.maskStart
      + .35 * HERO_LINE_TRANSITION_SPAN / Math.max(.01, motionTuning.lineDraftSpeed);
    const entered = progress >= Math.min(1, entryStart);
    // Scroll triggers entry; CSS completes it even when the wheel stops.
    aiVisibilityScene.style.setProperty('--ai-entry-progress', entered ? '1' : '0');
    setAiSceneEntered(aiVisibilityScene, entered);
  };
  window.addEventListener('scroll', syncAiVisibility, { passive: true });
  window.addEventListener('resize', syncAiVisibility, { passive: true });
  syncAiVisibility();
  window.addEventListener('pagehide', () => {
    window.removeEventListener('scroll', syncAiVisibility);
    window.removeEventListener('resize', syncAiVisibility);
    document.body.classList.remove('motion-runtime-ready');
    setAiSceneEntered(aiVisibilityScene, true);
  }, { once: true });
}

function initHeroBackgroundVideo() {
  const video = document.querySelector('.hero-background-video');
  if (!video) return;

  if (video.classList.contains('hero-scroll-video')) {
    const hero = video.closest('.hero');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ready = false;
    let animationFrame = 0;
    let targetTime = 0;

    const updateTarget = () => {
      animationFrame = 0;
      if (!ready || !hero || !Number.isFinite(video.duration)) return;

      const rect = hero.getBoundingClientRect();
      const scrollDistance = Math.max(1, hero.offsetHeight - innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / scrollDistance));
      const usableDuration = Math.max(0, video.duration - .04);
      targetTime = reducedMotion ? 0 : progress * usableDuration;

      if (Math.abs(video.currentTime - targetTime) > .012) {
        video.currentTime = targetTime;
      }
    };

    const requestUpdate = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(updateTarget);
    };

    const prepareVideo = () => {
      if (ready) return;
      ready = true;
      video.pause();
      video.style.opacity = '1';
      requestUpdate();
    };

    video.addEventListener('loadedmetadata', prepareVideo, { once: true });
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) prepareVideo();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    requestUpdate();
    return;
  }

  let animationFrame = 0;
  let fadingOut = false;

  const fadeTo = (targetOpacity, duration = 500) => {
    cancelAnimationFrame(animationFrame);
    const startOpacity = Number.parseFloat(video.style.opacity || '0');
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      video.style.opacity = String(startOpacity + (targetOpacity - startOpacity) * eased);
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
      else animationFrame = 0;
    };
    animationFrame = requestAnimationFrame(animate);
  };

  const fadeIn = () => {
    fadingOut = false;
    fadeTo(1);
  };

  video.addEventListener('loadeddata', fadeIn);
  video.addEventListener('timeupdate', () => {
    if (video.duration - video.currentTime <= .55 && !fadingOut) {
      fadingOut = true;
      fadeTo(0);
    }
  });
  video.addEventListener('ended', () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    video.style.opacity = '0';
    setTimeout(() => {
      video.currentTime = 0;
      video.play().then(fadeIn).catch(() => {});
    }, 100);
  });

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) fadeIn();
}

initHeroBackgroundVideo();

function initOrbStream() {
  const canvas = document.querySelector('.orb-stream');
  const media = document.querySelector('.hero-media');
  if (!canvas || !media) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const sources = [
    './assets/hero-life.png',
    './assets/hero-creator-studio.png',
    './assets/ai-lab.png',
    './assets/ai-avatar.png',
    './assets/remix.png',
    './assets/encyclopedia.png'
  ];
  const images = sources.map((source) => {
    const image = new Image();
    image.src = source;
    return image;
  });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A single, evenly-spaced orbit: every image gets the same turn at the focal point.
  const orbCount = innerWidth < 850 ? 18 : 24;
  const orbs = Array.from({ length: orbCount }, (_, index) => ({
    index,
    phase: index / orbCount,
    hover: 0,
    x: 0,
    y: 0,
    radius: 0,
    depth: 0
  }));
  const pointer = { x: .5, y: .5, targetX: .5, targetY: .5, inside: false };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrame = 0;
  let previousTime = performance.now();
  let progress = 0;

  function resizeCanvas() {
    const bounds = media.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    dpr = Math.min(innerWidth < 850 ? 1.25 : 1.5, devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  function coverImage(image, radius) {
    const diameter = radius * 2;
    const ratio = Math.max(diameter / image.naturalWidth, diameter / image.naturalHeight);
    const drawWidth = image.naturalWidth * ratio;
    const drawHeight = image.naturalHeight * ratio;
    context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  }

  // Originkit Spiral Images reference: Archimedean spiral with arc-length
  // reparameterisation so equal phase steps remain visually equidistant.
  const spiralTurns = 2.25;
  const arcSamples = 1800;
  const arcLookupSize = 1024;
  const cumulativeArc = new Float32Array(arcSamples + 1);
  function unitSpiral(n) {
    const angle = n * spiralTurns * Math.PI * 2;
    const radius = 1 - n;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  }
  let previousArcPoint = unitSpiral(0);
  for (let index = 1; index <= arcSamples; index += 1) {
    const point = unitSpiral(index / arcSamples);
    cumulativeArc[index] = cumulativeArc[index - 1] + Math.hypot(point.x - previousArcPoint.x, point.y - previousArcPoint.y);
    previousArcPoint = point;
  }
  const totalArc = cumulativeArc[arcSamples] || 1;
  const nForArc = new Float32Array(arcLookupSize + 1);
  let arcIndex = 0;
  for (let sample = 0; sample <= arcLookupSize; sample += 1) {
    const target = sample / arcLookupSize * totalArc;
    while (arcIndex < arcSamples && cumulativeArc[arcIndex + 1] < target) arcIndex += 1;
    const segment = cumulativeArc[arcIndex + 1] - cumulativeArc[arcIndex];
    const fraction = segment > 0 ? (target - cumulativeArc[arcIndex]) / segment : 0;
    nForArc[sample] = (arcIndex + fraction) / arcSamples;
  }
  function arcToN(value) {
    const position = Math.max(0, Math.min(arcLookupSize, value * arcLookupSize));
    const index = Math.floor(position);
    const start = nForArc[index];
    const end = nForArc[Math.min(index + 1, arcLookupSize)];
    return start + (end - start) * (position - index);
  }

  function renderOrb(orb, time) {
    const t = (orb.phase + progress) % 1;
    const spiralN = arcToN(t);
    const base = Math.min(width, height);
    const ringRadius = base * .47;
    const tilt = 55 * Math.PI / 180;
    const roll = Math.PI * 1.14;
    const cameraDistance = ringRadius * 3.1;

    function project(pathN) {
      const angle = pathN * spiralTurns * Math.PI * 2;
      const pathRadius = ringRadius * (1 - pathN);
      const circleX = Math.cos(angle) * pathRadius * Math.cos(tilt);
      const circleY = Math.sin(angle) * pathRadius;
      const z = Math.cos(angle) * pathRadius * Math.sin(tilt);
      const scale = cameraDistance / (cameraDistance - z);
      const projectedX = circleX * scale;
      const projectedY = circleY * scale;
      return {
        x: projectedX * Math.cos(roll) - projectedY * Math.sin(roll),
        y: projectedX * Math.sin(roll) + projectedY * Math.cos(roll),
        scale
      };
    }

    const projected = project(spiralN);
    const nearScale = cameraDistance / (cameraDistance - ringRadius * Math.sin(tilt));
    const farScale = cameraDistance / (cameraDistance + ringRadius * Math.sin(tilt));
    const near = Math.max(0, Math.min(1, (projected.scale - farScale) / (nearScale - farScale)));
    const focusLinear = Math.max(0, Math.min(1, (near - .58) / .42));
    const focus = focusLinear * focusLinear * (3 - 2 * focusLinear);
    const depth = .08 + near * .92;
    const parallaxX = (pointer.x - .5) * (12 + depth * 54);
    const parallaxY = (pointer.y - .5) * (8 + depth * 36);
    const centerX = width * .4 + parallaxX;
    const centerY = height * .51 + parallaxY;
    const x = centerX + projected.x;
    const y = centerY + projected.y;
    const phaseStep = 1 / orbCount;
    const previousProjected = project(arcToN(Math.max(0, t - phaseStep)));
    const nextProjected = project(arcToN(Math.min(1, t + phaseStep)));
    const previousSpacing = Math.hypot(projected.x - previousProjected.x, projected.y - previousProjected.y);
    const nextSpacing = Math.hypot(projected.x - nextProjected.x, projected.y - nextProjected.y);
    const localSpacing = Math.max(36, Math.min(
      t < phaseStep ? nextSpacing : previousSpacing,
      t > 1 - phaseStep ? previousSpacing : nextSpacing
    ));
    const centerAttenuation = .18 + Math.pow(1 - spiralN, .8) * .82;
    const perspectiveSize = Math.pow(projected.scale, 2.05);
    const desiredRadius = base * .05 * perspectiveSize * centerAttenuation;
    const safeRadius = localSpacing * .4;
    const baseRadius = Math.min(desiredRadius, safeRadius);
    const hovered = pointer.inside && Math.hypot(pointer.targetX * width - x, pointer.targetY * height - y) < baseRadius * 1.12;
    orb.hover += ((hovered ? 1 : 0) - orb.hover) * .11;
    const radius = Math.min(baseRadius * (1 + orb.hover * .05), localSpacing * .43);
    if (![x, y, radius].every(Number.isFinite) || radius <= 0) return;
    orb.x = x;
    orb.y = y;
    orb.radius = radius;
    orb.depth = depth;

    if (x + radius < -20 || x - radius > width + 20 || y + radius < -20 || y - radius > height + 20) return;
    const image = images[orb.index % images.length];
    const fadeIn = Math.min(1, t / .045);
    const fadeOut = Math.min(1, (1 - t) / .14);
    const pathOpacity = Math.max(0, Math.min(fadeIn, fadeOut));
    const depthOpacity = .42 + Math.pow(depth, 1.08) * .52;
    const opacity = (depthOpacity + (1 - depthOpacity) * focus) * pathOpacity;

    if (focus > .015) {
      context.save();
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = opacity * .26 * focus;
      const glow = context.createRadialGradient(x, y, radius * .25, x, y, radius * 1.7);
      glow.addColorStop(0, 'rgba(255,255,255,.22)');
      glow.addColorStop(.5, 'rgba(255,255,255,.08)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius * 1.7, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    context.save();
    context.translate(x, y);
    context.globalAlpha = opacity;
    const depthBlur = 1.2 + Math.pow(1 - depth, 1.12) * 14;
    const blur = Math.max(0, depthBlur * Math.pow(1 - focus, 1.7) - orb.hover * 1.4);
    const saturation = .72 + depth * .26 + focus * .14 + orb.hover * .08;
    const brightness = .84 + depth * .16 + focus * .12;
    context.filter = `blur(${blur}px) saturate(${saturation}) brightness(${brightness}) contrast(1.04)`;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.clip();
    if (image.complete && image.naturalWidth) coverImage(image, radius);
    else {
      const fallback = context.createLinearGradient(-radius, -radius, radius, radius);
      fallback.addColorStop(0, '#d9dde0');
      fallback.addColorStop(.52, '#8d949a');
      fallback.addColorStop(1, '#34393d');
      context.fillStyle = fallback;
      context.fillRect(-radius, -radius, radius * 2, radius * 2);
    }
    context.filter = 'none';
    const shade = context.createRadialGradient(-radius * .34, -radius * .38, radius * .05, 0, 0, radius);
    shade.addColorStop(0, 'rgba(255,255,255,.38)');
    shade.addColorStop(.46, 'rgba(255,255,255,0)');
    shade.addColorStop(.82, 'rgba(3,8,7,.03)');
    shade.addColorStop(1, 'rgba(3,8,7,.28)');
    context.fillStyle = shade;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();

    context.save();
    context.translate(x, y);
    context.globalAlpha = opacity * (.42 + orb.hover * .45);
    context.lineWidth = Math.max(1, radius * .018);
    context.strokeStyle = 'rgba(255,255,255,.52)';
    context.beginPath();
    context.arc(0, 0, radius - 1, 0, Math.PI * 2);
    context.stroke();
    context.globalCompositeOperation = 'screen';
    context.shadowBlur = radius * .1;
    context.shadowColor = 'rgba(255,255,255,.24)';
    context.strokeStyle = 'rgba(255,255,255,.2)';
    context.beginPath();
    context.arc(0, 0, radius - 2, Math.PI * .58, Math.PI * 1.42);
    context.stroke();
    context.restore();
  }

  function draw(now) {
    if (!Number.isFinite(now)) now = performance.now();
    const delta = Math.min(.05, (now - previousTime) / 1000);
    previousTime = now;
    if (!reducedMotion) progress = (progress + delta * .014) % 1;
    if (!Number.isFinite(progress)) progress = 0;
    pointer.x += (pointer.targetX - pointer.x) * .045;
    pointer.y += (pointer.targetY - pointer.y) * .045;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    [...orbs].sort((a, b) => a.depth - b.depth).forEach((orb) => renderOrb(orb, now));
    animationFrame = requestAnimationFrame(draw);
  }

  canvas.addEventListener('pointermove', (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.targetX = (event.clientX - bounds.left) / bounds.width;
    pointer.targetY = (event.clientY - bounds.top) / bounds.height;
    pointer.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.targetX = .5;
    pointer.targetY = .5;
    pointer.inside = false;
  });
  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(media);
  resizeCanvas();
  animationFrame = requestAnimationFrame(draw);
  window.addEventListener('pagehide', () => cancelAnimationFrame(animationFrame), { once: true });
}

initOrbStream();

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .01, rootMargin: '0px 0px -20% 0px' });

document.querySelectorAll('.system-head:not(.operations-editorial-head):not(.benefit-editorial-head), .capability-shell').forEach((item) => {
  item.classList.add('reveal-item');
  revealObserver.observe(item);
});

document.querySelectorAll('.metric-card').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  });
});

function setLogin(open) {
  layer.classList.toggle('open', open);
  document.body.classList.toggle('login-open', open);
  trigger.setAttribute('aria-expanded', String(open));
}

function setLoginIdentity(identity = 'creator') {
  const nextIdentity = identity === 'mcn' ? 'mcn' : 'creator';
  document.querySelectorAll('.identity-switch button').forEach((button) => {
    const active = button.dataset.identity === nextIdentity;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelector('.login-panel')?.classList.toggle('mcn-active', nextIdentity === 'mcn');
}

function updateLoginModalScale() {
  if (!layer?.classList.contains('is-modal')) return;
  const horizontalScale = (window.innerWidth - 32) / 726;
  const verticalScale = (window.innerHeight - 32) / 501;
  layer.style.setProperty('--login-modal-scale', Math.min(1, horizontalScale, verticalScale).toFixed(4));
}

function setLoginModalBackgroundInert(inert) {
  if (inert) {
    loginModalInertState.clear();
    loginModalBackgrounds.forEach((element) => {
      loginModalInertState.set(element, element.inert);
      element.inert = true;
    });
    return;
  }
  loginModalBackgrounds.forEach((element) => {
    if (loginModalInertState.has(element)) element.inert = loginModalInertState.get(element);
  });
  loginModalInertState.clear();
}

function finishLoginModalClose() {
  if (!layer || loginModalState !== 'closing') return;
  loginLayerAnchor.parentNode?.insertBefore(layer, loginLayerAnchor.nextSibling);
  layer.classList.remove('is-modal');
  layer.classList.toggle('open', loginLayerWasOpen);
  layer.removeAttribute('role');
  layer.removeAttribute('aria-modal');
  layer.removeAttribute('tabindex');
  layer.style.removeProperty('--login-modal-scale');
  loginModalBackdrop?.classList.remove('is-visible');
  if (loginModalBackdrop) loginModalBackdrop.hidden = true;
  document.body.classList.remove('login-modal-open');
  document.body.classList.toggle('login-open', loginLayerWasOpen);
  trigger?.setAttribute('aria-expanded', String(loginLayerWasOpen));
  setLoginModalBackgroundInert(false);
  lenis?.start?.();
  loginModalState = 'closed';
  const opener = loginModalOpener;
  loginModalOpener = null;
  opener?.focus?.({ preventScroll: true });
}

function closeLoginModal() {
  if (!layer || loginModalState === 'closed' || loginModalState === 'closing') return;
  loginModalState = 'closing';
  window.clearTimeout(loginModalCloseTimer);
  layer.classList.remove('open');
  loginModalBackdrop?.classList.remove('is-visible');
  document.body.classList.remove('login-open');
  trigger?.setAttribute('aria-expanded', 'false');
  loginModalCloseTimer = window.setTimeout(finishLoginModalClose, loginModalReducedMotion.matches ? 0 : 440);
}

function openLoginModal(opener) {
  if (!layer || !loginModalBackdrop || loginModalState !== 'closed') return;
  window.clearTimeout(loginModalCloseTimer);
  loginModalState = 'opening';
  loginModalOpener = opener;
  loginLayerWasOpen = layer.classList.contains('open');
  setLoginIdentity(opener?.dataset.loginIdentity);
  layer.classList.remove('open');
  document.body.append(layer);
  setLoginModalBackgroundInert(true);
  layer.classList.add('is-modal');
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('tabindex', '-1');
  loginModalBackdrop.hidden = false;
  updateLoginModalScale();
  lenis?.stop?.();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (loginModalState !== 'opening') return;
    document.body.classList.add('login-open', 'login-modal-open');
    loginModalBackdrop.classList.add('is-visible');
    layer.classList.add('open');
    trigger?.setAttribute('aria-expanded', 'true');
    loginModalState = 'open';
    loginModalClose?.focus({ preventScroll: true });
  }));
}

[trigger].forEach((button) => {
  button.addEventListener('click', () => setLogin(!layer.classList.contains('open')));
});
document.querySelectorAll('[data-login-open]').forEach((button) => {
  button.addEventListener('click', () => openLoginModal(button));
});
document.querySelectorAll('.footer-login:not([data-login-open])').forEach((button) => {
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => setLogin(true), 650);
  });
});
document.querySelectorAll('.identity-switch button').forEach((button) => {
  button.addEventListener('click', () => {
    setLoginIdentity(button.dataset.identity);
  });
});

loginModalBackdrop?.addEventListener('click', closeLoginModal);
loginModalClose?.addEventListener('click', closeLoginModal);
window.addEventListener('resize', updateLoginModalScale, { passive: true });
document.addEventListener('keydown', (event) => {
  if (loginModalState !== 'open') return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeLoginModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...layer.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.getClientRects().length > 0);
  if (!focusable.length) {
    event.preventDefault();
    layer.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

const editorialFooter = document.querySelector('.site-footer');
const editorialFooterContent = editorialFooter?.querySelector('.footer-content');
const editorialFooterReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function syncEditorialFooterMask() {
  if (!editorialFooter || !editorialFooterContent) return;

  const disabled = editorialFooterReducedMotion.matches || innerWidth <= 850;
  if (disabled) {
    editorialFooter.style.setProperty('--footer-mask-y', '0%');
    editorialFooter.classList.remove('footer-mask-active');
    return;
  }

  const rect = editorialFooter.getBoundingClientRect();
  const height = Math.max(1, rect.height);
  const revealProgress = Math.max(0, Math.min(1, (innerHeight - rect.top) / height));
  const offsetYPercent = -60 * (1 - revealProgress);

  editorialFooter.style.setProperty('--footer-mask-y', `${offsetYPercent.toFixed(4)}%`);
  editorialFooter.classList.toggle('footer-mask-active', revealProgress > 0 && revealProgress < 1);
}

if (editorialFooter) {
  const revealFooter = () => {
    editorialFooter.classList.add('footer-entered');
    window.setTimeout(() => editorialFooter.classList.add('footer-settled'), 1120);
  };
  if (editorialFooterReducedMotion.matches || !('IntersectionObserver' in window)) {
    revealFooter();
  } else {
    const footerObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= .12)) return;
      revealFooter();
      footerObserver.disconnect();
    }, { threshold: [.12], rootMargin: '0px 0px -8% 0px' });
    footerObserver.observe(editorialFooter);
  }
}

document.querySelectorAll('.method-tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.method-tabs button').forEach((item) => item.classList.toggle('active', item === button));
    const passwordMode = button.dataset.method === 'password';
    document.querySelector('.code-field input').placeholder = passwordMode ? '请输入密码' : '请输入验证码';
    document.querySelector('.code-field button').style.visibility = passwordMode ? 'hidden' : 'visible';
  });
});

document.querySelector('[data-view="phone"]').addEventListener('submit', (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('.submit-login');
  button.textContent = '登录成功 · 正在进入';
  setTimeout(() => button.textContent = '登录/注册', 1600);
});

function setOperation(index) {
  const board = document.querySelector('.operations-board');
  if (!board || Number(board.dataset.active || 0) === index && board.dataset.ready) return;
  board.dataset.active = index;
  board.dataset.ready = 'true';
  board.classList.remove('scene-changing');
  void board.offsetWidth;
  board.classList.add('scene-changing');
  document.querySelectorAll('.board-nav button').forEach((button) => button.classList.toggle('active', Number(button.dataset.operation) === index));
  document.querySelectorAll('.board-scene').forEach((scene) => scene.classList.toggle('active', Number(scene.dataset.scene) === index));
  document.querySelectorAll('.operation-story article').forEach((article) => article.classList.toggle('active', Number(article.dataset.operationStory) === index));
  window.animateOperationText?.(index);
}

document.querySelectorAll('.board-nav button').forEach((button) => {
  button.addEventListener('click', () => {
    const index = Number(button.dataset.operation);
    setOperation(index);
    document.querySelector(`[data-operation-story="${index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

const operationObserver = new IntersectionObserver((entries) => {
  const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visible) setOperation(Number(visible.target.dataset.operationStory));
}, { threshold: .05, rootMargin: '-42% 0px -42% 0px' });

document.querySelectorAll('.operation-story article').forEach((article) => operationObserver.observe(article));

const operationTabs = [...document.querySelectorAll('[data-ops-tab]')];
const operationPanels = [...document.querySelectorAll('[data-ops-panel]')];
document.querySelectorAll('.operation-visual:not(.ops-figma-feature-list)').forEach((visual) => visual.setAttribute('aria-hidden', 'true'));
operationTabs.forEach((tab) => { tab.tabIndex = tab.classList.contains('active') ? 0 : -1; });

const centerOperationTab = (tab) => {
  if (innerWidth > 850) return;
  const rail = tab.closest('.operations-single-tab');
  if (!rail) return;
  const left = tab.offsetLeft - ((rail.clientWidth - tab.offsetWidth) / 2);
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  rail.scrollTo({ left: Math.max(0, left), behavior });
};

const selectOperationTab = (tab, { focus = false } = {}) => {
  const target = tab.dataset.opsTab;
  operationTabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  operationPanels.forEach((panel) => {
    const active = panel.dataset.opsPanel === target;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  if (focus) tab.focus({ preventScroll: true });
  centerOperationTab(tab);
};

const initialOperationTab = operationTabs.find((tab) => tab.classList.contains('active')) || operationTabs[0];
if (initialOperationTab) selectOperationTab(initialOperationTab);
document.body.classList.add('operations-tabs-ready');
document.body.classList.remove('operations-motion-ready');

operationTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectOperationTab(tab));
  tab.addEventListener('keydown', (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    let targetIndex = index;
    if (event.key === 'ArrowLeft') targetIndex = (index - 1 + operationTabs.length) % operationTabs.length;
    if (event.key === 'ArrowRight') targetIndex = (index + 1) % operationTabs.length;
    if (event.key === 'Home') targetIndex = 0;
    if (event.key === 'End') targetIndex = operationTabs.length - 1;
    selectOperationTab(operationTabs[targetIndex], { focus: true });
  });
});

// Figma chapter entrance: this controller owns only the finite reveal classes.
// Tab/panel state remains exclusively owned by selectOperationTab().
const operationsEntranceSection = document.querySelector('#creator-operations');
if (operationsEntranceSection) {
  const operationsEntranceReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let operationsEntranceObserver = null;
  let operationsEntranceCompleteTimer = 0;
  let operationsEntranceSeen = operationsEntranceSection.classList.contains('operations-entered');
  const completeOperationsEntrance = () => {
    operationsEntranceSection.classList.add('operations-entry-complete');
  };
  const revealOperationsEntrance = ({ immediate = false } = {}) => {
    if (operationsEntranceSeen) return;
    operationsEntranceSeen = true;
    operationsEntranceObserver?.disconnect();
    operationsEntranceSection.classList.add('operations-entered');
    if (immediate) {
      completeOperationsEntrance();
      return;
    }
    window.clearTimeout(operationsEntranceCompleteTimer);
    operationsEntranceCompleteTimer = window.setTimeout(completeOperationsEntrance, 1380);
  };
  const observeOperationsEntrance = () => {
    if (operationsEntranceSeen || operationsEntranceReduced.matches) {
      revealOperationsEntrance({ immediate: true });
      return;
    }
    document.body.classList.add('operations-entry-ready');
    const operationsEntranceTarget = operationsEntranceSection.querySelector('.operations-editorial-head') || operationsEntranceSection;
    const rect = operationsEntranceTarget.getBoundingClientRect();
    if (rect.bottom <= 0) {
      revealOperationsEntrance({ immediate: true });
      return;
    }
    if (rect.top <= window.innerHeight * .58 && rect.bottom >= 0) {
      requestAnimationFrame(() => revealOperationsEntrance());
      return;
    }
    if (!('IntersectionObserver' in window)) {
      revealOperationsEntrance({ immediate: true });
      return;
    }
    operationsEntranceObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= .35)) {
        revealOperationsEntrance();
      }
    }, { threshold: [0, .35], rootMargin: '0px 0px -38% 0px' });
    operationsEntranceObserver.observe(operationsEntranceTarget);
  };
  const resumeOperationsEntrance = () => {
    if (!operationsEntranceSeen) observeOperationsEntrance();
    else completeOperationsEntrance();
  };
  window.addEventListener('pageshow', resumeOperationsEntrance);
  window.addEventListener('pagehide', (event) => {
    operationsEntranceObserver?.disconnect();
    window.clearTimeout(operationsEntranceCompleteTimer);
    if (operationsEntranceSeen) completeOperationsEntrance();
    if (!event.persisted) window.removeEventListener('pageshow', resumeOperationsEntrance);
  });
  observeOperationsEntrance();
}

// Right-column copy follows the vertical story rail. Historic CSS owners
// deliberately disable article-level transitions to protect the measured
// scroll rail, so the three copy children own their exit/enter choreography.
// Down-scroll moves old copy up and brings new copy from below; up-scroll
// reverses both directions. Horizontal displacement is intentionally absent.
const aiStoryCopyArticles = [...document.querySelectorAll('.story-copy article[data-story]')];
const aiStoryCopyReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const aiStoryStickyQuery = matchMedia('(min-width: 851px) and (prefers-reduced-motion: no-preference)');
let aiStoryCopyAnimations = [];
let aiStoryCopyMotionToken = 0;
const AI_STORY_COPY_TRAVEL_PX = 100;
const AI_STORY_COPY_EXIT_MS = 600;
const AI_STORY_COPY_ENTER_MS = 780;
const AI_STORY_COPY_ENTER_DELAY_MS = 60;
const AI_STORY_COPY_STAGGER_MS = 10;

const getAiStoryCopyTargets = (article) => article
  ? [article.querySelector(':scope > span'), article.querySelector(':scope > h3'), article.querySelector(':scope > p')].filter(Boolean)
  : [];

const setAiStoryCopyFrame = (target, frame) => {
  target.style.opacity = String(frame.opacity);
  target.style.transform = frame.transform;
  target.style.filter = frame.filter;
  target.style.visibility = frame.visibility;
  target.style.willChange = 'auto';
};

const visibleAiStoryCopyFrame = {
  opacity: 1,
  transform: 'translate3d(0,0,0)',
  filter: 'blur(0px)',
  visibility: 'visible'
};
const hiddenAiStoryCopyFrame = (travelY = AI_STORY_COPY_TRAVEL_PX) => ({
  opacity: 0,
  transform: `translate3d(0,${travelY}px,0)`,
  filter: 'blur(8px)',
  visibility: 'hidden'
});

const freezeAiStoryCopyAnimations = () => {
  if (!aiStoryCopyAnimations.length) return;
  const animatedTargets = [...new Set(aiStoryCopyAnimations.map(({ target }) => target))];
  const snapshots = animatedTargets.map((target) => {
    const style = getComputedStyle(target);
    return {
      target,
      opacity: style.opacity,
      transform: style.transform === 'none' ? 'translate3d(0,0,0)' : style.transform,
      filter: style.filter === 'none' ? 'blur(0px)' : style.filter,
      visibility: style.visibility
    };
  });
  aiStoryCopyAnimations.forEach(({ animation }) => animation.cancel());
  aiStoryCopyAnimations = [];
  snapshots.forEach(({ target, ...frame }) => setAiStoryCopyFrame(target, frame));
};

const trackAiStoryCopyAnimation = (target, animation, finalFrame, token) => {
  aiStoryCopyAnimations.push({ target, animation });
  animation.finished.then(() => {
    if (token !== aiStoryCopyMotionToken) return;
    setAiStoryCopyFrame(target, finalFrame);
    animation.cancel();
    aiStoryCopyAnimations = aiStoryCopyAnimations.filter((entry) => entry.animation !== animation);
  }).catch(() => {});
};

const animateAiStoryCopySwap = (previousIndex, nextIndex) => {
  const previousArticle = aiStoryCopyArticles.find((article) => Number(article.dataset.story) === previousIndex);
  const nextArticle = aiStoryCopyArticles.find((article) => Number(article.dataset.story) === nextIndex);
  if (!nextArticle || previousArticle === nextArticle) return;

  const token = ++aiStoryCopyMotionToken;
  freezeAiStoryCopyAnimations();
  const previousTargets = getAiStoryCopyTargets(previousArticle);
  const nextTargets = getAiStoryCopyTargets(nextArticle);
  const scrollDirection = nextIndex > previousIndex ? 1 : -1;
  const exitFrame = hiddenAiStoryCopyFrame(scrollDirection * -AI_STORY_COPY_TRAVEL_PX);
  const enterFrame = hiddenAiStoryCopyFrame(scrollDirection * AI_STORY_COPY_TRAVEL_PX);

  aiStoryCopyArticles.forEach((article) => {
    if (article !== previousArticle && article !== nextArticle) {
      const articleIndex = Number(article.dataset.story);
      const restingDirection = articleIndex > nextIndex ? 1 : -1;
      const restingFrame = hiddenAiStoryCopyFrame(restingDirection * AI_STORY_COPY_TRAVEL_PX);
      getAiStoryCopyTargets(article).forEach((target) => setAiStoryCopyFrame(target, restingFrame));
    }
  });

  if (aiStoryCopyReducedMotion.matches) {
    previousTargets.forEach((target) => setAiStoryCopyFrame(target, exitFrame));
    nextTargets.forEach((target) => setAiStoryCopyFrame(target, visibleAiStoryCopyFrame));
    return;
  }

  previousTargets.forEach((target, order) => {
    const style = getComputedStyle(target);
    target.style.visibility = 'visible';
    target.style.willChange = 'opacity,transform,filter';
    const animation = target.animate([
      {
        opacity: style.opacity,
        transform: style.transform === 'none' ? 'translate3d(0,0,0)' : style.transform,
        filter: style.filter === 'none' ? 'blur(0px)' : style.filter
      },
      { opacity: 0, transform: exitFrame.transform, filter: exitFrame.filter }
    ], {
      duration: AI_STORY_COPY_EXIT_MS,
      delay: order * AI_STORY_COPY_STAGGER_MS,
      easing: 'cubic-bezier(.4,0,.2,1)',
      fill: 'forwards'
    });
    trackAiStoryCopyAnimation(target, animation, exitFrame, token);
  });

  nextTargets.forEach((target, order) => {
    const style = getComputedStyle(target);
    target.style.visibility = 'visible';
    target.style.willChange = 'opacity,transform,filter';
    const animation = target.animate([
      {
        opacity: style.opacity,
        transform: style.transform === 'none' ? enterFrame.transform : style.transform,
        filter: style.filter === 'none' ? enterFrame.filter : style.filter
      },
      { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0px)' }
    ], {
      duration: AI_STORY_COPY_ENTER_MS,
      delay: AI_STORY_COPY_ENTER_DELAY_MS + order * AI_STORY_COPY_STAGGER_MS,
      easing: 'cubic-bezier(.22,.7,.25,1)',
      fill: 'forwards'
    });
    trackAiStoryCopyAnimation(target, animation, visibleAiStoryCopyFrame, token);
  });
};

if (aiStoryCopyArticles.length) {
  const initialIndex = Number(document.querySelector('.ai-system')?.dataset.active || 0);
  aiStoryCopyArticles.forEach((article) => {
    const articleIndex = Number(article.dataset.story);
    const frame = articleIndex === initialIndex
      ? visibleAiStoryCopyFrame
      : hiddenAiStoryCopyFrame((articleIndex > initialIndex ? 1 : -1) * AI_STORY_COPY_TRAVEL_PX);
    getAiStoryCopyTargets(article).forEach((target) => setAiStoryCopyFrame(target, frame));
  });
}

function setCapability(index) {
  const aiSystem = document.querySelector('.ai-system');
  const panels = [...document.querySelectorAll('.capability-cube [data-panel]')];
  const previousIndex = Number(aiSystem.dataset.active || 0);
  const changed = previousIndex !== index;
  aiSystem.dataset.active = index;
  if (document.body.classList.contains('grid-optimized-version') && !aiSystem.classList.contains('ai-scroll-linked')) {
    window.setCapabilityTexture?.(index);
  }
  document.querySelectorAll('.capability-nav button').forEach((button) => button.classList.toggle('active', Number(button.dataset.capability) === index));
  panels.forEach((panel) => panel.classList.toggle('active', Number(panel.dataset.panel) === index));
  document.querySelectorAll('.story-copy article').forEach((article) => article.classList.toggle('active', Number(article.dataset.story) === index));
  document.querySelector('.ambient-wash').style.transform = `translate(${index % 2 ? -5 : 3}%, ${index > 1 ? -4 : 3}%) scale(${1 + index * .025})`;
  if (changed && !aiSystem.classList.contains('ai-scroll-linked')) animateAiStoryCopySwap(previousIndex, index);
  if (!aiSystem.classList.contains('ai-scroll-linked')) window.updateCapabilityPrompt?.(index);
  // The AI chapter now uses one CSS entrance curve for its left label, cube
  // and right copy. Keep state changes declarative to avoid stacked WAAPI /
  // GSAP animations flickering on scroll.
}

// The story rail follows native document scrolling. Desktop navigation targets
// each cached sticky stop; mobile keeps the centred flow behavior. Wheel and
// trackpad input are never intercepted or locked.
const scrollStoryStep = (index) => {
  const story = document.querySelector(`[data-story="${index}"]`);
  if (!story) return;
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const storyCopy = story.closest('.story-copy');
  const aiSystem = story.closest('.ai-system');
  if (aiStoryStickyQuery.matches && storyCopy && aiSystem) {
    const lagY = Number.parseFloat(storyCopy.style.getPropertyValue('--ai-copy-scroll-lag-y')) || 0;
    const stickyTop = Number.parseFloat(getComputedStyle(aiSystem).getPropertyValue('--ai-stage-top')) || 72;
    const railTop = scrollY + storyCopy.getBoundingClientRect().top - lagY;
    const measuredOffset = Number.parseFloat(story.dataset.storyStopOffset);
    const storyOffset = Number.isFinite(measuredOffset) ? measuredOffset : story.offsetTop;
    const targetY = Math.max(0, railTop + storyOffset - stickyTop);
    if (lenis?.scrollTo) lenis.scrollTo(targetY, { duration: 1.05 });
    else window.scrollTo({ top: targetY, behavior });
    return;
  }
  story.scrollIntoView({ behavior, block: 'center' });
};

document.querySelectorAll('.capability-nav button').forEach((button) => {
  button.addEventListener('click', () => {
    const index = Number(button.dataset.capability);
    if (!aiStoryStickyQuery.matches) setCapability(index);
    scrollStoryStep(index);
  });
});

// Scroll selects an integer destination; one interruptible ease-out timeline
// drives all AI visuals and settles after input stops. Native scroll stays free.
function initAiStoryScrollTimeline() {
  const scene = document.querySelector('.grid-optimized-version .ai-system');
  const rail = scene?.querySelector('.story-copy');
  if (!rail) return;
  const articles = [...rail.querySelectorAll(':scope > article[data-story]')];
  const nav = [...scene.querySelectorAll('[data-capability]')];
  const display = scene.querySelector('.capability-display');
  let stops = [], frame = 0;
  let progress = 0, destination = 0, origin = 0, startedAt = 0, duration = 900;
  let initialized = false;
  const clamp = value => Math.max(0, Math.min(1, value));
  const easeOut = value => 1 - Math.pow(1 - value, 4);
  const render = (now) => {
    frame = 0;
    if (!aiStoryStickyQuery.matches || !stops.length) return;
    const railRect = rail.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(scene).getPropertyValue('--ai-stage-top')) || 72;
    const railTop = scrollY + railRect.top;
    const position = scrollY - railTop + top;
    let target = 0;
    // Each story retains a readable scroll interval. Crossing the final 28vh
    // selects the next story; the wheel is never held while animation finishes.
    for (let i = 1; i < stops.length; i++) {
      const lead = Math.min(innerHeight * .28, (stops[i] - stops[i-1]) * .3);
      if (position >= stops[i] - lead) target = i;
      else break;
    }
    if (!initialized) {
      progress = destination = origin = target;
      initialized = true;
    } else {
      progress = origin + (destination-origin) * easeOut(clamp((now-startedAt)/duration));
      if (target !== destination) {
        // Retarget from the current visible pose, with no queue or input lock.
        origin = progress;
        destination = target;
        startedAt = now;
        duration = Math.max(650, Math.min(1100, 850 + Math.abs(destination-origin)*70));
      }
      if (now-startedAt >= duration) progress = destination;
    }
    scene.dataset.scrollTarget = String(destination);
    const active = Math.round(progress);
    if (Number(scene.dataset.active) !== active) setCapability(active);
    scene.dataset.scrollProgress = progress.toFixed(4);
    articles.forEach((article, index) => {
      const distance = index - progress;
      const opacity = clamp(1 - Math.abs(distance));
      // The long article measures scroll distance, not the visual reading stage.
      // Follow the cube's centre, including its shared chapter release.
      const visualRect = scene.querySelector('.capability-cube-shell').getBoundingClientRect();
      const articleRect = article.getBoundingClientRect();
      const correction = visualRect.top + visualRect.height / 2
        - (articleRect.top + articleRect.height / 2);
      getAiStoryCopyTargets(article).forEach(target => {
        target.style.opacity = String(opacity);
        target.style.visibility = opacity > .001 ? 'visible' : 'hidden';
        target.style.transform = `translate3d(0,${correction + distance * 48}px,0)`;
        target.style.filter = `blur(${Math.min(1, Math.abs(distance)) * 3}px)`;
      });
      article.setAttribute('aria-hidden', String(index !== active));
    });
    nav.forEach((button,index) => {
      const distance = index - progress;
      button.style.setProperty('--tab-opacity', String(clamp(1-Math.abs(distance))));
      button.style.setProperty('--tab-y', `${distance*24}px`);
      button.tabIndex = index === active ? 0 : -1;
      button.setAttribute('aria-current', index === active ? 'step' : 'false');
    });
    // A fixed pose per story makes the exact same scroll position produce the
    // exact same cube orientation, with the same axis and angle for all five faces.
    display.style.setProperty('--cube-turn', `${-72*progress}deg`);
    display.style.setProperty('--cube-pose-x', '-5deg');
    display.style.setProperty('--cube-shadow-scale', '1');
    window.setCapabilityDepth?.(progress);
    window.renderCapabilityPromptProgress?.(progress);
    if (progress !== destination) frame = requestAnimationFrame(render);
  };
  const request = () => { if (!frame) frame=requestAnimationFrame(render); };
  const measure = () => {
    const linked = aiStoryStickyQuery.matches;
    scene.classList.toggle('ai-scroll-linked',linked);
    ++aiStoryCopyMotionToken;
    freezeAiStoryCopyAnimations();
    scene.classList.remove('ai-story-sticky-ready');
    stops=articles.map(article => {
      const offset=article.offsetTop;
      article.dataset.storyStopOffset=String(offset);
      return offset;
    });
    scene.classList.toggle('ai-story-sticky-ready',linked);
    if (!linked) {
      initialized = false;
      articles.forEach(article => {
        article.removeAttribute('aria-hidden');
        getAiStoryCopyTargets(article).forEach(target=>setAiStoryCopyFrame(target,visibleAiStoryCopyFrame));
      });
      nav.forEach(button=>{button.removeAttribute('tabindex');button.removeAttribute('aria-current');});
      window.updateCapabilityPrompt?.(Number(scene.dataset.active));
    }
    request();
  };
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('pageshow',measure);
  window.addEventListener('ai-prompt-ready',request);
  aiStoryStickyQuery.addEventListener('change',measure);
  document.fonts.ready.then(measure);
  measure();
  window.addEventListener('pagehide',event=>{
    if (event.persisted) return;
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll',request);
    window.removeEventListener('resize',measure);
    window.removeEventListener('pageshow',measure);
    window.removeEventListener('ai-prompt-ready',request);
    aiStoryStickyQuery.removeEventListener('change',measure);
  });
}

initAiStoryScrollTimeline();

const storyObserver = new IntersectionObserver((entries) => {
  if (aiStoryStickyQuery.matches) return;
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  const index = Number(visible.target.dataset.story);
  setCapability(index);
}, {
  threshold: .01,
  rootMargin: '-34% 0px -56% 0px'
});

document.querySelectorAll('.story-copy article').forEach((article) => storyObserver.observe(article));

const benefitItems = [...document.querySelectorAll('.benefit-accordion article')];
const benefitSection = document.querySelector('.benefits');
const benefitHoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const benefitReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const benefitImages = [...document.querySelectorAll('[data-benefit-image]')];
let benefitActiveIndex = -1;

function setBenefit(activeItem) {
  const nextIndex = benefitItems.indexOf(activeItem);
  if (nextIndex < 0) return;
  if (nextIndex === benefitActiveIndex) return;
  benefitActiveIndex = nextIndex;
  benefitItems.forEach((item, index) => {
    const open = item === activeItem;
    item.classList.toggle('open', open);
    const button = item.querySelector('button');
    const panel = item.querySelector(':scope > p');
    button?.setAttribute('aria-expanded', String(open));
    panel?.setAttribute('aria-hidden', String(!open));
    const icon = button?.querySelector('i');
    icon?.classList.toggle('active', open);
  });
  benefitImages.forEach((image, index) => image.classList.toggle('active', index === nextIndex));
  if (!benefitSection) return;
  benefitSection.dataset.active = String(nextIndex);
}

benefitItems.forEach((article) => {
  const button = article.querySelector('button');
  button?.addEventListener('focus', () => setBenefit(article));
  button?.addEventListener('click', () => setBenefit(article));
});

// A section can scroll underneath a stationary cursor. `mouseenter` would
// treat that as intent and replace the authored default state. Pointer movement
// proves intent while keeping rapid title-to-title switching immediate.
benefitSection?.addEventListener('pointermove', (event) => {
  if (!benefitHoverQuery.matches || event.pointerType === 'touch') return;
  const button = event.target.closest('.benefit-accordion button');
  if (!button) return;
  setBenefit(button.closest('article'));
});
setBenefit(benefitItems.find((item) => item.classList.contains('open')) || benefitItems[0]);

if (benefitSection) {
  const revealBenefits = () => benefitSection.classList.add('benefits-entered');
  if (benefitReducedMotion.matches || !('IntersectionObserver' in window)) {
    revealBenefits();
  } else {
    document.body.classList.add('benefits-entry-ready');
    const benefitEntranceObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      revealBenefits();
      observer.disconnect();
    }, { threshold:.08, rootMargin:'0px 0px -10% 0px' });
    benefitEntranceObserver.observe(benefitSection);
    window.addEventListener('pagehide', () => benefitEntranceObserver.disconnect(), { once:true });
  }
}

const operationsColumnTransition = document.querySelector('.operations-column-transition');
const operationsColumnPanels = operationsColumnTransition
  ? [...operationsColumnTransition.querySelectorAll('i')]
  : [];
const operationsColumnReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function clampOperationsColumnProgress(value) {
  return Math.max(0, Math.min(1, value));
}

function power2InOut(value) {
  const progress = clampOperationsColumnProgress(value);
  return progress < .5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function syncOperationsColumnTransition(operationsRect) {
  if (!operationsColumnTransition) return;

  const disabled = operationsColumnReducedMotion.matches || innerWidth <= 850 || !operationsRect;
  if (disabled) {
    operationsColumnTransition.classList.remove('is-active');
    operationsColumnTransition.removeAttribute('data-progress');
    operationsColumnPanels.forEach((panel) => panel.style.setProperty('--column-progress', '0'));
    return;
  }

  // The reference uses a 1.1-unit scrubbed timeline: .5 duration with .12
  // stagger across six curtains. We retain the four central panel timings
  // (virtual indices 1...4), omitting its narrow outer gutters.
  const globalProgress = clampOperationsColumnProgress(
    (innerHeight - operationsRect.top) / Math.max(1, innerHeight),
  );
  const timelineTime = globalProgress * 1.1;

  operationsColumnPanels.forEach((panel, index) => {
    const localProgress = clampOperationsColumnProgress(
      (timelineTime - .12 * (index + 1)) / .5,
    );
    panel.style.setProperty('--column-progress', power2InOut(localProgress).toFixed(5));
  });

  const active = globalProgress > 0 && globalProgress < 1;
  operationsColumnTransition.classList.toggle('is-active', active);
  if (active) operationsColumnTransition.dataset.progress = globalProgress.toFixed(5);
  else operationsColumnTransition.removeAttribute('data-progress');
}

function onScroll() {
  syncEditorialFooterMask();

  const isGridOptimized = document.body.classList.contains('grid-optimized-version');
  const operationsScene = isGridOptimized ? document.querySelector('.operations') : null;
  const operationsRect = operationsScene?.getBoundingClientRect();
  if (isGridOptimized) syncOperationsColumnTransition(operationsRect);

  if (isGridOptimized && hero) {
    const operationsStarted = Boolean(operationsRect && operationsRect.top <= 72);
    // The dark line-art and AI scenes retain the transparent header and white
    // logo. Switch both treatments only when the following light scene arrives.
    document.body.classList.toggle('content-topbar', operationsStarted);
    document.body.classList.toggle('line-logo-ready', operationsStarted);
  }

  document.querySelectorAll('.feature-card').forEach((card) => {
    const rect = card.getBoundingClientRect();
    const stackProgress = Math.max(0, Math.min(1, (110 - rect.top) / Math.max(1, rect.height)));
    card.style.setProperty('--stack-progress', stackProgress.toFixed(3));
  });

  if (document.body.classList.contains('grid-optimized-version')) {
    const releaseHeading = (sectionSelector, targetSelector, property) => {
      const section = document.querySelector(sectionSelector);
      const target = section?.querySelector(targetSelector);
      if (!section || !target) return;
      const rect = target.getBoundingClientRect();
      section.style.setProperty(property, `${Math.min(0, rect.top + rect.height / 2 - innerHeight / 2).toFixed(1)}px`);
    };
    const syncStickyRelease = (sectionSelector, targetSelector, items) => {
      const section = document.querySelector(sectionSelector);
      const target = section?.querySelector(targetSelector);
      if (!section || !target) return;
      const targetRect = target.getBoundingClientRect();
      const releaseDistance = Math.max(0, innerHeight / 2 - (targetRect.top + targetRect.height / 2));

      items.forEach(([selector, property]) => section.style.setProperty(property, '0px'));
      if (releaseDistance <= 0) return;
      items.forEach(([selector, property]) => {
        const element = section.querySelector(selector);
        if (!element) return;
        const stickyTop = Number.parseFloat(getComputedStyle(element).top) || 0;
        const naturalTop = element.getBoundingClientRect().top;
        const desiredTop = stickyTop - releaseDistance;
        section.style.setProperty(property, `${Math.min(0, desiredTop - naturalTop).toFixed(1)}px`);
      });
    };

    // All AI columns release with the full-height shared background stage.
    const aiScene = document.querySelector('.ai-system');
    const backgroundStage = document.querySelector('.shared-visual-stage');
    if (aiScene?.classList.contains('ai-scroll-linked') && backgroundStage) {
      const releaseY = Math.min(0, aiScene.getBoundingClientRect().bottom - innerHeight);
      // The background has a negative flow margin for the hero overlap; its
      // native sticky boundary therefore cannot define the chapter exit.
      const previousBackgroundY = parseFloat(backgroundStage.dataset.releaseY) || 0;
      const naturalBackgroundTop = backgroundStage.getBoundingClientRect().top - previousBackgroundY;
      const backgroundY = releaseY - naturalBackgroundTop;
      backgroundStage.style.translate = `0 ${backgroundY}px`;
      backgroundStage.dataset.releaseY = String(backgroundY);
      for (const [selector, property] of [
        ['.story-left', '--ai-heading-release-y'],
        ['.story-middle', '--ai-visual-release-y'],
      ]) {
        const column = aiScene.querySelector(selector);
        if (!column) continue;
        const previous = parseFloat(aiScene.style.getPropertyValue(property)) || 0;
        const naturalTop = column.getBoundingClientRect().top - previous;
        const top = parseFloat(getComputedStyle(column).top) || 72;
        // Entry must retain its positive rise offset. Only correct sticky
        // geometry once the chapter is actually leaving the viewport.
        aiScene.style.setProperty(property, `${releaseY < 0 ? Math.min(0, top + releaseY - naturalTop) : 0}px`);
      }
      aiScene.style.setProperty('--ai-nav-release-y', '0px');
    } else if (backgroundStage) {
      backgroundStage.style.removeProperty('translate');
      delete backgroundStage.dataset.releaseY;
      aiScene?.style.setProperty('--ai-heading-release-y', '0px');
      aiScene?.style.setProperty('--ai-visual-release-y', '0px');
    }

  }

}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
window.addEventListener('pageshow', onScroll);
operationsColumnReducedMotion.addEventListener?.('change', onScroll);
editorialFooterReducedMotion.addEventListener?.('change', onScroll);
onScroll();

function initMotionEditor() {
  const liquidEditorDefaults = {
    tuningVersion: 2,
    simResolution: 96, dyeResolution: 384, densityDissipation: .96,
    velocityDissipation: .93, pressure: .68, pressureIterations: 3,
    curl: 1.1, radius: .29, force: .65, intensity: 1.8, distortion: .51,
    blend: 5, colorR: .43, colorG: .77, colorB: 1, rainbow: false,
  };
  const panel = document.createElement('aside');
  panel.className = 'motion-editor';
  panel.innerHTML = `
    <button class="motion-editor-toggle" type="button" aria-expanded="false">动效微调 <span>⌘E</span></button>
    <div class="motion-editor-panel" aria-label="首屏流体微调控制器">
      <div class="motion-editor-heading"><strong>首屏流体</strong><button type="button" data-action="reset">重置</button></div>
      <p>所有调整实时预览并自动保存到当前浏览器。</p>
      <h4>颜色</h4>
      <label>红 <output data-output="colorR"></output><input data-key="colorR" type="range" min="0" max="1" step=".01"></label>
      <label>绿 <output data-output="colorG"></output><input data-key="colorG" type="range" min="0" max="1" step=".01"></label>
      <label>蓝 <output data-output="colorB"></output><input data-key="colorB" type="range" min="0" max="1" step=".01"></label>
      <label class="motion-editor-check">彩虹色 <input data-key="rainbow" type="checkbox"></label>
      <h4>画面效果</h4>
      <label>混合 <output data-output="blend"></output><input data-key="blend" type="range" min="0" max="100" step="1"></label>
      <label>扭曲 <output data-output="distortion"></output><input data-key="distortion" type="range" min="0" max="1.5" step=".01"></label>
      <label>可见强度 <output data-output="intensity"></output><input data-key="intensity" type="range" min="0" max="3" step=".05"></label>
      <h4>流动</h4>
      <label>流动范围 <output data-output="radius"></output><input data-key="radius" type="range" min=".03" max=".5" step=".01"></label>
      <label>推动力度 <output data-output="force"></output><input data-key="force" type="range" min=".1" max="2" step=".05"></label>
      <label>颜色停留 <output data-output="densityDissipation"></output><input data-key="densityDissipation" type="range" min=".8" max=".999" step=".001"></label>
      <label>速度停留 <output data-output="velocityDissipation"></output><input data-key="velocityDissipation" type="range" min=".8" max=".999" step=".001"></label>
      <label>压力 <output data-output="pressure"></output><input data-key="pressure" type="range" min=".1" max="1" step=".01"></label>
      <label>压力迭代 <output data-output="pressureIterations"></output><input data-key="pressureIterations" type="range" min="1" max="12" step="1"></label>
      <label>卷曲 <output data-output="curl"></output><input data-key="curl" type="range" min="0" max="3" step=".05"></label>
      <h4>清晰度</h4>
      <label>模拟分辨率 <output data-output="simResolution"></output><input data-key="simResolution" type="range" min="48" max="192" step="16"></label>
      <label>染色分辨率 <output data-output="dyeResolution"></output><input data-key="dyeResolution" type="range" min="128" max="768" step="64"></label>
    </div>`;
  document.body.append(panel);
  const toggle = panel.querySelector('.motion-editor-toggle');
  const render = () => {
    const liquidTuning = window.getLiquidTuning?.() || liquidEditorDefaults;
    panel.querySelectorAll('input[data-key]').forEach((input) => {
      const key = input.dataset.key;
      if (input.type === 'checkbox') {
        input.checked = Boolean(liquidTuning[key]);
        return;
      }
      input.value = liquidTuning[key];
      const suffix = key.startsWith('color') ? '' : key.endsWith('Resolution') ? '' : key === 'blend' ? '%' : '';
      panel.querySelector(`[data-output="${key}"]`).textContent = `${liquidTuning[key]}${suffix}`;
    });
  };
  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  panel.querySelectorAll('input[data-key]').forEach((input) => input.addEventListener('input', () => {
    const value = input.type === 'checkbox' ? input.checked : Number(input.value);
    window.setLiquidTuning?.({ [input.dataset.key]: value });
    render();
  }));
  panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
    window.resetLiquidTuning?.();
    render();
  });
  window.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      toggle.click();
    }
  });
  window.addEventListener('liquid-tuning-ready', render);
  window.addEventListener('liquid-tuning-change', render);
  render();
}
