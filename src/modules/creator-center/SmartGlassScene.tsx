import { memo, useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { smartOrbGeometry } from './smart-orbit'
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
  uniform float uBrightness;
  uniform float uSaturation;
  uniform float uContrast;
  varying vec2 vUv;
  void main() {
    vec4 sampleColor = texture2D(uPosterMap, vUv);
    if (uVideoMix > 0.0) {
      // Video textures need the same sRGB decode as Three's built-in map shader.
      // Poster textures are already decoded by the GPU's sRGB texture format.
      vec4 videoColor = sRGBTransferEOTF(texture2D(uVideoMap, vUv));
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
  posters: string[]
  captions: { title: string; description: string }[]
  phaseRef: RefObject<number>
  hoveredRef: RefObject<number | null>
  readyVideoRef: RefObject<number | null>
  videoRefs: RefObject<(HTMLVideoElement | null)[]>
  settingsRef: RefObject<GlassSettings>
  onReady: (ready: boolean) => void
}

function SmartGlassScene({ posters, captions, phaseRef, hoveredRef, readyVideoRef, videoRefs, settingsRef, onReady }: GlassSceneProps) {
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
    const camera = new THREE.OrthographicCamera(-173.5, 173.5, 70, -142, 0.1, 1000)
    camera.position.z = 400
    const room = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const environmentTarget = pmrem.fromScene(room, 0.04)
    scene.environment = environmentTarget.texture
    const circleGeometry = new THREE.CircleGeometry(0.87, 64)
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 40)
    const initialSettings = settingsRef.current
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(initialSettings.tintColor),
      metalness: 0,
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
    // Fill more of the sphere with UI artwork while retaining the shared glass optics.
    const isInterfaceArtwork = posters.map(url => url.endsWith('/interface.webp'))
    const groups: THREE.Group[] = []
    const captionGeometry = new THREE.PlaneGeometry(220, 20)
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
      renderer.setSize(width, 212, false)
      camera.left = -width / 2
      camera.right = width / 2
      camera.updateProjectionMatrix()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true })
    visibilityObserver.observe(host)
    resize()

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

    const updatePositions = () => groups.forEach((group, index) => {
      const { size, offset, distance } = smartOrbGeometry(index, phaseRef.current, posters.length, sceneWidth)
      group.position.set(offset, 0, -Math.abs(distance) * 0.01)
      group.scale.setScalar(size / 2)
      group.visible = Math.abs(distance) < 2.5
      const caption = captionMeshes[index]
      if (caption) {
        const prominence = (size - 64) / 76
        const edgeOpacity = THREE.MathUtils.smoothstep(2.2 - Math.abs(distance), 0, 0.6)
        const reveal = THREE.MathUtils.smoothstep(0.5 - Math.abs(distance), 0, 0.35)
        caption.title.position.set(offset, -size / 2 - 22, 1)
        caption.title.scale.setScalar(0.8 + 0.2 * prominence)
        caption.title.material.opacity = edgeOpacity * (0.6 + 0.4 * prominence)
        caption.title.visible = group.visible
        caption.description.position.set(offset, -size / 2 - 42 - (1 - reveal) * 6, 1)
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
          const distance = Math.abs(smartOrbGeometry(index, phaseRef.current, posters.length).distance)
          const transition = THREE.MathUtils.smoothstep(distance, 0.2, 1.6)
          const optics = 1 - transition * 0.28
          const chromatic = 1 - transition * 0.65
          const reflection = 1 - transition * 0.12
          material.color.set(settings.tintColor)
          material.attenuationColor.set(settings.attenuationColor)
          material.transmission = 1 - (1 - settings.transmission) * optics
          material.ior = 1 + (settings.ior - 1) * optics
          material.thickness = settings.thickness * optics
          material.dispersion = settings.dispersion * chromatic
          material.roughness = settings.roughness
          material.clearcoat = settings.clearcoat * reflection
          material.clearcoatRoughness = settings.clearcoatRoughness
          material.specularIntensity = settings.specularIntensity * reflection
          material.envMapIntensity = settings.envMapIntensity * reflection
          material.attenuationDistance = settings.attenuationDistance
        })
        artworkMaterials.forEach(material => {
          material.uniforms.uBrightness.value = settings.imageBrightness
          material.uniforms.uSaturation.value = settings.imageSaturation
          material.uniforms.uContrast.value = settings.imageContrast
        })
        updateVideo(elapsed)
        updatePositions()
        renderer.render(scene, camera)
      }
      frame = window.requestAnimationFrame(render)
    }

    const loader = new THREE.TextureLoader()
    const makeCaption = async (text: string, title: boolean) => {
      const escaped = text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="60" viewBox="0 0 220 20"><text x="110" y="15" text-anchor="middle" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="${title ? 14 : 12}" font-weight="${title ? 600 : 400}" fill="${title ? '#252632' : '#7c7d84'}">${escaped}</text></svg>`
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
        const mesh = new THREE.Mesh(captionGeometry, material)
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
            uBrightness: { value: initialSettings.imageBrightness },
            uSaturation: { value: initialSettings.imageSaturation },
            uContrast: { value: initialSettings.imageContrast },
          },
          side: THREE.DoubleSide,
          toneMapped: false,
        })
        const artwork = new THREE.Mesh(circleGeometry, artworkMaterial)
        if (isInterfaceArtwork[index]) artwork.scale.setScalar(0.96 / 0.87)
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
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      posterTextures.forEach(texture => texture.dispose())
      videoTextures.forEach(texture => texture?.dispose())
      artworkMaterials.forEach(material => material.dispose())
      captionTextures.forEach(texture => texture.dispose())
      scene.traverse(node => {
        if (node instanceof THREE.Mesh && node.geometry === captionGeometry) node.material.dispose()
      })
      captionGeometry.dispose()
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
  }, [captions, hoveredRef, readyVideoRef, onReady, phaseRef, posters, settingsRef, videoRefs])

  return <div ref={hostRef} className="fh-glass-canvas" aria-hidden="true" />
}

export default memo(SmartGlassScene)
