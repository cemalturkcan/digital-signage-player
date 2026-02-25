import type {
  RegistrationRequest,
  RegistrationResponse,
  PlaylistResponse,
  ScreenshotMetadata,
} from '@signage/contracts'
import type { BaseService } from './base-service.js'

export interface ScreenshotUploadRequest {
  metadata: ScreenshotMetadata
  uploadUrl: string
  uploadMethod: 'PUT' | 'POST' | 'PATCH'
  uploadHeaders?: Record<string, string>
}

export interface PlayerHttpClient {
  register(request: RegistrationRequest): Promise<RegistrationResponse>
  fetchPlaylist(): Promise<PlaylistResponse>
  requestScreenshotUpload(metadata: ScreenshotMetadata): Promise<ScreenshotUploadRequest>
}

export class PlayerService implements PlayerHttpClient {
  constructor(private readonly api: BaseService) {}

  async register(request: RegistrationRequest): Promise<RegistrationResponse> {
    throw new Error('Not implemented: register')
  }

  async fetchPlaylist(): Promise<PlaylistResponse> {
    throw new Error('Not implemented: fetchPlaylist')
  }

  async requestScreenshotUpload(metadata: ScreenshotMetadata): Promise<ScreenshotUploadRequest> {
    throw new Error('Not implemented: requestScreenshotUpload')
  }
}
