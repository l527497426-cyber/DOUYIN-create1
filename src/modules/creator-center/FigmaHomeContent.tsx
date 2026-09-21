import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import type { ProductId } from './data'
import SmartGlassScene from './SmartGlassScene'
import GlassEditor from './GlassEditor'
import { loadGlassSettings, saveGlassSettings } from './glass-settings'
import { smartDistance, smartFloat, smartOrbGeometry } from './smart-orbit'
import './figma-home.css'

const asset = (name: string) => `/figma-home/${name}`
const designAsset = (name: string) => asset(`design/${name}`)
const exportedIconNames = new Set(['bell.svg', 'comment.svg', 'dots.svg', 'eye.svg', 'help.svg', 'music-badge.svg', 'sparkle.svg', 'thumb.svg'])

const publishItems = [
  { title: '发布高清视频', detail: '支持常用格式推荐mp4', icon: 'publish-video.png' },
  { title: '发布全景视频', detail: '推荐分辨率为4K 及以上', icon: 'publish-panorama.png' },
  { title: '发布图文', detail: '支持常用图片格式png/jpg', icon: 'publish-image.png' },
  { title: '发布文章', detail: '支持上传8000字和30个图片素材', icon: 'publish-article.png' },
]

const metrics = [
  { label: '总播放量', value: '1.9万', delta: '-347', positive: false },
  { label: '新增粉丝数', value: '840', delta: '+234', positive: true },
  { label: '主页访问', value: '9768', delta: '+356', positive: true },
  { label: '总收益', value: '¥780', delta: '+121', positive: true },
  { label: '作品点赞', value: '5903', delta: '+12', positive: true },
  { label: '作品评论', value: '7869', delta: '-47', positive: false },
  { label: '作品收藏', value: '1.1万', delta: '+190', positive: true },
  { label: '作品分享', value: '1.2万', delta: '-25', positive: false },
]

const works = [
  { cover: 'work-1.png', title: '蜘蛛侠经典名场面，超英的成长与选择', views: '8.6万', likes: '6421', comments: '328', shares: '1256', completion: '56.2%' },
  { cover: 'work-2.png', title: '《奥德赛》观前指南，读懂史诗冒险', views: '5.2万', likes: '3867', comments: '246', shares: '892', completion: '48.7%' },
  { cover: 'work-3.png', title: '《杀死比尔》的暴力美学', views: '3.8万', likes: '2954', comments: '187', shares: '631', completion: '62.4%' },
  { cover: 'work-4.png', title: '周星驰经典重温，笑声背后的辛酸', views: '12.4万', likes: '9872', comments: '563', shares: '2184', completion: '68.5%' },
  // Extra preview cards reuse local recommendation artwork with illustrative metrics.
  { cover: 'recommend-2.png', title: '登山爱好者一生中不容错过的十座高峰', views: '6.7万', likes: '5128', comments: '294', shares: '1036', completion: '59.3%' },
  { cover: 'recommend-1.png', title: '一顿吃一碗，一天吃三碗，家的味道', views: '4.9万', likes: '3672', comments: '218', shares: '764', completion: '61.8%' },
]

function Icon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  return <img src={asset(exportedIconNames.has(name) ? `design/${name}` : name)} alt="" aria-hidden="true" className={className} style={{ width: size, height: size, flex: 'none' }} />
}

function Arrow({ size = 12 }: { size?: number }) {
  return <Icon name={size > 12 ? 'design/analysis-chevron.svg' : 'design/chevron-right.svg'} size={size} />
}

function TaskIcon({ type }: { type: 'money' | 'notification' }) {
  return <span className={`fh-task-icon fh-task-icon--${type}`} aria-hidden="true">
    <img src={designAsset(type === 'money' ? 'money-task-base.svg' : 'notification-task-base.svg')} alt="" />
    <img src={designAsset(type === 'money' ? 'money-task-center.svg' : 'notification-task-center.svg')} alt="" />
  </span>
}

function IncomeEye() {
  return <span className="fh-income-eye" aria-hidden="true"><img src={designAsset('eye.svg')} alt="" /></span>
}

function Profile() {
  return (
    <section className="fh-profile" aria-label="创作者资料">
      <img className="fh-profile-avatar" src={asset('profile-avatar.png')} alt="创作者头像" />
      <div className="fh-profile-name">
        <strong>创作者用户昵称</strong>
        <span className="fh-music-badge"><Icon name="design/music-badge.svg" size={14} />抖音音乐人</span>
      </div>
      <div className="fh-profile-id"><span>抖音号：3473824292</span><i /><span>这个人很懒，没有留下任何签名...</span></div>
      <div className="fh-profile-stats"><span>关注 <b>30</b></span><span>粉丝 <b>140.5 万</b></span><span>获赞 <b>242.23 万</b></span></div>
    </section>
  )
}

const smartWorks: { id: string; title: string; description: string; product: ProductId | 'create-world' }[] = [
  { id: 'mountain', title: '造世界', description: '极智造物, 造无限世界', product: 'create-world' },
  { id: 'milo', title: 'AI 工坊', description: '把好想法变成好玩法', product: 'workshop' },
  { id: 'avatar', title: 'AI分身', description: '创造陪伴用户的另一个你', product: 'ai-avatar' },
  { id: 'creation', title: '随变', description: '随心创作, 智能成片', product: 'suibian' },
  { id: 'interface', title: '百科', description: '让世界和角色持续生长', product: 'wiki' },
]
const smartPosters = smartWorks.map(work => asset(`media/${work.id}.webp`))

function SmartCreate({ onOpenProduct, expanded = false }: { onOpenProduct: (id: ProductId) => void; expanded?: boolean }) {
  const [phase, setPhase] = useState(2)
  const phaseRef = useRef(2)
  const stripRef = useRef<HTMLDivElement>(null)
  const stripWidthRef = useRef(371)
  const [stripWidth, setStripWidth] = useState(371)
  const hoveredRef = useRef<number | null>(null)
  const readyVideoRef = useRef<number | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const frameCallbackRef = useRef<{ video: HTMLVideoElement; id: number } | null>(null)
  const wheelVelocityRef = useRef(0)
  const dragMomentumRef = useRef(0)
  const dragTargetRef = useRef<number | null>(null)
  const focusTargetRef = useRef<number | null>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; lastX: number; lastTime: number; velocity: number; active: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [readyVideoIndex, setReadyVideoIndex] = useState<number | null>(null)
  const [webglReady, setWebglReady] = useState(false)
  const [glassSettings, setGlassSettings] = useState(loadGlassSettings)
  const settingsRef = useRef(glassSettings)
  settingsRef.current = glassSettings
  const changeGlassSettings = (next: typeof glassSettings) => { settingsRef.current = next; setGlassSettings(next); saveGlassSettings(next) }
  const reducedMotion = useReducedMotion()
  const videoRefCallbacks = useMemo(() => smartWorks.map((_, index) => (element: HTMLVideoElement | null) => {
    videoRefs.current[index] = element
  }), [])

  const playVideo = (index: number) => {
    if (hoveredRef.current === index) return
    if (frameCallbackRef.current) {
      frameCallbackRef.current.video.cancelVideoFrameCallback(frameCallbackRef.current.id)
      frameCallbackRef.current = null
    }
    videoRefs.current.forEach((video, other) => {
      if (other !== index && video) { video.pause(); if (video.src) video.currentTime = 0 }
    })
    hoveredRef.current = index
    readyVideoRef.current = null
    setReadyVideoIndex(null)
    const video = videoRefs.current[index]
    if (!video) return
    if (!video.src) video.src = asset(`media/${smartWorks[index].id}.mp4`)
    const revealVideo = () => {
      if (hoveredRef.current !== index || video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
      readyVideoRef.current = index
      setReadyVideoIndex(index)
    }
    if ('requestVideoFrameCallback' in video) {
      const id = video.requestVideoFrameCallback(() => { frameCallbackRef.current = null; revealVideo() })
      frameCallbackRef.current = { video, id }
    }
    void video.play().then(() => {
      if (hoveredRef.current !== index) video.pause()
      else if (!('requestVideoFrameCallback' in video)) window.requestAnimationFrame(revealVideo)
    }).catch(() => {})
  }

  const pauseVideo = (index: number) => {
    if (frameCallbackRef.current?.video === videoRefs.current[index]) {
      frameCallbackRef.current.video.cancelVideoFrameCallback(frameCallbackRef.current.id)
      frameCallbackRef.current = null
    }
    if (hoveredRef.current === index) { hoveredRef.current = null; readyVideoRef.current = null; setReadyVideoIndex(null) }
    const video = videoRefs.current[index]
    if (video) { video.pause(); if (video.src) video.currentTime = 0 }
  }

  useEffect(() => {
    let frame = 0
    let previousTime = 0
    const animate = (now: number) => {
      const elapsed = previousTime ? Math.min(now - previousTime, 50) : 0
      previousTime = now
      stripRef.current?.querySelectorAll<HTMLElement>(".fh-orb-position").forEach((element, index) => {
        element.style.translate = expanded && stripWidthRef.current >= 640 && !reducedMotion ? `0 ${smartFloat(index, now)}px` : "none"
      })
      if (expanded && stripWidthRef.current >= 640) {
        frame = window.requestAnimationFrame(animate)
        return
      }
      if (dragRef.current?.active) {
        const remaining = (dragTargetRef.current ?? phaseRef.current) - phaseRef.current
        const easedStep = remaining * (1 - Math.exp(-elapsed / 45))
        phaseRef.current += Math.max(-elapsed * 0.0045, Math.min(elapsed * 0.0045, easedStep))
      } else {
        let speed = reducedMotion ? 0 : 0.00024
        const target = focusTargetRef.current
        if (target !== null) {
          const remaining = target - phaseRef.current
          if (Math.abs(remaining) <= Math.max(0.012, elapsed * 0.001)) {
            phaseRef.current = target
            focusTargetRef.current = null
          } else {
            speed = Math.sign(remaining) * Math.min(0.004, Math.max(0.001, Math.abs(remaining) * 0.003))
          }
        }
        phaseRef.current += (speed + wheelVelocityRef.current + dragMomentumRef.current) * elapsed
        wheelVelocityRef.current *= Math.exp(-elapsed / 180)
        dragMomentumRef.current *= Math.exp(-elapsed / 440)
      }
      setPhase(phaseRef.current)
      frame = window.requestAnimationFrame(animate)
    }
    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [reducedMotion, expanded])

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((expanded && stripWidthRef.current >= 640) || event.button !== 0 || dragRef.current) return
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, active: false }
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (!drag.active) {
      if (Math.abs(event.clientX - drag.startX) < 6) return
      drag.active = true
      suppressClickRef.current = true
      focusTargetRef.current = null
      wheelVelocityRef.current = 0
      dragMomentumRef.current = 0
      dragTargetRef.current = phaseRef.current
      if (hoveredRef.current !== null) pauseVideo(hoveredRef.current)
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    event.preventDefault()
    const elapsed = Math.max(8, Math.min(50, event.timeStamp - drag.lastTime))
    const delta = -(event.clientX - drag.lastX) / 110
    const target = (dragTargetRef.current ?? phaseRef.current) + delta
    dragTargetRef.current = Math.max(phaseRef.current - 0.85, Math.min(phaseRef.current + 0.85, target))
    const instantaneousVelocity = Math.max(-0.004, Math.min(0.004, delta / elapsed))
    drag.velocity = drag.velocity * 0.55 + instantaneousVelocity * 0.45
    drag.lastX = event.clientX
    drag.lastTime = event.timeStamp
    if (reducedMotion) { phaseRef.current = dragTargetRef.current ?? phaseRef.current; setPhase(phaseRef.current) }
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.active) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      const remaining = (dragTargetRef.current ?? phaseRef.current) - phaseRef.current
      const releaseVelocity = event.timeStamp - drag.lastTime > 90 ? 0 : drag.velocity
      dragMomentumRef.current = cancelled || reducedMotion ? 0 : Math.max(-0.0024, Math.min(0.0024, releaseVelocity * 0.7 + remaining * 0.002))
      dragTargetRef.current = null
      setDragging(false)
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    }
    dragRef.current = null
  }

  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const resize = () => { stripWidthRef.current = strip.clientWidth; setStripWidth(strip.clientWidth) }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(strip)
    const onWheel = (event: WheelEvent) => {
      if (expanded && stripWidthRef.current >= 640) return
      const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      const delta = Math.max(-180, Math.min(180, rawDelta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1)))
      if (Math.abs(delta) < 4) return
      event.preventDefault()
      focusTargetRef.current = null
      dragMomentumRef.current = 0
      if (reducedMotion) {
        phaseRef.current += delta * 0.006
        setPhase(phaseRef.current)
      } else {
        wheelVelocityRef.current = Math.max(-0.018, Math.min(0.018, wheelVelocityRef.current + delta * 0.00004))
      }
    }
    strip.addEventListener('wheel', onWheel, { passive: false })
    return () => { strip.removeEventListener('wheel', onWheel); observer.disconnect() }
  }, [reducedMotion, expanded])

  const fixedEntries = expanded && stripWidth >= 640
  const centerIndex = ((Math.round(phase) % smartWorks.length) + smartWorks.length) % smartWorks.length
  return (
    <><section className={`fh-panel fh-smart${fixedEntries ? " fh-smart-fixed" : ""}`} aria-label="智能创作">
      <h2>智能创作</h2>
      <div ref={stripRef} className={`fh-orbs${webglReady ? ' has-webgl' : ''}${dragging ? ' is-dragging' : ''}`} style={{ '--glass-rim-opacity': glassSettings.cssRimOpacity, '--glass-rim-blur': `${glassSettings.cssRimBlur}px` } as CSSProperties} role="group" aria-roledescription="轮播" aria-label="滚动切换智能创作作品" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={event => endDrag(event)} onPointerCancel={event => endDrag(event, true)} onPointerLeave={() => { if (dragRef.current && !dragRef.current.active) dragRef.current = null }} onClickCapture={event => { if (suppressClickRef.current) { event.preventDefault(); event.stopPropagation(); suppressClickRef.current = false } }} onDragStart={event => event.preventDefault()}>
        <SmartGlassScene expanded={expanded} posters={smartPosters} captions={smartWorks} phaseRef={phaseRef} hoveredRef={hoveredRef} readyVideoRef={readyVideoRef} videoRefs={videoRefs} settingsRef={settingsRef} onReady={setWebglReady} />
        {smartWorks.map((work, index) => {
          const { distance, size, offset } = smartOrbGeometry(index, phase, smartWorks.length, stripWidthRef.current, expanded)
          const isCenter = fixedEntries || index === centerIndex
          const prominence = (size - 64) / 76
          const revealProgress = Math.max(0, Math.min(1, (0.5 - Math.abs(distance)) / 0.35))
          const descriptionOpacity = revealProgress * revealProgress * (3 - 2 * revealProgress)
          return <div
            key={work.id}
            className="fh-orb-position"
            style={{ left: '50%', top: 0, transform: `translate3d(${offset - size / 2}px, ${(140 - size) / 2}px, 0)`, width: size, height: size, zIndex: Math.round(100 - Math.abs(distance) * 10) }}
          ><button
            type="button"
            className={`fh-orb${isCenter ? ' is-center' : ''}`}
            onPointerEnter={() => playVideo(index)}
            onPointerLeave={() => pauseVideo(index)}
            onFocus={() => playVideo(index)}
            onBlur={() => pauseVideo(index)}
            onClick={() => {
              if (fixedEntries || Math.abs(distance) < 0.5) {
                if (work.product === 'create-world') toast('造世界（演示）')
                else onOpenProduct(work.product)
              }
              else if (reducedMotion) { phaseRef.current += distance; setPhase(phaseRef.current) }
              else {
                wheelVelocityRef.current = 0
                dragMomentumRef.current = 0
                focusTargetRef.current = phaseRef.current + smartDistance(index, phaseRef.current, smartWorks.length)
              }
            }}
            aria-label={`${work.title}${isCenter ? '，进入' : '，移至中间'}`}
            aria-current={!fixedEntries && isCenter ? 'true' : undefined}
          ><img className="fh-orb-media fh-orb-poster" src={smartPosters[index]} alt="" draggable={false} /><video className={`fh-orb-media fh-orb-video${readyVideoIndex === index ? ' is-playing' : ''}`} ref={videoRefCallbacks[index]} poster={smartPosters[index]} preload="none" muted loop playsInline aria-hidden="true" /></button>
            {!webglReady && <div className="fh-smart-caption" style={{ opacity: fixedEntries ? 1 : Math.max(0, Math.min(1, (2.2 - Math.abs(distance)) / 0.6)) }}>
              <strong style={{ transform: `scale(${0.8 + 0.2 * prominence})`, opacity: 0.6 + 0.4 * prominence }}>{work.title}</strong>
              <span
                style={{ opacity: fixedEntries ? 1 : descriptionOpacity, transform: `translate3d(0, ${(1 - descriptionOpacity) * 6}px, 0)` }}
                aria-hidden={!fixedEntries && descriptionOpacity === 0}
              >{work.description}</span>
            </div>}
          </div>
        })}
      </div>
    </section><GlassEditor settings={glassSettings} onChange={changeGlassSettings} /></>
  )
}

function PublishRow() {
  return <div className="fh-publish-row" aria-label="作品发布">
    {publishItems.map(item => <button type="button" key={item.title} className="fh-publish-item" onClick={() => toast(`${item.title}（演示）`)}>
      <Icon name={item.icon} size={40} /><span><strong>{item.title}</strong><small>{item.detail}</small></span>
    </button>)}
  </div>
}

function SegmentedTabs<T extends string>({ options, value, onChange, className = '' }: { options: { label: T; icon?: string }[]; value: T; onChange: (value: T) => void; className?: string }) {
  const id = useId()
  const reducedMotion = useReducedMotion()
  return <div className={`fh-segmented ${className}`} role="group" aria-label="内容分类">
    {options.map(option => <button type="button" key={option.label} className={value === option.label ? 'active' : ''} aria-pressed={value === option.label} onClick={() => onChange(option.label)}>
      {value === option.label && <motion.span className="fh-tab-highlight" layoutId={id} initial={false} transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }} />}
      <span className="fh-tab-label">{option.icon && <Icon name={option.icon} size={16} />}{option.label}</span>
    </button>)}
  </div>
}

function Overview() {
  const [range, setRange] = useState('近7天')
  const [mode, setMode] = useState('近期作品')
  return <section className="fh-panel fh-overview">
    <div className="fh-section-heading fh-overview-heading">
      <div className="fh-heading-title"><h2>数据总览</h2><Icon name="design/help.svg" size={14} /><span>数据更新至今日 10:00</span></div>
      <div className="fh-overview-controls">
        <button type="button" className="fh-select" onClick={() => setRange(range === '近7天' ? '近30天' : '近7天')}>时间&nbsp; {range} <Icon name="design/down.svg" size={16} /></button>
        <SegmentedTabs options={[{ label: '近期作品' }, { label: '近期直播' }]} value={mode} onChange={setMode} />
        <button type="button" className="fh-more" onClick={() => toast('数据中心（演示）')}>更多 <Arrow size={12} /></button>
      </div>
    </div>
    <div className="fh-insight"><span className="fh-insight-icon"><img src={designAsset('overview-insight.svg')} alt="" aria-hidden="true" /></span><p>播放在涨，吸粉效率却 <b>下降了 9%。</b> 冷门佳片带来更多观看，但关注转化低于你的平均水平。下一条建议把“创作背景”进行前置。</p></div>
    <div className="fh-metrics">{metrics.map(metric => <div className="fh-metric" key={metric.label}><span>{metric.label}</span><div><strong>{metric.value}</strong><small>较前7日 <em className={metric.positive ? 'rise' : 'fall'}>{metric.delta}</em></small></div></div>)}</div>
  </section>
}

function WorkPerformance() {
  return <section className="fh-panel fh-work">
    <div className="fh-section-heading"><h2>作品表现</h2><button type="button" className="fh-more" onClick={() => toast('更多作品（演示）')}>更多 <Arrow size={12} /></button></div>
    <div className="fh-work-grid">{works.map(work => <article className="fh-work-card" key={work.cover}>
      <div className="fh-work-cover"><img src={designAsset(work.cover)} alt={work.title} /><span>{work.title}</span></div>
      <div className="fh-work-card-heading"><span><Icon name="design/thumb.svg" size={12} />表现优异</span><button type="button" onClick={() => toast('作品分析（演示）')}>查看分析 <Arrow size={16} /></button></div>
      <div className="fh-work-stats">{[['播放', work.views], ['点赞', work.likes], ['评论', work.comments], ['分享', work.shares], ['完播率', work.completion]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    </article>)}</div>
  </section>
}

function Activity() {
  return <><section className="fh-panel fh-activity">
    <div className="fh-section-heading"><h2>创作动态</h2><button type="button" aria-label="更多创作动态" onClick={() => toast('创作动态（演示）')}><Icon name="dots.svg" size={16} /></button></div>
    <div className="fh-activity-block">
      <div className="fh-draft-head"><h3>继续创作</h3><span>待完善</span></div>
      <div className="fh-draft-body"><img src={asset('draft.png')} alt="Q版合影教程草稿封面" /><div><strong>Q版合影教程</strong><span>随变 · 12 分钟前保存</span><span>成片已生成，待完善封面</span><i><b /></i></div></div>
      <button type="button" className="fh-continue" onClick={() => toast('继续创作（演示）')}>继续创作</button>
      <div className="fh-task-status"><div><Icon name="bell.svg" size={16} />任务状态</div><p>世界书 · 角色档案生成中 <button type="button" onClick={() => toast('查看任务（演示）')}>查看</button></p><p>AI 工坊 · 兴趣卡发布失败 <button type="button" onClick={() => toast('处理任务（演示）')}>去处理</button></p></div>
    </div>
  </section>
    <section className="fh-panel fh-interaction">
      <div className="fh-section-heading"><h2>互动管理</h2></div>
      <div className="fh-interaction-item">
        <div className="fh-interaction-head"><span><Icon name="comment.svg" size={16} />作品评论 <b>+223</b></span><button type="button" onClick={() => toast('评论管理（演示）')}>评论管理 <Arrow size={16} /></button></div>
        <p>你知道私人FM为什么没有倒退键只有下一首因为错过了就错过了，再也回不来了</p>
        <div className="fh-message-meta"><small><b>来源作品：</b>重庆通报1批次不合格食品，网络平台仍有售</small><time>07-08 00:35</time></div>
      </div>
      <div className="fh-interaction-item">
        <div className="fh-interaction-head"><span><Icon name="design/mail.svg" size={16} />私信消息 <b>+23</b></span><button type="button" onClick={() => toast('私信管理（演示）')}>私信管理 <Arrow size={16} /></button></div>
        <p>“长的是深夜，短的是人生。“在你成长的这些年里，“真正放不下的，只有筷子。</p>
        <div className="fh-message-meta"><small><img src={designAsset('message-avatar.png')} alt="" />酸豆角的小毛牛</small><time>07-21 00:35</time></div>
      </div>
    </section>
    <section className="fh-panel fh-activity-recommend"><div className="fh-section-heading"><h2>活动推荐</h2><button type="button" className="fh-more" onClick={() => toast('全部活动（演示）')}>查看更多 <Arrow size={16} /></button></div>{[
      ['关于清理已下线个人认证标识的通知', '11-18~12-20'],
      ['潮流收藏在抖音', '11-02~01-02'],
      ['心动观赛季', '10.26~12-26'],
      ['潮流收藏在抖音', '11-02~01-02'],
      ['抖音搜索流量来了', '09.28~12.31'],
    ].map(([title, date], index) => <button type="button" key={`${title}-${index}`} onClick={() => toast(`${title}（演示）`)}><span>{title}</span><small>{date}</small></button>)}</section>
  </>
}

function Monetization() {
  const tasks = [
    { type: 'money' as const, label: '可参与任务', value: '3242', detail: '山海短剧cps90%高分佣高转化短剧《修罗帅》' },
    { type: 'notification' as const, label: '我的任务', value: '42', detail: '中国电信155G-星图投稿' },
  ]
  return <section className="fh-panel fh-lower">
    <div className="fh-section-heading">
      <span className="fh-heading-title"><h2>收入变现</h2><IncomeEye /></span>
      <button type="button" className="fh-more" onClick={() => toast('收入变现（演示）')}>查看更多 <Arrow size={16} /></button>
    </div>
    <div className="fh-income-content">
      <div className="fh-income-total">
        <span>近7日 <small>07-18~07-24</small> <Arrow size={12} /></span>
        <div><strong>￥137.59<span>万</span></strong><small>较7天前 <em>+3247</em></small></div>
      </div>
      {tasks.map(task => <div className="fh-income-task" key={task.type}>
        <div className="fh-income-task-row">
          <div className="fh-income-task-title"><TaskIcon type={task.type} /><strong>{task.label}</strong><span className="fh-income-task-count"><b>{task.value}</b><span>个</span></span></div>
          <button type="button" onClick={() => toast(`${task.label}（演示）`)}>去查看</button>
        </div>
        <small>{task.detail}</small>
      </div>)}
    </div>
  </section>
}

function CreationRecommendations() {
  const [tab, setTab] = useState<'精选热门' | '热点榜单'>('精选热门')
  const [courseTab, setCourseTab] = useState<'热门课程' | '精选专题'>('热门课程')
  const popular = [
    { image: 'recommend-1.png', title: '一顿吃一碗，一天吃三碗，过年回家10天应该够了...', author: '影视飓风' },
    { image: 'recommend-2.png', title: '登山爱好者一生中不容错过的十座高峰', author: '影视飓风' },
    { image: 'recommend-3.png', title: '一顿吃一碗，一天吃三碗，过年回家10天应该够了...', author: '影视飓风' },
    { image: 'recommend-4.png', title: '一顿吃一碗，一天吃三碗，过年回家10天应该够了...', author: '影视飓风' },
    { image: 'recommend-5.png', title: '一顿吃一碗，一天吃三碗，过年回家10天应该够了...', author: '影视飓风' },
  ]
  const courses = [
    { image: 'course-1.png', title: '抖音精选创作指南' },
    { image: 'course-1.png', title: '精选内容创作课之生活记录篇' },
    { image: 'course-2.png', title: '精选作者创作访谈' },
    { image: 'course-3.png', title: '剧情演绎规则课堂不良导向篇' },
    { image: 'course-4.png', title: '抖音私域运营干货' },
  ]
  return <section className="fh-panel fh-recommend"><div className="fh-section-heading"><h2>创作推荐</h2></div><div className="fh-recommend-columns"><div><div className="fh-recommend-heading"><SegmentedTabs className="fh-recommend-tabs" options={[{ label: '精选热门', icon: 'design/featured-tab.png' }, { label: '热点榜单' }]} value={tab} onChange={setTab} /><button type="button" className="fh-more" onClick={() => toast('全部热门（演示）')}>查看全部 <Arrow size={16} /></button></div><div className="fh-recommend-list">{popular.map(item => <button type="button" key={item.image} onClick={() => toast(`${item.title}（演示）`)}><img src={designAsset(item.image)} alt="" /><span><strong>{item.title}</strong><small className="fh-recommend-author">{item.author}</small><small>获赞 <b>3696.97 万</b></small></span></button>)}</div></div><div><div className="fh-recommend-heading"><SegmentedTabs className="fh-recommend-tabs" options={[{ label: '热门课程' }, { label: '精选专题' }]} value={courseTab} onChange={setCourseTab} /><button type="button" className="fh-more" onClick={() => toast('全部课程（演示）')}>查看全部 <Arrow size={16} /></button></div><div className="fh-recommend-list">{courses.map((item, index) => <button type="button" key={`${item.image}-${index}`} onClick={() => toast(`${item.title}（演示）`)}><img src={designAsset(item.image)} alt="" /><span><strong>{item.title}</strong><small>播放 <b>3696.97 万</b></small></span></button>)}</div></div></div></section>
}

export default function FigmaHomeContent({ onOpenProduct, onScrollStateChange }: { onOpenProduct: (id: ProductId) => void; onScrollStateChange?: (scrolled: boolean) => void }) {
  const reducedMotion = useReducedMotion()
  const classicLayout = new URLSearchParams(window.location.search).get('layout') === 'classic'
  return <main className={`fh-main${classicLayout ? '' : ' fh-layout-create-first'}`} onScroll={event => onScrollStateChange?.(event.currentTarget.scrollTop > 8)}>
    <div className="fh-hero-background" aria-hidden="true"><img src={designAsset('ascii-magic.png')} alt="" /></div>
    <div className="fh-content-grid">
      <div className="fh-left-column">
        <motion.div className="fh-enter" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}><Profile /></motion.div>
        <motion.div className="fh-enter" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.08 }}>{classicLayout ? <PublishRow /> : <SmartCreate expanded onOpenProduct={onOpenProduct} />}</motion.div>
        <motion.div className="fh-enter" initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.16 }}><Overview /></motion.div>
        <motion.div className="fh-enter" initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, delay: 0.22 }}><WorkPerformance /></motion.div>
        <Monetization />
        <CreationRecommendations />
      </div>
      <div className="fh-right-column">
        <motion.div className="fh-enter" initial={reducedMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>{classicLayout ? <SmartCreate onOpenProduct={onOpenProduct} /> : <div className="fh-publish-panel"><PublishRow /></div>}</motion.div>
        <Activity />
      </div>
    </div>
  </main>
}
