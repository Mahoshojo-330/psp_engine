import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { AssetStore } from './assets/AssetStore'
import type { AssetPersistence } from './assets/AssetStore'
import { EditorCore } from './core/EditorCore'
import type { IOAdapter } from './io/adapters/IOAdapter'
import { sceneToJSON } from './io/serialization/sceneToJSON'

function makeIo(overrides: Partial<IOAdapter> = {}): IOAdapter {
  return {
    saveScene: vi.fn(async () => {}),
    loadScene: vi.fn(async () => null),
    ...overrides,
  }
}

const emptyPersistence: AssetPersistence = {
  loadAll: async () => [],
  put: async () => {},
  delete: async () => {},
}

function makeAssetStore(): AssetStore {
  return new AssetStore(emptyPersistence)
}

afterEach(cleanup)

describe('App — Save button', () => {
  it('renders a Save button in the toolbar', () => {
    render(<App core={new EditorCore()} io={makeIo()} assetStore={makeAssetStore()} />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
  })

  it('hands the current scene to the adapter as pretty-printed JSON named scene.json', () => {
    const core = new EditorCore()
    core.addEntity(['transform'])
    const saveScene = vi.fn(async () => {})
    render(<App core={core} io={makeIo({ saveScene })} assetStore={makeAssetStore()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    // The button must serialize the live scene exactly the way "Show JSON" does.
    const expectedJson = JSON.stringify(sceneToJSON(core.getSnapshot()), null, 2)
    expect(saveScene).toHaveBeenCalledTimes(1)
    expect(saveScene).toHaveBeenCalledWith(expectedJson, 'scene.json')
    // Sanity: the serialized scene actually contains the entity we added.
    expect(expectedJson).toContain('"transform"')
  })

  it('reflects later edits in what gets saved (reads the live snapshot, not a stale one)', () => {
    const core = new EditorCore()
    const saveScene = vi.fn(async () => {})
    render(<App core={core} io={makeIo({ saveScene })} assetStore={makeAssetStore()} />)

    // Mutate after the initial render; the click must serialize the new state.
    core.addEntity(['transform', 'physics'])
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(saveScene).toHaveBeenCalledWith(
      JSON.stringify(sceneToJSON(core.getSnapshot()), null, 2),
      'scene.json',
    )
  })

  it('logs but does not throw when the adapter rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const saveScene = vi.fn(async () => {
      throw new Error('disk full')
    })
    render(<App core={new EditorCore()} io={makeIo({ saveScene })} assetStore={makeAssetStore()} />)

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Save' }))).not.toThrow()

    await waitFor(() => expect(consoleError).toHaveBeenCalled())
    consoleError.mockRestore()
  })
})
