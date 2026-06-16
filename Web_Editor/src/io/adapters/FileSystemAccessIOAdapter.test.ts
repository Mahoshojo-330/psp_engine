import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock, MockInstance } from 'vitest'
import type { IOAdapter } from './IOAdapter'
import { FileSystemAccessIOAdapter } from './FileSystemAccessIOAdapter'

describe('FileSystemAccessIOAdapter.saveScene', () => {
  describe('download fallback (no File System Access API — Safari/older Firefox, jsdom)', () => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    let createObjectURL: Mock
    let revokeObjectURL: Mock
    let clickedAnchors: HTMLAnchorElement[]
    let clickSpy: MockInstance

    beforeEach(() => {
      // jsdom doesn't implement object URLs; stub them so we can capture the Blob.
      createObjectURL = vi.fn(() => 'blob:mock-url')
      revokeObjectURL = vi.fn()
      URL.createObjectURL = createObjectURL as typeof URL.createObjectURL
      URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL

      // Intercept the click so jsdom doesn't attempt navigation, and record which
      // anchor was activated so we can assert how it was wired up.
      clickedAnchors = []
      clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          clickedAnchors.push(this)
        })
    })

    afterEach(() => {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      clickSpy.mockRestore()
    })

    it('selects the download fallback when showSaveFilePicker is absent', async () => {
      // Precondition: jsdom's window exposes no File System Access API, so the
      // adapter must choose the fallback at construction.
      expect('showSaveFilePicker' in window).toBe(false)

      const adapter: IOAdapter = new FileSystemAccessIOAdapter()
      await adapter.saveScene('{}', 'scene.json')

      expect(clickedAnchors).toHaveLength(1)
    })

    it('downloads the JSON under the suggested filename', async () => {
      const json = JSON.stringify({ entities: [{ id: 1 }] })
      const adapter = new FileSystemAccessIOAdapter()

      await adapter.saveScene(json, 'my-scene.json')

      // Exactly one Blob, of the right MIME type and with the exact JSON payload.
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      const blob = createObjectURL.mock.calls[0]![0] as Blob
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/json')
      await expect(blob.text()).resolves.toBe(json)

      // Exactly one anchor activated, pointing at the object URL with the download name.
      expect(clickedAnchors).toHaveLength(1)
      const anchor = clickedAnchors[0]!
      expect(anchor.download).toBe('my-scene.json')
      expect(anchor.getAttribute('href')).toBe('blob:mock-url')
    })

    it('revokes the object URL and detaches the anchor (no leaks)', async () => {
      const adapter = new FileSystemAccessIOAdapter()

      await adapter.saveScene('{}', 'scene.json')

      expect(revokeObjectURL).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
      // The transient <a> must not linger in the document after the click.
      expect(document.querySelectorAll('a[download]')).toHaveLength(0)
    })
  })

  describe('native path (File System Access API available — Chromium)', () => {
    // A stand-in window exposing the pickers. document is jsdom's real one, so a
    // wrongly-chosen fallback would still build (and fail) the anchor assertions.
    function nativeWindow(showSaveFilePicker: unknown): Window {
      return {
        showSaveFilePicker,
        showOpenFilePicker: vi.fn(),
        document,
      } as unknown as Window
    }

    it('writes the JSON through showSaveFilePicker when supported', async () => {
      const write = vi.fn(async () => {})
      const close = vi.fn(async () => {})
      const createWritable = vi.fn(async () => ({ write, close }))
      let savedOptions: { suggestedName?: string } | undefined
      const showSaveFilePicker = vi.fn(async (options?: { suggestedName?: string }) => {
        savedOptions = options
        return { createWritable }
      })

      const adapter = new FileSystemAccessIOAdapter(nativeWindow(showSaveFilePicker))
      await adapter.saveScene('{"entities":[]}', 'scene.json')

      expect(showSaveFilePicker).toHaveBeenCalledTimes(1)
      expect(savedOptions?.suggestedName).toBe('scene.json')
      expect(write).toHaveBeenCalledWith('{"entities":[]}')
      expect(close).toHaveBeenCalledTimes(1)
    })

    it('treats a cancelled save dialog (AbortError) as a no-op', async () => {
      const showSaveFilePicker = vi.fn(async () => {
        throw new DOMException('The user aborted a request.', 'AbortError')
      })
      const adapter = new FileSystemAccessIOAdapter(nativeWindow(showSaveFilePicker))

      await expect(adapter.saveScene('{}', 'scene.json')).resolves.toBeUndefined()
    })

    it('propagates non-abort errors from the picker', async () => {
      const showSaveFilePicker = vi.fn(async () => {
        throw new DOMException('Permission denied', 'NotAllowedError')
      })
      const adapter = new FileSystemAccessIOAdapter(nativeWindow(showSaveFilePicker))

      await expect(adapter.saveScene('{}', 'scene.json')).rejects.toThrow(/Permission denied/)
    })
  })
})
