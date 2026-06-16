import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AssetStore } from './assets/AssetStore'
import { IndexedDBAssetPersistence } from './assets/IndexedDBAssetPersistence'
import { EditorCore } from './core/EditorCore'
import { FileSystemAccessIOAdapter } from './io/adapters/FileSystemAccessIOAdapter'
import App from './App.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element in index.html')

const core = new EditorCore()
const io = new FileSystemAccessIOAdapter()
const assetStore = new AssetStore(new IndexedDBAssetPersistence())
// Load any textures persisted in a previous session; the store notifies React
// when they're ready, so a slow disk read never blocks first paint.
void assetStore.init().catch((err: unknown) => {
  console.error('Failed to load persisted assets', err)
})

createRoot(root).render(
  <StrictMode>
    <App core={core} io={io} assetStore={assetStore} />
  </StrictMode>,
)
