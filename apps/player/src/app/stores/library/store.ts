import type { Playlist } from '@signage/contracts'
import { defineStore } from 'pinia'

export interface LibraryState {
  playlists: Playlist[]
  selectedPlaylistId: string | null
}

export const useLibraryStore = defineStore('library', {
  state: (): LibraryState => ({
    playlists: [],
    selectedPlaylistId: null,
  }),

  getters: {
    selectedPlaylist: (state): Playlist | null => {
      if (!state.selectedPlaylistId)
        return null
      return state.playlists.find(playlist => playlist.id === state.selectedPlaylistId) ?? null
    },
  },

  actions: {
    setPlaylists(playlists: Playlist[]): void {
      this.playlists = playlists

      if (!this.selectedPlaylistId)
        return

      const exists = playlists.some(playlist => playlist.id === this.selectedPlaylistId)
      if (!exists)
        this.selectedPlaylistId = null
    },

    selectPlaylist(id: string): void {
      this.selectedPlaylistId = id
    },

    clearSelection(): void {
      this.selectedPlaylistId = null
    },
  },
})
