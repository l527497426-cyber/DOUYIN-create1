(() => {
  const gsap = window.gsap;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;

  if (!reducedMotion.matches) {
    root.classList.add("motion-ready");
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("page-ready")));
  }

  const initAsciiField = () => {
    const canvas = document.querySelector(".ascii-map-live");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const hoverCanvas = document.querySelector(".ascii-map-hover");
    const hero = document.querySelector(".hero");

    const fieldWidth = 1642;
    const fieldHeight = 1642;
    const cellWidth = 10;
    const cellHeight = 13;
    const glyphs = ["0", "8", "S", "X", "#", "@"];
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
    const context = canvas.getContext("2d");
    const hoverContext = hoverCanvas?.getContext("2d");
    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
    const source = new Image();

    canvas.width = Math.round(fieldWidth * pixelRatio);
    canvas.height = Math.round(fieldHeight * pixelRatio);
    if (hoverCanvas) {
      hoverCanvas.width = canvas.width;
      hoverCanvas.height = canvas.height;
    }
    sampleCanvas.width = fieldWidth;
    sampleCanvas.height = fieldHeight;
    if (!context || !sampleContext) return;

    const syncHoverPosition = () => {
      if (!hero || !hoverCanvas) return;
      const heroBounds = hero.getBoundingClientRect();
      const asciiBounds = canvas.getBoundingClientRect();
      hoverCanvas.style.left = `${asciiBounds.left - heroBounds.left}px`;
      hoverCanvas.style.top = `${asciiBounds.top - heroBounds.top}px`;
      hoverCanvas.style.width = `${asciiBounds.width}px`;
      hoverCanvas.style.height = `${asciiBounds.height}px`;
    };
    syncHoverPosition();
    if (hero) new ResizeObserver(syncHoverPosition).observe(hero);

    const cells = [];
    let pointerActive = false;
    let pointerX = -1000;
    let pointerY = -1000;
    let trail = [];
    const trailLifetime = 550;
    const segmentDistance = (pointX, pointY, start, end) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const progress = Math.max(0, Math.min(1, ((pointX - start.x) * dx + (pointY - start.y) * dy) / Math.max(lengthSquared, 1)));
      return Math.hypot(pointX - start.x - progress * dx, pointY - start.y - progress * dy);
    };
    const drawHover = (now) => {
      if (!hoverContext || document.hidden) return;
      trail = trail.filter((point) => now - point.t < trailLifetime);
      hoverContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      hoverContext.clearRect(0, 0, fieldWidth, fieldHeight);
      if (!trail.length) return;
      hoverContext.font = "600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      hoverContext.textAlign = "center";
      hoverContext.textBaseline = "middle";
      cells.forEach((cell) => {
        let light = 0;
        for (let index = 0; index < trail.length; index++) {
          const point = trail[index];
          const distance = index ? segmentDistance(cell.x, cell.y, trail[index - 1], point) : Math.hypot(cell.x - point.x, cell.y - point.y);
          const life = index ? Math.min(trail[index - 1].life, point.life) : point.life;
          light = Math.max(light, Math.max(0, 1 - distance / 11) * life);
        }
        if (light < .04) return;
        hoverContext.fillStyle = `rgba(255, 255, 255, ${Math.min(.68, light * .68)})`;
        hoverContext.fillText(cell.glyph, cell.x, cell.y);
      });
    };
    const draw = () => {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, fieldWidth, fieldHeight);
      context.font = "600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      cells.forEach((cell) => {
        context.fillStyle = `rgba(255, 255, 255, ${cell.alpha})`;
        context.fillText(cell.glyph, cell.x, cell.y);
      });
    };

    source.addEventListener("load", () => {
      const scale = Math.max(fieldWidth / source.naturalWidth, fieldHeight / source.naturalHeight);
      const drawWidth = source.naturalWidth * scale;
      const drawHeight = source.naturalHeight * scale;
      sampleContext.clearRect(0, 0, fieldWidth, fieldHeight);
      sampleContext.drawImage(source, (fieldWidth - drawWidth) / 2, (fieldHeight - drawHeight) / 2, drawWidth, drawHeight);

      const pixels = sampleContext.getImageData(0, 0, fieldWidth, fieldHeight).data;
      for (let y = 0; y < fieldHeight; y += cellHeight) {
        for (let x = 0; x < fieldWidth; x += cellWidth) {
          let alphaTotal = 0;
          let samples = 0;
          for (let sampleY = y; sampleY < Math.min(y + cellHeight, fieldHeight); sampleY += 2) {
            for (let sampleX = x; sampleX < Math.min(x + cellWidth, fieldWidth); sampleX += 2) {
              alphaTotal += pixels[(sampleY * fieldWidth + sampleX) * 4 + 3];
              samples += 1;
            }
          }
          const density = alphaTotal / (samples * 255);
          if (density < 0.018) continue;
          cells.push({
            x: x + cellWidth / 2,
            y: y + cellHeight / 2,
            alpha: Math.min(0.46, 0.12 + density * 1.7),
            glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
          });
        }
      }

      draw();
      if (reducedMotion.matches) return;
      hero?.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        const bounds = canvas.getBoundingClientRect();
        pointerX = (event.clientX - bounds.left) * fieldWidth / bounds.width;
        pointerY = (event.clientY - bounds.top) * fieldHeight / bounds.height;
        pointerActive = true;
        const now = performance.now();
        const previous = trail[trail.length - 1];
        if (!previous || Math.hypot(pointerX - previous.x, pointerY - previous.y) > 6 || now - previous.t > 45) {
          trail.push({ x: pointerX, y: pointerY, t: now, life: 1 });
          if (trail.length > 16) trail.shift();
        }
      }, { passive: true });
      hero?.addEventListener("pointerleave", () => { pointerActive = false; });
      window.addEventListener("blur", () => { pointerActive = false; trail = []; hoverContext?.clearRect(0, 0, fieldWidth, fieldHeight); });
      window.setInterval(() => {
        if (document.hidden) return;
        const now = performance.now();
        if (pointerActive && now - (trail[trail.length - 1]?.t ?? 0) > 90) {
          trail.push({ x: pointerX, y: pointerY, t: now, life: 1 });
          if (trail.length > 16) trail.shift();
        }
        trail.forEach((point) => { point.life = Math.max(0, 1 - (now - point.t) / trailLifetime); });
        drawHover(now);
      }, 50);
      window.setInterval(() => {
        if (document.hidden) return;
        cells.forEach((cell) => {
          if (Math.random() < 0.12) {
            let nextGlyph = cell.glyph;
            while (nextGlyph === cell.glyph) nextGlyph = glyphs[Math.floor(Math.random() * glyphs.length)];
            cell.glyph = nextGlyph;
          }
        });
        draw();
      }, 150);
    }, { once: true });

    source.src = canvas.dataset.source;
  };

  initAsciiField();

  const selectTabs = (tabs, selectedTab) => {
    tabs.forEach((tab) => {
      const selected = tab === selectedTab;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
  };

  const identityTabs = [...document.querySelectorAll("[data-identity]")];
  identityTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      selectTabs(identityTabs, tab);
      document.querySelector(".login-panel")?.classList.toggle("mcn-active", tab.dataset.identity === "mcn");
    });
  });

  const methodTabs = [...document.querySelectorAll("[data-method]")];
  const codeField = document.querySelector(".code-field");
  const passwordField = document.querySelector(".password-field");
  methodTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      selectTabs(methodTabs, tab);
      const usePassword = tab.dataset.method === "password";
      codeField.hidden = usePassword;
      passwordField.hidden = !usePassword;
    });
  });

  const phoneInput = document.querySelector(".phone-field input");
  const submit = document.querySelector(".login-submit");
  phoneInput?.addEventListener("input", () => {
    submit?.classList.toggle("ready", phoneInput.value.trim().length >= 11);
  });

  const sendCode = document.querySelector("[data-send-code]");
  sendCode?.addEventListener("click", () => {
    if (sendCode.disabled) return;
    let seconds = 60;
    sendCode.disabled = true;
    sendCode.textContent = `${seconds}s`;
    const timer = window.setInterval(() => {
      seconds -= 1;
      sendCode.textContent = seconds ? `${seconds}s` : "获取验证码";
      if (!seconds) {
        window.clearInterval(timer);
        sendCode.disabled = false;
      }
    }, 1000);
  });

  document.querySelector(".phone-login")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submit.textContent = "登录成功 · 正在进入";
    submit.disabled = true;
    sessionStorage.setItem("creator-center-demo-session", "signed-in");
    window.setTimeout(() => {
      window.location.replace("/");
    }, 250);
  });

  const aiGrid = document.querySelector(".ai-grid");
  const aiCards = [...document.querySelectorAll("[data-ai-card]")];
  const aiLayoutButtons = [...document.querySelectorAll("[data-ai-layout]")];
  const aiVideos = aiCards.map((card) => card.querySelector("[data-card-video]")).filter(Boolean);
  aiVideos.forEach((video) => {
    const poster = document.createElement("div");
    poster.className = "card-art-poster";
    poster.style.backgroundImage = `url("${video.getAttribute("src").replace(/\.mp4$/, "-first.webp")}")`;
    poster.setAttribute("aria-hidden", "true");
    video.parentElement.prepend(poster);
    const showFirstFrame = () => video.classList.add("is-ready");
    video.addEventListener("loadeddata", showFirstFrame, { once: true });
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) showFirstFrame();
  });
  const aiVideoFadeTimers = new WeakMap();
  const cancelAiVideoFade = (video) => {
    const timer = aiVideoFadeTimers.get(video);
    if (!timer) return;
    window.clearTimeout(timer);
    aiVideoFadeTimers.delete(video);
  };
  const stopAiVideo = (card, fade = false) => {
    const video = card.querySelector("[data-card-video]");
    if (!video) return;
    video.pause();
    cancelAiVideoFade(video);
    video.classList.add("is-fading-out");
    if (video.readyState < HTMLMediaElement.HAVE_METADATA || video.currentTime <= 0.01) return;
    if (!fade || aiGrid?.classList.contains("layout-grid")) {
      video.currentTime = 0;
      return;
    }
    const timer = window.setTimeout(() => {
      if (aiVideoFadeTimers.get(video) !== timer) return;
      video.currentTime = 0;
      aiVideoFadeTimers.delete(video);
    }, 560);
    aiVideoFadeTimers.set(video, timer);
  };
  const playAiVideo = (card) => {
    const video = card.querySelector("[data-card-video]");
    if (!video) return;
    cancelAiVideoFade(video);
    video.classList.remove("is-fading-out");
    if (video.paused) video.play().catch(() => {});
  };
  // Both accordion states share the original heading to avoid overlapping text.
  const aiAutoplayDelay = 5200;
  let activeAiIndex = 0;
  let aiAutoplayTimer = 0;
  let aiScrollTimer = 0;
  let aiTimeline = null;
  let aiGridVisible = false;
  let aiInteractionPaused = false;
  let aiLayoutMode = "accordion";

  const syncAiVideos = (fadeIndex = -1) => {
    aiCards.forEach((card, index) => {
      const video = card.querySelector("[data-card-video]");
      const shouldPlay = aiGridVisible && !document.hidden && !reducedMotion.matches && (
        aiLayoutMode === "accordion"
          ? index === activeAiIndex
          : card.matches(":hover") || document.activeElement === card
      );
      if (shouldPlay) {
        playAiVideo(card);
        return;
      }
      const canFade = aiGridVisible && !document.hidden && !reducedMotion.matches;
      if (canFade && video && aiVideoFadeTimers.has(video)) return;
      stopAiVideo(card, canFade && (aiLayoutMode === "grid" || index === fadeIndex));
    });
  };

  const restartAiProgress = () => {
    if (!aiGrid || aiLayoutMode !== "accordion" || reducedMotion.matches || aiInteractionPaused) return;
    aiGrid.classList.remove("is-cycling");
    void aiGrid.offsetWidth;
    aiGrid.classList.add("is-cycling");
  };

  const scheduleAiAutoplay = () => {
    window.clearTimeout(aiAutoplayTimer);
    aiGrid?.classList.remove("is-cycling");
    if (aiLayoutMode !== "accordion" || reducedMotion.matches || aiInteractionPaused || !aiGridVisible || document.hidden) return;
    restartAiProgress();
    aiAutoplayTimer = window.setTimeout(() => {
      setActiveAiCard((activeAiIndex + 1) % aiCards.length, true);
      scheduleAiAutoplay();
    }, aiAutoplayDelay);
  };

  const applyAiGalleryLayout = (animate = true) => {
    if (!aiGrid || !aiCards.length || aiLayoutMode !== "accordion") return;
    const mobile = window.matchMedia("(max-width: 960px)").matches;
    const duration = animate && !reducedMotion.matches ? 0.88 : 0;
    const availableWidth = aiGrid.clientWidth - (aiCards.length - 1) * 16;
    const grow = mobile ? 1 : (294 * (aiCards.length - 1)) / (availableWidth - 294);
    aiTimeline?.kill();

    if (!gsap) return;
    const timeline = gsap.timeline({ defaults: { ease: "power3.out", overwrite: "auto" } });
    aiCards.forEach((card, index) => {
      const active = index === activeAiIndex;
      const art = card.querySelector(".card-art");
      const copy = card.querySelector(".card-copy");
      const description = card.querySelector(".card-copy > p");
      if (mobile) {
        gsap.set(card, { clearProps: "flexGrow,rotateY,opacity" });
        gsap.set(art, { x: 0 });
      } else {
        timeline.to(
          card,
          {
            flexGrow: active ? grow : 1,
            rotateY: 0,
            opacity: 1,
            duration,
          },
          0,
        );
        gsap.set(art, { x: 0 });
      }

      timeline.to(
        copy,
        {
          top: active ? 242 : 312,
          duration,
        },
        0,
      );
      timeline.to(
        description,
        {
          opacity: active ? 1 : 0,
          maskPosition: active ? "0% 0%" : "100% 100%",
          webkitMaskPosition: active ? "0% 0%" : "100% 100%",
          duration: active ? Math.max(0, duration - 0.04) : Math.min(duration, 0.16),
          ease: active ? "none" : "power2.in",
        },
        active && duration ? 0.04 : 0,
      );
    });
    aiTimeline = timeline;
  };

  const setActiveAiCard = (nextCard, scrollMobile = false, animate = true) => {
    const nextIndex = typeof nextCard === "number" ? nextCard : aiCards.indexOf(nextCard);
    if (nextIndex < 0) return;
    const previousIndex = activeAiIndex;
    activeAiIndex = nextIndex;
    aiGrid?.classList.add("has-active");
    aiCards.forEach((card, index) => {
      const active = index === activeAiIndex;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-expanded", String(active));
    });
    syncAiVideos(previousIndex === nextIndex ? -1 : previousIndex);
    applyAiGalleryLayout(animate);
    if (scrollMobile && aiGrid && window.matchMedia("(max-width: 960px)").matches) {
      aiGrid.scrollTo({
        left: aiCards[activeAiIndex].offsetLeft,
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
    }
  };

  const clearAiCardLayoutStyles = () => {
    aiCards.forEach((card) => {
      gsap?.set(card, { clearProps: "flexGrow,rotateY,opacity,y,transform" });
      gsap?.set(card.querySelector(".card-art"), { clearProps: "x" });
      gsap?.set(card.querySelector(".card-copy"), { clearProps: "top,backgroundColor" });
      gsap?.set(card.querySelector(".card-copy > p"), {
        clearProps: "marginTop,opacity,y,transform,filter,clipPath,maskPosition,webkitMaskPosition",
      });
    });
  };

  const setAiLayout = (nextMode, animate = true) => {
    if (!aiGrid || !["accordion", "grid"].includes(nextMode) || nextMode === aiLayoutMode) return;
    window.clearTimeout(aiAutoplayTimer);
    aiGrid.classList.remove("is-cycling");
    aiTimeline?.kill();

    const commitLayout = () => {
      aiLayoutMode = nextMode;
      clearAiCardLayoutStyles();
      aiGrid.classList.toggle("layout-accordion", nextMode === "accordion");
      aiGrid.classList.toggle("layout-grid", nextMode === "grid");
      aiGrid.setAttribute("aria-label", nextMode === "grid"
        ? "AI 创作能力，三加二等权卡片排版"
        : "AI 创作能力，聚焦卡片可展开详情");
      aiLayoutButtons.forEach((button) => {
        const selected = button.dataset.aiLayout === nextMode;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });

      if (nextMode === "accordion") {
        applyAiGalleryLayout(false);
      }
      syncAiVideos();

      if (animate && gsap && !reducedMotion.matches) {
        gsap.fromTo(
          aiCards,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.46, stagger: 0.045, ease: "power3.out", clearProps: "opacity,y,transform" },
        );
      }
      scheduleAiAutoplay();
    };

    if (animate && gsap && !reducedMotion.matches) {
      gsap.to(aiCards, {
        opacity: 0,
        y: 10,
        duration: 0.16,
        stagger: 0.018,
        ease: "power2.in",
        overwrite: true,
        onComplete: commitLayout,
      });
    } else {
      commitLayout();
    }
  };

  aiLayoutButtons.forEach((button) => {
    button.addEventListener("click", () => setAiLayout(button.dataset.aiLayout));
  });

  aiCards.forEach((card, index) => {
    card.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      if (aiLayoutMode !== "accordion") {
        syncAiVideos();
        return;
      }
      aiInteractionPaused = true;
      window.clearTimeout(aiAutoplayTimer);
      aiGrid?.classList.remove("is-cycling");
      setActiveAiCard(card);
    });
    card.addEventListener("focus", () => {
      if (aiLayoutMode !== "accordion") {
        syncAiVideos();
        return;
      }
      aiInteractionPaused = true;
      window.clearTimeout(aiAutoplayTimer);
      aiGrid?.classList.remove("is-cycling");
      setActiveAiCard(card);
    });
    card.addEventListener("pointerleave", syncAiVideos);
    card.addEventListener("blur", syncAiVideos);
    card.addEventListener("click", () => {
      if (aiLayoutMode !== "accordion") return;
      if (window.matchMedia("(max-width: 960px)").matches) {
        setActiveAiCard(card, true);
      } else {
        setActiveAiCard(card);
      }
    });
    card.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      aiCards[(index + direction + aiCards.length) % aiCards.length].focus();
    });
  });
  aiGrid?.addEventListener("pointerleave", () => {
    if (aiLayoutMode !== "accordion") return;
    aiInteractionPaused = false;
    scheduleAiAutoplay();
  });
  aiGrid?.addEventListener("focusout", (event) => {
    if (aiLayoutMode !== "accordion") return;
    if (!aiGrid.contains(event.relatedTarget)) {
      aiInteractionPaused = false;
      scheduleAiAutoplay();
    }
  });
  aiGrid?.addEventListener(
    "scroll",
    () => {
      if (aiLayoutMode !== "accordion" || !window.matchMedia("(max-width: 960px)").matches) return;
      aiInteractionPaused = true;
      window.clearTimeout(aiAutoplayTimer);
      window.clearTimeout(aiScrollTimer);
      aiScrollTimer = window.setTimeout(() => {
        const gridCenter = aiGrid.scrollLeft + aiGrid.clientWidth / 2;
        const closestCard = aiCards.reduce((closest, card) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const closestCenter = closest.offsetLeft + closest.offsetWidth / 2;
          return Math.abs(cardCenter - gridCenter) < Math.abs(closestCenter - gridCenter) ? card : closest;
        }, aiCards[0]);
        setActiveAiCard(closestCard);
        aiInteractionPaused = false;
        scheduleAiAutoplay();
      }, 140);
    },
    { passive: true },
  );
  setActiveAiCard(0, false, false);

  const aiResizeObserver = new ResizeObserver(() => {
    if (aiLayoutMode === "accordion") applyAiGalleryLayout(false);
  });
  if (aiGrid) aiResizeObserver.observe(aiGrid);

  if ("IntersectionObserver" in window) {
    const aiAutoplayObserver = new IntersectionObserver(
      ([entry]) => {
        aiGridVisible = entry.isIntersecting;
        syncAiVideos();
        scheduleAiAutoplay();
      },
      { threshold: 0.3 },
    );
    if (aiGrid) aiAutoplayObserver.observe(aiGrid);
  } else {
    aiGridVisible = true;
    syncAiVideos();
    scheduleAiAutoplay();
  }

  document.addEventListener("visibilitychange", () => {
    syncAiVideos();
    scheduleAiAutoplay();
  });
  reducedMotion.addEventListener("change", syncAiVideos);

  const operations = {
    publish: [
      { image: "publish-1.webp", eyebrow: "DIVERSE FORMATS", title: "丰富的作品体裁" },
      { image: "publish-2.webp", eyebrow: "CONTENT MANAGEMENT", title: "高效的内容管理" },
      { image: "publish-3.webp", eyebrow: "INTERACTION MANAGEMENT", title: "便捷的互动管理" },
    ],
    analysis: [
      { image: "analysis-1.webp", eyebrow: "ACCOUNT INSIGHTS", title: "账号经营 · 全面分析", description: "对账号进行检测分析<br>给出改进建议" },
      { image: "analysis-2.webp", eyebrow: "CONTENT ANALYTICS", title: "内容作品 · 深度分析", description: "对单个作品<br>有全方位的分析查看" },
      { image: "analysis-3.webp", eyebrow: "AUDIENCE PROFILE", title: "粉丝群体 · 受众画像", description: "明确清晰的<br>查看作品受众的特征" },
      { image: "analysis-4.webp", eyebrow: "WEEKLY RECAP", title: "阶段创作 · 周报汇总", description: "汇总一周的数据表现<br>给出创作建议" },
    ],
    revenue: [
      { image: "revenue-1.webp", eyebrow: "DEAL MARKETPLACE", title: "变现广场 · 快速找商单", description: "在这里千粉以上作者，能够快速找到合适的商单任务，接到任务并完成变现" },
      { image: "revenue-2.webp", eyebrow: "MY TASKS", title: "我的任务 · 跟踪任务进度", description: "明确清晰的展示任务详情，实时查看收到的任务，并展示我的任务进度" },
      { image: "revenue-3.webp", eyebrow: "EARNINGS SUMMARY", title: "收入金额 · 计算汇总收入", description: "呈现抖音内所有收入总额，账号收入一目了然，并且展示可提现金额" },
      { image: "revenue-4.webp", eyebrow: "REVENUE INSIGHTS", title: "收入分析 · 丰富收入渠道", description: "分解对收入来源，帮助作者清晰查看收入结构，且支持可拓展其他收入方式" },
    ],
  };

  const opsTabs = [...document.querySelectorAll("[data-ops]")];
  const opsPanel = document.querySelector("[data-ops-panel]");

  const renderOperationCards = (key) => {
    opsPanel.dataset.activeOps = key;
    opsPanel.className = `ops-grid ops-poster-grid tone-${key} is-changing`;
    opsPanel.innerHTML = operations[key]
      .map(({ image, eyebrow, title, description = "" }) => `
        <article class="ops-card ops-card--${key}">
          <div class="ops-card-copy">
            <small>${eyebrow}</small>
            <h3>${title}</h3>
            ${description ? `<p>${description}</p>` : ""}
          </div>
          <div class="ops-card-visual" aria-hidden="true">
            <img src="./assets/figma-v2/ops-tabs/${image}" alt="" loading="lazy" decoding="async">
          </div>
        </article>`)
      .join("");
  };

  renderOperationCards("publish");
  opsPanel.classList.remove("is-changing");

  opsTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains("active")) return;
      selectTabs(opsTabs, tab);
      opsPanel.classList.add("is-changing");
      window.setTimeout(() => {
        renderOperationCards(tab.dataset.ops);
        requestAnimationFrame(() => opsPanel.classList.remove("is-changing"));
      }, reducedMotion.matches ? 0 : 180);
    });
  });

  const revealGroups = [
    [".section-heading", 0],
    [".ai-card", 90],
    [".ops-tabs", 0],
    [".ops-grid article", 85],
    [".benefit-grid a", 90],
  ];
  const revealItems = revealGroups.flatMap(([selector, stagger]) =>
    [...document.querySelectorAll(selector)].map((element, index) => {
      element.classList.add("reveal-item");
      element.style.setProperty("--reveal-delay", `${index * stagger}ms`);
      return element;
    }),
  );

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const nav = document.querySelector(".site-nav");
  const hero = document.querySelector(".hero");
  const orbs = [...hero.querySelectorAll(".orb")];
  const orbMotion = [
    [13, 10, -76],
    [12, 9, -24],
    [11, 9, -50],
    [14, 11, -42],
    [12, 10, -62],
  ];
  const orbOffsets = orbMotion.map(() => ({ x: 0, y: 0 }));
  let pointerX = 0;
  let pointerY = 0;
  let pointerActive = false;
  let ticking = false;

  const updateMotion = () => {
    const scrollY = window.scrollY;
    const progress = Math.min(1, Math.max(0, scrollY / Math.max(hero.offsetHeight, 1)));
    nav.classList.toggle("is-scrolled", scrollY > Math.max(80, hero.offsetHeight - 72));
    root.style.setProperty("--brand-y", `${progress * -26}px`);
    root.style.setProperty("--hero-edge-rise", `${progress * 100}px`);
    root.style.setProperty("--hero-scroll-shift", `${progress * -55}px`);
    const reach = Math.max(300, Math.min(680, hero.clientWidth * 0.54));
    let settling = false;
    orbMotion.forEach(([maxX, maxY, scroll], index) => {
      const orb = orbs[index];
      const offset = orbOffsets[index];
      const dx = pointerX - (orb.offsetLeft + orb.offsetWidth / 2);
      const dy = pointerY - (orb.offsetTop + orb.offsetHeight / 2);
      const distance = Math.hypot(dx, dy);
      const proximity = pointerActive ? Math.pow(Math.max(0, 1 - distance / reach), 1.7) : 0;
      const aimX = (dx / (distance + 80)) * maxX * proximity;
      const aimY = (dy / (distance + 80)) * maxY * proximity;
      offset.x += (aimX - offset.x) * 0.065;
      offset.y += (aimY - offset.y) * 0.065;
      if (Math.abs(aimX - offset.x) < 0.02) offset.x = aimX;
      if (Math.abs(aimY - offset.y) < 0.02) offset.y = aimY;
      if (offset.x !== aimX || offset.y !== aimY) settling = true;
      root.style.setProperty(`--orb-${index + 1}-x`, `${offset.x}px`);
      root.style.setProperty(`--orb-${index + 1}-y`, `${progress * scroll + offset.y}px`);
      root.style.setProperty(`--orb-${index + 1}-light-x`, `${offset.x * 0.5}px`);
      root.style.setProperty(`--orb-${index + 1}-light-y`, `${offset.y * 0.5}px`);
    });
    ticking = false;
    if (settling) requestMotion();
  };

  const requestMotion = () => {
    if (reducedMotion.matches || ticking) return;
    ticking = true;
    requestAnimationFrame(updateMotion);
  };

  window.addEventListener("scroll", requestMotion, { passive: true });
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      const bounds = hero.getBoundingClientRect();
      pointerX = event.clientX - bounds.left;
      pointerY = event.clientY - bounds.top;
      pointerActive = true;
      requestMotion();
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    pointerActive = false;
    requestMotion();
  });
  updateMotion();
})();
