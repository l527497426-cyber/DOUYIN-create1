export function mountPublishMenu({arrow,toast}){
  const trigger=document.querySelector('.publish>button');
  const menu=document.createElement('div');
  menu.id='publish-menu';menu.className='publish-menu';menu.hidden=true;
  menu.setAttribute('role','menu');menu.setAttribute('aria-label','选择作品类型');
  const options=[['发布高清视频','支持常用格式，推荐 mp4'],['发布全景视频','推荐分辨率为 4K 及以上'],['发布图文','支持常用图片格式 png/jpg'],['发布文章','支持上传 8000 字和 30 个图片素材']];
  menu.innerHTML=options.map(([title,description],i)=>`<button type="button" role="menuitem"><img class="publish-option-icon" src="/assets/publish-option-${i}@2x.png" alt="" width="40" height="32"><span><strong>${title}</strong><small>${description}</small></span>${arrow()}</button>`).join('');
  document.querySelector('.sidebar').append(menu);
  trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-controls',menu.id);trigger.setAttribute('aria-expanded','false');
  const items=[...menu.querySelectorAll('button')];
  const setOpen=(open,focus=false)=>{menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));document.querySelector('.publish').classList.toggle('is-open',open);if(open&&focus)items[0].focus();};
  trigger.addEventListener('click',()=>setOpen(menu.hidden));
  trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true,true);if(e.key==='ArrowUp')items.at(-1).focus();}});
  menu.addEventListener('keydown',e=>{const i=items.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){setOpen(false);trigger.focus();}});
  document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target)&&!trigger.contains(e.target))setOpen(false);});
  document.addEventListener('focusin',e=>{if(!menu.hidden&&!menu.contains(e.target)&&e.target!==trigger)setOpen(false);});
  items.forEach((item,i)=>item.addEventListener('click',()=>{setOpen(false);trigger.focus();toast(`${options[i][0]}：当前为设计预览，发布功能待接入`);}));
}
