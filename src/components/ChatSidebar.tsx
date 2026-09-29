import { useState, type FormEvent } from 'react'
import type { Chat } from '../types'
import styles from './ChatSidebar.module.css'

interface Props {
  chats: Chat[]
  selectedId: string | null
  busy: boolean
  error: string | null
  onCreate: (phone: string) => Promise<boolean>
  onSelect: (id: string) => void
  onDisconnect: () => void
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
}

export function ChatSidebar({ chats, selectedId, busy, error, onCreate, onSelect, onDisconnect }: Props) {
  const [phone, setPhone] = useState('')
  const [creating, setCreating] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await onCreate(phone)) { setPhone(''); setCreating(false) }
  }

  return <aside className={styles.sidebar}>
    <div className={styles.header}>
      <span className={styles.brand}>MAX</span>
      <button className={styles.disconnect} onClick={onDisconnect} title="Отключиться" aria-label="Отключиться"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 17l5-5-5-5M15 12H3M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    </div>
    <div className={styles.sectionTitle}><h2>Чаты</h2><button className={styles.add} onClick={() => setCreating(value => !value)} aria-label={creating ? 'Закрыть форму' : 'Создать чат'} title={creating ? 'Закрыть форму' : 'Создать чат'}>{creating ? '×' : '+'}</button></div>
    {creating && <form className={styles.createForm} onSubmit={submit}>
      <label htmlFor="phone">Номер получателя</label>
      <input id="phone" type="tel" inputMode="tel" autoFocus placeholder="7… или 375…" value={phone} onChange={event => setPhone(event.target.value)} required />
      <button disabled={busy}>{busy ? 'Проверяем…' : 'Создать чат'}</button>
    </form>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.list}>
      {chats.length === 0 ? !creating && <div className={styles.empty}><strong>Пока нет чатов</strong><span>Нажмите «+» и введите номер собеседника.</span></div> : chats.map(chat => {
        const last = chat.messages.at(-1)
        return <button key={chat.id} onClick={() => onSelect(chat.id)} className={`${styles.chat} ${selectedId === chat.id ? styles.selected : ''}`}>
          <span className={styles.avatar}>{chat.name.charAt(0).toUpperCase()}</span>
          <span className={styles.chatInfo}><span className={styles.chatTop}><strong>{chat.name}</strong>{last && <time>{formatTime(last.timestamp)}</time>}</span><span className={styles.preview}>{last?.text || chat.phone || 'Новый чат'}</span></span>
        </button>
      })}
    </div>
  </aside>
}
