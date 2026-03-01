import type { PlaylistResponse } from '@signage/contracts'
import type { ServiceResponse } from '@/app/rest/rest.js'
import { ErrorCode } from '@/app/rest/codes.js'
import { fail, ok, unexpected } from '@/app/rest/rest.js'
import { playlistRepository } from '@/routes/playlist/repository.js'

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
      const pageResult = await playlistRepository.getPlaylistsByDeviceIdPage(
        normalizedDeviceId,
        page,
        pageSize,
      )
      return ok(pageResult)
    }
    catch (error) {
      return unexpected(error, 'Failed to get playlists by device id')
    }
  },
}
