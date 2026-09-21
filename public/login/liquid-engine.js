const DEFAULTS = {
    simResolution: 128,
    dyeResolution: 512,
    densityDissipation: 0.96,
    dissipationVariation: 0,
    velocityDissipation: 1,
    pressure: 0.8,
    pressureIterations: 4,
    curl: 1.9,
    radius: 0.3,
    force: 1.1,
    intensity: 2,
    distortion: 0.4,
    blend: 5,
    color: [
        0.145,
        0.239,
        0.867
    ],
    rainbow: false,
    overlayOnly: false
};
const DT = 1 / 60;
function srgbToLinear(value) {
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}
const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const FRAG_DISPLAY = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform sampler2D uFluid;
uniform vec3 uColor;
uniform float uDistortion;
uniform float uIntensity;
uniform float uBlend;
uniform float uRainbow;
uniform float uHasContent;
uniform vec2 uContentScale;
vec3 toLinear (vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 toSrgb (vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 spectrum (float t) {
  return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.67, 0.33)));
}
void main () {
  vec3 fluid = texture(uFluid, vUv).rgb;
  float hue = fract(atan(fluid.g, fluid.r) / 6.2831853 + 0.5);
  if (uHasContent < 0.5) {
    float mag = length(fluid);
    vec3 tint = uRainbow == 1.0
      ? mix(vec3(1.0), spectrum(hue), 0.88)
      : uColor;
    float overlay = (1.0 - exp(-mag * uIntensity * 0.5)) * 0.82;
    outColor = vec4(toSrgb(clamp(tint, 0.0, 1.0)) * overlay, overlay);
    return;
  }
  vec2 uv = vUv - fluid.rg * uDistortion * 0.001;
  vec2 contentUv = vec2(uv.x, 1.0 - uv.y);
  contentUv = (contentUv - 0.5) * uContentScale + 0.5;
  vec4 content = texture(uContent, contentUv);
  content.rgb = toLinear(content.rgb);
  vec3 tint = uRainbow == 1.0 ? spectrum(hue) * length(fluid) : uColor * length(fluid);
  vec4 fluidColor = vec4(tint, 1.0);
  vec4 blended = mix(content, fluidColor, uBlend * 0.01 * clamp(length(fluid), 0.0, 1.0));
  vec4 final = mix(blended, vec4(0.0), 1.0 - content.a);
  outColor = vec4(toSrgb(clamp(final.rgb, 0.0, 1.0)), final.a);
}`;
const FRAG_SPLAT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
void main () {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture(uTarget, vUv).xyz;
  outColor = vec4(base + splat, 1.0);
}`;
const FRAG_ADVECT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float uDt;
uniform float uDissipation;
uniform float uDissipationVariation;
void main () {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * texelSize;
  float cloud = clamp(0.5 + 0.27 * sin(vUv.x * 19.0 + vUv.y * 7.0) + 0.23 * sin(vUv.y * 23.0 - vUv.x * 11.0), 0.0, 1.0);
  float localRate = pow(uDissipation, mix(1.0, 0.45 + cloud * 1.35, uDissipationVariation));
  outColor = localRate * texture(uSource, coord);
  outColor.a = 1.0;
}`;
const FRAG_CLEAR = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTexture;
uniform float uValue;
void main () {
  outColor = uValue * texture(uTexture, vUv);
}`;
const FRAG_DIVERGENCE = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);
  outColor = vec4(div, 0.0, 0.0, 1.0);
}`;
const FRAG_CURL = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  outColor = vec4(vorticity, 0.0, 0.0, 1.0);
}`;
const FRAG_VORTICITY = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float uDt;
void main () {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = vec2(abs(T) - abs(B), abs(R) - abs(L)) * 0.5;
  force /= length(force) + 1.0;
  force *= uCurlStrength * C;
  force.y *= -1.0;
  vec2 velocity = texture(uVelocity, vUv).xy;
  outColor = vec4(velocity + force * uDt, 0.0, 1.0);
}`;
const FRAG_PRESSURE = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  outColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;
const FRAG_GRADIENT = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  outColor = vec4(velocity, 0.0, 1.0);
}`;
function supportsHtmlInCanvas() {
    if (typeof document === "undefined") return false;
    const probe = document.createElement("canvas");
    const ctx = probe.getContext("2d");
    return Boolean(ctx && typeof ctx.drawElementImage === "function" && typeof probe.requestPaint === "function");
}
export function createLiquid(elements, options = {}) {
    const config = {
        ...DEFAULTS,
        ...options
    };
    const { source, content, output, pointerTarget } = elements;
    const gl = output.getContext("webgl2", {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        premultipliedAlpha: true
    });
    if (!gl || gl.isContextLost()) return null;
    const sourceCtx = source.getContext("2d");
    const paintable = source;
    const htmlInCanvas = Boolean(sourceCtx && typeof sourceCtx.drawElementImage === "function" && typeof paintable.requestPaint === "function");
    const videoSource = htmlInCanvas ? null : content.querySelector("video");
    const imageSource = htmlInCanvas || videoSource ? null : content.querySelector("img");
    const canvasSource = htmlInCanvas || videoSource || imageSource ? null : content.querySelector("canvas");
    let videoReady = Boolean(videoSource && videoSource.readyState >= 2);
    let imageReady = Boolean(imageSource && imageSource.complete && imageSource.naturalWidth > 0);
    let canvasReady = Boolean(canvasSource && canvasSource.width > 0 && canvasSource.height > 0);
    let contentDirty = Boolean(videoSource || imageSource || canvasSource);
    let wake = ()=>{};
    const markVideoDirty = ()=>{
        videoReady = Boolean(videoSource && videoSource.readyState >= 2);
        contentDirty = true;
        wake();
    };
    if (videoSource) {
        videoSource.addEventListener("loadeddata", markVideoDirty);
        videoSource.addEventListener("seeked", markVideoDirty);
        videoSource.addEventListener("timeupdate", markVideoDirty);
    }
    const markImageDirty = ()=>{
        imageReady = Boolean(imageSource && imageSource.complete && imageSource.naturalWidth > 0);
        contentDirty = true;
        wake();
    };
    if (imageSource) {
        imageSource.addEventListener("load", markImageDirty);
        imageSource.addEventListener("error", markImageDirty);
    }
    const markCanvasDirty = ()=>{
        canvasReady = Boolean(canvasSource && canvasSource.width > 0 && canvasSource.height > 0);
        contentDirty = true;
        wake();
    };
    if (canvasSource) canvasSource.addEventListener("liquidcontentchange", markCanvasDirty);
    if (htmlInCanvas) {
        paintable.onpaint = ()=>{
            try {
                sourceCtx.reset();
                sourceCtx.drawElementImage(content, 0, 0);
                contentDirty = true;
                wake();
            } catch  {}
        };
    }
    gl.getExtension("EXT_color_buffer_float");
    const supportsLinear = Boolean(gl.getExtension("OES_texture_float_linear"));
    const filtering = supportsLinear ? gl.LINEAR : gl.NEAREST;
    const shaders = [];
    function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Liquid shader error:", gl.getShaderInfoLog(shader));
        }
        shaders.push(shader);
        return shader;
    }
    const vertexShader = compile(gl.VERTEX_SHADER, VERT);
    const programs = [];
    function createProgram(fragSource) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragSource));
        gl.linkProgram(program);
        programs.push(program);
        const uniforms = {};
        const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for(let i = 0; i < count; i++){
            const info = gl.getActiveUniform(program, i);
            uniforms[info.name] = gl.getUniformLocation(program, info.name);
        }
        return {
            program,
            uniforms
        };
    }
    const displayProgram = createProgram(FRAG_DISPLAY);
    const splatProgram = createProgram(FRAG_SPLAT);
    const advectProgram = createProgram(FRAG_ADVECT);
    const clearProgram = createProgram(FRAG_CLEAR);
    const divergenceProgram = createProgram(FRAG_DIVERGENCE);
    const curlProgram = createProgram(FRAG_CURL);
    const vorticityProgram = createProgram(FRAG_VORTICITY);
    const pressureProgram = createProgram(FRAG_PRESSURE);
    const gradientProgram = createProgram(FRAG_GRADIENT);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1,
        -1,
        1,
        -1,
        -1,
        1,
        1,
        1
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    function createTarget(size, internalFormat, format, filter) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, size, size, 0, format, gl.HALF_FLOAT, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, size, size);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return {
            fbo,
            texture,
            width: size,
            height: size
        };
    }
    function createDoubleTarget(size, internalFormat, format, filter) {
        let read = createTarget(size, internalFormat, format, filter);
        let write = createTarget(size, internalFormat, format, filter);
        return {
            get read () {
                return read;
            },
            get write () {
                return write;
            },
            swap () {
                const t = read;
                read = write;
                write = t;
            }
        };
    }
    const velocity = createDoubleTarget(config.simResolution, gl.RG16F, gl.RG, filtering);
    const dye = createDoubleTarget(config.dyeResolution, gl.RGBA16F, gl.RGBA, filtering);
    const divergence = createTarget(config.simResolution, gl.R16F, gl.RED, gl.NEAREST);
    const curl = createTarget(config.simResolution, gl.R16F, gl.RED, gl.NEAREST);
    const pressure = createDoubleTarget(config.simResolution, gl.R16F, gl.RED, gl.NEAREST);
    function releaseAll() {
        [
            velocity.read,
            velocity.write,
            dye.read,
            dye.write,
            pressure.read,
            pressure.write,
            divergence,
            curl
        ].forEach((t)=>{
            gl.deleteFramebuffer(t.fbo);
            gl.deleteTexture(t.texture);
        });
    }
    let texelX = 0;
    let texelY = 0;
    function updateTexelSize() {
        const width = Math.max(output.clientWidth, 1);
        const height = Math.max(output.clientHeight, 1);
        texelX = 1 / (config.simResolution * (width / (height + 400)));
        texelY = 1 / config.simResolution;
    }
    function syncCanvasSize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(output.clientWidth * dpr));
        const height = Math.max(1, Math.round(output.clientHeight * dpr));
        if (output.width !== width || output.height !== height) {
            output.width = width;
            output.height = height;
        }
        if (htmlInCanvas || imageSource) {
            const cssWidth = Math.max(1, Math.round(imageSource ? output.clientWidth : source.clientWidth));
            const cssHeight = Math.max(1, Math.round(imageSource ? output.clientHeight : source.clientHeight));
            if (source.width !== cssWidth * dpr || source.height !== cssHeight * dpr) {
                source.width = cssWidth * dpr;
                source.height = cssHeight * dpr;
                contentDirty = true;
            }
            if (htmlInCanvas) paintable.requestPaint();
        }
        updateTexelSize();
    }
    syncCanvasSize();
    const contentTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, contentTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([
        0,
        0,
        0,
        0
    ]));
    function uploadContent() {
        // The hero is a scroll-scrubbed WebP sequence: while the liquid is awake,
        // refresh the image texture so the refraction never freezes on an old frame.
        if (!contentDirty && !imageSource) return;
        if (!htmlInCanvas && (!videoSource || videoSource.readyState < 2) && !imageReady && !canvasReady) return;
        contentDirty = false;
        if (imageSource && imageReady && sourceCtx) {
            const cssWidth = Math.max(output.clientWidth, 1);
            const cssHeight = Math.max(output.clientHeight, 1);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            sourceCtx.setTransform(1, 0, 0, 1, 0, 0);
            sourceCtx.clearRect(0, 0, source.width, source.height);
            sourceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const outputRect = output.getBoundingClientRect();
            const imageRect = imageSource.getBoundingClientRect();
            const unitX = cssWidth / Math.max(outputRect.width, 1);
            const unitY = cssHeight / Math.max(outputRect.height, 1);
            const imageLeft = (imageRect.left - outputRect.left) * unitX;
            const imageTop = (imageRect.top - outputRect.top) * unitY;
            const imageWidth = imageRect.width * unitX;
            const imageHeight = imageRect.height * unitY;
            const cover = Math.max(imageWidth / imageSource.naturalWidth, imageHeight / imageSource.naturalHeight);
            const drawWidth = imageSource.naturalWidth * cover;
            const drawHeight = imageSource.naturalHeight * cover;
            sourceCtx.drawImage(imageSource, imageLeft + (imageWidth - drawWidth) / 2, imageTop + (imageHeight - drawHeight) / 2, drawWidth, drawHeight);
            sourceCtx.setTransform(1, 0, 0, 1, 0, 0);
        }
        gl.bindTexture(gl.TEXTURE_2D, contentTexture);
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, htmlInCanvas || imageSource ? source : canvasSource || videoSource);
            if (videoSource) videoReady = true;
            if (imageSource) imageReady = true;
        } catch  {
            videoReady = false;
            imageReady = false;
        }
    }
    function blit(target) {
        if (target) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
            gl.viewport(0, 0, target.width, target.height);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, output.width, output.height);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function bindTexture(texture, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return unit;
    }
    function applySplat(x, y, dx, dy, strength = 1, radiusScale = 1) {
        const aspect = output.clientWidth / Math.max(output.clientHeight, 1);
        const radius = config.radius / 100 * Math.max(.24, radiusScale);
        gl.useProgram(splatProgram.program);
        gl.uniform1i(splatProgram.uniforms.uTarget, bindTexture(velocity.read.texture, 0));
        gl.uniform1f(splatProgram.uniforms.uAspect, aspect);
        gl.uniform2f(splatProgram.uniforms.uPoint, x, y);
        gl.uniform3f(splatProgram.uniforms.uColor, dx, dy, 10);
        gl.uniform1f(splatProgram.uniforms.uRadius, radius);
        blit(velocity.write);
        velocity.swap();
        gl.uniform1i(splatProgram.uniforms.uTarget, bindTexture(dye.read.texture, 0));
        gl.uniform3f(splatProgram.uniforms.uColor, dx * strength, dy * strength, 10 * strength);
        blit(dye.write);
        dye.swap();
    }
    function step(delta) {
        gl.disable(gl.BLEND);
        gl.useProgram(curlProgram.program);
        gl.uniform2f(curlProgram.uniforms.texelSize, texelX, texelY);
        gl.uniform1i(curlProgram.uniforms.uVelocity, bindTexture(velocity.read.texture, 0));
        blit(curl);
        gl.useProgram(vorticityProgram.program);
        gl.uniform2f(vorticityProgram.uniforms.texelSize, texelX, texelY);
        gl.uniform1i(vorticityProgram.uniforms.uVelocity, bindTexture(velocity.read.texture, 0));
        gl.uniform1i(vorticityProgram.uniforms.uCurl, bindTexture(curl.texture, 1));
        gl.uniform1f(vorticityProgram.uniforms.uCurlStrength, config.curl);
        gl.uniform1f(vorticityProgram.uniforms.uDt, DT);
        blit(velocity.write);
        velocity.swap();
        gl.useProgram(divergenceProgram.program);
        gl.uniform2f(divergenceProgram.uniforms.texelSize, texelX, texelY);
        gl.uniform1i(divergenceProgram.uniforms.uVelocity, bindTexture(velocity.read.texture, 0));
        blit(divergence);
        gl.useProgram(clearProgram.program);
        gl.uniform1i(clearProgram.uniforms.uTexture, bindTexture(pressure.read.texture, 0));
        gl.uniform1f(clearProgram.uniforms.uValue, Math.pow(config.pressure, delta * 60));
        blit(pressure.write);
        pressure.swap();
        gl.useProgram(pressureProgram.program);
        gl.uniform2f(pressureProgram.uniforms.texelSize, texelX, texelY);
        gl.uniform1i(pressureProgram.uniforms.uDivergence, bindTexture(divergence.texture, 0));
        for(let i = 0; i < config.pressureIterations; i++){
            gl.uniform1i(pressureProgram.uniforms.uPressure, bindTexture(pressure.read.texture, 1));
            blit(pressure.write);
            pressure.swap();
        }
        gl.useProgram(gradientProgram.program);
        gl.uniform2f(gradientProgram.uniforms.texelSize, texelX, texelY);
        gl.uniform1i(gradientProgram.uniforms.uPressure, bindTexture(pressure.read.texture, 0));
        gl.uniform1i(gradientProgram.uniforms.uVelocity, bindTexture(velocity.read.texture, 1));
        blit(velocity.write);
        velocity.swap();
        gl.useProgram(advectProgram.program);
        gl.uniform2f(advectProgram.uniforms.texelSize, texelX, texelY);
        gl.uniform1i(advectProgram.uniforms.uVelocity, bindTexture(velocity.read.texture, 0));
        gl.uniform1i(advectProgram.uniforms.uSource, bindTexture(velocity.read.texture, 0));
        gl.uniform1f(advectProgram.uniforms.uDt, DT);
        gl.uniform1f(advectProgram.uniforms.uDissipation, Math.pow(config.velocityDissipation, delta * 60));
        gl.uniform1f(advectProgram.uniforms.uDissipationVariation, 0);
        blit(velocity.write);
        velocity.swap();
        gl.uniform1i(advectProgram.uniforms.uVelocity, bindTexture(velocity.read.texture, 0));
        gl.uniform1i(advectProgram.uniforms.uSource, bindTexture(dye.read.texture, 1));
        gl.uniform1f(advectProgram.uniforms.uDissipation, Math.pow(config.densityDissipation, delta * 60));
        gl.uniform1f(advectProgram.uniforms.uDissipationVariation, config.dissipationVariation);
        blit(dye.write);
        dye.swap();
    }
    function render() {
        uploadContent();
        gl.useProgram(displayProgram.program);
        gl.uniform1i(displayProgram.uniforms.uContent, bindTexture(contentTexture, 0));
        gl.uniform1i(displayProgram.uniforms.uFluid, bindTexture(dye.read.texture, 1));
        gl.uniform3f(displayProgram.uniforms.uColor, srgbToLinear(config.color[0]), srgbToLinear(config.color[1]), srgbToLinear(config.color[2]));
        gl.uniform1f(displayProgram.uniforms.uDistortion, effectsActive ? config.distortion : 0);
        gl.uniform1f(displayProgram.uniforms.uIntensity, effectsActive ? config.intensity : 0);
        gl.uniform1f(displayProgram.uniforms.uBlend, effectsActive ? config.blend : 0);
        gl.uniform1f(displayProgram.uniforms.uRainbow, config.rainbow ? 1 : 0);
        const hasContent = !config.overlayOnly && (htmlInCanvas || videoReady || imageReady || canvasReady);
        let scaleX = 1;
        let scaleY = 1;
        if (videoReady && videoSource?.videoWidth && videoSource.videoHeight) {
            const contentAspect = videoSource.videoWidth / videoSource.videoHeight;
            const outputAspect = output.clientWidth / Math.max(output.clientHeight, 1);
            if (contentAspect > outputAspect) scaleX = outputAspect / contentAspect;
            else scaleY = contentAspect / outputAspect;
        }
        gl.uniform2f(displayProgram.uniforms.uContentScale, scaleX, scaleY);
        gl.uniform1f(displayProgram.uniforms.uHasContent, hasContent ? 1 : 0);
        blit(null);
    }
    const queued = [];
    let raf = 0;
    let lastTime = performance.now();
    let destroyed = false;
    let running = false;
    let visible = true;
    let effectsActive = true;
    let idleAt = 0;
    function idleDelayMs() {
        const dissipation = Math.min(config.densityDissipation, 0.999);
        const frames = Math.log(1e-7) / Math.log(dissipation);
        return frames / 60 * 1000;
    }
    function frame(now) {
        if (destroyed) return;
        if (!visible) {
            running = false;
            return;
        }
        const delta = Math.min((now - lastTime) / 1000, 1 / 30);
        lastTime = now;
        if (!effectsActive) {
            render();
            running = false;
            return;
        }
        if (queued.length > 0) {
            idleAt = now + idleDelayMs();
            while(queued.length > 0){
                const [x, y, dx, dy, strength, radiusScale] = queued.pop();
                applySplat(x, y, dx, dy, strength, radiusScale);
            }
        }
        step(delta);
        render();
        if (now >= idleAt && !contentDirty) {
            running = false;
            return;
        }
        raf = requestAnimationFrame(frame);
    }
    function start() {
        if (destroyed || running || !visible) return;
        running = true;
        lastTime = performance.now();
        raf = requestAnimationFrame(frame);
    }
    wake = start;
    start();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    function onMotionChange() {
        reducedMotion = motionQuery.matches;
        if (!reducedMotion) start();
    }
    motionQuery.addEventListener("change", onMotionChange);
    const pointers = new Map();
    function onPointerMove(event) {
        if (reducedMotion || !effectsActive || document.hidden) return;
        const rect = output.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        const previous = pointers.get(event.pointerId);
        pointers.set(event.pointerId, {
            x: px,
            y: py
        });
        if (!previous) return;
        const dx = (px - previous.x) * config.force;
        const dy = -(py - previous.y) * config.force;
        queued.push([
            px / rect.width,
            1 - py / rect.height,
            dx,
            dy,
            1,
            1
        ]);
        start();
    }
    function onPointerLeave(event) {
        pointers.delete(event.pointerId);
    }
    const listenTarget = pointerTarget ?? output.parentElement ?? output;
    listenTarget.addEventListener("pointermove", onPointerMove);
    listenTarget.addEventListener("pointerleave", onPointerLeave);
    listenTarget.addEventListener("pointercancel", onPointerLeave);
    const observer = new ResizeObserver(()=>{
        syncCanvasSize();
        start();
    });
    observer.observe(output);
    const intersection = new IntersectionObserver((entries)=>{
        visible = entries[entries.length - 1]?.isIntersecting ?? true;
        if (visible) start();
    });
    intersection.observe(output);
    return {
        splat (x, y, dx, dy, strength = 1, radiusScale = 1) {
            if (reducedMotion) return;
            queued.push([
                x,
                y,
                dx,
                dy,
                strength,
                radiusScale
            ]);
            start();
        },
        setOptions (next) {
            if (!Object.entries(next).some(([key, value])=>config[key] !== value)) return;
            const { simResolution, dyeResolution, ...rest } = next;
            void simResolution;
            void dyeResolution;
            Object.assign(config, rest);
            start();
        },
        resize () {
            syncCanvasSize();
            start();
        },
        setActive (active) {
            effectsActive = active;
            if (!active) queued.length = 0;
            start();
        },
        destroy () {
            destroyed = true;
            cancelAnimationFrame(raf);
            observer.disconnect();
            intersection.disconnect();
            motionQuery.removeEventListener("change", onMotionChange);
            releaseAll();
            gl.deleteTexture(contentTexture);
            programs.forEach((program)=>gl.deleteProgram(program));
            shaders.forEach((shader)=>gl.deleteShader(shader));
            gl.deleteBuffer(quad);
            if (htmlInCanvas) paintable.onpaint = null;
            if (videoSource) {
                videoSource.removeEventListener("loadeddata", markVideoDirty);
                videoSource.removeEventListener("seeked", markVideoDirty);
                videoSource.removeEventListener("timeupdate", markVideoDirty);
            }
            if (imageSource) {
                imageSource.removeEventListener("load", markImageDirty);
                imageSource.removeEventListener("error", markImageDirty);
            }
            if (canvasSource) canvasSource.removeEventListener("liquidcontentchange", markCanvasDirty);
            listenTarget.removeEventListener("pointermove", onPointerMove);
            listenTarget.removeEventListener("pointerleave", onPointerLeave);
            listenTarget.removeEventListener("pointercancel", onPointerLeave);
        }
    };
}
