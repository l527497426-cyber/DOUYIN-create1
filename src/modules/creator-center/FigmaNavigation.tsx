import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { toast } from 'sonner'
import { logout } from '@/app/demo-session'
import { usePublishFlow } from './use-publish-flow'
import type { ProductId } from './data'
import './figma-navigation.css'

const asset = (name: string) => `/figma-home/${name}`

const sideItems = [
  { key: 'home', label: '首页', icon: 'design/side-home.svg' },
  { key: 'content', label: '内容管理', icon: 'design/side-content.svg' },
  { key: 'live', label: '直播管理', icon: 'design/side-live.svg' },
  { key: 'data', label: '数据中心', icon: 'design/side-data.svg' },
  { key: 'income', label: '收入变现', icon: 'design/side-income.svg' },
]

const topItems: { id: ProductId | 'create-world'; label: string; icon: string }[] = [
  { id: 'home', label: '首页', icon: 'design/top-home.svg' },
  { id: 'ai-avatar', label: 'AI 分身', icon: 'design/top-avatar.svg' },
  { id: 'wiki', label: '世界书', icon: 'design/top-worldbook.svg' },
  { id: 'suibian', label: '随变', icon: 'design/top-suibian.svg' },
  { id: 'workshop', label: 'AI 工坊', icon: 'design/top-workshop.svg' },
  { id: 'create-world', label: '造世界', icon: 'design/top-world.svg' },
]

export function FigmaSideNav() {
  const publishRef = usePublishFlow()
  const [servicesOpen, setServicesOpen] = useState(true)
  return <aside className="fn-side" aria-label="创作者中心侧栏">
    <a className="fn-side-logo" href="/" aria-label="抖音创作者中心首页"><span className="fn-side-logo-art" aria-hidden="true"><img src={asset('design/side-logo-symbol.svg')} alt="" /><img src={asset('design/side-logo-wordmark.svg')} alt="" /></span></a>
    <div className="fn-side-body">
      <div className="fn-publish-card">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button ref={publishRef} type="button" className="creator-publish-action fn-publish-button" aria-label="作品发布菜单">
              <span className="fn-publish-label"><img src={asset('design/side-publish.svg')} alt="" />作品发布</span>
              <img className="fn-publish-chevron" src={asset('design/side-chevron-down.svg')} alt="" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="fn-publish-menu" side="bottom" align="start" sideOffset={8}>
              {['发布高清视频', '发布全景视频', '发布图文', '发布文章'].map(item => <Popover.Close asChild key={item}><button type="button" onClick={() => toast(`${item}（演示）`)}>{item}</button></Popover.Close>)}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      <nav className="fn-side-menu" aria-label="侧栏菜单">
        {sideItems.map(item => <button type="button" key={item.key} className={`fn-side-row ${item.key === 'home' ? 'active' : ''}`} aria-current={item.key === 'home' ? 'page' : undefined} onClick={() => item.key !== 'home' && toast(`${item.label}（演示）`)}><img src={asset(item.icon)} alt="" /><span>{item.label}</span></button>)}
        <div className="fn-service-group">
          <button type="button" className="fn-side-row" aria-expanded={servicesOpen} aria-controls="creator-service-menu" onClick={() => setServicesOpen(open => !open)}>
            <img src={asset('design/side-service.svg')} alt="" /><span>创作服务</span>
            <img className={`fn-service-chevron ${servicesOpen ? 'expanded' : ''}`} src={asset('design/side-service-chevron.svg')} alt="" />
          </button>
          {servicesOpen && <div id="creator-service-menu" className="fn-service-menu">
            {['作品共创', '活动管理', '原创保护', '抖音指数'].map(label => <button type="button" className="fn-side-row fn-side-subrow" key={label} onClick={() => toast(`${label}（演示）`)}>{label}</button>)}
          </div>}
        </div>
      </nav>
    </div>
  </aside>
}

export function FigmaTopNav({ onSelect }: { onSelect: (id: ProductId) => void }) {
  const open = (id: ProductId | 'create-world') => {
    if (id === 'create-world') toast('造世界（演示）')
    else onSelect(id)
  }
  return <header className="fn-topbar">
    <nav className="fn-topnav" aria-label="产品导航">
      {topItems.map((item, index) => <button type="button" key={item.id} className={`fn-top-item ${index === 0 ? 'active' : ''}`} aria-current={index === 0 ? 'page' : undefined} onClick={() => open(item.id)}><img src={asset(item.icon)} alt="" /><span>{item.label}</span></button>)}
    </nav>
    <div className="fn-account">
      <button type="button" className="fn-stars" aria-label="星光余额 276" onClick={() => toast('当前星光余额：276')}><img src={asset('design/top-stars.svg')} alt="" /><span>276</span></button>
      <button type="button" className="fn-bell" aria-label="通知" onClick={() => toast('通知（演示）')}><img src={asset('design/top-bell.svg')} alt="" /><i /></button>
      <Popover.Root>
        <Popover.Trigger asChild><button type="button" className="fn-user" aria-label="账号菜单"><img src={asset('top-user.png')} alt="创作者头像" /></button></Popover.Trigger>
        <Popover.Portal><Popover.Content className="fn-user-menu" side="bottom" align="end" sideOffset={10}><strong>创作者用户昵称</strong><span>抖音号：3473824292</span><button type="button" onClick={() => toast('账号管理（演示）')}>账号管理</button><button type="button" onClick={logout}>退出登录</button></Popover.Content></Popover.Portal>
      </Popover.Root>
    </div>
  </header>
}
