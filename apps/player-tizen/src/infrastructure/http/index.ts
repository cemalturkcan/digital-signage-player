import type { AxiosInstance } from 'axios'
import type { TokenAccessor } from './axios.js'
import { createAxiosInstance } from './axios.js'
import { BaseService } from './base-service.js'
import { PlayerService } from './player-service.js'

interface HttpClientConfig {
  baseURL: string
  tokenAccessor?: TokenAccessor
}

let axiosInstance: AxiosInstance | null = null
let baseService: BaseService | null = null
let playerService: PlayerService | null = null

export function getAxiosInstance(config?: HttpClientConfig): AxiosInstance {
  if (!axiosInstance && config) {
    axiosInstance = createAxiosInstance({
      baseURL: config.baseURL,
      tokenAccessor: config.tokenAccessor,
    })
  }
  if (!axiosInstance) {
    throw new Error('Axios instance not initialized')
  }
  return axiosInstance
}

export function getBaseService(config?: HttpClientConfig): BaseService {
  if (!baseService) {
    const axios = getAxiosInstance(config)
    baseService = new BaseService(axios)
  }
  return baseService
}

export function getPlayerService(config?: HttpClientConfig): PlayerService {
  if (!playerService) {
    const base = getBaseService(config)
    playerService = new PlayerService(base)
  }
  return playerService
}

export function resetHttpClient(): void {
  axiosInstance = null
  baseService = null
  playerService = null
}
