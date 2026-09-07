// A single moving surface keeps the selected state continuous between tabs.
export function mountSegmentedTabs() {
  const row = document.querySelector('.analytics .tabs');
  const group = document.createElement('div');
  group.setAttribute('aria-label', '数据视图');
  const buttons = [...row.querySelectorAll(':scope > button')];
  row.prepend(group);
  group.append(...buttons);
  [group, ...document.querySelectorAll('.recommend-tabs')].forEach(list => {
    list.classList.add('segmented-tabs');
    list.setAttribute('role', 'tablist');
    const tabs = [...list.querySelectorAll('button')];
    const indicator = document.createElement('span');
    indicator.className = 'tab-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    list.prepend(indicator);
    const sync = () => {
      const active = tabs.find(tab => tab.classList.contains('active')) || tabs[0];
      tabs.forEach(tab => {
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(tab === active));
        tab.tabIndex = tab === active ? 0 : -1;
      });
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.transform = `translateX(${active.offsetLeft - 2}px)`;
    };
    list.addEventListener('click', sync);
    list.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus();
    });
    new ResizeObserver(sync).observe(list);
    sync();
    requestAnimationFrame(() => requestAnimationFrame(() => list.classList.add('is-ready')));
  });
}
