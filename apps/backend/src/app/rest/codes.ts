export const SUCCESS = '200'
export const BAD_REQUEST = '400'
export const SERVER_INTERNAL_ERROR = '500'
export const NOT_FOUND = '404'
export const UNAUTHORIZED = '401'

export const ErrorCode = {
  SUCCESS,
  BAD_REQUEST,
  NOT_FOUND,
  INTERNAL_SERVER_ERROR: SERVER_INTERNAL_ERROR,
  UNAUTHORIZED,
} as const

export const Code = {
  [SUCCESS]: 'Success',
  [BAD_REQUEST]: 'Bad Request',
  [NOT_FOUND]: 'Not Found',
  [SERVER_INTERNAL_ERROR]: 'Server Internal Error',
  [UNAUTHORIZED]: 'Unauthorized',
} as const

export const HttpStatus = {
  [SUCCESS]: 200,
  [BAD_REQUEST]: 400,
  [NOT_FOUND]: 404,
  [SERVER_INTERNAL_ERROR]: 500,
  [UNAUTHORIZED]: 401,
} as const

type CodeKey = keyof typeof Code
type HttpStatusKey = keyof typeof HttpStatus

export function getCodeMessage(code: string): string {
  if (code in Code) {
    return Code[code as CodeKey]
  }

  return Code[SERVER_INTERNAL_ERROR]
}

export function getHttpStatusCode(code: string): number {
  if (code in HttpStatus) {
    return HttpStatus[code as HttpStatusKey]
  }

  return HttpStatus[SERVER_INTERNAL_ERROR]
}

export function getStatusForCode(code: string): number {
  return getHttpStatusCode(code)
}

export function getMessageForCode(code: string): string {
  return getCodeMessage(code)
}
