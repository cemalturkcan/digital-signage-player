import type { PlaylistRecord } from '@/routes/playlist/model.js'

export interface PlaylistRepository {
  save: (playlist: PlaylistRecord) => Promise<void>
  findById: (id: string) => Promise<PlaylistRecord | null>
  findAll: () => Promise<PlaylistRecord[]>
  delete: (id: string) => Promise<void>
}

const store = new Map<string, PlaylistRecord>()

export const playlistRepository: PlaylistRepository = {
  async save(playlist: PlaylistRecord): Promise<void> {
    store.set(playlist.id, playlist)
  },

  async findById(id: string): Promise<PlaylistRecord | null> {
    return store.get(id) ?? null
  },

  async findAll(): Promise<PlaylistRecord[]> {
    return Array.from(store.values())
  },

  async delete(id: string): Promise<void> {
    store.delete(id)
  },
}
