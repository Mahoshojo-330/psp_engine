import { useState } from 'react'
import type { AssetStore } from './assets/AssetStore'
import type { EditorCore } from './core/EditorCore'
import type { IOAdapter } from './io/adapters/IOAdapter'
import { sceneToJSON } from './io/serialization/sceneToJSON'
import { Canvas } from './ui/canvas/Canvas'
import { EntityList } from './ui/EntityList'
import { EntityPresets } from './ui/EntityPresets'
import { useScene } from './ui/hooks/useScene'
import { JsonView } from './ui/JsonView'
import { useUndoRedoShortcuts } from './ui/keybindings/useUndoRedoShortcuts'
import { PropertyPanel } from './ui/PropertyPanel'

interface Props {
  core: EditorCore
  io: IOAdapter
  assetStore: AssetStore
}

export default function App({ core, io, assetStore }: Props) {
  const [jsonOpen, setJsonOpen] = useState(false)
  const snapshot = useScene(core)
  const json = jsonOpen ? JSON.stringify(sceneToJSON(snapshot), null, 2) : ''
  useUndoRedoShortcuts(core)

  const handleSave = () => {
    // Read the live scene rather than the render-time snapshot so a save always
    // serializes current truth, even if a mutation hasn't re-rendered yet.
    const sceneJson = JSON.stringify(sceneToJSON(core.getSnapshot()), null, 2)
    // saveScene resolves on success and on user-cancel; only real IO errors reject.
    io.saveScene(sceneJson, 'scene.json').catch((err: unknown) => {
      console.error('Failed to save scene', err)
    })
  }

  const entityCount = snapshot.entities.length
  const selectionLabel =
    snapshot.selectedEntityId == null ? 'No selection' : `Selected #${snapshot.selectedEntityId}`

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">◆</span>
          <span className="brand-name">PSP Engine</span>
          <span className="brand-sub">Scene Editor</span>
        </div>
        <div className="toolbar-actions">
          <EntityPresets core={core} />
          <span className="toolbar-divider" aria-hidden="true" />
          <button type="button" className="btn" onClick={() => core.undo()} disabled={!snapshot.canUndo}>
            Undo
          </button>
          <button type="button" className="btn" onClick={() => core.redo()} disabled={!snapshot.canRedo}>
            Redo
          </button>
          <button type="button" className="btn" onClick={() => setJsonOpen(true)}>
            Show JSON
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </header>
      <main className="layout">
        <aside className="sidebar">
          <div className="column-header">
            <h2 className="column-title">Entities</h2>
            <span className="column-count">{entityCount}</span>
          </div>
          <EntityList core={core} />
        </aside>
        <section className="canvas-region">
          <Canvas core={core} assetStore={assetStore} />
        </section>
        <section className="panel">
          <div className="column-header">
            <h2 className="column-title">Properties</h2>
          </div>
          <PropertyPanel core={core} assetStore={assetStore} />
        </section>
      </main>
      <footer className="statusbar">
        <span className="statusbar-item">
          {entityCount} {entityCount === 1 ? 'entity' : 'entities'}
        </span>
        <span className="statusbar-item statusbar-selection">{selectionLabel}</span>
      </footer>
      <JsonView open={jsonOpen} json={json} onClose={() => setJsonOpen(false)} />
    </div>
  )
}
