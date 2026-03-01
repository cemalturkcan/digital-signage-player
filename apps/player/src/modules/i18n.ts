import messages from '@intlify/unplugin-vue-i18n/messages'
import { createI18n } from 'vue-i18n'

export const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  availableLocales: ['en'],
  messages,
})

export function translate(key: string, params?: Record<string, unknown>): string {
  if (!params) {
    return i18n.global.t(key) as string
  }

  return i18n.global.t(key, params) as string
}
