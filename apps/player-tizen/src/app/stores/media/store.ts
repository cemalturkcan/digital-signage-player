import { defineStore } from 'pinia'
import type { Playlist } from '@signage/contracts'

export interface QuotaInfo {
  used: number
  total: number
}

export interface MediaState {
  quota: QuotaInfo | null
}

export const useMediaStore = defineStore('media', {
  state: (): MediaState => ({
    quota: null,
  }),

  actions: {
    async savePlaylist(playlist: Playlist): Promise<void> {
      void playlist
      throw new Error('Not implemented: savePlaylist')
    },
    async loadPlaylist(): Promise<Playlist | null> {
      throw new Error('Not implemented: loadPlaylist')
    },
    async saveMedia(id: string, blob: Blob): Promise<void> {
      void id
      void blob
      throw new Error('Not implemented: saveMedia')
    },
    async loadMedia(id: string): Promise<Blob | null> {
      void id
      throw new Error('Not implemented: loadMedia')
    },
    async hasMedia(id: string): Promise<boolean> {
      void id
      throw new Error('Not implemented: hasMedia')
    },
    async deleteMedia(id: string): Promise<void> {
      void id
      throw new Error('Not implemented: deleteMedia')
    },
    async getQuota(): Promise<QuotaInfo> {
      throw new Error('Not implemented: getQuota')
    },
    async clear(): Promise<void> {
      throw new Error('Not implemented: clear')
    },
  },
})
