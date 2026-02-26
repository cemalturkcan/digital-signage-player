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

async function savePlaylist(playlist: Playlist): Promise<void> {
  void playlist
  throw new Error('Not implemented: savePlaylist')
}

async function loadPlaylist(): Promise<Playlist | null> {
  throw new Error('Not implemented: loadPlaylist')
}

async function saveMedia(id: string, blob: Blob): Promise<void> {
  void id
  void blob
  throw new Error('Not implemented: saveMedia')
}

async function loadMedia(id: string): Promise<Blob | null> {
  void id
  throw new Error('Not implemented: loadMedia')
}

async function hasMedia(id: string): Promise<boolean> {
  void id
  throw new Error('Not implemented: hasMedia')
}

async function deleteMedia(id: string): Promise<void> {
  void id
  throw new Error('Not implemented: deleteMedia')
}

async function getQuota(): Promise<{ used: number, total: number }> {
  throw new Error('Not implemented: getQuota')
}

async function clear(): Promise<void> {
  throw new Error('Not implemented: clear')
}

export const storageService: StorageService = {
  savePlaylist,
  loadPlaylist,
  saveMedia,
  loadMedia,
  hasMedia,
  deleteMedia,
  getQuota,
  clear,
}
