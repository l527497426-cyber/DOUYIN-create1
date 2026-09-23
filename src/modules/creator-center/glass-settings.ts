export type GlassSettings = {
  tintColor: string
  attenuationColor: string
  transmission: number
  ior: number
  thickness: number
  roughness: number
  clearcoat: number
  clearcoatRoughness: number
  specularIntensity: number
  envMapIntensity: number
  dispersion: number
  attenuationDistance: number
  imageBrightness: number
  imageSaturation: number
  imageContrast: number
  cssRimOpacity: number
  cssRimBlur: number
}

export const defaultGlassSettings: GlassSettings = {
  "tintColor": "#ffffff",
  "attenuationColor": "#ffffff",
  "transmission": 1,
  "ior": 1.01,
  "thickness": 2,
  "roughness": 0,
  "clearcoat": 0.06,
  "clearcoatRoughness": 0.145,
  "specularIntensity": 0.58,
  "envMapIntensity": 2,
  "dispersion": 0.155,
  "attenuationDistance": 7.7,
  "imageBrightness": 1.02,
  "imageSaturation": 1,
  "imageContrast": 1.1,
  "cssRimOpacity": 0,
  "cssRimBlur": 6.3
}

export const glassSettingControls: { key: Exclude<keyof GlassSettings, 'tintColor' | 'attenuationColor'>; label: string; min: number; max: number; step: number; group: 'optics' | 'reflection' | 'image' }[] = [
  { key: 'transmission', label: '透射率', min: 0.8, max: 1, step: 0.005, group: 'optics' },
  { key: 'ior', label: '折射率', min: 1, max: 2.33, step: 0.01, group: 'optics' },
  { key: 'thickness', label: '玻璃厚度', min: 0, max: 2, step: 0.01, group: 'optics' },
  { key: 'dispersion', label: '真实色散', min: 0, max: 0.5, step: 0.005, group: 'optics' },
  { key: 'attenuationDistance', label: '颜色吸收距离', min: 0.1, max: 20, step: 0.1, group: 'optics' },
  { key: 'roughness', label: '表面粗糙度', min: 0, max: 0.25, step: 0.005, group: 'reflection' },
  { key: 'specularIntensity', label: '镜面反光', min: 0, max: 1, step: 0.01, group: 'reflection' },
  { key: 'envMapIntensity', label: '环境映射强度', min: 0, max: 2, step: 0.01, group: 'reflection' },
  { key: 'clearcoat', label: '清漆层', min: 0, max: 1, step: 0.01, group: 'reflection' },
  { key: 'clearcoatRoughness', label: '清漆粗糙度', min: 0, max: 0.25, step: 0.005, group: 'reflection' },
  { key: 'cssRimOpacity', label: '轮廓亮线', min: 0, max: 1, step: 0.01, group: 'reflection' },
  { key: 'cssRimBlur', label: '轮廓模糊', min: 0, max: 8, step: 0.1, group: 'reflection' },
  { key: 'imageBrightness', label: '视频亮度', min: 0.6, max: 1.5, step: 0.01, group: 'image' },
  { key: 'imageSaturation', label: '视频饱和度', min: 0, max: 1.8, step: 0.01, group: 'image' },
  { key: 'imageContrast', label: '视频对比度', min: 0.6, max: 1.5, step: 0.01, group: 'image' },
]

const storageKey = 'creator-center-glass-settings-v6'

export function loadGlassSettings(): GlassSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<GlassSettings>
    const settings = { ...defaultGlassSettings }
    if (typeof saved.tintColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(saved.tintColor)) settings.tintColor = saved.tintColor
    if (typeof saved.attenuationColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(saved.attenuationColor)) settings.attenuationColor = saved.attenuationColor
    for (const control of glassSettingControls) {
      const value = saved[control.key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        settings[control.key] = Math.min(control.max, Math.max(control.min, value))
      }
    }
    return settings
  } catch {
    return { ...defaultGlassSettings }
  }
}

export function saveGlassSettings(settings: GlassSettings) {
  try { localStorage.setItem(storageKey, JSON.stringify(settings)) } catch { /* Private browsing can disable storage. */ }
}
