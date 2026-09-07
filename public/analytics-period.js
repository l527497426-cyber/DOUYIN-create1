// Deterministic preview fixtures; one source for chart points and summary totals.
export function periodSeries(base,days){
  return days===7?[...base]:[...Array.from({length:23},(_,i)=>Math.round(base[i%7]*(.72+i*.012))),...base];
}
export function periodDate(index,days){
  const d=new Date(Date.UTC(2023,0,10-days+1+index));
  return `${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
export function mountPeriodPicker({select,linkedMetrics,metrics,arrow}){
  const label=select.parentElement;
  const picker=document.createElement('div');picker.className='time-picker';
  picker.innerHTML=`<button class="time-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="period-options"><span>时间</span><strong>近7天</strong>${arrow()}</button><div id="period-options" class="time-options" role="listbox" aria-label="数据时间范围" hidden>${[7,30].map((days,i)=>`<button type="button" role="option" aria-selected="${i===0}" data-days="${days}"><span>近${days}天</span><small>${periodDate(0,days)} 至 01-10</small></button>`).join('')}</div>`;
  label.replaceWith(picker);select.hidden=true;picker.append(select);
  const trigger=picker.querySelector('.time-trigger'),popup=picker.querySelector('.time-options'),options=[...popup.querySelectorAll('button')];
  const close=(focus=false)=>{popup.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();};
  const open=()=>{popup.hidden=false;trigger.setAttribute('aria-expanded','true');options[select.selectedIndex].focus();};
  trigger.addEventListener('click',()=>popup.hidden?open():close());
  trigger.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open();}});
  const format=n=>n>=10000?`${Number((n/10000).toFixed(2))}万`:n.toLocaleString('zh-CN');
  const update=()=>{
    const days=select.selectedIndex===0?7:30;
    trigger.querySelector('strong').textContent=`近${days}天`;
    trigger.setAttribute('aria-label',`数据时间范围：近${days}天`);
    options.forEach((o,i)=>o.setAttribute('aria-selected',String(i===select.selectedIndex)));
    document.querySelector('.data-panel>.section-heading>small').textContent=`统计周期：2022/2023 · ${periodDate(0,days)}—01-10（每天10点更新）`.replace('2022/2023',days===7?'2023':'2022—2023');
    document.querySelectorAll('.metric').forEach((button,i)=>{
      const [name,original,delta]=metrics[i];
      let amount=original,change=Number(delta);
      if(days===30){
        const base=linkedMetrics[name]?.[1];
        const total7=base?base.reduce((a,b)=>a+b,0):Number(original.replace('¥','').replace('万',''))*(original.includes('万')?10000:1);
        const total30=base?periodSeries(base,30).reduce((a,b)=>a+b,0):Math.round(total7*3.84);
        amount=(name==='总收益'?'¥':'')+format(total30);
        change=Math.round(Number(delta)*total30/Math.max(1,total7));
      }
      button.querySelector('div>b').textContent=amount;
      button.querySelector('small').innerHTML=`较前${days}日 <em class="${change<0?'down':''}">${change>0?'+':''}${change}</em>`;
    });
  };
  options.forEach((o,i)=>o.addEventListener('click',()=>{if(select.selectedIndex!==i){select.selectedIndex=i;select.dispatchEvent(new Event('change',{bubbles:true}));}close(true);}));
  popup.addEventListener('keydown',e=>{const i=options.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();options[e.key==='Home'?0:e.key==='End'?1:(i+1)%2].focus();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!popup.hidden){e.preventDefault();close(true);}});
  document.addEventListener('pointerdown',e=>{if(!picker.contains(e.target))close();});
  document.addEventListener('focusin',e=>{if(!picker.contains(e.target))close();});
  window.addEventListener('scroll',()=>close(),{passive:true});
  select.addEventListener('change',update);update();
}
