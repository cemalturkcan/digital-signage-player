import type { Playlist } from '@signage/contracts'

export interface StorageService {
  savePlaylist: (playlist: Playlist) => Promise<void>
  loadPlaylist: () => Promise<Playlist | null>
  saveMedia: (id: string, blob: Blob) => Promise<void>
  loadMedia: (id: string) => Promise<Blob | null>
  hasMedia: (id: string) => Promise<boolean>
  deleteMedia: (id: string) => Promise<void>
  getQuota: () => Promise<{ used: number, total: number }>
  clear: () => Promise<void>
}

let storageServiceInstance: StorageService | null = null

function createStorageServiceInternal(): StorageService {
  throw new Error('Not implemented: createStorageService')
}

export function createStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = createStorageServiceInternal()
  }
  return storageServiceInstance
}

export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    throw new Error('Not implemented: getStorageService')
  }
  return storageServiceInstance
}

export function resetStorageService(): void {
  storageServiceInstance = null
}
