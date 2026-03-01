import { Pool } from 'pg'
import { logger } from '@/app/logger/logger.js'
import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from '@/config.js'

export const db = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
})

db.on('error', (err: Error) => {
  logger.error({ err }, 'Unexpected database pool error')
})

export async function connectDb(): Promise<void> {
  logger.debug({ host: DB_HOST, port: DB_PORT, database: DB_NAME }, 'Connecting to database')
  try {
    await db.query('SELECT 1')
    logger.info({ host: DB_HOST, port: DB_PORT, database: DB_NAME }, 'Database connected')
  }
  catch (err) {
    logger.error(
      { err, host: DB_HOST, port: DB_PORT, database: DB_NAME },
      'Database connection failed',
    )
    throw err
  }
}
