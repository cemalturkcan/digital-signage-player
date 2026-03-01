import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'
import type { ServiceResponse } from '@/app/rest/rest.js'
import type { DeviceRecord } from '@/routes/register/modal.js'
import { mqttProvisioningService } from '@/app/mqtt/provisioning-service.js'
import { ok, unexpected } from '@/app/rest/rest.js'
import { MQTT_CLIENT_HOST, MQTT_CLIENT_PORT, MQTT_CLIENT_SSL } from '@/config.js'
import { registerRepository } from '@/routes/register/repository.js'

function buildMqttConfig(device: DeviceRecord): RegistrationResponse['mqtt'] {
  return {
    host: MQTT_CLIENT_HOST,
    port: MQTT_CLIENT_PORT,
    ssl: MQTT_CLIENT_SSL,
    clientId: device.deviceId,
    username: device.mqttUsername,
    password: device.mqttPassword,
    keepalive: 60,
    connectTimeout: 30000,
    reconnectPeriod: 5000,
    clean: true,
  }
}

function buildRegistrationResponse(device: DeviceRecord): RegistrationResponse {
  return {
    mqtt: buildMqttConfig(device),
  }
}

export interface RegisterService {
  register: (request: RegistrationRequest) => Promise<ServiceResponse<RegistrationResponse>>
}

export const registerService: RegisterService = {
  async register(request: RegistrationRequest): Promise<ServiceResponse<RegistrationResponse>> {
    const deviceId = request.deviceId.trim()

    try {
      const { device, shouldProvision } = await registerRepository.findOrCreate({
        deviceId,
      })

      if (shouldProvision) {
        await mqttProvisioningService.provisionDevice(
          device.deviceId,
          device.mqttUsername,
          device.mqttPassword,
        )
      }

      return ok(buildRegistrationResponse(device))
    }
    catch (error) {
      return unexpected(error, 'Failed to register device')
    }
  },
}
