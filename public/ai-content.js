// Keep the homepage shell mounted; only its content region changes.
export function mountAiContent() {
  const main = document.querySelector('main');
  const brand = document.createElement('a');
  brand.className = 'ai-shell-brand';
  brand.href = '/';
  brand.setAttribute('aria-label', '返回首页');
  brand.append(document.querySelector('.sidebar .brand-logo'));
  document.body.append(brand);
  brand.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    document.querySelector('.top-nav button[data-card="null"]').click();
  });
  const frames = new Map();
  const activate = (frame, active) => frame.contentWindow?.postMessage({type:'ai-page-active',active},location.origin);
  const sync = () => {
    const view = location.hash === '#ai-avatar' ? 'avatar' : location.hash === '#ai-workshop' ? 'workshop' : null;
    document.body.classList.toggle('show-ai-content', Boolean(view));
    frames.forEach((frame,key)=>{frame.hidden=key!==view;activate(frame,key===view);});
    document.querySelectorAll('.top-nav button').forEach(button => {
      const selected = button.dataset.card === (view === 'avatar' ? '0' : view === 'workshop' ? '3' : 'null');
      button.classList.toggle('selected', selected);
      if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    if (view) {
      if(!frames.has(view)) {
        const frame=document.createElement('iframe');
        frame.className='ai-content-frame';
        frame.title=view==='avatar'?'AI 分身':'AI 工坊';
        frame.src=`/ai-preview.html?view=${view}&embedded=1`;
        frame.addEventListener('load',()=>activate(frame,!frame.hidden));
        frames.set(view,frame);main.append(frame);
      }
      window.scrollTo({top: 0, behavior: 'instant'});
    }
  };
  window.addEventListener('hashchange', sync);
  window.addEventListener('popstate', sync);
  sync();
}
