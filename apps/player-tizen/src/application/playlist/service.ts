import type { MediaItem, Playlist } from '@signage/contracts'

export interface PlaylistService {
  currentPlaylist: Playlist | null
  currentIndex: number
  getCurrentItem: () => MediaItem | null
  loadPlaylist: (playlist: Playlist) => Promise<void>
  next: () => MediaItem | null
  hasNext: () => boolean
}

function getCurrentItem(): MediaItem | null {
  throw new Error('Not implemented: getCurrentItem')
}

async function loadPlaylist(playlist: Playlist): Promise<void> {
  void playlist
  throw new Error('Not implemented: loadPlaylist')
}

function next(): MediaItem | null {
  throw new Error('Not implemented: next')
}

function hasNext(): boolean {
  throw new Error('Not implemented: hasNext')
}

export const playlistService: PlaylistService = {
  currentPlaylist: null,
  currentIndex: 0,
  getCurrentItem,
  loadPlaylist,
  next,
  hasNext,
}
