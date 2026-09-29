import { useEffect, useRef } from 'react'
import { deleteNotification, parseIncomingText, receiveNotification, type IncomingText } from '../api/greenApi'
import type { Credentials } from '../types'

const pause = (ms: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) return resolve()
  const timer = window.setTimeout(() => { signal.removeEventListener('abort', stop); resolve() }, ms)
  const stop = () => { window.clearTimeout(timer); resolve() }
  signal.addEventListener('abort', stop, { once: true })
})

export function useNotifications(credentials: Credentials | null, onMessage: (message: IncomingText) => void, onError: (message: string | null) => void): void {
  const handlers = useRef({ onMessage, onError })
  useEffect(() => { handlers.current = { onMessage, onError } }, [onMessage, onError])

  useEffect(() => {
    if (!credentials) return
    const controller = new AbortController()
    const { signal } = controller
    let failures = 0

    const run = async () => {
      while (!signal.aborted) {
        try {
          const notification = await receiveNotification(credentials, signal)
          if (signal.aborted) break
          if (notification) {
            const message = parseIncomingText(notification.body)
            if (message) handlers.current.onMessage(message)
            await deleteNotification(credentials, notification.receiptId, signal)
          }
          failures = 0
          handlers.current.onError(null)
          if (!notification) await pause(500, signal)
        } catch (error) {
          if (signal.aborted) break
          handlers.current.onError(error instanceof Error ? error.message : 'Ошибка получения сообщений.')
          failures += 1
          await pause(Math.min(3000 * failures, 15000), signal)
        }
      }
    }
    void run()
    return () => controller.abort()
  }, [credentials])
}
