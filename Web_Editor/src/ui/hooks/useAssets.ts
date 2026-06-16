import { useSyncExternalStore } from 'react'
import type { AssetStore, TextureAsset } from '../../assets/AssetStore'

export function useAssets(store: AssetStore): readonly TextureAsset[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
