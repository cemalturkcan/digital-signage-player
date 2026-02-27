import type { CacheInfo, Playlist, PlaylistResponse } from '@signage/contracts'

const playlists = new Map<string, Playlist>()
const deviceAssignments = new Map<string, string>()

const defaultPlaylist: Playlist = {
  id: 'default',
  version: '1.0.0',
  loop: true,
  items: [
    {
      id: 'img-1',
      type: 'image',
      url: 'https://picsum.photos/1920/1080',
      duration: 10,
      order: 0,
      mimeType: 'image/jpeg',
    },
    {
      id: 'vid-1',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      order: 1,
      mimeType: 'video/mp4',
    },
  ],
  updatedAt: Date.now(),
}

function createCacheInfo(playlist: Playlist): CacheInfo {
  return {
    etag: `"${playlist.version}-${playlist.updatedAt}"`,
    maxAge: 60,
    cacheControl: 'public, max-age=60',
  }
}

playlists.set(defaultPlaylist.id, defaultPlaylist)

export interface PlaylistService {
  getPlaylist: (deviceId: string) => Promise<PlaylistResponse | null>
  getPlaylistById: (playlistId: string) => Promise<Playlist | null>
  updatePlaylist: (deviceId: string, playlist: Playlist) => Promise<void>
  assignPlaylist: (deviceId: string, playlistId: string) => Promise<void>
}

export const playlistService: PlaylistService = {
  async getPlaylist(deviceId: string): Promise<PlaylistResponse | null> {
    const playlistId = deviceAssignments.get(deviceId)
    let playlist: Playlist | undefined
    if (!playlistId) {
      deviceAssignments.set(deviceId, defaultPlaylist.id)
      playlist = defaultPlaylist
    }
    else {
      playlist = playlists.get(playlistId)
    }
    if (!playlist) {
      return null
    }
    return {
      playlist,
      cache: createCacheInfo(playlist),
    }
  },

  async getPlaylistById(playlistId: string): Promise<Playlist | null> {
    return playlists.get(playlistId) ?? null
  },

  async updatePlaylist(deviceId: string, playlist: Playlist): Promise<void> {
    const playlistId = deviceAssignments.get(deviceId) ?? playlist.id
    deviceAssignments.set(deviceId, playlistId)
    playlists.set(playlistId, { ...playlist, updatedAt: Date.now() })
  },

  async assignPlaylist(deviceId: string, playlistId: string): Promise<void> {
    deviceAssignments.set(deviceId, playlistId)
  },
}
