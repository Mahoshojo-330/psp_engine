import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  json: string
  onClose: () => void
}

export function JsonView({ open, json, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className="json-view" onClose={onClose}>
      <header className="json-view-header">
        <h2>scene.json</h2>
        <button type="button" onClick={onClose}>Close</button>
      </header>
      <textarea readOnly value={json} className="json-view-text" />
    </dialog>
  )
}
