import { useSyncExternalStore } from 'react'
import type { EditorCore } from '../../core/EditorCore'
import type { Scene } from '../../core/types'

export function useScene(core: EditorCore): Scene {
  return useSyncExternalStore(core.subscribe, core.getSnapshot)
}
