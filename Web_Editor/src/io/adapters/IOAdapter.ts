export interface LoadedScene {
  filename: string
  json: string
}

/**
 * Abstracts how the editor reads and writes `scene.json` so the toolbar buttons
 * don't branch on browser capabilities (V2.4 design). Implementations decide
 * between the File System Access API and a download/upload fallback.
 */
export interface IOAdapter {
  /**
   * Persist `json` to disk under `suggestedName` (e.g. `"scene.json"`).
   * Resolves once written. A user-cancelled save is a no-op: it resolves rather
   * than rejecting, so callers don't have to distinguish "cancelled" from "saved".
   */
  saveScene(json: string, suggestedName: string): Promise<void>

  /**
   * Prompt the user to pick a scene file and return its name and contents.
   * Resolves to `null` when the user cancels; rejects only on a real IO error.
   */
  loadScene(): Promise<LoadedScene | null>
}
