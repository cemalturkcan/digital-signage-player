import type { MediaItem, Playlist } from '@signage/contracts'

export interface PlaylistService {
  currentPlaylist: Playlist | null
  currentIndex: number
  getCurrentItem: () => MediaItem | null
  loadPlaylist: (playlist: Playlist) => Promise<void>
  next: () => MediaItem | null
  hasNext: () => boolean
}

let playlistServiceInstance: PlaylistService | null = null

function createPlaylistServiceInternal(): PlaylistService {
  throw new Error('Not implemented: createPlaylistService')
}

export function createPlaylistService(): PlaylistService {
  if (!playlistServiceInstance) {
    playlistServiceInstance = createPlaylistServiceInternal()
  }
  return playlistServiceInstance
}

export function getPlaylistService(): PlaylistService {
  if (!playlistServiceInstance) {
    throw new Error('Not implemented: getPlaylistService')
  }
  return playlistServiceInstance
}

export function resetPlaylistService(): void {
  playlistServiceInstance = null
}
