import type { Playlist } from '@signage/contracts'

export interface PlaylistService {
  getPlaylist: (deviceId: string) => Promise<Playlist | null>
  getPlaylistById: (playlistId: string) => Promise<Playlist | null>
  updatePlaylist: (deviceId: string, playlist: Playlist) => Promise<void>
  assignPlaylist: (deviceId: string, playlistId: string) => Promise<void>
}

export const playlistService: PlaylistService = {
  async getPlaylist(deviceId: string): Promise<Playlist | null> {
    void deviceId
    throw new Error('Not implemented: getPlaylist')
  },

  async getPlaylistById(playlistId: string): Promise<Playlist | null> {
    void playlistId
    throw new Error('Not implemented: getPlaylistById')
  },

  async updatePlaylist(deviceId: string, playlist: Playlist): Promise<void> {
    void deviceId
    void playlist
    throw new Error('Not implemented: updatePlaylist')
  },

  async assignPlaylist(deviceId: string, playlistId: string): Promise<void> {
    void deviceId
    void playlistId
    throw new Error('Not implemented: assignPlaylist')
  },
}
