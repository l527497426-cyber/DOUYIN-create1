import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { defaultGlassSettings, glassSettingControls, type GlassSettings } from './glass-settings'

const groupLabels = { optics: '玻璃折射', reflection: '表面反光', image: '视频画面' }

type Props = { settings: GlassSettings; onChange: (settings: GlassSettings) => void }

export default function GlassEditor({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
      toast('玻璃参数已复制，可以直接发给我')
    } catch {
      toast('复制失败，请从面板底部手动复制参数')
    }
  }

  return createPortal(
    <div className={`glass-editor${open ? ' is-open' : ''}`}>
      <button type="button" className="glass-editor-toggle" aria-expanded={open} aria-controls="glass-editor-panel" onClick={() => setOpen(value => !value)}>
        <span className="glass-editor-toggle-icon" aria-hidden="true">◉</span> 玻璃调节 <span aria-hidden="true">{open ? '×' : '⌃'}</span>
      </button>
      {open && <div id="glass-editor-panel" className="glass-editor-panel">
        <div className="glass-editor-head"><strong>球体玻璃质感</strong><span>拖动滑杆实时预览</span></div>
        <label className="glass-editor-color"><span>玻璃表面色</span><input type="color" value={settings.tintColor} onChange={event => onChange({ ...settings, tintColor: event.currentTarget.value })} /><output>{settings.tintColor.toUpperCase()}</output></label>
        <label className="glass-editor-color"><span>玻璃吸收色</span><input type="color" value={settings.attenuationColor} onChange={event => onChange({ ...settings, attenuationColor: event.currentTarget.value })} /><output>{settings.attenuationColor.toUpperCase()}</output></label>
        <div className="glass-editor-controls">
          {glassSettingControls.map(({ key, label, min, max, step, group }, index) => <label className={`glass-editor-control${index === 0 || glassSettingControls[index - 1].group !== group ? ' is-group-start' : ''}`} key={key}>
            {(index === 0 || glassSettingControls[index - 1].group !== group) && <b className="glass-editor-group">{groupLabels[group]}</b>}
            <span><span>{label}</span><output>{settings[key].toFixed(step < 0.01 ? 3 : step < 0.1 ? 2 : 1)}</output></span>
            <input type="range" min={min} max={max} step={step} value={settings[key]} onChange={event => onChange({ ...settings, [key]: Number(event.currentTarget.value) })} />
          </label>)}
        </div>
        <div className="glass-editor-actions">
          <button type="button" onClick={() => onChange({ ...defaultGlassSettings })}>恢复默认</button>
          <button type="button" onClick={copy}>复制参数</button>
        </div>
        <textarea aria-label="当前玻璃参数" readOnly value={JSON.stringify(settings, null, 2)} onFocus={event => event.currentTarget.select()} />
      </div>}
    </div>,
    document.body,
  )
}
