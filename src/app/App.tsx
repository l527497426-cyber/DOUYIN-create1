import { toast, Toaster } from 'sonner'
import CreatorCenterHome from '@/modules/creator-center/CreatorCenterHome'
import { FigmaTopNav } from '@/modules/creator-center/FigmaNavigation'

export default function App() {
  const notice = () => toast('当前为独立首页演示')
  return (
    <div className="relative flex h-dvh flex-col">
      <FigmaTopNav onSelect={notice} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <CreatorCenterHome onOpenProduct={notice} />
      </div>
      <Toaster position="top-center" theme="dark" />
    </div>
  )
}