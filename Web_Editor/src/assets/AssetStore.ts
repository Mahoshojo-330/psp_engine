// The asset store owns uploaded textures: their bytes (persisted) and the
// blob: URLs the canvas/preview render from (minted in memory, never persisted).
// It follows the same subscribe/getSnapshot shape as EditorCore so React can
// read it through useSyncExternalStore. Persistence is injected (IndexedDB in
// the browser, a fake in tests) so the store's logic stays free of IO.

export interface TextureRecord {
  id: number
  name: string
  width: number
  height: number
  blob: Blob
}

export interface TextureAsset {
  id: number
  name: string
  width: number
  height: number
  /** A blob: URL valid for the lifetime of this store; revoked on removal. */
  objectURL: string
}

export interface AssetPersistence {
  loadAll(): Promise<TextureRecord[]>
  put(record: TextureRecord): Promise<void>
  delete(id: number): Promise<void>
}

export class AssetStore {
  private persistence: AssetPersistence
  private assets = new Map<number, TextureAsset>()
  private listeners = new Set<() => void>()
  private cachedSnapshot: readonly TextureAsset[] | null = null

  constructor(persistence: AssetPersistence) {
    this.persistence = persistence
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): readonly TextureAsset[] => {
    if (this.cachedSnapshot === null) {
      this.cachedSnapshot = [...this.assets.values()].sort((a, b) => a.id - b.id)
    }
    return this.cachedSnapshot
  }

  /** Load persisted textures into memory and mint their blob URLs. Call once at startup. */
  init = async (): Promise<void> => {
    const records = await this.persistence.loadAll()
    for (const record of records) this.assets.set(record.id, this.toAsset(record))
    this.emit()
  }

  /** Persist a new texture under the next dense id (Engine.md §7) and return that id. */
  addTexture = async (blob: Blob, name: string, width: number, height: number): Promise<number> => {
    const id = nextDenseId([...this.assets.keys()])
    const record: TextureRecord = { id, name, width, height, blob }
    await this.persistence.put(record)
    this.assets.set(id, this.toAsset(record))
    this.emit()
    return id
  }

  removeTexture = async (id: number): Promise<void> => {
    const existing = this.assets.get(id)
    if (!existing) return
    await this.persistence.delete(id)
    URL.revokeObjectURL(existing.objectURL)
    this.assets.delete(id)
    this.emit()
  }

  getAsset = (id: number): TextureAsset | undefined => this.assets.get(id)

  private toAsset = (record: TextureRecord): TextureAsset => ({
    id: record.id,
    name: record.name,
    width: record.width,
    height: record.height,
    objectURL: URL.createObjectURL(record.blob),
  })

  private emit = (): void => {
    this.cachedSnapshot = null
    for (const listener of this.listeners) listener()
  }
}

/** Smallest non-negative integer not already in use — keeps texture ids dense from 0. */
export function nextDenseId(existing: readonly number[]): number {
  const taken = new Set(existing)
  let id = 0
  while (taken.has(id)) id++
  return id
}
