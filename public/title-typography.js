import {titleOutlines} from '/title-outlines.js';

// Replace only matching text nodes, preserving heading semantics and adjacent controls.
export function mountTitleOutlines(root=document) {
  const selectors='h2,.intro h1,.capability-heading strong,.showcase-title,.activity-date strong';
  root.querySelectorAll(selectors).forEach(heading=>{
    [...heading.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>{
      const title=node.textContent.trim();
      if(!titleOutlines[title])return;
      const wrapper=document.createElement('span');
      wrapper.className='outlined-title';
      wrapper.style.cssText='display:inline-block;position:relative;line-height:inherit';
      const label=document.createElement('span');
      label.textContent=title;
      label.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
      wrapper.innerHTML=titleOutlines[title];
      wrapper.prepend(label);
      node.replaceWith(wrapper);
    });
  });
}
