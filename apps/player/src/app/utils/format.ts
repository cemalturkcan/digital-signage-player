import { i18n } from '@/app/modules/i18n'

export function formatDate(timestamp: number): string {
  if (!timestamp)
    return i18n.global.t('unknownDate')

  return new Intl.DateTimeFormat(i18n.global.locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}
