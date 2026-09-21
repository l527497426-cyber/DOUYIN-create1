import { createRoot } from 'react-dom/client'
import App from './app/App'
import { hasDemoSession } from './app/demo-session'
import './index.css'
// Side-effect import — eagerly applies the persisted theme class to <html>
// before React mounts.
import '@/shared/storage/theme'

const requireSession = () => {
  if (hasDemoSession()) return true
  if (window.location.pathname !== '/login/index.html') window.location.replace('/login/index.html')
  return false
}
window.addEventListener('pageshow', requireSession)
if (requireSession()) createRoot(document.getElementById('root')!).render(<App />)
