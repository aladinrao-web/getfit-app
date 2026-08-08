import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { FitnessProvider } from './store/FitnessContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FitnessProvider>
      <App />
    </FitnessProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}
