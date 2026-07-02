export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export class HttpSessionError extends Error {
  constructor() {
    super('Session expirée')
    this.name = 'HttpSessionError'
  }
}
