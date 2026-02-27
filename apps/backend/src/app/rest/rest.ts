import { ErrorCode, getMessageForCode, getStatusForCode } from '@/app/rest/codes.js'

export class Err extends Error {
  code: string
  status: number
  originError?: Error

  constructor(code: string, status: number, message?: string, originError?: Error) {
    super(message ?? getMessageForCode(code))
    this.code = code
    this.status = status
    this.originError = originError
  }
}

export type ServiceResponse<T> = { data: T } | { error: Err }

export function ok<T>(data: T): ServiceResponse<T> {
  return { data }
}

export function fail(
  code: string,
  message?: string,
  status?: number,
  originError?: Error,
): ServiceResponse<never> {
  return {
    error: new Err(code, status ?? getStatusForCode(code), message, originError),
  }
}

export function unexpected(error: unknown, message?: string): ServiceResponse<never> {
  const originError = error instanceof Error ? error : undefined
  return fail(ErrorCode.INTERNAL_SERVER_ERROR, message, undefined, originError)
}

export function toHttpResponse<T>(result: ServiceResponse<T>): Response {
  if ('data' in result) {
    return Response.json(result.data)
  }

  return Response.json(
    {
      error: result.error.message,
      code: result.error.code,
      status: result.error.status,
    },
    { status: result.error.status },
  )
}
