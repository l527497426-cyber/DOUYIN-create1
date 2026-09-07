import { gsap } from './vendor/gsap/index.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion) {
  const heroTitle = document.querySelector('.hero-copy h1');

  function prepareHeroLines(element) {
    if (!element || element.dataset.motionReady) return [];
    const lines = element.innerHTML
      .split(/<br\s*\/?\s*>/i)
      .map((line) => line.replace(/<[^>]*>/g, '').trim())
      .filter(Boolean);
    element.innerHTML = lines
      .map((line) => `<span class="motion-line-mask"><span class="motion-line">${line}</span></span>`)
      .join('');
    element.dataset.motionReady = 'true';
    return [...element.querySelectorAll('.motion-line')];
  }

  // animate-text: mask-reveal-up
  const heroLines = prepareHeroLines(heroTitle);
  if (heroLines.length) {
    gsap.fromTo(heroLines,
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, duration: .76, stagger: .09, ease: 'cubic-bezier(0.22,1,0.36,1)', delay: .16, clearProps: 'transform' }
    );
  }

  // animate-text: focus-blur-resolve
  const chapterTitles = document.querySelectorAll(
    '.operations > .system-head h2, .benefit-layout > .system-head h2'
  );
  const titleObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      gsap.fromTo(entry.target,
        { autoAlpha: 0, y: 14, scale: 1.01, filter: 'blur(14px)', transformOrigin: 'left center' },
        { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: .76, ease: 'cubic-bezier(0.22,1,0.36,1)', clearProps: 'transform,filter' }
      );
      observer.unobserve(entry.target);
    });
  }, { threshold: .38 });
  chapterTitles.forEach((title) => titleObserver.observe(title));

  function revealContentSet(elements) {
    const targets = elements.filter(Boolean);
    if (!targets.length) return;
    const enterDistance = Math.max(52, Math.min(innerHeight * .1, 72));
    gsap.killTweensOf(targets);
    gsap.set(targets, { autoAlpha: 0, y: enterDistance, filter: 'blur(7px)' });
    gsap.to(targets, {
      autoAlpha: 1,
      y: 0,
      duration: .58,
      ease: 'power3.out',
      stagger: 0,
      clearProps: 'transform,visibility'
    });
    gsap.to(targets, {
      filter: 'blur(0px)',
      duration: .2,
      ease: 'power2.out',
      stagger: 0,
      clearProps: 'filter'
    });
  }

  window.animateCapabilityText = (index) => {
    const story = document.querySelector(`.story-copy article[data-story="${index}"]`);
    revealContentSet([
      story?.querySelector('span'),
      story?.querySelector('h3'),
      story?.querySelector('p')
    ]);
  };

  window.animateOperationText = (index) => {
    const story = document.querySelector(`.operation-story article[data-operation-story="${index}"]`);
    revealContentSet([story?.querySelector('span'), story?.querySelector('h3'), story?.querySelector('p')]);
  };
}
