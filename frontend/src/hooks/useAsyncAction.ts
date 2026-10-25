/**
 * Busy and error state for a user-triggered async action (submitting a form,
 * confirming a dialog).
 *
 * `run(action)` clears any previous error, marks the action busy and awaits
 * it. On failure the user-facing message is stored and the action becomes
 * available again. On success it stays busy: the caller is about to move on
 * (the dialog closes or the page changes), so the button must not re-enable.
 */
import { useCallback, useState } from 'react'

import { messageFor } from '../api/client'

export function useAsyncAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (caught) {
      setError(messageFor(caught))
      setBusy(false)
    }
  }, [])

  return { busy, error, run }
}
