/* A quiet WebGL glyph field for the login hero. The existing gradient and ASCII art remain intact. */
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-particles';
  canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas);

  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: true, powerPreference: 'low-power',
  });
  if (!gl) { canvas.remove(); return; }

  const vertexSource = `
    precision highp float;
    attribute vec3 aPoint;
    uniform vec2 uSize;
    uniform vec3 uTrail[16];
    uniform float uTime, uDpr, uCell;
    varying float vAlpha, vKind, vHeat;
    float segment(vec2 p, vec2 a, vec2 b) {
      vec2 ab = b - a;
      float t = clamp(dot(p - a, ab) / max(dot(ab, ab), .001), 0., 1.);
      return length(p - a - t * ab);
    }
    void main() {
      vec2 p = aPoint.xy;
      p.x += sin(aPoint.y * .012 - uTime * .40) * 2.2;
      p.y += sin(aPoint.x * .009 + aPoint.y * .004 - uTime * .34) * 2.8;
      float heat = 0.;
      for (int i = 0; i < 15; i++) {
        float life = min(uTrail[i].z, uTrail[i + 1].z);
        float trailDistance = segment(p, uTrail[i].xy, uTrail[i + 1].xy);
        heat = max(heat, (1. - smoothstep(2., 8., trailDistance)) * life);
      }
      float current = .5 + .3 * sin(p.x * .010 + p.y * .009 - uTime * .55)
                           + .2 * sin(p.x * -.006 + p.y * .013 - uTime * .39);
      float edge = smoothstep(40., 200., p.y) * (1. - smoothstep(uSize.y - 245., uSize.y, p.y));
      float centerQuiet = 1. - .72 * exp(-pow((p.x - uSize.x * .67) / (uSize.x * .29), 2.)
                                         -pow((p.y - uSize.y * .44) / 220., 2.));
      vAlpha = (.024 + .12 * pow(current, 1.65)) * edge * centerQuiet * step(.13, aPoint.z);
      vHeat = heat * edge * centerQuiet * step(.13, aPoint.z);
      vKind = mod(floor(aPoint.z * 31.), 3.);
      gl_Position = vec4(p.x / uSize.x * 2. - 1., 1. - p.y / uSize.y * 2., 0., 1.);
      gl_PointSize = min(uCell * .75, 5.) * uDpr;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying float vAlpha, vKind, vHeat;
    float box(vec2 p, vec2 c, float radius) {
      return 1. - smoothstep(radius - .045, radius + .045,
                             max(abs(p.x - c.x), abs(p.y - c.y)));
    }
    void main() {
      vec2 p = gl_PointCoord - .5;
      float d = length(p);
      float glyph;
      if (vKind < .5) glyph = 1. - smoothstep(.17, .23, d);
      else if (vKind < 1.5) glyph = (1. - smoothstep(.35, .42, d)) * smoothstep(.12, .19, d);
      else glyph = max(box(p, vec2(-.12, -.12), .20), box(p, vec2(.12, .12), .20));
      float alpha = glyph * mix(vAlpha, .30, vHeat);
      vec3 color = mix(vec3(.72, .80, .95), vec3(1.), vHeat);
      gl_FragColor = vec4(color * alpha, alpha);
    }
  `;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error);
    }
    return shader;
  };

  let program, vertex, fragment;
  try {
    vertex = compile(gl.VERTEX_SHADER, vertexSource);
    fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    console.warn('Hero particles unavailable; original background retained.', error);
    canvas.remove();
    return;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const point = gl.getAttribLocation(program, 'aPoint');
  gl.enableVertexAttribArray(point);
  gl.vertexAttribPointer(point, 3, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['uSize', 'uTrail[0]', 'uTime', 'uDpr', 'uCell']
    .map((name) => [name, gl.getUniformLocation(program, name)]));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const asciiLayer = hero.querySelector('.ascii-map-live');
  const maskWidth = 1642, maskHeight = 1642, maskCellWidth = 10, maskCellHeight = 13;
  const maskColumns = Math.ceil(maskWidth / maskCellWidth);
  const maskRows = Math.ceil(maskHeight / maskCellHeight);
  const asciiOccupied = new Uint8Array(maskColumns * maskRows);
  let maskReady = false;
  canvas.style.visibility = 'hidden';
  const trailData = new Float32Array(16 * 3);
  let width = 1, height = 1, dpr = 1, cell = 8, count = 0;
  let targetX = -1000, targetY = -1000, x = -1000, y = -1000;
  let pointerActive = false, time = 0, last = 0, visible = true;
  let trail = [];

  const resize = () => {
    width = Math.max(1, hero.clientWidth);
    height = Math.max(1, hero.clientHeight);
    dpr = Math.min(devicePixelRatio || 1, 1.25);
    cell = Math.max(coarse.matches ? 10 : 8, Math.sqrt(width * height / 28000));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const points = [];
    const heroRect = hero.getBoundingClientRect();
    const asciiRect = asciiLayer?.getBoundingClientRect();
    const asciiLeft = asciiRect ? asciiRect.left - heroRect.left : 0;
    const asciiTop = asciiRect ? asciiRect.top - heroRect.top : 0;
    const asciiScaleX = asciiRect ? maskWidth / asciiRect.width : 1;
    const asciiScaleY = asciiRect ? maskHeight / asciiRect.height : 1;
    const overlapsAscii = (pointX, pointY) => {
      if (!maskReady || !asciiRect) return false;
      const sampleX = (pointX - asciiLeft) * asciiScaleX;
      const sampleY = (pointY - asciiTop) * asciiScaleY;
      const maskX = Math.floor(sampleX / maskCellWidth);
      const maskY = Math.floor(sampleY / maskCellHeight);
      if (maskX < 0 || maskX >= maskColumns || maskY < 0 || maskY >= maskRows) return false;
      // Leave a one-cell gutter so drifting points never touch the ASCII glyphs.
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
          const x = maskX + offsetX, y = maskY + offsetY;
          if (x >= 0 && x < maskColumns && y >= 0 && y < maskRows && asciiOccupied[y * maskColumns + x]) return true;
        }
      }
      return false;
    };
    let seed = 71;
    for (let row = -cell; row < height + cell; row += cell) {
      for (let column = -cell; column < width + cell; column += cell) {
        if (overlapsAscii(column, row)) continue;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        points.push(column, row, seed / 4294967296);
      }
    }
    count = points.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
  };

  hero.addEventListener('pointermove', (event) => {
    if (reduced.matches || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    targetX = event.clientX - bounds.left;
    targetY = event.clientY - bounds.top;
    if (!pointerActive) { x = targetX; y = targetY; }
    pointerActive = true;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerActive = false; });
  window.addEventListener('blur', () => { pointerActive = false; trail = []; });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    last = 0;
  });
  observer.observe(hero);
  new ResizeObserver(resize).observe(hero);
  resize();

  if (asciiLayer?.dataset.source) {
    const source = new Image();
    source.addEventListener('load', () => {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = maskWidth;
      maskCanvas.height = maskHeight;
      const context = maskCanvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        const scale = Math.max(maskWidth / source.naturalWidth, maskHeight / source.naturalHeight);
        const drawWidth = source.naturalWidth * scale;
        const drawHeight = source.naturalHeight * scale;
        context.drawImage(source, (maskWidth - drawWidth) / 2, (maskHeight - drawHeight) / 2, drawWidth, drawHeight);
        const pixels = context.getImageData(0, 0, maskWidth, maskHeight).data;
        for (let row = 0; row < maskRows; row++) {
          for (let column = 0; column < maskColumns; column++) {
            let alpha = 0, samples = 0;
            for (let y = row * maskCellHeight; y < Math.min((row + 1) * maskCellHeight, maskHeight); y += 2) {
              for (let x = column * maskCellWidth; x < Math.min((column + 1) * maskCellWidth, maskWidth); x += 2) {
                alpha += pixels[(y * maskWidth + x) * 4 + 3];
                samples++;
              }
            }
            asciiOccupied[row * maskColumns + column] = alpha / (samples * 255) >= .018 ? 1 : 0;
          }
        }
      }
      maskReady = true;
      resize();
      canvas.style.visibility = 'visible';
    }, { once: true });
    source.addEventListener('error', () => { canvas.style.visibility = 'visible'; }, { once: true });
    source.src = asciiLayer.dataset.source;
  } else {
    canvas.style.visibility = 'visible';
  }

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now;
    if (!reduced.matches) {
      time += dt;
      const follow = 1 - Math.exp(-dt * 6);
      x += (targetX - x) * follow;
      y += (targetY - y) * follow;
      const previous = trail[trail.length - 1];
      if (pointerActive && (!previous || now - previous.t > 70)) {
        trail.push({ x, y, t: now });
        if (trail.length > 16) trail.shift();
      }
    } else {
      trail = [];
    }
    trailData.fill(0);
    trail = trail.filter((item) => now - item.t < 550);
    trail.forEach((item, index) => {
      trailData[index * 3] = item.x;
      trailData[index * 3 + 1] = item.y;
      trailData[index * 3 + 2] = 1 - (now - item.t) / 550;
    });
    gl.uniform2f(uniforms.uSize, width, height);
    gl.uniform3fv(uniforms['uTrail[0]'], trailData);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform1f(uniforms.uDpr, dpr);
    gl.uniform1f(uniforms.uCell, cell);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
  };
  requestAnimationFrame(frame);
})();
