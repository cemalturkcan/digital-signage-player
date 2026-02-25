import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'
import { getPlayerService } from './index.js'

export interface HttpClient {
  baseUrl: string
  authToken: string | null
  register: (request: RegistrationRequest) => Promise<RegistrationResponse>
  uploadScreenshot: (blob: Blob, metadata: Record<string, string>) => Promise<void>
  fetchPlaylist: () => Promise<unknown>
}

let httpClientInstance: HttpClient | null = null

class HttpClientImpl implements HttpClient {
  authToken: string | null = null

  constructor(public baseUrl: string) {}

  async register(request: RegistrationRequest): Promise<RegistrationResponse> {
    const service = getPlayerService({ baseURL: this.baseUrl })
    const response = await service.register(request)
    if (response.authToken) {
      this.authToken = response.authToken
    }
    return response
  }

  async uploadScreenshot(_blob: Blob, _metadata: Record<string, string>): Promise<void> {
    throw new Error('Not implemented: uploadScreenshot')
  }

  async fetchPlaylist(): Promise<unknown> {
    const service = getPlayerService({ baseURL: this.baseUrl })
    return service.fetchPlaylist()
  }
}

export function createHttpClient(baseUrl: string): HttpClient {
  if (!httpClientInstance) {
    httpClientInstance = new HttpClientImpl(baseUrl)
  }
  return httpClientInstance
}

export function getHttpClient(): HttpClient | null {
  return httpClientInstance
}

export function resetHttpClient(): void {
  httpClientInstance = null
}
