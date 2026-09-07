const assets=await (await fetch('/assets/manifest.json')).json();
const asset=(file,name)=>assets[file+'.txt:'+name];
const img=(file,name,cls='',alt='')=>`<img class="${cls}" src="${asset(file,name)}" alt="${alt}" decoding="async" draggable="false">`;
const arrow=()=>img('section-1','imgSemiIconsChevronRight','icon');
const more=()=>`<button class="more">更多 ${arrow()}</button>`;
const cards=[['AI分身','创造陪伴用户的另一个“你”','710:22508'],['随变','自由角色创作，专业 Agent 成片','710:22660'],['世界书','让世界和角色持续生长','710:22510'],['AI工坊','把好想法变成好玩法','710:22511'],['造世界','All-New AI Game Editor','710:22521']];
const pictures=[img('part-0','imgAi'),'<img class="suibian-updated" src="/assets/suibian-new@2x.png" alt="" decoding="async" draggable="false">','<img src="/assets/worldbook-approved@2x.webp" alt="" decoding="async" draggable="false">','<span class="phone">'+img('part-0','imgRectangle1','phone-content')+img('part-0','imgRectangle2','phone-content')+img('part-0','imgSpaceBlack')+'</span>','<img class="create-world-updated" src="/assets/create-world-new@3x.png" alt="" decoding="async" draggable="false">'];
const metrics=[['总播放量','1.9万','-347'],['新增粉丝数','740','+234'],['主页访问','68','+356'],['总收益','¥480','+121'],['作品点赞','5903','+12'],['作品评论','169','-47'],['作品收藏','1.1万','+190'],['作品分享','1.2万','-25']];
document.querySelector('#app').innerHTML=`
<aside class="sidebar"><div class="brand"><img class="brand-logo" src="/assets/douyin-creator-logo-official.png" width="144" height="23" alt="抖音创作者中心" decoding="async"></div><div class="publish"><p>分享你的精彩瞬间~</p><button type="button"><img class="publish-add" src="/assets/publish-add@2x.png" width="16" height="16" alt=""><span>作品发布</span>${img('section-1','imgSemiIconsChevronDown','icon publish-chevron')}</button></div><nav class="side-menu" aria-label="主导航"><button class="selected" aria-current="page"><img src="/assets/side-nav-0@2x.png" width="16" height="16" alt=""><span>首页</span></button> <button><img src="/assets/side-nav-1@2x.png" width="16" height="16" alt=""><span>内容管理</span></button> <button><img src="/assets/side-nav-2@2x.png" width="16" height="16" alt=""><span>直播管理</span></button> <button><img src="/assets/side-nav-3@2x.png" width="16" height="16" alt=""><span>数据中心</span></button> <button><img src="/assets/side-nav-4@2x.png" width="16" height="16" alt=""><span>收入变现</span></button> <button><img src="/assets/side-nav-5@2x.png" width="16" height="16" alt=""><span>创作服务</span></button></nav></aside>
<main><div class="bg" data-node-id="667:39489" aria-hidden="true"><img class="bg-composite" src="/assets/bg-667-39489@2x.png" alt="" draggable="false"></div>
<header><nav class="top-nav">${['首页','AI 分身','世界书','随变','AI 工坊'].map((s,i)=>`<button class="${i===0?'selected':''}" data-card="${[null,0,2,1,3][i]}">${img('part-2','imgNavIcon'+(i||''),'icon')}${s}</button>`).join('')}</nav><div class="account"><span class="account-points"><img src="/assets/account-points@2x.png" width="48" height="24" alt="积分 276"></span><img src="/assets/account-avatar@2x.png" class="mini-avatar" width="24" height="24" alt="用户头像"></div></header>
<section class="hero"><div class="profile enter">${img('node-667-39593','img','avatar')}<h1>创作者用户昵称 <span class="badge">${img('node-667-39593','imgIcColorPersonal','icon')}抖音音乐人</span></h1><p class="bio">抖音号：3473824292　 |　 这个人很懒，没有留下任何签名</p><p class="counts"><span>关注 <b>30</b></span><span>粉丝 <b>140.5 万</b></span><span>获赞 <b>242.23 万</b></span></p></div>
<div class="card-deck" aria-label="创作工具">${cards.map((c,i)=>`<div class="card-slot" style="--i:${i};--angle:${i%2?4:-4}deg" data-node-id="${c[2]}"><div class="card-float"><button class="creation-card" aria-label="${c[0]}：${c[1]}" aria-pressed="false"><span class="card-art art-${i}">${pictures[i]}</span><span class="card-copy"><strong>${c[0]}</strong><span>${c[1]}</span></span><span class="shine"></span></button></div><span class="card-tooltip" role="tooltip">${c[1]}</span></div>`).join('')}</div></section>
<div class="dashboard enter"><div class="primary-panel"><section class="data-panel"><div class="section-heading"><h2>数据中心 ${img('section-1','imgSemiIconsHelpCircle','icon')}</h2><small>更新时间：2023.01.10（每天10点更新）</small>${more()}</div><div class="data-content"><div class="latest"><button class="video-card"><span class="latest-badge">最新作品</span>${img('section-1','imgImg')}<span class="video-title">00:36<br>新的一年·兔·be·fine#张杰…</span><span class="video-blur" aria-hidden="true"><i></i><i></i><i></i></span><span class="video-stats">播放量 <b>3847万</b><br>点赞量 <b>235</b></span></button></div><div class="analytics"><div class="tabs"><button class="active">账号总览</button><button>近期作品</button><button>直播数据</button><label>时间 <select aria-label="数据时间范围"><option>近7天</option><option>近30天</option></select></label></div><div class="chart"><span class="legend">${img('section-1','imgIcon','dot')}播放量</span>${img('section-1','imgLine1','chart-line')}<div class="axis">${Array.from({length:7},(_,i)=>'<span>01-0'+(i+1)+'</span>').join('')}</div></div><div class="metrics">${metrics.map(m=>`<button class="metric"><span>${m[0]}</span><div><b>${m[1]}</b><small>较前7日 <em class="${m[2][0]==='-'?'down':''}">${m[2]}</em></small></div></button>`).join('')}</div></div></div></section><div id="lower-content"></div></div>
<aside class="right-rail"><section class="panel activities"><div class="section-heading"><h2>活动管理</h2>${more()}</div><div class="activity-date"><strong>7月活动总览</strong> <small>共2个进行中</small></div>${['快乐是小游戏给的','用营养守护足球梦','潮流收藏在抖音','心动观赛季'].map((s,i)=>`<button class="activity"><span class="bullet ${i===0?'red':''}"></span>${s}<small>${['12-01~12-08','11-18~12-20','11-02~01-02','10.26~12-26'][i]}</small></button>`).join('')}</section><section class="panel"><div class="section-heading"><h2>快捷导航</h2>${more()}</div><div class="quick-links">${['巨量引擎','剪映','抖店','巨量百应'].map((s,i)=>`<button>${img('section-2','imgImg'+(i||''))}<span>${s}</span></button>`).join('')}</div></section><section class="panel courses"><div class="section-heading"><h2>热门课程</h2>${more()}</div>${['剧情演绎规则课堂丨不良导向篇','如何开通视频赞赏','解说文案怎么写才吸引人','剧情演绎规则课堂丨不良导向篇','如何更专业地创作旅行类图文作品'].map((s,i)=>`<button class="course">${img('section-2','imgImg'+(4+i%4))}<span>${s}<small>播放量　${['3696.97','3276.39','2926.95','1501.07','1237.70'][i]}万</small></span></button>`).join('')}</section></aside></div></main><div class="toast" role="status"></div>`;
let toastTimer;const toast=t=>{const el=document.querySelector('.toast');el.textContent=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400)};
const slots=[...document.querySelectorAll('.card-slot')];
slots.forEach((slot,i)=>{const card=slot.querySelector('button');card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.setProperty('--rx',-y*7+'deg');card.style.setProperty('--ry',x*9+'deg');card.style.setProperty('--mx',(x+.5)*100+'%');card.style.setProperty('--my',(y+.5)*100+'%')});card.addEventListener('pointerleave',()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg')});card.addEventListener('click',()=>{const pin=!slot.classList.contains('pinned');slots.forEach(s=>{s.classList.remove('pinned');s.querySelector('button').setAttribute('aria-pressed','false')});slot.classList.toggle('pinned',pin);card.setAttribute('aria-pressed',String(pin))});card.addEventListener('keydown',e=>{if(e.key==='Escape'){slot.classList.remove('pinned');card.setAttribute('aria-pressed','false');card.blur()}if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();slots[(i+(e.key==='ArrowRight'?1:4))%5].querySelector('button').focus()}})});
document.querySelectorAll('.top-nav button').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.card);if(b.dataset.card!=='null')slots[i].querySelector('button').focus();else window.scrollTo({top:0,behavior:'smooth'})}));
document.querySelectorAll('.side-menu button,.more,.activity,.quick-links button,.course,.video-card').forEach(b=>b.addEventListener('click',()=>toast('当前为设计预览，业务功能待接入')));
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');toast('当前展示设计稿示例数据')}));

document.addEventListener('visibilitychange',()=>document.body.classList.toggle('paused',document.hidden));
const {mountTrendChart}=await import('/trend-chart.js');
const trend=mountTrendChart(document.querySelector('.chart'),document.querySelector('select'));
const linkedMetrics={
  '总播放量':['播放量',[2400,1600,2100,3900,3200,2200,3600],'次'],
  '新增粉丝数':['新增粉丝数',[85,76,110,152,95,102,120],'人'],
  '主页访问':['主页访问量',[5,12,8,15,9,6,13],'次'],
  '作品点赞':['作品点赞',[600,780,1020,870,733,980,920],'次'],
  '作品评论':['作品评论',[18,30,12,26,35,20,28],'次'],
  '作品分享':['作品分享',[1200,1800,1500,2100,1750,1950,1700],'次']
};
let activeMetric='总播放量',metricTimer;
const metricButtons=[...document.querySelectorAll('.metric')];
metricButtons.forEach(button=>{
  const key=button.querySelector('span').textContent;
  if(!linkedMetrics[key])return;
  button.classList.add('metric-linked');button.setAttribute('aria-pressed',String(key===activeMetric));
  button.classList.toggle('metric-active',key===activeMetric);
  const select=()=>{clearTimeout(metricTimer);if(key===activeMetric)return;activeMetric=key;
    metricButtons.forEach(b=>{const on=b===button;b.classList.toggle('metric-active',on);if(b.classList.contains('metric-linked'))b.setAttribute('aria-pressed',String(on));});
    trend.setMetric(...linkedMetrics[key]);
  };
  button.addEventListener('pointerenter',()=>{clearTimeout(metricTimer);metricTimer=setTimeout(select,100);});
  button.addEventListener('pointerleave',()=>clearTimeout(metricTimer));
  button.addEventListener('focus',select);button.addEventListener('click',select);
});
// Figma: outer dark stroke frame containing an inner white stroke frame.
const {mountLowerPanels}=await import('/lower-panels.js');
mountLowerPanels({arrow,toast});
document.querySelectorAll('.primary-panel,.right-rail>.panel').forEach(panel=>{
  const inner=document.createElement('div');
  inner.className='panel-inner';
  inner.append(...panel.childNodes);
  panel.append(inner);
});





const {mountPublishMenu}=await import('/publish-menu.js');
mountPublishMenu({arrow,toast});
const startPublishFlow=()=>import('/publish-flow.js').then(({mountPublishFlow})=>mountPublishFlow()).catch(()=>{});
if('requestIdleCallback' in window)requestIdleCallback(startPublishFlow,{timeout:1200});else setTimeout(startPublishFlow,400);

const {mountPeriodPicker}=await import('/analytics-period.js');
mountPeriodPicker({select:document.querySelector('select'),linkedMetrics,metrics,arrow});
