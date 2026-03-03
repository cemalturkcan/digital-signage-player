import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'
import type { ServiceResponse } from '@/app/rest/rest.js'
import type { ActiveDevice, DeviceRecord } from '@/routes/devices/modal.js'
import { messageBusService } from '@/app/message-bus/service.js'
import { statusTopicFor } from '@/app/message-bus/topics.js'
import { ok, unexpected } from '@/app/rest/rest.js'
import { MQTT_CLIENT_HOST, MQTT_CLIENT_PATH, MQTT_CLIENT_PORT, MQTT_CLIENT_SSL } from '@/config.js'
import { devicesRepository } from '@/routes/devices/repository.js'

function buildOfflineWill(deviceId: string): RegistrationResponse['mqtt']['will'] {
  return {
    topic: statusTopicFor(deviceId),
    payload: JSON.stringify({
      type: 'presence',
      status: 'offline',
      reason: 'lwt',
    }),
    qos: 1,
    retain: true,
  }
}

function buildMqttConfig(device: DeviceRecord): RegistrationResponse['mqtt'] {
  return {
    host: MQTT_CLIENT_HOST,
    port: MQTT_CLIENT_PORT,
    ssl: MQTT_CLIENT_SSL,
    path: MQTT_CLIENT_PATH,
    clientId: device.deviceId,
    username: device.mqttUsername,
    password: device.mqttPassword,
    keepalive: 60,
    connectTimeout: 30000,
    reconnectPeriod: 5000,
    clean: true,
    will: buildOfflineWill(device.deviceId),
  }
}

function buildRegistrationResponse(device: DeviceRecord): RegistrationResponse {
  return {
    mqtt: buildMqttConfig(device),
  }
}

export interface DevicesService {
  registerDevice: (request: RegistrationRequest) => Promise<ServiceResponse<RegistrationResponse>>
  getActiveDevices: () => Promise<ServiceResponse<ActiveDevice[]>>
}

export const devicesService: DevicesService = {
  async registerDevice(
    request: RegistrationRequest,
  ): Promise<ServiceResponse<RegistrationResponse>> {
    const deviceId = request.deviceId.trim()

    try {
      const { device } = await devicesRepository.findOrCreate({
        deviceId,
      })

      await messageBusService.provisionDevice(
        device.deviceId,
        device.mqttUsername,
        device.mqttPassword,
      )

      return ok(buildRegistrationResponse(device))
    }
    catch (error) {
      return unexpected(error, 'Failed to register device')
    }
  },

  async getActiveDevices(): Promise<ServiceResponse<ActiveDevice[]>> {
    try {
      const activeDevices = await devicesRepository.listActiveDevices()

      return ok(
        activeDevices.map(device => ({
          deviceId: device.deviceId,
          isOnline: device.isOnline,
          lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
          lastPresenceReason: device.lastPresenceReason,
        })),
      )
    }
    catch (error) {
      return unexpected(error, 'Failed to list active devices')
    }
  },
}
