import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'
import { registerRepository } from '@/routes/register/repository.js'
import type { DeviceRecord } from '@/routes/register/model.js'
import { MQTT_CLIENT_HOST, MQTT_CLIENT_PORT, MQTT_CLIENT_SSL } from '@/config.js'
import { mqttProvisioningService } from '@/app/mqtt/provisioning-service.js'

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
  register: (request: RegistrationRequest) => Promise<RegistrationResponse>
}

export const registerService: RegisterService = {
  async register(request: RegistrationRequest): Promise<RegistrationResponse> {
    const { device, shouldProvision } = await registerRepository.findOrCreate({
      deviceId: request.deviceId,
    })

    if (shouldProvision) {
      await mqttProvisioningService.provisionDevice(
        device.deviceId,
        device.mqttUsername,
        device.mqttPassword
      )
    }

    return buildRegistrationResponse(device)
  },
}
