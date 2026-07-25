import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'

export type ConversationSummary = {
  id: string
  subject: string
  lastMessageAt: string
  lastMessagePreview: string | null
  createdAt: string
  unread: boolean
  employee: {
    id: string
    firstName: string | null
    lastName: string | null
  }
}

export type ConversationMessage = {
  id: string
  body: string
  createdAt: string
  senderUserId: string
  sender: {
    id: string
    firstName: string | null
    lastName: string | null
    role: string | null
  }
}

export type ConversationDetail = {
  id: string
  subject: string
  lastMessageAt: string
  lastMessagePreview: string | null
  createdAt: string
  employee: {
    id: string
    firstName: string | null
    lastName: string | null
  }
  messages: ConversationMessage[]
  viewerUserId: string
}

export function listConversations(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<ConversationSummary>>('/messages', { params })
}

export function getConversation(id: string) {
  return http.get<ConversationDetail>(`/messages/${id}`)
}

export function createConversation(body: {
  employeeId: string
  subject: string
  body: string
}) {
  return http.post<ConversationDetail>('/messages', body)
}

export function replyToConversation(id: string, body: string) {
  return http.post<ConversationMessage>(`/messages/${id}/messages`, { body })
}
