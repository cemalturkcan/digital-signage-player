import type { DeviceRecord } from '@/routes/devices/modal.js'
import { randomBytes } from 'node:crypto'
import { db } from '@/app/db/db.js'

interface DeviceRow {
  device_id: string
  mqtt_username: string
  mqtt_password: string
}

const SELECT_DEVICE_BY_ID = 'SELECT * FROM devices WHERE device_id = $1'

const UPDATE_DEVICE_WITH_CREDS = `UPDATE devices
           SET mqtt_username = $1, mqtt_password = $2, updated_at = CURRENT_TIMESTAMP
           WHERE device_id = $3`

const INSERT_DEVICE = `INSERT INTO devices (device_id, mqtt_username, mqtt_password)
       VALUES ($1, $2, $3)`

function generateCredentials(): { username: string, password: string } {
  return {
    username: `device_${randomBytes(8).toString('hex')}`,
    password: randomBytes(32).toString('base64'),
  }
}

function mapRowToRecord(row: DeviceRow): DeviceRecord {
  return {
    deviceId: row.device_id,
    mqttUsername: row.mqtt_username,
    mqttPassword: row.mqtt_password,
  }
}

export interface FindOrCreateResult {
  device: DeviceRecord
  shouldProvision: boolean
}

export interface DevicesRepository {
  findOrCreate: (device: Pick<DeviceRecord, 'deviceId'>) => Promise<FindOrCreateResult>
}

export const devicesRepository: DevicesRepository = {
  async findOrCreate(device: Pick<DeviceRecord, 'deviceId'>): Promise<FindOrCreateResult> {
    const existingResult = await db.query<DeviceRow>(SELECT_DEVICE_BY_ID, [device.deviceId])

    if (existingResult.rows.length > 0) {
      const row = existingResult.rows[0]

      if (!row.mqtt_username || !row.mqtt_password) {
        const creds = generateCredentials()
        await db.query(UPDATE_DEVICE_WITH_CREDS, [creds.username, creds.password, device.deviceId])

        const updatedResult = await db.query<DeviceRow>(SELECT_DEVICE_BY_ID, [device.deviceId])

        if (updatedResult.rows.length === 0) {
          throw new Error('Failed to update device')
        }

        return {
          device: mapRowToRecord(updatedResult.rows[0]),
          shouldProvision: true,
        }
      }

      return {
        device: mapRowToRecord(row),
        shouldProvision: false,
      }
    }

    const creds = generateCredentials()
    await db.query(INSERT_DEVICE, [device.deviceId, creds.username, creds.password])

    const createdResult = await db.query<DeviceRow>(SELECT_DEVICE_BY_ID, [device.deviceId])

    if (createdResult.rows.length === 0) {
      throw new Error('Failed to create device')
    }

    return {
      device: mapRowToRecord(createdResult.rows[0]),
      shouldProvision: true,
    }
  },
}
