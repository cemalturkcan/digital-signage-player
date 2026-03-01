import type { Playlist } from '@signage/contracts'
import { readJsonStorage, removeStorageItem, writeJsonStorage } from '@/app/cache/storage'

const CACHE_SCHEMA_VERSION = 1
const MEDIA_CACHE_NAME_PREFIX = 'signage-media-cache:'
const MEDIA_CACHE_INDEX_PREFIX = 'signage-media-cache-index:'

interface MediaCacheIndex {
  schemaVersion: number
  playlistHash: string
  cachedUrls: string[]
  updatedAt: number
}

export interface PlayableMediaSource {
  url: string
  release: () => void
}

function getCacheName(deviceId: string): string {
  return `${MEDIA_CACHE_NAME_PREFIX}${deviceId}`
}

function getIndexKey(deviceId: string): string {
  return `${MEDIA_CACHE_INDEX_PREFIX}${deviceId}`
}

function supportsMediaCache(): boolean {
  return typeof caches !== 'undefined' && typeof fetch !== 'undefined'
}

function getMediaUrls(playlists: Playlist[]): string[] {
  const urls = new Set<string>()

  for (const playlist of playlists) {
    for (const item of playlist.items) {
      if (item.url) {
        urls.add(item.url)
      }
    }
  }

  return Array.from(urls)
}

async function fetchMediaForCache(url: string): Promise<Response | null> {
  try {
    const response = await fetch(url)
    if (response.ok || response.type === 'opaque') {
      return response
    }
  }
  catch {
    // ignore and retry with no-cors
  }

  try {
    const fallback = await fetch(url, { mode: 'no-cors' })
    return fallback.type === 'opaque' || fallback.ok ? fallback : null
  }
  catch {
    return null
  }
}

function readIndex(deviceId: string): MediaCacheIndex | null {
  const parsed = readJsonStorage<MediaCacheIndex>(getIndexKey(deviceId))
  if (!parsed) {
    return null
  }

  if (parsed.schemaVersion !== CACHE_SCHEMA_VERSION) {
    return null
  }

  if (!Array.isArray(parsed.cachedUrls)) {
    return null
  }

  return parsed
}

function writeIndex(deviceId: string, playlistHash: string, cachedUrls: string[]): void {
  const payload: MediaCacheIndex = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    playlistHash,
    cachedUrls,
    updatedAt: Date.now(),
  }

  writeJsonStorage(getIndexKey(deviceId), payload)
}

async function cacheMediaUrls(
  cache: Cache,
  urls: string[],
  initialCachedUrls?: Set<string>,
): Promise<Set<string>> {
  const cachedUrls = initialCachedUrls ?? new Set<string>()

  for (const url of urls) {
    const response = await fetchMediaForCache(url)
    if (!response) {
      continue
    }

    try {
      await cache.put(url, response)
      cachedUrls.add(url)
    }
    catch {
      // Skip invalid cache entries
    }
  }

  return cachedUrls
}

async function findMissingUrls(
  cache: Cache,
  expectedUrls: string[],
  indexedUrls: Set<string>,
): Promise<string[]> {
  const missing: string[] = []

  for (const url of expectedUrls) {
    if (!indexedUrls.has(url)) {
      missing.push(url)
      continue
    }

    const cachedEntry = await cache.match(url)
    if (!cachedEntry) {
      missing.push(url)
    }
  }

  return missing
}

export async function clearMediaCache(deviceId: string): Promise<void> {
  if (!supportsMediaCache()) {
    return
  }

  await caches.delete(getCacheName(deviceId))
  removeStorageItem(getIndexKey(deviceId))
}

export async function syncMediaCache(
  deviceId: string,
  playlists: Playlist[],
  playlistHash: string,
): Promise<void> {
  if (!supportsMediaCache()) {
    return
  }

  const expectedUrls = getMediaUrls(playlists)
  const existing = readIndex(deviceId)
  const cache = await caches.open(getCacheName(deviceId))

  if (existing?.playlistHash === playlistHash) {
    const indexedUrls = new Set(existing.cachedUrls)
    const missingUrls = await findMissingUrls(cache, expectedUrls, indexedUrls)
    if (missingUrls.length === 0) {
      return
    }

    const cachedUrls = await cacheMediaUrls(cache, missingUrls, indexedUrls)
    writeIndex(deviceId, playlistHash, Array.from(cachedUrls))
    return
  }

  await clearMediaCache(deviceId)

  const freshCache = await caches.open(getCacheName(deviceId))
  const cachedUrls = await cacheMediaUrls(freshCache, expectedUrls)
  writeIndex(deviceId, playlistHash, Array.from(cachedUrls))
}

function identityPlayableSource(url: string): PlayableMediaSource {
  return {
    url,
    release: () => {},
  }
}

export async function resolvePlayableMediaSource(
  deviceId: string,
  url: string,
): Promise<PlayableMediaSource> {
  if (!supportsMediaCache()) {
    return identityPlayableSource(url)
  }

  try {
    const cache = await caches.open(getCacheName(deviceId))
    const response = await cache.match(url)
    if (!response) {
      return identityPlayableSource(url)
    }

    if (response.type === 'opaque') {
      return identityPlayableSource(url)
    }

    const blob = await response.blob()
    if (blob.size <= 0) {
      return identityPlayableSource(url)
    }

    const objectUrl = URL.createObjectURL(blob)
    return {
      url: objectUrl,
      release: () => {
        URL.revokeObjectURL(objectUrl)
      },
    }
  }
  catch {
    return identityPlayableSource(url)
  }
}
