import type { MediaItem, Playlist, PlaylistResponse } from '@signage/contracts'
import type { ServiceResponse } from '@/app/rest/rest.js'
import type { PlaylistItemRecord, PlaylistRecord } from '@/routes/playlist/modal.js'
import { ErrorCode } from '@/app/rest/codes.js'
import { fail, ok, unexpected } from '@/app/rest/rest.js'
import { playlistRepository } from '@/routes/playlist/repository.js'

const DEFAULT_PLAYLIST: Playlist = {
  id: 'default',
  createdAt: 0,
  updatedAt: 0,
  items: [
    {
      id: 'default-0',
      type: 'image',
      url: 'https://cdn.cemalturkcan.com/images/image1.jpg',
      order: 0,
    },
    {
      id: 'default-1',
      type: 'video',
      url: 'https://cdn.cemalturkcan.com/videos/video1.mp4',
      order: 1,
    },
    {
      id: 'default-2',
      type: 'image',
      url: 'https://cdn.cemalturkcan.com/images/image2.jpg',
      order: 2,
    },
    {
      id: 'default-3',
      type: 'video',
      url: 'https://cdn.cemalturkcan.com/videos/video2.mp4',
      order: 3,
    },
  ],
}

function mapRecordToPlaylist(record: PlaylistRecord, itemRecords: PlaylistItemRecord[]): Playlist {
  const items: MediaItem[] = itemRecords.map((itemRecord: PlaylistItemRecord) => {
    return {
      id: String(itemRecord.id),
      type: itemRecord.mediaType,
      url: itemRecord.mediaUrl,
      order: itemRecord.sortOrder,
    }
  })

  return {
    id: String(record.id),
    items,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

async function loadPlaylistFromRecord(record: PlaylistRecord): Promise<Playlist> {
  const itemRecords = await playlistRepository.loadPlaylistItemsOrdered(record.id)
  return mapRecordToPlaylist(record, itemRecords)
}

export interface PlaylistService {
  getPlaylistsByDeviceId: (
    deviceId: string,
    page: number,
    pageSize: number,
  ) => Promise<ServiceResponse<PlaylistResponse>>
}

export const playlistService: PlaylistService = {
  async getPlaylistsByDeviceId(
    deviceId: string,
    page: number,
    pageSize: number,
  ): Promise<ServiceResponse<PlaylistResponse>> {
    const normalizedDeviceId = deviceId.trim()
    if (!normalizedDeviceId) {
      return fail(ErrorCode.BAD_REQUEST, 'deviceId required')
    }

    try {
      const offset = (page - 1) * pageSize

      const [totalDevicePlaylists, records] = await Promise.all([
        playlistRepository.countPlaylistsByDeviceId(normalizedDeviceId),
        playlistRepository.listPlaylistsByDeviceId(normalizedDeviceId, pageSize, offset),
      ])

      const devicePlaylists = await Promise.all(records.map(loadPlaylistFromRecord))
      const content = page === 1 ? [DEFAULT_PLAYLIST, ...devicePlaylists] : devicePlaylists

      const total = totalDevicePlaylists + 1
      const totalPages = Math.ceil(total / pageSize)

      return ok({
        size: pageSize,
        total,
        currentPage: page,
        totalPages,
        content,
      })
    }
    catch (error) {
      return unexpected(error, 'Failed to get playlists by device id')
    }
  },
}
