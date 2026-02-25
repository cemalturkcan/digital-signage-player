import type { Playlist } from '@signage/contracts'

export interface PlaylistService {
  getPlaylist: (deviceId: string) => Promise<Playlist | null>
  getPlaylistById: (playlistId: string) => Promise<Playlist | null>
  updatePlaylist: (deviceId: string, playlist: Playlist) => Promise<void>
  assignPlaylist: (deviceId: string, playlistId: string) => Promise<void>
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
