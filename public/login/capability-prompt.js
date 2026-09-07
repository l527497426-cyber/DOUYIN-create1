const system = document.querySelector('.ai-system');
const display = system?.querySelector('.capability-display');
const prompt = system?.querySelector('.capability-prompt');
const textHost = prompt?.querySelector('.capability-prompt-text');

const prompts = [
  { text: '帮小狗 Milo 做张宠物兴趣卡，展示性格与爱好，加入好玩的养宠互动。' },
  { text: '创建一个酷酷的 AI 分身，设定我的语气和兴趣，记住粉丝喜好，陪他们聊天。' },
  { text: '让我的原创角色和喜欢的伙伴同框，设计一段充满动感的冒险，生成角色短片。' },
  { text: '把我的故事灵感整理成世界书，补全世界规则、角色档案与关系，留下剧情伏笔。' },
  { text: '造一个热闹的卡通海岛乐园，和伙伴乘车穿过瀑布与灯光赛道，探索隐藏惊喜。' }
];

// animate-text / shared-axis-y translation for this scroll context. The old
// phrase leaves upward before the next phrase rises from below. Both phases
// are constrained to the Y axis so the copy follows the page's reading flow.
const promptMotionSpeed = .42;
const scalePromptTime = (milliseconds) => Math.round(milliseconds * promptMotionSpeed);
const promptMotion = Object.freeze({
  enterDuration: scalePromptTime(850),
  enterEasing: 'cubic-bezier(0.22,1,0.36,1)',
  travelY: 22,
  enterBlur: 8,
  exitDuration: scalePromptTime(650),
  exitEasing: 'cubic-bezier(0.7,0,0.84,0)',
  exitBlur: 8,
  microDelay: scalePromptTime(36),
  heightDuration: scalePromptTime(850),
  extraLineBreathing: 8
});

if (system && display && prompt && textHost) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let requestedIndex = Number(system.dataset.active || 0);
  let renderedIndex = -1;
  let renderingIndex = -1;
  let currentLayer = null;
  let docked = false;
  let animationToken = 0;
  let activeAnimations = [];
  let scrollLayers = null;
  let scrollHeights = [];
  let scrollTextHeights = [];
  let measuredWidth = 0;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const easeOut = (value) => 1 - Math.pow(1 - value, 3);
  const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

  const clearAnimations = () => {
    activeAnimations.forEach((animation) => animation.cancel());
    activeAnimations = [];
  };

  const makePhraseLayer = (promptModel, direction) => {
    const layer = document.createElement('span');
    layer.className = 'capability-prompt-phrase';
    layer.setAttribute('aria-label', promptModel.text);
    layer.style.cssText = `opacity:0;transform:translate3d(0,${direction * promptMotion.travelY}px,0);filter:blur(${promptMotion.enterBlur}px);backface-visibility:hidden;transform-origin:50% 55%;`;
    const unit = document.createElement('span');
    unit.className = 'capability-prompt-unit';
    unit.textContent = promptModel.text;
    // The whole phrase shares one vertical axis. Natural wrapping still lets
    // longer prompts expand the input shell without splitting the animation.
    unit.style.cssText = 'display:block;width:100%;white-space:normal;backface-visibility:hidden;';
    layer.append(unit);
    return { layer };
  };

  const settleUnits = (units) => units.forEach((unit) => {
    unit.style.opacity = '1';
    unit.style.transform = 'translate3d(0,0,0)';
    unit.style.filter = 'blur(0px)';
    unit.style.willChange = 'auto';
  });

  const settleLayer = (layer) => {
    if (!layer) return;
    settleUnits([...layer.querySelectorAll('.capability-prompt-unit')]);
    layer.style.opacity = '1';
    layer.style.transform = 'translate3d(0,0,0)';
    layer.style.filter = 'blur(0px)';
    layer.style.willChange = 'auto';
  };

  const animateIn = async (layer, token, direction) => {
    layer.setAttribute('aria-hidden', 'false');
    layer.style.willChange = 'opacity,transform,filter';
    const animation = layer.animate([
      { opacity: 0, transform: `translate3d(0,${direction * promptMotion.travelY}px,0)`, filter: `blur(${promptMotion.enterBlur}px)` },
      { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0px)' }
    ], {
      duration: promptMotion.enterDuration,
      easing: promptMotion.enterEasing,
      fill: 'forwards'
    });
    activeAnimations.push(animation);
    await Promise.allSettled([animation.finished]);
    if (token !== animationToken) return;
    settleLayer(layer);
  };

  const animateOut = async (layer, token, direction) => {
    layer.style.willChange = 'opacity,transform,filter';
    const animation = layer.animate([
      { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0px)' },
      { opacity: 0, transform: `translate3d(0,${direction * -promptMotion.travelY}px,0)`, filter: `blur(${promptMotion.exitBlur}px)` }
    ], {
      duration: promptMotion.exitDuration,
      easing: promptMotion.exitEasing,
      fill: 'forwards'
    });
    activeAnimations.push(animation);
    await Promise.allSettled([animation.finished]);
    if (token !== animationToken) return;
  };

  const measurePromptHeight = (layer) => {
    const promptStyle = getComputedStyle(prompt);
    const padding = (parseFloat(promptStyle.paddingTop) || 0) + (parseFloat(promptStyle.paddingBottom) || 0);
    const minimum = parseFloat(promptStyle.minHeight) || 52;
    const textHeight = layer.getBoundingClientRect().height;
    const lineHeight = parseFloat(getComputedStyle(layer).lineHeight) || textHeight;
    const lineCount = Math.max(1, Math.ceil((textHeight - .5) / Math.max(lineHeight, 1)));
    const breathing = Math.max(0, lineCount - 1) * promptMotion.extraLineBreathing;
    const plusHeight = prompt.querySelector('.capability-prompt-plus')?.getBoundingClientRect().height || 0;
    const sendHeight = prompt.querySelector('.capability-prompt-send')?.getBoundingClientRect().height || 0;
    return Math.max(minimum, Math.ceil(Math.max(textHeight, plusHeight, sendHeight) + padding + breathing));
  };

  const animatePromptHeight = async (fromHeight, toHeight, token) => {
    prompt.style.height = `${fromHeight}px`;
    if (reduceMotion.matches || Math.abs(toHeight - fromHeight) < .5) {
      prompt.style.height = `${toHeight}px`;
      return;
    }
    const animation = prompt.animate([
      { height: `${fromHeight}px` },
      { height: `${toHeight}px` }
    ], {
      duration: promptMotion.heightDuration,
      easing: promptMotion.enterEasing,
      fill: 'forwards'
    });
    activeAnimations.push(animation);
    await Promise.allSettled([animation.finished]);
    if (token !== animationToken) return;
    prompt.style.height = `${toHeight}px`;
    animation.cancel();
  };

  const renderPhrase = async (index) => {
    const promptModel = prompts[index] || prompts[0];
    // Match the story rail in both directions: down-scroll sends the old copy
    // upward and raises the new one from below; up-scroll reverses the pair.
    const direction = renderedIndex < 0 || index > renderedIndex ? 1 : -1;
    // Read the composited height before cancelling a prior WAAPI transition.
    // Cancelling restores its inline start value, so immediately freezing this
    // visual value prevents a one-frame snap during fast scroll reversals.
    const fromHeight = prompt.getBoundingClientRect().height || 52;
    const token = ++animationToken;
    renderingIndex = index;
    clearAnimations();
    prompt.style.height = `${fromHeight}px`;

    const existingLayers = [...textHost.querySelectorAll('.capability-prompt-phrase')];
    existingLayers.forEach((layer) => {
      if (layer !== currentLayer) layer.remove();
    });
    if (currentLayer) {
      currentLayer.removeAttribute('aria-hidden');
      settleLayer(currentLayer);
    }

    const nextPhrase = makePhraseLayer(promptModel, direction);
    nextPhrase.layer.setAttribute('aria-hidden', 'true');
    textHost.append(nextPhrase.layer);
    const targetHeight = measurePromptHeight(nextPhrase.layer);

    if (reduceMotion.matches) {
      currentLayer?.remove();
      currentLayer = nextPhrase.layer;
      settleLayer(currentLayer);
      currentLayer.removeAttribute('aria-hidden');
      prompt.style.height = `${targetHeight}px`;
      renderedIndex = index;
      renderingIndex = -1;
      prompt.classList.remove('is-typing');
      if (requestedIndex !== renderedIndex) void renderPhrase(requestedIndex);
      return;
    }

    prompt.classList.add('is-typing');
    currentLayer?.setAttribute('aria-hidden', 'true');
    if (currentLayer) {
      await animateOut(currentLayer, token, direction);
      if (token !== animationToken) return;
      await wait(promptMotion.microDelay);
    }
    if (token !== animationToken) return;
    currentLayer?.remove();
    currentLayer = nextPhrase.layer;
    // The shared-axis swap has zero overlap: resizing begins with the
    // replacement phrase and completes on the same enter clock.
    const heightPromise = animatePromptHeight(fromHeight, targetHeight, token);
    const enterPromise = animateIn(currentLayer, token, direction);
    await Promise.allSettled([enterPromise, heightPromise]);
    if (token !== animationToken) return;
    currentLayer.removeAttribute('aria-hidden');
    prompt.style.height = `${targetHeight}px`;
    renderedIndex = index;
    renderingIndex = -1;
    prompt.classList.remove('is-typing');
    // Scroll can request another story while this exact exit/enter pair is in
    // flight. Keep only the latest target and start it after the pair settles;
    // never cancel halfway and snap either phrase back to a completed frame.
    if (requestedIndex !== renderedIndex) void renderPhrase(requestedIndex);
  };

  const requestPhrase = (index) => {
    requestedIndex = clamp(Number(index) || 0, 0, prompts.length - 1);
    if (system.classList.contains('ai-scroll-linked')) return;
    if (scrollLayers) {
      textHost.replaceChildren();
      textHost.style.removeProperty('height');
      scrollLayers = null;
      currentLayer = null;
      renderedIndex = -1;
      renderingIndex = -1;
    }
    if (!docked) return;
    if (renderingIndex !== -1) return;
    if (requestedIndex !== renderedIndex) renderPhrase(requestedIndex);
  };

  const updatePromptPosition = () => {
    frame = 0;
    const systemRect = system.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const start = viewportHeight * .82;
    const end = viewportHeight * .1;
    const rawProgress = clamp((start - systemRect.top) / (start - end));
    const progress = reduceMotion.matches ? (rawProgress ? 1 : 0) : easeOut(rawProgress);
    const displayRect = display.getBoundingClientRect();
    const sceneContent = system.querySelector('.ai-scene-content');
    const entryOffset = parseFloat(sceneContent && getComputedStyle(sceneContent).translate.split(' ')[1]) || 0;
    const sceneEntered = system.classList.contains('scene-entered');
    // Re-measure settled content on resize. The inline height keeps the extra
    // breathing room for multi-line prompts; their top anchor stays unchanged.
    if (currentLayer && renderingIndex === -1 && !system.classList.contains('ai-scroll-linked')) {
      prompt.style.height = `${measurePromptHeight(currentLayer)}px`;
    }
    // The prompt stays anchored to the centre column, independently of a
    // later art-direction shift applied to the cube.
    const dockX = viewportWidth / 2;
    // Reserve the tallest desktop wrapping case for the viewport clamp. The
    // anchor therefore never moves upward when a one-line prompt becomes two
    // (or three) lines; only the shell's bottom edge expands.
    const promptHeightCeiling = 112;
    // The cube shell is lifted 10px while the prompt is lowered 10px, giving
    // the two objects a clearer 20px visual separation without shifting the
    // middle column's alignment box.
    const dockTop = Math.min(viewportHeight - promptHeightCeiling - 20, displayRect.bottom - entryOffset + 26);
    const startX = viewportWidth / 2;
    // The prompt belongs to the middle column, not merely to the cube. Clamp
    // its centre using the same 29.24% / 70.76% column rules as the backdrop.
    const columnInset = 20;
    const promptWidth = prompt.getBoundingClientRect().width;
    const columnLeft = viewportWidth * .2924 + columnInset + promptWidth / 2;
    const columnRight = viewportWidth * .7076 - columnInset - promptWidth / 2;
    const clampToMiddleColumn = (value) => Math.min(columnRight, Math.max(columnLeft, value));
    // Before the shared AI scene is released, the dock stays fully hidden.
    // After release it simply occupies its final position; the parent scene
    // supplies the one coordinated 56px entrance for every foreground item.
    const startY = viewportHeight * 1.08;
    const entrance = sceneEntered ? 1 : 0;
    const exit = clamp((viewportHeight * .38 - systemRect.bottom) / (viewportHeight * .3));
    const alpha = entrance * (1 - exit);
    const scale = .86 + entrance * .14 - exit * .03;
    const blur = Math.max(1 - entrance, exit) * 12;

    const intendedX = startX + (dockX - startX) * progress;
    prompt.style.left = `${clampToMiddleColumn(intendedX)}px`;
    prompt.style.top = `${sceneEntered ? dockTop : startY}px`;
    // The scene owns the first appearance as one group. Do not let this
    // dock's older scroll animation delay it behind the cube.
    prompt.classList.toggle('scene-ready', sceneEntered);
    if (!sceneEntered) {
      prompt.style.opacity = alpha.toFixed(3);
      prompt.style.filter = `blur(${blur.toFixed(2)}px)`;
      prompt.style.transform = `translate(-50%,0) scale(${scale.toFixed(3)})`;
    } else {
      prompt.style.removeProperty('opacity');
      prompt.style.removeProperty('filter');
      prompt.style.removeProperty('transform');
    }
    prompt.classList.toggle('is-visible', (sceneEntered || alpha > .01) && systemRect.bottom > viewportHeight * .12);

    // Begin the wording transition just before the prompt reaches its final
    // dock, so the text is already settled when the scene pauses.
    const isDocked = sceneEntered && systemRect.bottom > viewportHeight * .12;
    const wasDocked = docked;
    // Commit the dock state before requesting the first phrase. requestPhrase()
    // intentionally ignores offscreen updates, so calling it while `docked`
    // was still false left the initial prompt empty until the next story change.
    docked = isDocked;
    if (isDocked && !wasDocked) requestPhrase(requestedIndex);
    if (!isDocked) prompt.classList.remove('is-typing');
  };

  const requestPositionUpdate = () => {
    if (!frame) frame = requestAnimationFrame(updatePromptPosition);
  };

  window.updateCapabilityPrompt = requestPhrase;
  window.renderCapabilityPromptProgress = (progress) => {
    if (!system.classList.contains('ai-scroll-linked')) return;
    if (!scrollLayers) {
      ++animationToken;
      clearAnimations();
      renderingIndex = -1;
      currentLayer = null;
      textHost.replaceChildren();
      scrollLayers = prompts.map(model => {
        const {layer} = makePhraseLayer(model,1);
        textHost.append(layer);
        return layer;
      });
      prompt.classList.remove('is-typing');
      measuredWidth = 0;
    }
    const width = textHost.getBoundingClientRect().width;
    if (width !== measuredWidth) {
      scrollHeights = scrollLayers.map(measurePromptHeight);
      scrollTextHeights = scrollLayers.map(layer => layer.getBoundingClientRect().height);
      measuredWidth = width;
    }
    const from = Math.floor(progress), to = Math.min(from+1,prompts.length-1);
    prompt.style.height = `${scrollHeights[from]+(scrollHeights[to]-scrollHeights[from])*(progress-from)}px`;
    textHost.style.height = `${scrollTextHeights[from]+(scrollTextHeights[to]-scrollTextHeights[from])*(progress-from)}px`;
    scrollLayers.forEach((layer,index) => {
      layer.style.top = '50%';
      layer.style.marginTop = `${-scrollTextHeights[index]/2}px`;
      const distance = index-progress;
      layer.style.opacity = String(clamp(1-Math.abs(distance)));
      layer.style.transform = `translate3d(0,${distance*22}px,0)`;
      layer.style.filter = `blur(${Math.min(1,Math.abs(distance))*3}px)`;
      layer.style.visibility = Math.abs(distance)<1 ? 'visible' : 'hidden';
      layer.setAttribute('aria-hidden',String(index!==Math.round(progress)));
    });
  };
  requestPhrase(requestedIndex);
  requestPositionUpdate();
  window.addEventListener('scroll', requestPositionUpdate, { passive: true });
  window.addEventListener('resize', requestPositionUpdate);
  reduceMotion.addEventListener?.('change', requestPositionUpdate);
  window.dispatchEvent(new Event('ai-prompt-ready'));
}
