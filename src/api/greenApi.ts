import type { Credentials, Notification } from '../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeApiUrl(value: string): string {
  const url = new URL(value.trim())
  if (url.protocol !== 'https:' || !/^(?:[a-z0-9-]+\.)?api\.green-api\.com$/i.test(url.hostname) || url.pathname !== '/' || url.search || url.hash || url.username || url.password || url.port) {
    throw new Error('Укажите адрес сервера из личного кабинета.')
  }
  return url.origin
}

function methodUrl(credentials: Credentials, method: string): string {
  return `${credentials.apiUrl}/waInstance${credentials.idInstance}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}`
}

async function request(url: string, init: RequestInit, signal?: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, { ...init, signal, cache: 'no-store', referrerPolicy: 'no-referrer' })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new Error('Не удаётся загрузить сообщения. Проверьте интернет и адрес подключения.')
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Доступ отклонён. Проверьте данные подключения и вход в аккаунт.')
    if (response.status === 429) throw new Error('Слишком много запросов. Повторим получение позже.')
    throw new Error(`Ошибка сервера (${response.status}). Проверьте данные подключения и настройки сообщений.`)
  }
  if (response.status === 204) return null
  try {
    const body = await response.text()
    return body.trim() ? JSON.parse(body) as unknown : null
  } catch {
    throw new Error('Сервер вернул некорректный ответ.')
  }
}

export async function checkAccount(credentials: Credentials, phone: string, signal?: AbortSignal): Promise<string> {
  const result = await request(methodUrl(credentials, 'checkAccount'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: Number(phone) }),
  }, signal)
  if (!isRecord(result)) throw new Error('Некорректный ответ проверки номера.')
  if (result.exist === false) throw new Error('На этом номере нет аккаунта MAX.')
  if (result.exist !== true || typeof result.chatId !== 'string' || !result.chatId) {
    throw new Error('Не удалось открыть чат. Проверьте подключение аккаунта.')
  }
  return result.chatId
}

export async function sendMessage(credentials: Credentials, chatId: string, message: string, signal?: AbortSignal): Promise<string> {
  const result = await request(methodUrl(credentials, 'sendMessage'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId, message }),
  }, signal)
  if (!isRecord(result) || typeof result.idMessage !== 'string' || !result.idMessage) {
    throw new Error('Сервер не подтвердил отправку сообщения.')
  }
  return result.idMessage
}

export async function receiveNotification(credentials: Credentials, signal: AbortSignal): Promise<Notification | null> {
  const result = await request(`${methodUrl(credentials, 'receiveNotification')}?receiveTimeout=5`, { method: 'GET' }, signal)
  if (result === null) return null
  if (!isRecord(result) || typeof result.receiptId !== 'number' || !Number.isInteger(result.receiptId) || !isRecord(result.body)) {
    throw new Error('Получен ответ неизвестного формата.')
  }
  return { receiptId: result.receiptId, body: result.body }
}

export async function deleteNotification(credentials: Credentials, receiptId: number, signal: AbortSignal): Promise<void> {
  const result = await request(`${methodUrl(credentials, 'deleteNotification')}/${receiptId}`, { method: 'DELETE' }, signal)
  if (!isRecord(result) || result.result !== true) throw new Error('Не удалось обработать новое сообщение.')
}

export interface IncomingText {
  id: string
  chatId: string
  phone: string
  name: string
  text: string
  timestamp: number
}

export function parseIncomingText(body: unknown): IncomingText | null {
  if (!isRecord(body) || body.typeWebhook !== 'incomingMessageReceived' || typeof body.idMessage !== 'string' || !isRecord(body.senderData) || !isRecord(body.messageData)) return null
  const { senderData, messageData } = body
  if (senderData.chatType !== 'user' || messageData.typeMessage !== 'textMessage' || !isRecord(messageData.textMessageData)) return null
  const text = messageData.textMessageData.textMessage
  if (typeof senderData.chatId !== 'string' || typeof text !== 'string' || typeof body.timestamp !== 'number') return null
  const phone = typeof senderData.senderPhoneNumber === 'number' && senderData.senderPhoneNumber > 0 ? String(senderData.senderPhoneNumber) : ''
  const name = typeof senderData.senderContactName === 'string' && senderData.senderContactName.trim() ? senderData.senderContactName.trim() : phone || senderData.chatId
  return { id: body.idMessage, chatId: senderData.chatId, phone, name, text, timestamp: body.timestamp * 1000 }
}
