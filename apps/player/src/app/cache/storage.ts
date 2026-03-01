function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  return localStorage
}

export function readJsonStorage<T>(key: string): T | null {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const rawValue = storage.getItem(key)
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as T
  }
  catch {
    return null
  }
}

export function writeJsonStorage(key: string, value: unknown): boolean {
  const storage = getStorage()
  if (!storage) {
    return false
  }

  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  }
  catch {
    return false
  }
}

export function removeStorageItem(key: string): void {
  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.removeItem(key)
}
