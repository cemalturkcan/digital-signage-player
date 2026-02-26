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

export interface HttpError extends Error {
  status?: number
  data?: unknown
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
    const response = await axiosInstance.request<T>({
      method,
      url: config.url,
      data: config.payload,
      headers,
    })
    return response.data
  }
  catch (error) {
    if (axios.isAxiosError(error)) {
      const httpError: HttpError = new Error(error.message)
      httpError.status = error.response?.status
      httpError.data = error.response?.data
      throw httpError
    }
    throw error
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
