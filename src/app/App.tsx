import { useState, type CSSProperties } from 'react'
import { toast, Toaster } from 'sonner'
import CreatorCenterHome from '@/modules/creator-center/CreatorCenterHome'
import TopNav from '@/modules/creator-center/TopNav'
export default function App() {
 const [scrolled, setScrolled] = useState(false)
 const notice = () => { toast('当前为独立首页演示') }
 return <div data-nav-version={4} className="relative flex h-dvh flex-col" style={{'--cc-top':'48px'} as CSSProperties}>
  <TopNav active="home" onSelect={notice} overlay scrolled={scrolled} glassLeftInset={200}/>
  <div className="relative min-h-0 flex-1 overflow-hidden"><CreatorCenterHome active onOpenProduct={notice} onScrollStateChange={setScrolled}/></div>
  <Toaster position="top-center" theme="dark"/>
 </div>
}
