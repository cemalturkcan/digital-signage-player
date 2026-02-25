export interface Playlist {
  id: string
  version: string
  loop: boolean
  items: MediaItem[]
  updatedAt: number
}

export interface MediaItem {
  id: string
  type: MediaType
  url: string
  duration?: number
  order: number
  checksum?: string
  mimeType?: string
}

export type MediaType = 'image' | 'video'

export interface PlaylistResponse {
  playlist: Playlist
  cache: CacheInfo
}

export interface CacheInfo {
  etag: string
  maxAge: number
  cacheControl: string
}
