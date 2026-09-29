export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export interface Chat {
  id: string
  phone: string
  name: string
  messages: Message[]
}

export interface Message {
  id: string
  text: string
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

export interface Notification {
  receiptId: number
  body: unknown
}
