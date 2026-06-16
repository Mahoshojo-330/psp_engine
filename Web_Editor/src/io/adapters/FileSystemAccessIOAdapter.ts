import type { IOAdapter, LoadedScene } from './IOAdapter'

// Minimal slice of the File System Access API we depend on. The full types live
// in @types/wicg-file-system-access; we declare only what we touch so the editor
// doesn't take a dev-dependency just for two method signatures.
interface FileSystemWritableStream {
  write(data: string | Blob): Promise<void>
  close(): Promise<void>
}

interface SaveFileHandle {
  createWritable(): Promise<FileSystemWritableStream>
}

interface OpenFileHandle {
  getFile(): Promise<File>
}

interface FilePickerAcceptType {
  description?: string
  accept: Record<string, string[]>
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: FilePickerAcceptType[]
}

interface OpenFilePickerOptions {
  types?: FilePickerAcceptType[]
  multiple?: boolean
}

interface FileSystemAccessWindow {
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<SaveFileHandle>
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<OpenFileHandle[]>
}

const SCENE_FILE_TYPES: FilePickerAcceptType[] = [
  { description: 'PSP Engine scene', accept: { 'application/json': ['.json'] } },
]

/**
 * Saves/loads scenes via the File System Access API where available
 * (Chromium), falling back to an `<a download>` / `<input type="file">` pair on
 * Safari and older Firefox. The strategy is chosen once at construction, after
 * which `saveScene`/`loadScene` present a single browser-agnostic interface.
 */
export class FileSystemAccessIOAdapter implements IOAdapter {
  private readonly win: Window
  private readonly hasNativeFs: boolean

  constructor(win: Window = window) {
    this.win = win
    this.hasNativeFs = 'showSaveFilePicker' in win && 'showOpenFilePicker' in win
  }

  saveScene = async (json: string, suggestedName: string): Promise<void> => {
    if (this.hasNativeFs) {
      await this.saveViaPicker(json, suggestedName)
    } else {
      this.saveViaDownload(json, suggestedName)
    }
  }

  loadScene = async (): Promise<LoadedScene | null> => {
    return this.hasNativeFs ? this.loadViaPicker() : this.loadViaInput()
  }

  private saveViaPicker = async (json: string, suggestedName: string): Promise<void> => {
    const fs = this.win as unknown as FileSystemAccessWindow
    try {
      const handle = await fs.showSaveFilePicker({ suggestedName, types: SCENE_FILE_TYPES })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
    } catch (err) {
      if (isAbortError(err)) return // user dismissed the picker; not an error
      throw err
    }
  }

  private saveViaDownload = (json: string, suggestedName: string): void => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    try {
      const anchor = this.win.document.createElement('a')
      anchor.href = url
      anchor.download = suggestedName
      this.win.document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  private loadViaPicker = async (): Promise<LoadedScene | null> => {
    const fs = this.win as unknown as FileSystemAccessWindow
    try {
      const [handle] = await fs.showOpenFilePicker({ types: SCENE_FILE_TYPES, multiple: false })
      if (!handle) return null
      const file = await handle.getFile()
      return { filename: file.name, json: await file.text() }
    } catch (err) {
      if (isAbortError(err)) return null // user dismissed the picker
      throw err
    }
  }

  private loadViaInput = (): Promise<LoadedScene | null> => {
    return new Promise<LoadedScene | null>((resolve, reject) => {
      const input = this.win.document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.style.display = 'none'
      input.addEventListener('change', () => {
        const file = input.files?.[0]
        input.remove()
        if (!file) {
          resolve(null)
          return
        }
        file.text().then(json => resolve({ filename: file.name, json }), reject)
      })
      // <input type="file"> has no reliable cross-browser cancel signal: a
      // cancelled pick never fires 'change', so the promise stays pending. That
      // matches the V2.4 design note — don't conflate cancel with an error.
      this.win.document.body.appendChild(input)
      input.click()
    })
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
