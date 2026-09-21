import { memo, useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { smartFloat, smartOrbGeometry } from './smart-orbit'
import type { GlassSettings } from './glass-settings'

const artworkVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const artworkFragmentShader = `
  uniform sampler2D uPosterMap;
  uniform sampler2D uVideoMap;
  uniform float uVideoMix;
  uniform vec2 uPosterScale;
  uniform vec2 uVideoScale;
  uniform vec2 uMediaCenter;
  uniform float uBrightness;
  uniform float uSaturation;
  uniform float uContrast;
  varying vec2 vUv;
  void main() {
    vec4 sampleColor = texture2D(uPosterMap, (vUv - 0.5) * uPosterScale + uMediaCenter);
    if (uVideoMix > 0.0) {
      // Video textures need the same sRGB decode as Three's built-in map shader.
      // Poster textures are already decoded by the GPU's sRGB texture format.
      vec4 videoColor = sRGBTransferEOTF(texture2D(uVideoMap, (vUv - 0.5) * uVideoScale + uMediaCenter));
      sampleColor = mix(sampleColor, videoColor, uVideoMix);
    }
    float luma = dot(sampleColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    vec3 color = mix(vec3(luma), sampleColor.rgb, uSaturation);
    color = (color - 0.5) * uContrast + 0.5;
    color = max(color * uBrightness, vec3(0.0));
    gl_FragColor = vec4(color, sampleColor.a);
    #include <colorspace_fragment>
  }
`

type GlassSceneProps = {
  expanded?: boolean
  posters: string[]
  captions: { title: string; description: string }[]
  phaseRef: RefObject<number>
  hoveredRef: RefObject<number | null>
  readyVideoRef: RefObject<number | null>
  videoRefs: RefObject<(HTMLVideoElement | null)[]>
  settingsRef: RefObject<GlassSettings>
  onReady: (ready: boolean) => void
}

function SmartGlassScene({ expanded = false, posters, captions, phaseRef, hoveredRef, readyVideoRef, videoRefs, settingsRef, onReady }: GlassSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      return
    }

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)")
    let disposed = false
    let frame = 0
    let visible = true
    let lastRenderTime = 0
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0xffffff, 0)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    // Extend the viewport below the balls without changing their screen-space size.
    const camera = new THREE.OrthographicCamera(-173.5, 173.5, 70, expanded ? -158 : -142, 0.1, 1000)
    camera.position.z = 400
    const room = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environmentTarget = pmrem.fromScene(room, 0.04)
    scene.environment = environmentTarget.texture
    const circleGeometry = new THREE.CircleGeometry(expanded ? 1 : 0.87, 64)
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 40)
    const initialSettings = settingsRef.current
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(initialSettings.tintColor),
      metalness: 0,
      // Explicit material maps enable independent envMapRotation per sphere.
      envMap: environmentTarget.texture,
      transmission: initialSettings.transmission,
      ior: initialSettings.ior,
      thickness: initialSettings.thickness,
      roughness: initialSettings.roughness,
      clearcoat: initialSettings.clearcoat,
      clearcoatRoughness: initialSettings.clearcoatRoughness,
      specularIntensity: initialSettings.specularIntensity,
      envMapIntensity: initialSettings.envMapIntensity,
      dispersion: initialSettings.dispersion,
      attenuationColor: new THREE.Color(initialSettings.attenuationColor),
      attenuationDistance: initialSettings.attenuationDistance,
      opacity: 1,
      depthWrite: false,
    })
    const shellMaterials = posters.map((_, index) => index === 0 ? shellMaterial : shellMaterial.clone())
    // Orthographic rays are parallel: perspective rays shift off-center artwork
    // sideways as soon as the transmission pass replaces the HTML poster.
    shellMaterials.forEach(material => {
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <transmission_fragment>',
          THREE.ShaderChunk.transmission_fragment.replace(
            'vec3 v = normalize( cameraPosition - pos );',
            'vec3 v = isOrthographic ? normalize( vec3( viewMatrix[0].z, viewMatrix[1].z, viewMatrix[2].z ) ) : normalize( cameraPosition - pos );',
          ),
        )
      }
      material.customProgramCacheKey = () => 'orthographic-transmission-v1'
    })
    // Fill more of the sphere with UI artwork while retaining the shared glass optics.
    const isInterfaceArtwork = posters.map(url => url.endsWith('/interface.webp'))
    const groups: THREE.Group[] = []
    const hoverScales = posters.map(() => 1)
    const pointerTargets = posters.map(() => new THREE.Vector2())
    const pointerLights = posters.map(() => new THREE.Vector2())
    const isWorld = posters.map(url => url.endsWith("/mountain.webp"))
    const captionGeometry = new THREE.PlaneGeometry(220, 20)
    const descriptionGeometry = new THREE.PlaneGeometry(220, 20)
    const captionMeshes: { title: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; description: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> }[] = []
    const captionTextures: THREE.Texture[] = []
    const artworkMaterials: THREE.ShaderMaterial[] = []
    const videoTextures: (THREE.VideoTexture | null)[] = posters.map(() => null)
    let posterTextures: THREE.Texture[] = []
    const warmupFrames = posters.map(() => 0)
    const videoWasActive = posters.map(() => false)

    let sceneWidth = 371
    const resize = () => {
      const width = host.clientWidth || 347
      sceneWidth = width
      renderer.setSize(width, expanded ? 228 : 212, false)
      camera.left = -width / 2
      camera.right = width / 2
      camera.updateProjectionMatrix()
    }
    const pointerSurface = host.parentElement
    const moveLight = (event: PointerEvent) => {
      const index = hoveredRef.current
      if (index === null) return
      const bounds = host.getBoundingClientRect()
      const { size, offset } = smartOrbGeometry(index, phaseRef.current, posters.length, sceneWidth, expanded)
      const floatY = expanded && sceneWidth >= 640 && !motionPreference.matches ? smartFloat(index, performance.now()) : 0
      pointerTargets[index].set(
        THREE.MathUtils.clamp((event.clientX - bounds.left - sceneWidth / 2 - offset) / (size / 2), -1, 1),
        THREE.MathUtils.clamp((event.clientY - bounds.top - 70 - floatY) / (size / 2), -1, 1),
      )
    }
    const resetLight = () => pointerTargets.forEach(target => target.set(0, 0))
    pointerSurface?.addEventListener('pointermove', moveLight)
    pointerSurface?.addEventListener('pointerleave', resetLight)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true })
    visibilityObserver.observe(host)
    resize()

    const coverScale = (width: number, height: number, index: number) => expanded
      ? new THREE.Vector2(Math.min(1, height / width), Math.min(1, width / height)).multiplyScalar(isWorld[index] ? 1.04 : 1)
      : new THREE.Vector2(1, 1)

    const updateVideo = (elapsed: number) => {
      const hovered = hoveredRef.current === readyVideoRef.current ? hoveredRef.current : null
      artworkMaterials.forEach((material, index) => {
        const video = videoRefs.current[index]
        if (hovered !== index || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.paused) {
          material.uniforms.uVideoMix.value = 0
          warmupFrames[index] = 0
          videoWasActive[index] = false
          return
        }
        if (!videoTextures[index]) {
          const texture = new THREE.VideoTexture(video)
          texture.colorSpace = THREE.SRGBColorSpace
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          texture.needsUpdate = true
          videoTextures[index] = texture
        }
        if (!videoWasActive[index]) {
          material.uniforms.uVideoMap.value = videoTextures[index]
          material.uniforms.uVideoScale.value.copy(coverScale(video.videoWidth, video.videoHeight, index))
          warmupFrames[index] = 2
          videoWasActive[index] = true
        }
        if (warmupFrames[index] > 0) {
          warmupFrames[index] -= 1
          return
        }
        const amount = material.uniforms.uVideoMix.value as number
        material.uniforms.uVideoMix.value = Math.min(1, amount + elapsed / 280)
      })
    }

    const updatePositions = (elapsed = 16) => groups.forEach((group, index) => {
      const { size, offset, distance } = smartOrbGeometry(index, phaseRef.current, posters.length, sceneWidth, expanded)
      const floatY = expanded && sceneWidth >= 640 && !motionPreference.matches ? smartFloat(index, performance.now()) : 0
      group.position.set(offset, -floatY, -Math.abs(distance) * 0.01)
      const targetScale = expanded && hoveredRef.current === index ? 1.045 : 1
      hoverScales[index] += (targetScale - hoverScales[index]) * (motionPreference.matches ? 1 : 1 - Math.exp(-elapsed / 85))
      group.scale.setScalar(size / 2 * hoverScales[index])
      group.visible = Math.abs(distance) < 2.5
      const caption = captionMeshes[index]
      if (caption) {
        const fixedEntries = expanded && sceneWidth >= 640
        const captionY = -floatY - size / 2 * hoverScales[index]
        const prominence = (size - 64) / 76
        const edgeOpacity = fixedEntries ? 1 : THREE.MathUtils.smoothstep(2.2 - Math.abs(distance), 0, 0.6)
        const reveal = fixedEntries ? 1 : THREE.MathUtils.smoothstep(0.5 - Math.abs(distance), 0, 0.35)
        caption.title.position.set(offset, captionY - (expanded ? 32 : 22), 1)
        caption.title.scale.setScalar(fixedEntries ? 1 : 0.8 + 0.2 * prominence)
        caption.title.material.opacity = edgeOpacity * (fixedEntries ? 1 : 0.6 + 0.4 * prominence)
        caption.title.visible = group.visible
        caption.description.position.set(offset, captionY - (expanded ? 54 : 42) - (1 - reveal) * 6, 1)
        caption.description.material.opacity = edgeOpacity * reveal
        caption.description.visible = group.visible && reveal > 0
      }
    })

    const render = () => {
      if (visible) {
        const now = performance.now()
        const elapsed = lastRenderTime ? Math.min(now - lastRenderTime, 50) : 0
        lastRenderTime = now
        const settings = settingsRef.current
        shellMaterials.forEach((material, index) => {
          const distance = Math.abs(smartOrbGeometry(index, phaseRef.current, posters.length, sceneWidth, expanded).distance)
          const transition = THREE.MathUtils.smoothstep(distance, 0.2, 1.6)
          const softenRefraction = expanded && isInterfaceArtwork[index]
          const optics = 1 - transition * 0.28
          const chromatic = 1 - transition * 0.65
          const reflection = 1 - transition * 0.12
          material.color.set(settings.tintColor)
          material.attenuationColor.set(settings.attenuationColor)
          material.transmission = 1 - (1 - settings.transmission) * optics
          material.ior = 1 + (settings.ior - 1) * optics * (softenRefraction ? 0.25 : 1)
          material.thickness = settings.thickness * optics * (softenRefraction ? 0.16 : 1)
          material.dispersion = settings.dispersion * chromatic * (softenRefraction ? 0.25 : 1)
          material.roughness = settings.roughness
          material.clearcoat = settings.clearcoat * reflection
          material.clearcoatRoughness = settings.clearcoatRoughness
          material.specularIntensity = settings.specularIntensity * reflection * (expanded ? 1.6 : 1)
          material.envMapIntensity = settings.envMapIntensity * reflection * (expanded ? 1.8 : 1)
          material.attenuationDistance = settings.attenuationDistance
          const lightPhase = expanded && !motionPreference.matches ? now * 0.00045 + index * 0.7 : 0
          if (hoveredRef.current !== index) pointerTargets[index].set(0, 0)
          pointerLights[index].lerp(pointerTargets[index], motionPreference.matches ? 1 : 1 - Math.exp(-elapsed / 140))
          const pointer = pointerLights[index]
          material.envMapRotation.set(Math.sin(lightPhase) * 0.45 + pointer.y * 0.8, lightPhase + pointer.x * 1.2, Math.sin(lightPhase * 0.7) * 0.3 + pointer.x * 0.15)
        })
        artworkMaterials.forEach(material => {
          material.uniforms.uBrightness.value = settings.imageBrightness
          material.uniforms.uSaturation.value = settings.imageSaturation
          material.uniforms.uContrast.value = settings.imageContrast
        })
        updateVideo(elapsed)
        updatePositions(elapsed)
        renderer.render(scene, camera)
      }
      frame = window.requestAnimationFrame(render)
    }

    const loader = new THREE.TextureLoader()
    const makeCaption = async (text: string, title: boolean) => {
      const lines = [text]
      const height = 20
      const textNodes = lines.map((line, i) => '<text x="110" y="' + (15 + i * 18) + '" text-anchor="middle" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="' + (title ? 14 : 12) + '" font-weight="' + (title ? 600 : 400) + '" fill="' + (title ? '#252632' : '#7c7d84') + '">' + line.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!) + '</text>').join('')
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="660" height="' + height * 3 + '" viewBox="0 0 220 ' + height + '">' + textNodes + '</svg>'
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      try {
        const texture = await loader.loadAsync(url)
        if (disposed) { texture.dispose(); return null }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = false
        captionTextures.push(texture)
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 })
        const mesh = new THREE.Mesh(title ? captionGeometry : descriptionGeometry, material)
        mesh.renderOrder = 2
        scene.add(mesh)
        return mesh
      } finally { URL.revokeObjectURL(url) }
    }
    const captionReady = Promise.all(captions.map(async (caption, index) => {
      const [title, description] = await Promise.all([makeCaption(caption.title, true), makeCaption(caption.description, false)])
      if (title && description) captionMeshes[index] = { title, description }
    }))
    const postersReady = Promise.all(posters.map(async url => {
      const texture = await loader.loadAsync(url)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      return texture
    }))
    Promise.all([postersReady, captionReady]).then(([textures]) => {
      if (disposed) { textures.forEach(texture => texture.dispose()); return }
      posterTextures = textures
      textures.forEach((texture, index) => {
        const group = new THREE.Group()
        const artworkMaterial = new THREE.ShaderMaterial({
          vertexShader: artworkVertexShader,
          fragmentShader: artworkFragmentShader,
          uniforms: {
            uPosterMap: { value: texture },
            uVideoMap: { value: texture },
            uVideoMix: { value: 0 },
            uMediaCenter: { value: new THREE.Vector2(0.5, 0.5) },
            uPosterScale: { value: coverScale(texture.image.width, texture.image.height, index) },
            uVideoScale: { value: new THREE.Vector2(1, 1) },
            uBrightness: { value: initialSettings.imageBrightness },
            uSaturation: { value: initialSettings.imageSaturation },
            uContrast: { value: initialSettings.imageContrast },
          },
          side: THREE.DoubleSide,
          toneMapped: false,
        })
        const artwork = new THREE.Mesh(circleGeometry, artworkMaterial)
        if (!expanded && isInterfaceArtwork[index]) artwork.scale.setScalar(0.96 / 0.87)
        artwork.position.z = -0.12
        group.add(artwork)
        const shell = new THREE.Mesh(sphereGeometry, shellMaterials[index])
        shell.renderOrder = 1
        group.add(shell)
        scene.add(group)
        groups.push(group)
        artworkMaterials.push(artworkMaterial)
      })
      updatePositions()
      renderer.render(scene, camera)
      onReady(true)
      frame = window.requestAnimationFrame(render)
    }).catch(() => { /* The poster and HTML video remain visible as a fallback. */ })

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      pointerSurface?.removeEventListener('pointermove', moveLight)
      pointerSurface?.removeEventListener('pointerleave', resetLight)
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      posterTextures.forEach(texture => texture.dispose())
      videoTextures.forEach(texture => texture?.dispose())
      artworkMaterials.forEach(material => material.dispose())
      captionTextures.forEach(texture => texture.dispose())
      scene.traverse(node => {
        if (node instanceof THREE.Mesh && (node.geometry === captionGeometry || node.geometry === descriptionGeometry)) node.material.dispose()
      })
      captionGeometry.dispose()
      descriptionGeometry.dispose()
      circleGeometry.dispose()
      sphereGeometry.dispose()
      shellMaterials.forEach(material => material.dispose())
      environmentTarget.dispose()
      pmrem.dispose()
      room.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      onReady(false)
    }
  }, [expanded, captions, hoveredRef, readyVideoRef, onReady, phaseRef, posters, settingsRef, videoRefs])

  return <div ref={hostRef} className="fh-glass-canvas" style={expanded ? { height: 228 } : undefined} aria-hidden="true" />
}

export default memo(SmartGlassScene)
