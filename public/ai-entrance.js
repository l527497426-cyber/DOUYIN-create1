export function mountContentEntrance() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stages = [
    ['.hero-ring', 0], ['.hero-person', 80],
    ['.intro h1', 150], ['.intro p', 220], ['.invite-panel', 300],
    ['.showcase-section>h2', 390]
  ];
  const prepare = (element, delay) => {
    element.classList.add('ai-reveal');
    element.style.setProperty('--enter-delay', `${delay}ms`);
  };
  stages.forEach(([selector, delay]) => document.querySelectorAll(selector).forEach(element => {
    prepare(element, delay);
    element.classList.add('ai-reveal-visible');
  }));
  const cards = [...document.querySelectorAll('.capability-card,.showcase-card')];
  const observer = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
      entry.target.style.setProperty('--enter-delay', `${index * 75}ms`);
      entry.target.classList.add('ai-reveal-visible');
      observer.unobserve(entry.target);
    });
  }, {threshold: .08});
  cards.forEach((card, index) => {
    const visible = card.getBoundingClientRect().top < innerHeight - 12;
    prepare(card, visible ? 430 + index * 75 : 0);
    if (visible) card.classList.add('ai-reveal-visible');
    else observer.observe(card);
  });
}
