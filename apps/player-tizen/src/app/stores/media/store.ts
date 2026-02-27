import type { MediaItem, Playlist } from '@signage/contracts'
import { defineStore } from 'pinia'
import {
  clearMediaCache,
  deleteMedia as deleteMediaSvc,
  getCachedUrl,
  hasMedia as hasMediaSvc,
  loadMedia as loadMediaSvc,
  prefetchMedia as prefetchMediaSvc,
  saveMedia as saveMediaSvc,
} from '@/app/services/media-cache'

export interface QuotaInfo {
  used: number
  total: number
}

export interface MediaState {
  quota: QuotaInfo | null
  cachedPlaylist: Playlist | null
}

export const useMediaStore = defineStore('media', {
  state: (): MediaState => ({
    quota: null,
    cachedPlaylist: null,
  }),

  persist: {
    pick: ['cachedPlaylist'],
  },

  actions: {
    async savePlaylist(playlist: Playlist): Promise<void> {
      this.cachedPlaylist = playlist
    },

    async loadPlaylist(): Promise<Playlist | null> {
      return this.cachedPlaylist
    },

    async saveMedia(id: string, blob: Blob): Promise<void> {
      await saveMediaSvc(id, blob)
    },

    async loadMedia(id: string): Promise<Blob | null> {
      return loadMediaSvc(id)
    },

    async hasMedia(id: string): Promise<boolean> {
      return hasMediaSvc(id)
    },

    async deleteMedia(id: string): Promise<void> {
      await deleteMediaSvc(id)
    },

    async getQuota(): Promise<QuotaInfo> {
      return { used: 0, total: 0 }
    },

    async clear(): Promise<void> {
      this.cachedPlaylist = null
      await clearMediaCache()
    },

    async prefetchMedia(items: MediaItem[]): Promise<void> {
      await prefetchMediaSvc(items)
    },

    async getCachedUrl(item: MediaItem): Promise<string> {
      return getCachedUrl(item)
    },
  },
})
