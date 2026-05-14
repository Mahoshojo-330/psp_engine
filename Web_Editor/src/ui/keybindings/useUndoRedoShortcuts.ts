import { useEffect } from 'react'
import type { EditorCore } from '../../core/EditorCore'

export function useUndoRedoShortcuts(core: EditorCore): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'z' && e.key !== 'Z') return
      if (!(e.metaKey || e.ctrlKey)) return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }
      e.preventDefault()
      if (e.shiftKey) core.redo()
      else core.undo()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [core])
}
