const base = '/assets/online-ai/';
export const interests = [
  ['情感心理','答案之书','翻开答案之书，为当下困惑抽取一句随机启发。','interest-card-answers-home.68a1cec1.png','interest-card-answers-detail.d936a984.png'],
  ['语言','单词学习','学习雅思高频词汇，结合释义与熟练度反馈巩固记忆。','interest-card-vocabulary-home.e405de20.png','interest-card-vocabulary-detail.a53a4c49.jpg'],
  ['人文艺术','中国色鉴赏','探索中国传统色，每抹颜色背后都是一个诗意故事。','interest-card-chinese-color-home.dc3b665e.png','interest-card-chinese-color-detail.75f70d05.jpg'],
  ['情感心理','恋爱回复挑战','这是一场关于“误解”的实战，来练练？','interest-card-love-challenge-home.3ca06da7.png','interest-card-love-challenge-detail.14ee3e66.jpg'],
  ['宠物','猜猜小狗品种','看图猜狗狗品种，四选一作答，挑战你的萌宠知识。','interest-card-dog-home.303abed4.png','interest-card-dog-detail.efcbf9bb.jpg']
];
const features = [
  ['AI 聊天','1 对 1 专属陪聊，把陪伴留给每位粉丝'],
  ['评论区','一对多智能回评，让每条评论都被看见'],
  ['群聊','全天候在线运营，让粉丝群持续活跃']
];
// Paths from the three capability icons in the reference page.
const iconPaths = [
 'M3 11.5a9.5 9.5 0 1 1 6.086 8.868 9.85 9.85 0 0 0-.182-.07l-.013-.004a6.868 6.868 0 0 0-.161.016l-5.121.53a7.311 7.311 0 0 1-.658.051c-.186.001-.521-.01-.842-.205a1.5 1.5 0 0 1-.7-1.048c-.059-.372.06-.685.132-.856.074-.172.18-.37.283-.559l1.652-3.057c.071-.133.11-.204.135-.257l.004-.008A9.49 9.49 0 0 1 3 11.5ZM12.5 4a7.5 7.5 0 0 0-7.108 9.897l.024.073c.081.239.177.519.197.772a1.91 1.91 0 0 1-.056.652c-.062.245-.19.479-.292.668l-.03.054-1.455 2.695 4.744-.49.033-.004c.12-.013.267-.028.412-.023.132.005.243.02.372.05.142.033.296.092.425.142l.04.015A7.5 7.5 0 1 0 12.5 4Z',
 'M7.759 2h8.482c.805 0 1.47 0 2.01.044.563.046 1.08.145 1.565.392a4 4 0 0 1 1.748 1.748c.247.485.346 1.002.392 1.564C22 6.29 22 6.954 22 7.758v5.776c0 .67 0 1.223-.03 1.675-.033.47-.101.904-.274 1.322a4 4 0 0 1-2.165 2.165c-.418.173-.852.241-1.322.273-.452.031-1.005.031-1.675.031H16.5c-.537 0-.643.006-.73.027a1 1 0 0 0-.41.205c-.07.057-.138.139-.46.568l-1.477 1.97a5.926 5.926 0 0 1-.3.378 1.522 1.522 0 0 1-.58.417 1.5 1.5 0 0 1-1.087 0 1.522 1.522 0 0 1-.579-.417 5.679 5.679 0 0 1-.3-.379L9.1 19.8c-.322-.43-.39-.51-.46-.568a1 1 0 0 0-.41-.205c-.087-.02-.193-.027-.73-.027h-.034c-.67 0-1.223 0-1.676-.03-.469-.033-.903-.101-1.32-.274a4 4 0 0 1-2.166-2.165c-.173-.418-.241-.852-.273-1.321C2 14.757 2 14.204 2 13.534V7.76c0-.805 0-1.47.044-2.01.046-.563.145-1.08.392-1.565a4 4 0 0 1 1.748-1.748c.485-.247 1.002-.346 1.564-.392C6.29 2 6.954 2 7.758 2ZM5.91 4.038c-.438.035-.663.1-.819.18a2 2 0 0 0-.874.874c-.08.156-.145.38-.18.819C4 6.361 4 6.943 4 7.8v5.7c0 .713 0 1.197.026 1.573.025.368.07.559.126.692a2 2 0 0 0 1.083 1.083c.133.055.324.1.692.126.376.026.86.026 1.573.026h.084c.405 0 .762 0 1.105.08a3 3 0 0 1 1.233.617c.27.226.485.511.728.836l.05.067 1.3 1.733 1.3-1.733.05-.067c.243-.325.457-.61.728-.836a3 3 0 0 1 1.233-.617c.343-.08.7-.08 1.105-.08h.084c.713 0 1.197 0 1.573-.026.368-.025.559-.07.692-.126a2 2 0 0 0 1.083-1.083c.055-.133.1-.324.126-.692.026-.376.026-.86.026-1.573V7.8c0-.857 0-1.439-.038-1.889-.035-.438-.1-.663-.18-.819a2 2 0 0 0-.874-.874c-.156-.08-.38-.145-.819-.18C17.639 4 17.057 4 16.2 4H7.8c-.857 0-1.439 0-1.889.038ZM6 10.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm4.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm4.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z',
 'M9.5 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM4 7.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Zm11.104-4.477a1 1 0 0 1 1.341-.45 5.5 5.5 0 0 1 0 9.855 1 1 0 0 1-.89-1.791 3.5 3.5 0 0 0 0-6.274 1 1 0 0 1-.45-1.34ZM9.5 17c-2.539 0-4.912 1.325-6.714 3.618a1 1 0 0 1-1.572-1.236C3.305 16.72 6.217 15 9.5 15c3.283 0 6.195 1.72 8.286 4.382a1 1 0 0 1-1.572 1.236C14.413 18.325 12.039 17 9.5 17Zm7.589-.646a1 1 0 0 1 1.323-.499c1.678.76 3.162 1.984 4.374 3.527a1 1 0 0 1-1.572 1.236c-1.043-1.327-2.281-2.332-3.626-2.94a1 1 0 0 1-.499-1.324Z'
];
const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.293 5.293a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 0 1-1.414-1.414L13.586 12 8.293 6.707a1 1 0 0 1 0-1.414Z"/></svg>';
export function showcaseMarkup(avatar) {
  if (avatar) return `<section class="capability-section" aria-label="AI 分身能力">${features.map((f,i)=>`<article class="capability-card"><div class="capability-heading"><span class="capability-icon"><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="${iconPaths[i]}"/></svg></span><strong>${f[0]}</strong></div><p>${f[1]}</p></article>`).join('')}</section>`;
  return `<section class="showcase-section" aria-labelledby="showcase-title"><h2 id="showcase-title">看看大家的兴趣卡</h2><div class="showcase-grid">${interests.map((c,i)=>`<button class="showcase-card" data-interest="${i}" aria-label="查看精选项目：${c[1]}" aria-expanded="false" aria-controls="qr-${i}"><span class="showcase-meta"><span class="showcase-category">${c[0]}</span><span class="showcase-title">${c[1]}${chevron}</span><span class="showcase-description">${c[2]}</span></span><span class="showcase-phone"><span class="showcase-phone-motion"><span class="showcase-screen"><img class="showcase-home" src="${base}${c[3]}" alt="" loading="lazy" draggable="false"><img class="showcase-detail" data-src="${base}${c[4]}" alt="" loading="lazy" draggable="false"><span class="showcase-qr" id="qr-${i}" aria-hidden="true"><span>使用抖音APP扫码预览</span><span class="qr-paper"><img src="${base}interest-qr-${i}.webp" alt="${c[1]}抖音扫码预览二维码" loading="lazy" draggable="false"></span></span></span><img class="showcase-hardware" src="${base}interest-card-glass-hardware.bbf4898b.png" alt="" loading="lazy" draggable="false"></span></span></button>`).join('')}</div></section>`;
}
export function mountShowcase() {
  const cards = [...document.querySelectorAll('.showcase-card')];
  cards.forEach(card=>{
    const loadDetail=()=>{
      const img=card.querySelector('.showcase-detail');
      if(img.dataset.src){img.addEventListener('load',()=>card.classList.add('detail-ready'),{once:true});img.src=img.dataset.src;delete img.dataset.src;}
    };
    card.addEventListener('pointerenter',loadDetail,{once:true});
    card.addEventListener('focus',loadDetail,{once:true});
    card.addEventListener('click',loadDetail,{once:true});
  });
  const setOpen = active => cards.forEach(card => {
    const open = card === active;
    card.classList.toggle('is-open', open);
    card.setAttribute('aria-expanded', String(open));
    card.querySelector('.showcase-qr').setAttribute('aria-hidden', String(!open));
  });
  cards.forEach(card => card.addEventListener('click', () => setOpen(card.classList.contains('is-open') ? null : card)));
  document.addEventListener('click', e => { if (!e.target.closest('.showcase-card')) setOpen(null); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(null); });
}
