import { createBlaze } from "./src/components/canvasui/blaze-core.js";

const footer = document.querySelector(".site-footer");
const source = footer?.querySelector(".footer-blaze-source");
const content = footer?.querySelector(".footer-blaze-content");
const output = footer?.querySelector(".footer-blaze-output");

const STORAGE_KEY = "douyin-footer-blaze-v5";
const EDITOR_STORAGE_KEY = "douyin-footer-blaze-editor-v1";
const EDITOR_ENABLED = false;
const defaults = Object.freeze({
  enabled: true,
  opacity: 1,
  height: 0.85,
  distortion: 0.08,
  distortionScale: 0.62,
  speed: 0.34,
  sparks: 0.26,
  sparkDensity: 1.9,
  sparkSize: 1.05,
  layers: 8,
  smoke: 0.96,
  glow: 2.5,
  sparkColor: [0.784314, 0.87451, 1],
  smokeColor: [0.313725, 0.34902, 0.443137],
});

const numericControls = [
  { key: "opacity", label: "整体透明度", min: 0, max: 1, step: 0.01 },
  { key: "height", label: "火焰高度", min: 0.08, max: 0.85, step: 0.01 },
  { key: "speed", label: "动画速度", min: 0.05, max: 2, step: 0.01 },
  { key: "sparks", label: "火星亮度", min: 0, max: 1.5, step: 0.01 },
  { key: "sparkDensity", label: "火星密度", min: 0.5, max: 4, step: 0.05 },
  { key: "sparkSize", label: "火星大小", min: 0.1, max: 2, step: 0.01 },
  { key: "layers", label: "景深层数", min: 1, max: 8, step: 1 },
  { key: "smoke", label: "烟雾强度", min: 0, max: 1.2, step: 0.01 },
  { key: "glow", label: "底部辉光", min: 0, max: 2.5, step: 0.01 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function normalizeColor(value, fallback) {
  if (!Array.isArray(value) || value.length !== 3) return [...fallback];
  return value.map((channel, index) =>
    Number.isFinite(Number(channel))
      ? clamp(channel, 0, 1)
      : fallback[index],
  );
}

function normalize(candidate = {}) {
  const next = { ...defaults, ...candidate };
  for (const control of numericControls) {
    next[control.key] = clamp(next[control.key], control.min, control.max);
  }
  next.layers = Math.round(next.layers);
  next.enabled = Boolean(next.enabled);
  next.sparkColor = normalizeColor(next.sparkColor, defaults.sparkColor);
  next.smokeColor = normalizeColor(next.smokeColor, defaults.smokeColor);
  return next;
}

function loadTuning() {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    return normalize();
  }
}

function colorToHex(color) {
  return `#${color
    .map((channel) => Math.round(clamp(channel, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0"))
    .join("")}`;
}

function hexToColor(value) {
  const hex = value.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
}

function blazeOptions(tuning) {
  const {
    enabled: _enabled,
    opacity: _opacity,
    ...options
  } = tuning;
  return options;
}

if (
  footer instanceof HTMLElement &&
  source instanceof HTMLCanvasElement &&
  content instanceof HTMLElement &&
  output instanceof HTMLCanvasElement
) {
  let tuning = loadTuning();
  let syncEditor = () => {};
  const instance = createBlaze(
    { source, content, output },
    blazeOptions(tuning),
  );

  if (instance) {
    function applyTuning(next, persist = true) {
      tuning = normalize({ ...tuning, ...next });
      instance.setOptions(blazeOptions(tuning));
      footer.style.setProperty(
        "--footer-blaze-opacity",
        tuning.enabled ? String(tuning.opacity) : "0",
      );
      if (persist) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
        } catch {}
      }
      syncEditor();
      window.dispatchEvent(new CustomEvent("footer-blaze-change", {
        detail: { ...tuning },
      }));
    }

    if (EDITOR_ENABLED) {
    const editor = document.createElement("aside");
    let editorOpen = true;
    try {
      editorOpen = localStorage.getItem(EDITOR_STORAGE_KEY) !== "closed";
    } catch {}
    editor.className = `blaze-editor${editorOpen ? " is-open" : ""}`;
    editor.innerHTML = `
      <div class="blaze-editor-panel" aria-label="底部火焰参数编辑器">
        <div class="blaze-editor-heading">
          <strong>底部火焰</strong>
          <div><button type="button" data-action="copy">复制参数</button><button type="button" data-action="reset">重置</button></div>
        </div>
        <p>调整会实时预览，并保存在当前浏览器。</p>
        <label class="blaze-editor-check">显示火焰 <input data-key="enabled" type="checkbox"></label>
        <div class="blaze-editor-ranges"></div>
        <h4>颜色</h4>
        <label class="blaze-editor-color">火星颜色 <input data-key="sparkColor" type="color"></label>
        <label class="blaze-editor-color">烟雾与辉光 <input data-key="smokeColor" type="color"></label>
      </div>
      <button class="blaze-editor-toggle" type="button" aria-expanded="${editorOpen}">火焰调节 <span>${editorOpen ? "收起" : "展开"}</span></button>`;

    const ranges = editor.querySelector(".blaze-editor-ranges");
    numericControls.forEach((control) => {
      const label = document.createElement("label");
      label.innerHTML = `${control.label}<output data-output="${control.key}"></output><input data-key="${control.key}" type="range" min="${control.min}" max="${control.max}" step="${control.step}">`;
      ranges.append(label);
    });
    document.body.append(editor);

    const toggle = editor.querySelector(".blaze-editor-toggle");
    syncEditor = () => {
      editor.querySelectorAll("input[data-key]").forEach((input) => {
        const key = input.dataset.key;
        if (input.type === "checkbox") {
          input.checked = Boolean(tuning[key]);
        } else if (input.type === "color") {
          input.value = colorToHex(tuning[key]);
        } else {
          input.value = String(tuning[key]);
          const value = Number(tuning[key]);
          editor.querySelector(`[data-output="${key}"]`).textContent =
            key === "layers" ? String(value) : value.toFixed(2);
        }
      });
    };

    toggle.addEventListener("click", () => {
      const open = editor.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector("span").textContent = open ? "收起" : "展开";
      try {
        localStorage.setItem(EDITOR_STORAGE_KEY, open ? "open" : "closed");
      } catch {}
    });

    editor.querySelectorAll("input[data-key]").forEach((input) => {
      input.addEventListener("input", () => {
        const key = input.dataset.key;
        const value = input.type === "checkbox"
          ? input.checked
          : input.type === "color"
            ? hexToColor(input.value)
            : Number(input.value);
        applyTuning({ [key]: value });
      });
    });

    editor.querySelector('[data-action="reset"]').addEventListener("click", () => {
      tuning = normalize(defaults);
      applyTuning(tuning);
    });

    editor.querySelector('[data-action="copy"]').addEventListener("click", async (event) => {
      const button = event.currentTarget;
      try {
        await navigator.clipboard.writeText(JSON.stringify(tuning, null, 2));
        button.textContent = "已复制";
        window.setTimeout(() => { button.textContent = "复制参数"; }, 1200);
      } catch {
        button.textContent = "复制失败";
      }
    });
    }

    window.getFooterBlazeTuning = () => ({ ...tuning });
    window.setFooterBlazeTuning = (next) => applyTuning(next);
    window.resetFooterBlazeTuning = () => applyTuning(defaults);

    applyTuning(tuning, false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => footer.classList.add("footer-blaze-ready"));
    });

    window.addEventListener("pagehide", () => instance.destroy(), { once: true });
  }
}
