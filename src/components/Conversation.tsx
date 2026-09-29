import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Chat } from '../types'
import styles from './Conversation.module.css'

interface Props { chat: Chat | null; sending: boolean; error: string | null; onSend: (text: string) => Promise<boolean>; onBack: () => void }

function formatTime(timestamp: number) { return new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(timestamp) }

export function Conversation({ chat, sending, error, onSend, onBack }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const draft = chat ? drafts[chat.id] ?? '' : ''
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat?.messages.length])
  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`
    input.style.overflowY = input.scrollHeight > 140 ? 'auto' : 'hidden'
  }, [draft, chat?.id])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const originalDraft = draft
    const text = originalDraft.trim()
    if (!text || sending) return
    const submittedChatId = chat?.id
    if (await onSend(text) && submittedChatId) {
      setDrafts(current => {
        if (current[submittedChatId] !== originalDraft) return current
        const next = { ...current }
        delete next[submittedChatId]
        return next
      })
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  if (!chat) return <main className={styles.emptyConversation}><h2>Выберите чат</h2><p>Откройте переписку слева или создайте новую.</p></main>

  return <main className={styles.conversation}>
    <header className={styles.header}><button className={styles.back} onClick={onBack} aria-label="К списку чатов"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg></button><span className={styles.avatar}>{chat.name.charAt(0).toUpperCase()}</span><div><h1>{chat.name}</h1>{chat.phone && <span>{chat.phone}</span>}</div></header>
    <div className={styles.messages} aria-live="polite">
      {chat.messages.length === 0 ? <div className={styles.emptyChat}><strong>Начните переписку</strong><span>Напишите первое сообщение этому контакту.</span></div> : chat.messages.map(message => <div key={message.id} className={`${styles.messageRow} ${message.direction === 'outgoing' ? styles.outgoing : ''}`}><div className={styles.bubble}><p>{message.text}</p><time dateTime={new Date(message.timestamp).toISOString()}>{formatTime(message.timestamp)}</time></div></div>)}
      <div ref={endRef} />
    </div>
    <div className={styles.composerWrap}>{error && <p className={styles.error} role="alert">{error}</p>}<form className={styles.composer} onSubmit={submit}><textarea ref={inputRef} aria-label="Сообщение" placeholder="Сообщение" value={draft} maxLength={4000} rows={1} enterKeyHint="send" onChange={event => setDrafts(current => ({ ...current, [chat.id]: event.target.value }))} onKeyDown={keyDown} /><button type="submit" disabled={!draft.trim() || sending} aria-label="Отправить сообщение" title="Отправить сообщение">{sending ? <span className={styles.spinner} /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 12 16-8-4 16-4-7-8-1Z" strokeLinejoin="round"/><path d="m12 13 8-9" strokeLinecap="round"/></svg>}</button></form></div>
  </main>
}
