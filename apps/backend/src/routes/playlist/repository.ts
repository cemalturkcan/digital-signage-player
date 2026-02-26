import type { PlaylistRecord } from './model.js'

export interface PlaylistRepository {
  save: (playlist: PlaylistRecord) => Promise<void>
  findById: (id: string) => Promise<PlaylistRecord | null>
  findAll: () => Promise<PlaylistRecord[]>
  delete: (id: string) => Promise<void>
}

export const playlistRepository: PlaylistRepository = {
  async save(playlist: PlaylistRecord): Promise<void> {
    void playlist
    throw new Error('Not implemented: save')
  },

  async findById(id: string): Promise<PlaylistRecord | null> {
    void id
    throw new Error('Not implemented: findById')
  },

  async findAll(): Promise<PlaylistRecord[]> {
    throw new Error('Not implemented: findAll')
  },

  async delete(id: string): Promise<void> {
    void id
    throw new Error('Not implemented: delete')
  },
}
