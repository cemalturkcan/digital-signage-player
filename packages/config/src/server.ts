export interface ServerConfig {
  port: number
  host: string
  env: 'development' | 'production' | 'test'
  apiPrefix: string
  corsOrigins: string[]
}

export function loadServerConfig(): ServerConfig {
  throw new Error('Not implemented: loadServerConfig')
}
