import type { ProductId } from './data'
import FigmaHomeContent from './FigmaHomeContent'
import { FigmaSideNav } from './FigmaNavigation'

export default function CreatorCenterHome({ onOpenProduct }: { onOpenProduct: (id: ProductId) => void }) {
  return (
    <div className="figma-home-shell flex h-full min-h-0 bg-[#F9F9F9]">
      <FigmaSideNav />
      <FigmaHomeContent onOpenProduct={onOpenProduct} />
    </div>
  )
}
