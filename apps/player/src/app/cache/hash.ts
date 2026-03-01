export function stringifyForHash(value: unknown): string {
  return JSON.stringify(value)
}

export function fnv1aHash(input: string): string {
  let hash = 0x811C9DC5

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return `fnv1a-${(hash >>> 0).toString(16)}`
}

export function computeHash(value: unknown): string {
  return fnv1aHash(stringifyForHash(value))
}
