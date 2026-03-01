export function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return undefined
  }

  return normalizedValue
}

export function getPositiveInteger(value: unknown): number | undefined {
  const normalized = getNonEmptyString(value)
  if (!normalized) {
    return undefined
  }

  const parsed = Number.parseInt(normalized, 10)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return undefined
  }

  return parsed
}

export function getPage(value: unknown): number {
  return getPositiveInteger(value) ?? 1
}

export function getPageSize(value: unknown, fallback = 10, max = 100): number {
  const pageSize = getPositiveInteger(value) ?? fallback
  return Math.min(pageSize, max)
}
