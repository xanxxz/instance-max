import { useState, type FormEvent } from 'react'
import { normalizeApiUrl } from '../api/greenApi'
import type { Credentials } from '../types'
import styles from './ConnectionForm.module.css'

interface Props { onConnect: (credentials: Credentials) => void }

export function ConnectionForm({ onConnect }: Props) {
  const [apiUrl, setApiUrl] = useState('')
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      if (!/^\d+$/.test(idInstance.trim())) throw new Error('idInstance должен содержать только цифры.')
      if (!apiTokenInstance.trim()) throw new Error('Введите apiTokenInstance.')
      onConnect({ apiUrl: normalizeApiUrl(apiUrl), idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim() })
      setApiTokenInstance('')
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Проверьте введённые данные.')
    }
  }

  return <main className={styles.page}>
    <header className={styles.header}><span className={styles.brand}>MAX</span></header>
    <div className={styles.content}>
      <section className={styles.intro} aria-labelledby="connect-title">
        <h1 id="connect-title">Подключите свой аккаунт</h1>
        <p>Введите данные инстанса GREEN-API, чтобы отправлять и получать сообщения в MAX.</p>
        <a href="https://console.green-api.com/" target="_blank" rel="noopener noreferrer">Открыть личный кабинет <span aria-hidden="true">↗</span></a>
      </section>
      <section className={styles.formArea} aria-label="Данные подключения">
        <form onSubmit={submit} className={styles.form}>
          <label htmlFor="api-url">apiUrl</label>
          <input id="api-url" type="url" autoComplete="off" spellCheck={false} placeholder="https://…api.green-api.com" value={apiUrl} onChange={event => setApiUrl(event.target.value)} required />
          <label htmlFor="instance-id">idInstance</label>
          <input id="instance-id" inputMode="numeric" autoComplete="off" placeholder="Номер инстанса" value={idInstance} onChange={event => setIdInstance(event.target.value)} required />
          <label htmlFor="instance-token">apiTokenInstance</label>
          <input id="instance-token" type="password" autoComplete="off" placeholder="Ключ доступа" value={apiTokenInstance} onChange={event => setApiTokenInstance(event.target.value)} required />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit">Подключиться</button>
        </form>
        <p className={styles.note}>Ключ действует только в этой вкладке и удаляется при отключении.</p>
      </section>
    </div>
  </main>
}
