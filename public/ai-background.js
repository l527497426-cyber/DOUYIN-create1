// Adapted from the live creator page's 3433.66837528.js / module 768030.
// Same mask sampling, character set, wave equations, placement and 12 fps cadence.
export function mountAiBackground() {
  const host = document.querySelector('main');
  const canvas = document.createElement('canvas');
  canvas.className = 'ai-ascii-background';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const context = canvas.getContext('2d');
  const maskCanvas = document.createElement('canvas');
  const maskContext = maskCanvas.getContext('2d', {willReadFrequently:true});
  if (!context || !maskContext) return;
  const characters = ['0','8','@','S','X','#','+'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width=0, height=0, samples=[], mask, frame=0, last=0, active=true;
  function coverage(x,y) {
    let max=0, sum=0, count=0;
    for(let dy=-5;dy<=5;dy+=2) {
      const row=y+dy;
      if(row<0||row>=1024)continue;
      for(let dx=-5;dx<=5;dx+=2) {
        const col=x+dx;
        if(col<0||col>=1024)continue;
        const alpha=mask[(row*1024+col)*4+3]/255;
        max=Math.max(max,alpha);sum+=alpha;count++;
      }
    }
    return {coverage:max,density:count?sum/count:0};
  }
  function resize() {
    const nextWidth=Math.round(host.clientWidth);
    if(!nextWidth)return;
    const nextHeight=Math.round(Math.max(host.clientHeight,host.scrollHeight));
    if(nextWidth===width&&nextHeight===height)return;
    width=nextWidth;height=nextHeight;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
    if(mask)buildSamples();
  }
  function buildSamples() {
    samples=[];
    const maskWidth=1.34*width, maskHeight=Math.max(maskWidth,height+380), left=(width-maskWidth)/2;
    for(let row=0;row<Math.ceil(height/9);row++) {
      const y=row*9+4.5, my=Math.floor((y+380)/maskHeight*1024);
      if(my<0||my>=1024)continue;
      for(let col=0;col<Math.ceil(width/9);col++) {
        const x=col*9+4.5, mx=Math.floor((x-left)/maskWidth*1024);
        if(mx<0||mx>=1024)continue;
        const sample=coverage(mx,my);
        if(sample.coverage>=.14)samples.push({row,col,x,y,...sample});
      }
    }
    draw(reduced.matches?0:performance.now());
  }
  function draw(time) {
    canvas.dataset.frame = String(Math.floor(time));
    context.clearRect(0,0,width,height);
    context.font='600 9px "JetBrains Mono", monospace';
    context.textAlign='center';context.textBaseline='middle';
    const tick=Math.floor(time/280);
    for(const s of samples) {
      const wave=(Math.sin(.18*s.col+.12*s.row+time/920)+1)/2;
      const noise=(Math.sin(1.73*s.col+2.11*s.row+.68*tick)+1)/2;
      if(s.density>.14&&noise<.58+.36*wave)continue;
      context.fillStyle=`rgb(28 31 35 / ${.035+.035*s.coverage+.018*wave})`;
      context.fillText(characters[(3*s.col+5*s.row+tick)%characters.length],s.x,s.y);
    }
  }
  function animate(time) {
    if(time-last>=1000/12){last=time;draw(time);}
    frame=requestAnimationFrame(animate);
  }
  function play() {
    cancelAnimationFrame(frame);
    if(!mask)return;
    if(reduced.matches){draw(0);return;}
    if(active&&!document.hidden)frame=requestAnimationFrame(animate);
  }
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  [...host.children].filter(e=>e!==canvas).forEach(e=>observer.observe(e));
  resize();
  const image=new Image();
  image.onload=()=>{
    maskCanvas.width=maskCanvas.height=1024;
    maskContext.drawImage(image,0,0,1024,1024);
    mask=maskContext.getImageData(0,0,1024,1024).data;
    buildSamples();play();
  };
  image.src='/assets/online-ai/ascii-mask.webp';
  document.addEventListener('visibilitychange',play);
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='ai-page-active')return;
    active=Boolean(event.data.active);play();
  });
  reduced.addEventListener('change',play);
  window.addEventListener('pagehide',()=>{observer.disconnect();cancelAnimationFrame(frame);},{once:true});
}
