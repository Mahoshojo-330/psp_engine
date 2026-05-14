import { useState } from 'react'
import type { EditorCore } from './core/EditorCore'
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
}

export default function App({ core }: Props) {
  const [jsonOpen, setJsonOpen] = useState(false)
  const snapshot = useScene(core)
  const json = jsonOpen ? JSON.stringify(sceneToJSON(snapshot), null, 2) : ''
  useUndoRedoShortcuts(core)

  return (
    <div className="app">
      <header className="toolbar">
        <EntityPresets core={core} />
        <button type="button" onClick={() => core.undo()} disabled={!snapshot.canUndo}>
          Undo
        </button>
        <button type="button" onClick={() => core.redo()} disabled={!snapshot.canRedo}>
          Redo
        </button>
        <button type="button" onClick={() => setJsonOpen(true)}>
          Show JSON
        </button>
      </header>
      <main className="layout">
        <aside className="sidebar">
          <EntityList core={core} />
        </aside>
        <section className="canvas-region">
          <Canvas core={core} />
        </section>
        <section className="panel">
          <PropertyPanel core={core} />
        </section>
      </main>
      <JsonView open={jsonOpen} json={json} onClose={() => setJsonOpen(false)} />
    </div>
  )
}
