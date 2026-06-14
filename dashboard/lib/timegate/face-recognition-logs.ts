import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { FaceRecognitionLog } from '@/lib/timegate/types'

export function listFaceRecognitionLogs(params?: {
  page?: number
  limit?: number
  offlineSync?: boolean
}) {
  return http.get<PaginatedResponse<FaceRecognitionLog>>('/face-recognition-logs', { params })
}

export function listOfflineFaceSyncLogs(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<FaceRecognitionLog>>('/face-recognition-logs/offline-sync', {
    params,
  })
}
