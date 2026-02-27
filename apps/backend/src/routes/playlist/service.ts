import type { CacheInfo, Playlist, PlaylistResponse } from '@signage/contracts'
import type { ServiceResponse } from '@/app/rest/rest.js'
import { ErrorCode } from '@/app/rest/codes.js'
import { fail, ok, unexpected } from '@/app/rest/rest.js'

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
  getPlaylist: (deviceId: string) => Promise<ServiceResponse<PlaylistResponse>>
  getPlaylistById: (playlistId: string) => Promise<ServiceResponse<Playlist>>
  updatePlaylist: (deviceId: string, playlist: Playlist) => Promise<ServiceResponse<void>>
  assignPlaylist: (deviceId: string, playlistId: string) => Promise<ServiceResponse<void>>
}

export const playlistService: PlaylistService = {
  async getPlaylist(deviceId: string): Promise<ServiceResponse<PlaylistResponse>> {
    const normalizedDeviceId = deviceId.trim()

    if (!normalizedDeviceId) {
      return fail(ErrorCode.BAD_REQUEST, 'deviceId required')
    }

    try {
      const playlistId = deviceAssignments.get(normalizedDeviceId)
      let playlist: Playlist | undefined
      if (!playlistId) {
        deviceAssignments.set(normalizedDeviceId, defaultPlaylist.id)
        playlist = defaultPlaylist
      }
      else {
        playlist = playlists.get(playlistId)
      }

      if (!playlist) {
        return fail(ErrorCode.NOT_FOUND, 'Playlist not found')
      }

      return ok({
        playlist,
        cache: createCacheInfo(playlist),
      })
    }
    catch (error) {
      return unexpected(error, 'Failed to get playlist')
    }
  },

  async getPlaylistById(playlistId: string): Promise<ServiceResponse<Playlist>> {
    const normalizedPlaylistId = playlistId.trim()

    if (!normalizedPlaylistId) {
      return fail(ErrorCode.BAD_REQUEST, 'id required')
    }

    try {
      const playlist = playlists.get(normalizedPlaylistId)
      if (!playlist) {
        return fail(ErrorCode.NOT_FOUND, 'Playlist not found')
      }

      return ok(playlist)
    }
    catch (error) {
      return unexpected(error, 'Failed to get playlist by id')
    }
  },

  async updatePlaylist(deviceId: string, playlist: Playlist): Promise<ServiceResponse<void>> {
    const normalizedDeviceId = deviceId.trim()

    if (!normalizedDeviceId) {
      return fail(ErrorCode.BAD_REQUEST, 'deviceId required')
    }

    try {
      const playlistId = deviceAssignments.get(normalizedDeviceId) ?? playlist.id
      deviceAssignments.set(normalizedDeviceId, playlistId)
      playlists.set(playlistId, { ...playlist, updatedAt: Date.now() })
      return ok(undefined)
    }
    catch (error) {
      return unexpected(error, 'Failed to update playlist')
    }
  },

  async assignPlaylist(deviceId: string, playlistId: string): Promise<ServiceResponse<void>> {
    const normalizedDeviceId = deviceId.trim()
    const normalizedPlaylistId = playlistId.trim()

    if (!normalizedDeviceId) {
      return fail(ErrorCode.BAD_REQUEST, 'deviceId required')
    }

    if (!normalizedPlaylistId) {
      return fail(ErrorCode.BAD_REQUEST, 'id required')
    }

    try {
      deviceAssignments.set(normalizedDeviceId, normalizedPlaylistId)
      return ok(undefined)
    }
    catch (error) {
      return unexpected(error, 'Failed to assign playlist')
    }
  },
}
