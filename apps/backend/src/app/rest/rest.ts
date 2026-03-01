import { logger } from '@/app/logger/logger.js'
import {
  ErrorCode,
  getCodeMessage,
  getHttpStatusCode,
  SERVER_INTERNAL_ERROR,
  SUCCESS,
} from '@/app/rest/codes.js'

export class Err extends Error {
  code: string
  message: string
  originError?: Error

  constructor(code: string, message: string, originError?: Error) {
    super(message)
    this.code = code
    this.message = message
    this.originError = originError
  }
}

export interface Meta {
  code?: string
  message?: string
}

export interface ApiResponse<T = never> {
  data: T | null
  meta: Meta
}

export interface Page<T> {
  size: number
  total: number
  currentPage: number
  totalPages: number
  content: T[]
}

export type ServiceResponse<T = never> = { data?: T, error?: never } | { data?: never, error: Err }

function jsonResponse<T>(data: T | null, code: string, message: string): ApiResponse<T> {
  return {
    data,
    meta: {
      code,
      message,
    },
  }
}

export function ok<T>(data: T): ServiceResponse<T> {
  return { data }
}

export function fail(code: string, message?: string, originError?: Error): ServiceResponse {
  return {
    error: new Err(code, message ?? getCodeMessage(code), originError),
  }
}

export function unexpected(error: unknown, message?: string): ServiceResponse<never> {
  const originError = error instanceof Error ? error : undefined
  return fail(ErrorCode.INTERNAL_SERVER_ERROR, message, originError)
}

export function getError(error: Err): [string, string] {
  if (!error.code) {
    return [SERVER_INTERNAL_ERROR, getCodeMessage(SERVER_INTERNAL_ERROR)]
  }

  return [error.code, getCodeMessage(error.code)]
}

export function getHttpStatus(code: string): number {
  return getHttpStatusCode(code)
}

export function ErrorRes(error: Err): Response {
  const [code, message] = getError(error)
  const status = getHttpStatus(code)

  logger.error({ code, message, originError: error.originError }, 'Request error')

  return Response.json(jsonResponse(null, code, message), { status })
}

export function Res<T>(result: ServiceResponse<T>): Response {
  if (result.error) {
    return ErrorRes(result.error)
  }

  return Response.json(jsonResponse(result.data ?? null, SUCCESS, getCodeMessage(SUCCESS)))
}
