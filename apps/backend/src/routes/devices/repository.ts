import type { DeviceRecord } from '@/routes/devices/modal.js'
import { randomBytes } from 'node:crypto'
import { db } from '@/app/db/db.js'

interface DeviceRow {
  device_id: string
  mqtt_username: string
  mqtt_password: string
  is_online: boolean
  last_seen_at: Date | null
  last_presence_reason: string | null
}

interface ActiveDeviceRow {
  device_id: string
  is_online: boolean
  last_seen_at: Date | null
  last_presence_reason: string | null
}

const SELECT_DEVICE_BY_ID = 'SELECT * FROM devices WHERE device_id = $1'

const UPDATE_DEVICE_WITH_CREDS = `UPDATE devices
           SET mqtt_username = $1, mqtt_password = $2, updated_at = CURRENT_TIMESTAMP
           WHERE device_id = $3`

const INSERT_DEVICE = `INSERT INTO devices (device_id, mqtt_username, mqtt_password)
       VALUES ($1, $2, $3)`

const UPDATE_DEVICE_PRESENCE = `UPDATE devices
           SET is_online = $1,
               last_seen_at = $2,
               last_presence_reason = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE device_id = $4`

const SELECT_ACTIVE_DEVICES = `SELECT device_id, is_online, last_seen_at, last_presence_reason
         FROM devices
         WHERE is_online = TRUE
         ORDER BY last_seen_at DESC NULLS LAST, device_id ASC`

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

export interface ActiveDeviceRecord {
  deviceId: string
  isOnline: boolean
  lastSeenAt: Date | null
  lastPresenceReason: string | null
}

export interface DevicesRepository {
  findOrCreate: (device: Pick<DeviceRecord, 'deviceId'>) => Promise<FindOrCreateResult>
  updatePresence: (
    deviceId: string,
    status: 'online' | 'offline',
    reason: string | undefined,
    lastSeenAt: Date,
  ) => Promise<void>
  listActiveDevices: () => Promise<ActiveDeviceRecord[]>
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

  async updatePresence(
    deviceId: string,
    status: 'online' | 'offline',
    reason: string | undefined,
    lastSeenAt: Date,
  ): Promise<void> {
    await db.query(UPDATE_DEVICE_PRESENCE, [
      status === 'online',
      lastSeenAt,
      reason ?? null,
      deviceId,
    ])
  },

  async listActiveDevices(): Promise<ActiveDeviceRecord[]> {
    const result = await db.query<ActiveDeviceRow>(SELECT_ACTIVE_DEVICES)

    return result.rows.map(row => ({
      deviceId: row.device_id,
      isOnline: row.is_online,
      lastSeenAt: row.last_seen_at,
      lastPresenceReason: row.last_presence_reason,
    }))
  },
}
