import { Pool } from 'pg'
import { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } from '@/config.js'
import { logger } from '@/app/logger/logger.js'

export let db: Pool | null = null

export async function connectDb(): Promise<void> {
  if (db !== null) {
    return
  }

  logger.debug({ host: DB_HOST, port: DB_PORT, database: DB_NAME }, 'Connecting to database')

  try {
    db = new Pool({
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
    })

    db.on('error', (err: Error) => {
      logger.error({ err }, 'Unexpected database pool error')
    })

    logger.info({ host: DB_HOST, port: DB_PORT, database: DB_NAME }, 'Database connected')
  } catch (err) {
    logger.error(
      { err, host: DB_HOST, port: DB_PORT, database: DB_NAME },
      'Database connection failed'
    )
    throw err
  }
}
