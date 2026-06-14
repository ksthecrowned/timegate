import { http } from '@/lib/http'

export type FaceEnrollResult = {
  employee: {
    id: string
    firstName: string
    lastName: string
    photoUrl?: string | null
  }
  enrolled?: boolean
  updatedEmbedding?: boolean
}

export function enrollFace(employeeId: string, photo: File): Promise<FaceEnrollResult> {
  const body = new FormData()
  body.append('employeeId', employeeId)
  body.append('photo', photo)
  return http.post<FaceEnrollResult>('/face/enroll', body)
}

export function addFaceSample(employeeId: string, photo: File): Promise<FaceEnrollResult> {
  const body = new FormData()
  body.append('employeeId', employeeId)
  body.append('photo', photo)
  return http.post<FaceEnrollResult>('/face/add-face', body)
}
