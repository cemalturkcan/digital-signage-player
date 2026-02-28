import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'
import { postRequest } from '@/app/request/request'

export async function postRegister({
  payload,
}: {
  payload: RegistrationRequest
}): Promise<RegistrationResponse> {
  return postRequest<RegistrationResponse>({
    url: '/api/register',
    payload,
  })
}
