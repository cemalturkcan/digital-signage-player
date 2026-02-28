import axios from 'axios'
import { BACKEND_URL } from '@/config'

const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let authToken: string | null = null

export function setAuthToken(token: string): void {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

export interface RequestConfig {
  url: string
  payload?: unknown
  headers?: Record<string, string>
}

interface ApiMeta {
  code?: string
  message?: string
}

interface ApiEnvelope<T> {
  data: T | null
  meta?: ApiMeta
}

export interface HttpError extends Error {
  status?: number
  code?: string
  data?: unknown
}

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (!value || typeof value !== 'object') {
    return false
  }

  return 'data' in value && 'meta' in value
}

function unwrapResponse<T>(payload: unknown): T {
  if (!isApiEnvelope(payload)) {
    return payload as T
  }

  if (payload.data === null) {
    return undefined as T
  }

  return payload.data as T
}

function toHttpError(error: unknown): HttpError {
  if (!axios.isAxiosError(error)) {
    return error as HttpError
  }

  const responseData = error.response?.data
  const status = error.response?.status
  const message = isApiEnvelope(responseData)
    ? responseData.meta?.message ?? error.message
    : error.message

  const httpError: HttpError = new Error(message)
  httpError.status = status
  httpError.data = responseData

  if (isApiEnvelope(responseData)) {
    httpError.code = responseData.meta?.code
  }

  return httpError
}

async function makeRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  config: RequestConfig,
): Promise<T> {
  const headers: Record<string, string> = {
    ...config.headers,
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  try {
    const response = await axiosInstance.request<unknown>({
      method,
      url: config.url,
      data: config.payload,
      headers,
    })
    return unwrapResponse<T>(response.data)
  }
  catch (error) {
    throw toHttpError(error)
  }
}

export function getRequest<T>(config: RequestConfig): Promise<T> {
  return makeRequest<T>('GET', config)
}

export function postRequest<T>(config: RequestConfig): Promise<T> {
  return makeRequest<T>('POST', config)
}

export function deleteRequest<T>(config: RequestConfig): Promise<T> {
  return makeRequest<T>('DELETE', config)
}
