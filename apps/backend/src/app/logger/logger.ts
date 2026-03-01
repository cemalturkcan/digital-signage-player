import pino from 'pino'
import { LOG_LEVEL, LOG_PRETTY } from '@/config.js'

export const logger = pino({
  level: LOG_LEVEL,
  transport: LOG_PRETTY
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})
