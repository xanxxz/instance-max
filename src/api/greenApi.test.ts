import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeApiUrl, parseIncomingText, receiveNotification } from './greenApi'

afterEach(() => vi.unstubAllGlobals())

describe('GREEN-API notification parsing', () => {
  const textBody = {
    typeWebhook: 'incomingMessageReceived', idMessage: '42', timestamp: 1763115112,
    senderData: { chatId: '10000000', chatType: 'user', senderPhoneNumber: 79991234567 },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
  }
  it('accepts only incoming personal text', () => {
    expect(parseIncomingText(textBody)).toMatchObject({ id: '42', chatId: '10000000', text: 'Привет', phone: '79991234567' })
    expect(parseIncomingText({ ...textBody, messageData: { typeMessage: 'imageMessage' } })).toBeNull()
    expect(parseIncomingText({ ...textBody, senderData: { ...textBody.senderData, chatType: 'group' } })).toBeNull()
  })
  it('allows only GREEN-API HTTPS hosts', () => {
    expect(normalizeApiUrl('https://3100.api.green-api.com')).toBe('https://3100.api.green-api.com')
    expect(() => normalizeApiUrl('https://api.green-api.com.evil.test')).toThrow()
    expect(() => normalizeApiUrl('http://3100.api.green-api.com')).toThrow()
  })
  it('treats an empty receive response as no message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })))
    const result = await receiveNotification({ apiUrl: 'https://3100.api.green-api.com', idInstance: '1', apiTokenInstance: 'test' }, new AbortController().signal)
    expect(result).toBeNull()
  })
})
