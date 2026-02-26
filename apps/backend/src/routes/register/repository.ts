import type { DeviceRecord } from '@/routes/register/model.js'

export interface RegisterRepository {
  save: (device: DeviceRecord) => Promise<void>
  findById: (deviceId: string) => Promise<DeviceRecord | null>
  findAll: () => Promise<DeviceRecord[]>
  delete: (deviceId: string) => Promise<void>
}

export const registerRepository: RegisterRepository = {
  async save(device: DeviceRecord): Promise<void> {
    void device
    throw new Error('Not implemented: save')
  },

  async findById(deviceId: string): Promise<DeviceRecord | null> {
    void deviceId
    throw new Error('Not implemented: findById')
  },

  async findAll(): Promise<DeviceRecord[]> {
    throw new Error('Not implemented: findAll')
  },

  async delete(deviceId: string): Promise<void> {
    void deviceId
    throw new Error('Not implemented: delete')
  },
}
