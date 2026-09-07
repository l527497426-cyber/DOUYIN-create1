export function mountLowerPanels({arrow,toast}){
  const image=(name,cls='')=>`<img class="${cls}" src="/assets/lower-${name}@2x.png" alt="" loading="lazy" decoding="async" draggable="false">`;
  document.querySelector('#lower-content').innerHTML=`
  <section class="management-section"><div class="section-heading"><h2>互动管理</h2></div>
    <article class="message-card"><div class="message-heading">${image('comment','message-icon')}作品评论 <em>+223</em><time>07–08 00:35</time></div><p>你知道私人FM为什么没有倒退键只有下一首吗，因为错</p><div class="message-bottom"><span><b>来源作品：</b>重庆通报1批次不合格食品，网络平…</span><button class="quick-reply">${image('reply')}快捷回复</button></div></article>
    <article class="message-card"><div class="message-heading">${image('mail','message-icon')}私信消息 <em>+23</em><time>07–21 00:35</time></div><p>“长的是深夜，短的是人生。”“在你成长的这些年里，…</p><div class="message-bottom"><span class="message-sender">${image('fan')}酸豆角的小毛牛</span><button class="quick-reply">${image('reply')}快捷回复</button></div></article>
  </section>
  <section class="management-section"><div class="section-heading"><h2>收入变现 <button type="button" class="income-visibility" aria-label="隐藏收入金额" aria-pressed="false" aria-controls="income-total">${image('eye','income-eye')}</button></h2><button class="more">查看更多 ${arrow()}</button></div>
    <div class="income-card"><div class="income-overview"><p class="income-period"><strong>近7日</strong><span class="income-date">07–18~07–24 ${arrow()}</span></p><div class="income-total" id="income-total"><b><span>¥ </span><span class="income-amount">3,759</span></b><small>较7天前 <em>+327</em></small></div></div>
    <div class="income-task"><div>${image('money','task-icon')}<strong>可参与任务</strong><b>3242个</b><button>去查看</button></div><p>山海短剧cps90%高分佣高转化短剧《修罗帅》</p></div>
    <div class="income-task task-owned"><div>${image('bell','task-icon')}<strong>我的任务</strong><b>42个</b><button>去查看</button></div><p>中国电信155G–星图投稿</p></div></div>
  </section>`;
  const titles=[
    '1月4日安徽铜陵，男子被飞来的轮胎击中倒地不起，身后的墙都被撞移位了',
    '杭州已检测出XBB毒株，传播力和免疫逃逸能力增加',
    '一顿吃一碗，一天吃三碗，过年回家10天应该够了吧#抖音动物图鉴',
    '《狂飙》的艺术总监竟然是张译，“封神”片段出自他手#狂飙 #张译',
    '以前前面没车就逆向行车，殊不知……#平安春运交警同行'];
  const rightTitles=[...titles.slice(0,3),'APP广告“乱跳转”，这个问题有解了！#APP #广告 #弹窗','历史的记忆，1980年，深圳罗湖口岸，一名全副武装头戴钢盔的战士和对面全副武装的四名香港…'];
  const heats=[['9048.38','8988.04','8956.78','8374.86','7228.24'],['5764.64','4183.86','4037.15','9870.86','3701.55']];
  const recommend=document.createElement('section');recommend.className='recommendations';
  recommend.innerHTML=`<h2>创作推荐</h2><div class="recommend-grid">${[titles,rightTitles].map((list,col)=>`<section class="recommend-column"><div class="recommend-tabs" role="tablist" aria-label="${col?'爆款推荐':'内容推荐'}">${(col?['今日爆款','低粉爆款']:['猜你喜欢','热点榜单']).map((t,i)=>`<button role="tab" aria-selected="${!i}" class="${i?'':'active'}">${t}</button>`).join('')}</div><div class="recommend-list">${list.map((title,i)=>`<button class="recommend-row">${image(`cover-${col}-${i}`,'recommend-cover')}<span><span class="recommend-title">${title}</span><small>热度 <b>${heats[col][i]}</b>万</small></span></button>`).join('')}</div><button class="recommend-more">查看全部 ${arrow()}</button></section>`).join('')}</div>`;
  document.querySelector('#lower-content').after(recommend);
  const visibility=document.querySelector('.income-visibility');
  const amount=document.querySelector('.income-amount');
  const change=document.querySelector('.income-total em');
  const amountText=amount.textContent,changeText=change.textContent;
  visibility.addEventListener('click',()=>{
    const hidden=visibility.getAttribute('aria-pressed')!=='true';
    visibility.setAttribute('aria-pressed',String(hidden));
    visibility.setAttribute('aria-label',hidden?'显示收入金额':'隐藏收入金额');
    document.querySelector('.income-total').classList.toggle('is-hidden',hidden);
    amount.textContent=hidden?'****':amountText;
    change.textContent=hidden?'***':changeText;
  });
  document.querySelectorAll('#lower-content button:not(.income-visibility),.recommend-row,.recommend-more').forEach(b=>b.addEventListener('click',()=>toast('当前为设计预览，业务功能待接入')));
  recommend.querySelectorAll('[role="tab"]').forEach(b=>b.addEventListener('click',()=>{
    b.parentElement.querySelectorAll('button').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-selected',String(t===b));});
    toast('当前展示设计稿示例内容');
  }));
}

