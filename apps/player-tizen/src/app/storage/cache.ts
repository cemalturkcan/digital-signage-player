export async function openCache(cacheName: string): Promise<Cache | null> {
  if (typeof caches === 'undefined') {
    return null
  }
  try {
    return await caches.open(cacheName)
  }
  catch {
    return null
  }
}

export async function putBlob(cacheName: string, key: string, blob: Blob): Promise<boolean> {
  const cache = await openCache(cacheName)
  if (!cache) {
    return false
  }
  try {
    const response = new Response(blob, {
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    })
    await cache.put(key, response)
    return true
  }
  catch {
    return false
  }
}

export async function getBlob(cacheName: string, key: string): Promise<Blob | null> {
  const cache = await openCache(cacheName)
  if (!cache) {
    return null
  }
  try {
    const response = await cache.match(key)
    if (!response) {
      return null
    }
    return await response.blob()
  }
  catch {
    return null
  }
}

export async function hasEntry(cacheName: string, key: string): Promise<boolean> {
  const cache = await openCache(cacheName)
  if (!cache) {
    return false
  }
  try {
    const response = await cache.match(key)
    return response !== undefined
  }
  catch {
    return false
  }
}

export async function deleteEntry(cacheName: string, key: string): Promise<boolean> {
  const cache = await openCache(cacheName)
  if (!cache) {
    return false
  }
  try {
    await cache.delete(key)
    return true
  }
  catch {
    return false
  }
}

export async function clearCache(cacheName: string): Promise<boolean> {
  if (typeof caches === 'undefined') {
    return false
  }
  try {
    await caches.delete(cacheName)
    return true
  }
  catch {
    return false
  }
}
