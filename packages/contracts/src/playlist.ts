export interface Playlist {
  id: string
  items: MediaItem[]
  createdAt: number
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
  playlists: Playlist[]
  pagination: Pagination
}

export interface Pagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}
