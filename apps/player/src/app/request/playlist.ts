import type { Playlist, PlaylistResponse } from '@signage/contracts'
import { getRequest } from '@/app/modules/request'

const PLAYLIST_PAGE_SIZE = 100

function buildPlaylistUrl(deviceId: string, page: number): string {
  return `/api/playlist?deviceId=${encodeURIComponent(deviceId)}&page=${page}&pageSize=${PLAYLIST_PAGE_SIZE}`
}

export async function getPlaylistsByDeviceId(deviceId: string): Promise<PlaylistResponse> {
  const firstPage = await getRequest<PlaylistResponse>({
    url: buildPlaylistUrl(deviceId, 1),
  })

  if (firstPage.totalPages <= 1) {
    return firstPage
  }

  const pageNumbers = Array.from({ length: firstPage.totalPages - 1 }, (_, i) => i + 2)
  const remainingPages = await Promise.all(
    pageNumbers.map(page => getRequest<PlaylistResponse>({ url: buildPlaylistUrl(deviceId, page) })),
  )
  const content: Playlist[] = [
    ...firstPage.content,
    ...remainingPages.flatMap(p => p.content),
  ]

  return {
    ...firstPage,
    size: content.length,
    total: firstPage.total,
    currentPage: 1,
    totalPages: 1,
    content,
  }
}
