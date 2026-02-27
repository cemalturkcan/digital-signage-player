export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const

type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

const STATUS_BY_CODE: Record<ErrorCodeValue, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
}

const MESSAGE_BY_CODE: Record<ErrorCodeValue, string> = {
  [ErrorCode.BAD_REQUEST]: 'Bad Request',
  [ErrorCode.NOT_FOUND]: 'Not Found',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
}

export function getStatusForCode(code: string): number {
  return STATUS_BY_CODE[code as ErrorCodeValue] ?? STATUS_BY_CODE[ErrorCode.INTERNAL_SERVER_ERROR]
}

export function getMessageForCode(code: string): string {
  return MESSAGE_BY_CODE[code as ErrorCodeValue] ?? MESSAGE_BY_CODE[ErrorCode.INTERNAL_SERVER_ERROR]
}
