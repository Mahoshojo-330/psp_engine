import { useState } from 'react'
import type { EditorCore } from './core/EditorCore'
import { sceneToJSON } from './io/serialization/sceneToJSON'
import { Canvas } from './ui/canvas/Canvas'
import { EntityList } from './ui/EntityList'
import { JsonView } from './ui/JsonView'
import { PropertyPanel } from './ui/PropertyPanel'

interface Props {
  core: EditorCore
}

export default function App({ core }: Props) {
  const [jsonOpen, setJsonOpen] = useState(false)
  const json = jsonOpen ? JSON.stringify(sceneToJSON(core.getSnapshot()), null, 2) : ''

  return (
    <div className="app">
      <header className="toolbar">
        <button type="button" onClick={() => core.addEntity(['transform'])}>
          Add Entity
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
