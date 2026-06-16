import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { AssetPersistence, TextureRecord } from './AssetStore'

// Browser-backed persistence: textures (including their Blob bytes, which
// IndexedDB stores via structured clone) live in a single object store keyed by
// the dense texture id. Thin by design — all id/lifecycle logic is in AssetStore,
// so this layer is verified by the build rather than unit tests.

interface AssetDB extends DBSchema {
  textures: { key: number; value: TextureRecord }
}

const DB_NAME = 'psp-editor-assets'
const DB_VERSION = 1
const STORE = 'textures'

export class IndexedDBAssetPersistence implements AssetPersistence {
  private dbPromise: Promise<IDBPDatabase<AssetDB>>

  constructor() {
    this.dbPromise = openDB<AssetDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
      },
    })
  }

  loadAll = async (): Promise<TextureRecord[]> => {
    return (await this.dbPromise).getAll(STORE)
  }

  put = async (record: TextureRecord): Promise<void> => {
    await (await this.dbPromise).put(STORE, record)
  }

  delete = async (id: number): Promise<void> => {
    await (await this.dbPromise).delete(STORE, id)
  }
}
