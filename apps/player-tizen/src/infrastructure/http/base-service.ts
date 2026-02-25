import type { AxiosInstance, AxiosRequestConfig } from 'axios'

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  params?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string>
}

export class BaseService {
  constructor(private readonly client: AxiosInstance) {}

  async request<T>(config: RequestConfig): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data,
      headers: config.headers,
    }
    const response = await this.client.request<T>(axiosConfig)
    return response.data
  }

  get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ method: 'GET', url, params })
  }

  post<T>(url: string, data?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>({ method: 'POST', url, data, headers })
  }

  put<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data })
  }

  patch<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: 'PATCH', url, data })
  }

  delete<T>(url: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', url })
  }
}
