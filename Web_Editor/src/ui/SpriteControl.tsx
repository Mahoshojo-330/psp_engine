import { useRef } from 'react'
import type { AssetStore } from '../assets/AssetStore'
import type { EditorCore } from '../core/EditorCore'
import type { EntityId } from '../core/types'
import { spriteSchema } from '../schemas/sprite'
import { transformSchema } from '../schemas/transform'
import { abgrAlpha, abgrToRgbHex, rgbHexAndAlphaToAbgr, TINT_WHITE } from './colour'
import { useAssets } from './hooks/useAssets'
import { snapToPowerOfTwo } from './snap'

interface Props {
  core: EditorCore
  entityId: EntityId
  data: unknown
  assetStore: AssetStore
}

export function SpriteControl({ core, entityId, data, assetStore }: Props) {
  const assets = useAssets(assetStore)
  const fileRef = useRef<HTMLInputElement>(null)

  const record = isRecord(data) ? data : {}
  const textureId = typeof record.global_texture_id === 'number' ? record.global_texture_id : 0
  const tint = typeof record.colour_tint === 'number' ? record.colour_tint : TINT_WHITE
  const current = assets.find(a => a.id === textureId)

  // Pointing a sprite at a texture also hard-snaps the render quad to that image's
  // native (power-of-two) size, so a freshly uploaded sprite isn't stretched. The
  // texture assign + resize land as one undo step.
  const applyTexture = (id: number, size: { width: number; height: number } | undefined) => {
    core.beginTransaction()
    try {
      core.setField(entityId, spriteSchema.key, 'global_texture_id', id)
      if (size) {
        core.setFields(entityId, transformSchema.key, {
          width: snapToPowerOfTwo(size.width),
          height: snapToPowerOfTwo(size.height),
        })
      }
      core.commitTransaction()
    } catch (err) {
      core.abortTransaction()
      console.error('Failed to apply texture', err)
    }
  }

  const handleFile = async (file: File) => {
    let size: { width: number; height: number }
    try {
      size = await readImageSize(file)
    } catch (err) {
      console.error('Could not read image dimensions', err)
      return
    }
    let id: number
    try {
      id = await assetStore.addTexture(file, file.name, size.width, size.height)
    } catch (err) {
      console.error('Could not store texture', err)
      return
    }
    applyTexture(id, size)
  }

  const setTint = (value: number) => core.setField(entityId, spriteSchema.key, 'colour_tint', value)
  const hex = abgrToRgbHex(tint)
  const alpha = abgrAlpha(tint)

  return (
    <div className="sprite-control">
      <div className="sprite-preview" data-empty={current ? undefined : true}>
        {current ? (
          <img src={current.objectURL} alt={current.name} />
        ) : (
          <span>{assets.length ? 'No texture selected' : 'No image uploaded yet'}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor={`sprite-tex-${entityId}`}>Texture</label>
        <select
          id={`sprite-tex-${entityId}`}
          value={textureId}
          onChange={e => {
            const id = Number(e.currentTarget.value)
            applyTexture(id, assets.find(a => a.id === id))
          }}
        >
          {!current && <option value={textureId}>#{textureId} (missing)</option>}
          {assets.map(a => (
            <option key={a.id} value={a.id}>
              #{a.id} · {a.name} ({a.width}×{a.height})
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="btn sprite-upload" onClick={() => fileRef.current?.click()}>
        Upload image…
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const file = e.currentTarget.files?.[0]
          e.currentTarget.value = ''
          if (file) void handleFile(file)
        }}
      />

      <div className="field">
        <label htmlFor={`sprite-tint-${entityId}`}>Tint</label>
        <input
          id={`sprite-tint-${entityId}`}
          type="color"
          value={hex}
          onFocus={() => core.beginTransaction()}
          onChange={e => setTint(rgbHexAndAlphaToAbgr(e.currentTarget.value, alpha))}
          onBlur={() => core.commitTransaction()}
        />
      </div>
      <div className="field">
        <label htmlFor={`sprite-alpha-${entityId}`}>Opacity</label>
        <input
          id={`sprite-alpha-${entityId}`}
          type="range"
          min={0}
          max={255}
          value={alpha}
          onFocus={() => core.beginTransaction()}
          onChange={e => setTint(rgbHexAndAlphaToAbgr(hex, Number(e.currentTarget.value)))}
          onBlur={() => core.commitTransaction()}
        />
      </div>
    </div>
  )
}

// Browser-only: pull the intrinsic pixel size out of an uploaded image so we can
// size the entity to match it. Prefers createImageBitmap, falls back to <img>.
async function readImageSize(file: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return size
    } catch {
      // Fall through to the <img> path below.
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode image'))
    }
    img.src = url
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
