import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { EditorCore } from './core/EditorCore'
import App from './App.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element in index.html')

const core = new EditorCore()

createRoot(root).render(
  <StrictMode>
    <App core={core} />
  </StrictMode>,
)
