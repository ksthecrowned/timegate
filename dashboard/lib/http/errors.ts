export class HttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

export class HttpSessionError extends HttpError {
  constructor(message = 'Session expirée — reconnectez-vous.') {
    super(message, 401)
    this.name = 'HttpSessionError'
  }
}
