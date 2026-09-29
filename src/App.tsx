import { useCallback, useEffect, useRef, useState } from 'react'
import { checkAccount, sendMessage, type IncomingText } from './api/greenApi'
import { ChatSidebar } from './components/ChatSidebar'
import { ConnectionForm } from './components/ConnectionForm'
import { Conversation } from './components/Conversation'
import { useNotifications } from './hooks/useNotifications'
import type { Chat, Credentials, Message } from './types'
import styles from './App.module.css'

function normalizePhone(value: string): string | null {
  const phone = value.replace(/[\s()+-]/g, '')
  return /^(?:7\d{10}|375\d{9})$/.test(phone) ? phone : null
}

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [receiveError, setReceiveError] = useState<string | null>(null)
  const [receiveErrorDismissed, setReceiveErrorDismissed] = useState(false)
  const sendingRequest = useRef<AbortController | null>(null)
  const pending = useRef<Set<AbortController>>(new Set())
  const chatsRef = useRef(chats)
  chatsRef.current = chats

  const onMessage = useCallback((incoming: IncomingText) => {
    const message: Message = { id: incoming.id, text: incoming.text, timestamp: incoming.timestamp, direction: 'incoming' }
    setChats(current => {
      const existing = current.find(chat => chat.id === incoming.chatId)
      if (!existing) return [{ id: incoming.chatId, phone: incoming.phone, name: incoming.name, messages: [message] }, ...current]
      if (existing.messages.some(item => item.id === incoming.id)) return current
      return current.map(chat => chat.id === incoming.chatId ? { ...chat, messages: [...chat.messages, message] } : chat)
    })
  }, [])

  const onReceiveError = useCallback((message: string | null) => {
    setReceiveError(message)
    if (message === null) setReceiveErrorDismissed(false)
  }, [])
  useNotifications(chats.length > 0 ? credentials : null, onMessage, onReceiveError)

  const disconnect = useCallback(() => {
    pending.current.forEach(controller => controller.abort())
    pending.current.clear()
    setCredentials(null)
    setChats([])
    setSelectedId(null)
    setCreateError(null)
    setSendError(null)
    setReceiveError(null)
    setReceiveErrorDismissed(false)
    setCreating(false)
    setSending(false)
    sendingRequest.current = null
  }, [])
  useEffect(() => () => { pending.current.forEach(controller => controller.abort()) }, [])

  async function createChat(value: string): Promise<boolean> {
    if (!credentials || creating) return false
    const phone = normalizePhone(value)
    if (!phone) { setCreateError('Введите номер РФ или РБ в международном формате.'); return false }
    const found = chatsRef.current.find(chat => chat.phone === phone)
    if (found) { setSelectedId(found.id); setCreateError(null); return true }
    const controller = new AbortController()
    pending.current.add(controller)
    setCreating(true)
    setCreateError(null)
    try {
      const id = await checkAccount(credentials, phone, controller.signal)
      if (controller.signal.aborted) return false
      setChats(current => current.some(chat => chat.id === id) ? current : [{ id, phone, name: `+${phone}`, messages: [] }, ...current])
      setSelectedId(id)
      return true
    } catch (error) {
      if (!controller.signal.aborted) setCreateError(error instanceof Error ? error.message : 'Не удалось создать чат.')
      return false
    } finally {
      pending.current.delete(controller)
      if (!controller.signal.aborted) setCreating(false)
    }
  }

  async function send(text: string) {
    if (!credentials || !selectedId || sendingRequest.current) return false
    const chatId = selectedId
    const controller = new AbortController()
    pending.current.add(controller)
    sendingRequest.current = controller
    setSending(true)
    setSendError(null)
    try {
      const id = await sendMessage(credentials, chatId, text, controller.signal)
      if (controller.signal.aborted) return false
      const message: Message = { id, text, timestamp: Date.now(), direction: 'outgoing' }
      setChats(current => current.map(chat => chat.id === chatId ? { ...chat, messages: [...chat.messages, message] } : chat))
      return true
    } catch (error) {
      if (!controller.signal.aborted) setSendError(error instanceof Error ? error.message : 'Не удалось отправить сообщение.')
      return false
    } finally {
      pending.current.delete(controller)
      if (sendingRequest.current === controller) {
        sendingRequest.current = null
        if (!controller.signal.aborted) setSending(false)
      }
    }
  }

  if (!credentials) return <ConnectionForm onConnect={setCredentials} />
  const selected = chats.find(chat => chat.id === selectedId) ?? null
  const ordered = [...chats].sort((a, b) => (b.messages.at(-1)?.timestamp ?? 0) - (a.messages.at(-1)?.timestamp ?? 0))
  return <div className={`${styles.shell} ${selected ? styles.hasSelection : ''}`}>
    <ChatSidebar chats={ordered} selectedId={selectedId} busy={creating} error={createError} onCreate={createChat} onSelect={id => { setSelectedId(id); setSendError(null) }} onDisconnect={disconnect} />
    <div className={styles.main}><Conversation chat={selected} sending={sending} error={sendError} onSend={send} onBack={() => setSelectedId(null)} /></div>
    {receiveError && !receiveErrorDismissed && <div className={styles.receiveError} role="status"><span>{receiveError}</span><button onClick={() => setReceiveErrorDismissed(true)} aria-label="Закрыть сообщение об ошибке">×</button></div>}
  </div>
}
