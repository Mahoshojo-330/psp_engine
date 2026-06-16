import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetStore, nextDenseId } from './AssetStore'
import type { AssetPersistence, TextureRecord } from './AssetStore'

// In-memory stand-in for IndexedDB so the store's id/lifecycle logic is tested
// without a real database.
class FakeAssetPersistence implements AssetPersistence {
  records = new Map<number, TextureRecord>()
  loadAll = async (): Promise<TextureRecord[]> => [...this.records.values()]
  put = async (record: TextureRecord): Promise<void> => { this.records.set(record.id, record) }
  delete = async (id: number): Promise<void> => { this.records.delete(id) }
}

const blob = (text = 'png-bytes') => new Blob([text], { type: 'image/png' })

let createdURLs: string[] = []
let revokedURLs: string[] = []
let originalCreate: typeof URL.createObjectURL
let originalRevoke: typeof URL.revokeObjectURL

beforeEach(() => {
  createdURLs = []
  revokedURLs = []
  originalCreate = URL.createObjectURL
  originalRevoke = URL.revokeObjectURL
  let n = 0
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:fake/${n++}`
    createdURLs.push(url)
    return url
  })
  URL.revokeObjectURL = vi.fn((url: string) => { revokedURLs.push(url) })
})

afterEach(() => {
  URL.createObjectURL = originalCreate
  URL.revokeObjectURL = originalRevoke
})

describe('nextDenseId', () => {
  it('returns 0 for an empty set and fills the lowest gap otherwise', () => {
    expect(nextDenseId([])).toBe(0)
    expect(nextDenseId([0, 1, 2])).toBe(3)
    expect(nextDenseId([0, 2])).toBe(1) // fills the gap, not 3
    expect(nextDenseId([1, 2])).toBe(0)
  })
})

describe('AssetStore', () => {
  it('assigns dense ids from 0 and persists each texture', async () => {
    const persistence = new FakeAssetPersistence()
    const store = new AssetStore(persistence)

    const id0 = await store.addTexture(blob(), 'hero.png', 32, 32)
    const id1 = await store.addTexture(blob(), 'floor.png', 64, 16)

    expect([id0, id1]).toEqual([0, 1])
    expect(persistence.records.size).toBe(2)
    expect(store.getSnapshot().map(a => a.name)).toEqual(['hero.png', 'floor.png'])
    expect(createdURLs).toHaveLength(2)
  })

  it('mints a blob URL and carries native dimensions through to the asset', async () => {
    const store = new AssetStore(new FakeAssetPersistence())
    await store.addTexture(blob(), 'hero.png', 48, 24)
    const asset = store.getAsset(0)!
    expect(asset).toMatchObject({ id: 0, name: 'hero.png', width: 48, height: 24 })
    expect(asset.objectURL).toBe(createdURLs[0])
  })

  it('reuses a freed id and revokes the removed texture URL', async () => {
    const store = new AssetStore(new FakeAssetPersistence())
    await store.addTexture(blob(), 'a.png', 32, 32) // id 0
    await store.addTexture(blob(), 'b.png', 32, 32) // id 1

    await store.removeTexture(0)
    expect(revokedURLs).toEqual([createdURLs[0]])
    expect(store.getSnapshot().map(a => a.id)).toEqual([1])

    const reused = await store.addTexture(blob(), 'c.png', 32, 32)
    expect(reused).toBe(0) // dense-from-0: the freed slot is refilled
  })

  it('loads persisted textures and mints their URLs on init', async () => {
    const persistence = new FakeAssetPersistence()
    persistence.records.set(0, { id: 0, name: 'saved.png', width: 16, height: 16, blob: blob() })

    const store = new AssetStore(persistence)
    expect(store.getSnapshot()).toEqual([])
    await store.init()

    expect(store.getSnapshot().map(a => a.name)).toEqual(['saved.png'])
    expect(createdURLs).toHaveLength(1)
  })

  it('notifies subscribers and returns a stable snapshot between changes', async () => {
    const store = new AssetStore(new FakeAssetPersistence())
    const listener = vi.fn()
    store.subscribe(listener)

    const before = store.getSnapshot()
    expect(store.getSnapshot()).toBe(before) // cached identity

    await store.addTexture(blob(), 'a.png', 32, 32)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).not.toBe(before) // invalidated on change
  })
})
