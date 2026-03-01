declare const process: { env: Record<string, string | undefined> }

export interface ServerConfig {
  port: number
  host: string
  env: 'development' | 'production' | 'test'
  apiPrefix: string
  corsOrigins: string[]
}

function parseNumber(val: string | undefined, def: number): number {
  if (!val)
    return def
  const n = Number(val)
  return Number.isNaN(n) ? def : n
}

function parseString(val: string | undefined, def: string): string {
  return val ?? def
}

function parseEnv(val: string | undefined): 'development' | 'production' | 'test' {
  if (val === 'production' || val === 'test')
    return val
  return 'development'
}

function parseArray(val: string | undefined, def: string[]): string[] {
  if (!val)
    return def
  return val
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export function loadServerConfig(): ServerConfig {
  return {
    port: parseNumber(process.env.SERVER_PORT, 3000),
    host: parseString(process.env.SERVER_HOST, '0.0.0.0'),
    env: parseEnv(process.env.NODE_ENV),
    apiPrefix: parseString(process.env.API_PREFIX, '/api'),
    corsOrigins: parseArray(process.env.CORS_ORIGINS, ['*']),
  }
}
