/**
 * Body of a confirmation dialog for an irreversible action. Cancel comes
 * first, so it receives the dialog's initial focus and a stray Enter cannot
 * trigger the action.
 */
import type { ReactNode } from 'react'

import { useAsyncAction } from '../hooks/useAsyncAction'
import { Alert } from './Alert'
import { Button } from './Button'

interface ConfirmActionProps {
  children: ReactNode
  confirmLabel: string
  busyLabel: string
  /** Performs the action; a rejection is shown in the dialog. */
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function ConfirmAction({
  children,
  confirmLabel,
  busyLabel,
  onConfirm,
  onCancel,
}: ConfirmActionProps) {
  const { busy, error, run } = useAsyncAction()

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="text-sm text-slate-600">{children}</div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" disabled={busy} onClick={() => void run(onConfirm)}>
          {busy ? busyLabel : confirmLabel}
        </Button>
      </div>
    </div>
  )
}
