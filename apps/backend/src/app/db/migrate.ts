import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '@/app/db/db.js'
import { logger } from '@/app/logger/logger.js'

interface MigrationRecord {
  version: string
}

const SELECT_MIGRATIONS = 'SELECT version FROM schema_migrations ORDER BY version'

const INSERT_MIGRATION = 'INSERT INTO schema_migrations (version) VALUES ($1)'

const DELETE_MIGRATION = 'DELETE FROM schema_migrations WHERE version = $1'

const CREATE_MIGRATIONS_TABLE = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

const BEGIN = 'BEGIN'
const COMMIT = 'COMMIT'
const ROLLBACK = 'ROLLBACK'

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await db.query<MigrationRecord>(SELECT_MIGRATIONS)
  return new Set(result.rows.map((r: MigrationRecord) => r.version))
}

async function applyMigration(version: string, upSql: string): Promise<void> {
  const client = await db.connect()
  try {
    await client.query(BEGIN)
    await client.query(upSql)
    await client.query(INSERT_MIGRATION, [version])
    await client.query(COMMIT)
    logger.info({ version }, 'Applied migration')
  }
  catch (err) {
    await client.query(ROLLBACK)
    throw err
  }
  finally {
    client.release()
  }
}

async function runMigrations(): Promise<void> {
  logger.info('Running migrations')
  await db.query(CREATE_MIGRATIONS_TABLE)

  const migrationsDir = fileURLToPath(new URL('../../../migrations', import.meta.url))
  const applied = await getAppliedMigrations()

  const files = await readdir(migrationsDir)
  const upFiles = files.filter(f => f.endsWith('.up.sql')).sort()

  for (const file of upFiles) {
    const version = file.replace('.up.sql', '')
    if (applied.has(version)) {
      continue
    }

    const upPath = join(migrationsDir, file)
    const upSql = await readFile(upPath, 'utf-8')
    await applyMigration(version, upSql)
  }

  logger.info('Migrations complete')
}

async function rollbackMigration(version: string): Promise<void> {
  const migrationsDir = fileURLToPath(new URL('../../../migrations', import.meta.url))
  const downPath = join(migrationsDir, `${version}.down.sql`)

  try {
    const downSql = await readFile(downPath, 'utf-8')
    const client = await db.connect()
    try {
      await client.query(BEGIN)
      await client.query(downSql)
      await client.query(DELETE_MIGRATION, [version])
      await client.query(COMMIT)
      logger.info({ version }, 'Rolled back migration')
    }
    catch (err) {
      await client.query(ROLLBACK)
      throw err
    }
    finally {
      client.release()
    }
  }
  catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Down migration not found: ${version}`)
    }
    throw err
  }
}

export const migration = {
  migrate: runMigrations,
  rollback: rollbackMigration,
}
