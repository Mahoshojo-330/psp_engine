import { useSyncExternalStore } from 'react'
import type { EditorCore } from '../../core/EditorCore'
import type { EditorSnapshot } from '../../core/types'

export function useScene(core: EditorCore): EditorSnapshot {
  return useSyncExternalStore(core.subscribe, core.getSnapshot)
}
