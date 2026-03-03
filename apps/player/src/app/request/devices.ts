import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'
import { postRequest } from '@/app/modules/request'

export async function postDeviceRegistration({
  payload,
}: {
  payload: RegistrationRequest
}): Promise<RegistrationResponse> {
  return postRequest<RegistrationResponse>({
    url: '/devices/register',
    payload,
  })
}
