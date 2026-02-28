import type { PlaylistResponse } from '@signage/contracts'
import { getRequest } from '@/app/request/request'

export async function getPlaylist(deviceId: string): Promise<PlaylistResponse> {
  return getRequest<PlaylistResponse>({
    url: `/api/playlist?deviceId=${encodeURIComponent(deviceId)}`,
  })
}
