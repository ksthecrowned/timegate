import { http } from '@/lib/http'

export type AiUsageSummary = {
  enabled: boolean
  usedTokens: number
  quotaTokens: number | null
  percent: number | null
  unlimited: boolean
}

export type CopilotSource = {
  label: string
  href: string
}

export type CopilotChatResponse = {
  sessionId: string
  text: string
  sources: CopilotSource[]
  usage: AiUsageSummary
}

export type CopilotMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: CopilotSource[]
}

export function postCopilotChat(payload: { message: string; sessionId?: string }) {
  return http.post<CopilotChatResponse>('/ai/copilot/chat', payload)
}

export function getAiUsage() {
  return http.get<AiUsageSummary>('/ai/usage')
}

export function getAiUsageHistory() {
  return http.get<{ daily: Array<{ date: string; tokens: number }>; sessions: number }>(
    '/ai/usage/history',
  )
}
