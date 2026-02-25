import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'

export interface HttpError {
  code: string
  message: string
  status?: number
  data?: unknown
}

export function createHttpError(error: AxiosError): HttpError {
  if (error.response) {
    return {
      code: `HTTP_${error.response.status}`,
      message: error.message,
      status: error.response.status,
      data: error.response.data,
    }
  }
  if (error.request) {
    return {
      code: 'NETWORK_ERROR',
      message: error.message,
    }
  }
  return {
    code: 'REQUEST_ERROR',
    message: error.message,
  }
}

export interface TokenAccessor {
  getToken: () => string | null
}

export interface AxiosConfig {
  baseURL: string
  timeout?: number
  withCredentials?: boolean
  tokenAccessor?: TokenAccessor
}

export function createAxiosInstance(config: AxiosConfig): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? 30000,
    withCredentials: config.withCredentials ?? false,
    paramsSerializer: {
      indexes: null,
    },
  })

  instance.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig) => {
      if (requestConfig.headers && config.tokenAccessor) {
        const token = config.tokenAccessor.getToken()
        if (token) {
          requestConfig.headers.Authorization = `Bearer ${token}`
        }
      }
      return requestConfig
    },
    (error: AxiosError) => Promise.reject(error)
  )

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      throw createHttpError(error)
    }
  )

  return instance
}
