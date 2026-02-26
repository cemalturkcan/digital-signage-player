import { defineStore } from 'pinia'
import type { MediaItem, Playlist } from '@signage/contracts'

export interface PlaylistState {
  currentPlaylist: Playlist | null
  currentIndex: number
}

export const usePlaylistStore = defineStore('playlist', {
  state: (): PlaylistState => ({
    currentPlaylist: null,
    currentIndex: 0,
  }),

  getters: {
    currentItem: (state): MediaItem | null => {
      if (!state.currentPlaylist) {
        return null
      }
      return state.currentPlaylist.items[state.currentIndex] ?? null
    },
    hasNext: (state): boolean => {
      if (!state.currentPlaylist) {
        return false
      }
      return state.currentIndex < state.currentPlaylist.items.length - 1
    },
  },

  actions: {
    async loadPlaylist(playlist: Playlist): Promise<void> {
      this.currentPlaylist = playlist
      this.currentIndex = 0
    },
    next(): MediaItem | null {
      if (!this.currentPlaylist) {
        return null
      }
      if (this.currentIndex < this.currentPlaylist.items.length - 1) {
        this.currentIndex += 1
      }
      return this.currentPlaylist.items[this.currentIndex] ?? null
    },
  },
})
