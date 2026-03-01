export interface Playlist {
  id: string
  loop?: boolean
  items: MediaItem[]
  createdAt: number
  updatedAt: number
}

export interface MediaItem {
  id: string
  type: MediaType
  url: string
  duration?: number | null
  order: number
  checksum?: string
  mimeType?: string
}

export type MediaType = 'image' | 'video'

export interface Page<T> {
  size: number
  total: number
  currentPage: number
  totalPages: number
  content: T[]
}

export interface PlaylistResponse {
  size: number
  total: number
  currentPage: number
  totalPages: number
  content: Playlist[]
}
