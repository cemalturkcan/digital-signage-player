import type { MediaItem } from '@signage/contracts'
import { fetchMediaBlob } from '@/app/request/requests/media'
import { clearCache, deleteEntry, getBlob, hasEntry, putBlob } from '@/app/storage/cache'

const MEDIA_CACHE_NAME = 'signage-media-cache-v1'

function getMediaKey(id: string): string {
  return `/media/${id}`
}

export async function saveMedia(id: string, blob: Blob): Promise<boolean> {
  return putBlob(MEDIA_CACHE_NAME, getMediaKey(id), blob)
}

export async function loadMedia(id: string): Promise<Blob | null> {
  return getBlob(MEDIA_CACHE_NAME, getMediaKey(id))
}

export async function hasMedia(id: string): Promise<boolean> {
  return hasEntry(MEDIA_CACHE_NAME, getMediaKey(id))
}

export async function deleteMedia(id: string): Promise<boolean> {
  return deleteEntry(MEDIA_CACHE_NAME, getMediaKey(id))
}

export async function clearMediaCache(): Promise<boolean> {
  return clearCache(MEDIA_CACHE_NAME)
}

export async function prefetchMedia(items: MediaItem[]): Promise<void> {
  for (const item of items) {
    try {
      const exists = await hasMedia(item.id)
      if (exists) {
        continue
      }
      const blob = await fetchMediaBlob(item.url)
      await saveMedia(item.id, blob)
    }
    catch {
      // Prefetch failed for this item, continue with others
    }
  }
}

export async function getCachedUrl(item: MediaItem): Promise<string> {
  const blob = await loadMedia(item.id)
  if (blob) {
    return URL.createObjectURL(blob)
  }
  return item.url
}
