import type { PlaylistResponse } from '@signage/contracts'
import { getRequest } from '@/app/request/request'

export async function getPlaylist(): Promise<PlaylistResponse> {
  return getRequest<PlaylistResponse>({ url: '/api/playlist' })
}
