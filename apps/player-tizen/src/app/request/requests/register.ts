import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'
import { postRequest, setAuthToken } from '@/app/request/request'

export async function postRegister({
  payload,
}: {
  payload: RegistrationRequest
}): Promise<RegistrationResponse> {
  const response = await postRequest<RegistrationResponse>({
    url: '/api/register',
    payload,
  })
  if (response.authToken) {
    setAuthToken(response.authToken)
  }
  return response
}
