/**
 * Accessible modal dialog.
 *
 * - `role="dialog"` + `aria-modal`, named by its title.
 * - Focus moves to the first form field (or the first button) on open, and
 *   back to whatever was focused before when it closes.
 * - Escape or a click on the backdrop closes it.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, onClose, children }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const firstTarget = dialog?.querySelector<HTMLElement>('input, select, textarea, button')
    firstTarget?.focus()
    return () => previouslyFocused?.focus()
  }, [])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-xl font-bold tracking-tight">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
