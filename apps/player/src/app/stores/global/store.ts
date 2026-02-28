import { defineStore } from 'pinia'

export interface GlobalState {
  loading: boolean
  loadingMessage: string
  error: string | null
  status: string
}

export const useGlobalStore = defineStore('global', {
  state: (): GlobalState => ({
    loading: false,
    loadingMessage: '',
    error: null,
    status: '',
  }),

  actions: {
    showLoading(message?: string): void {
      this.loading = true
      this.loadingMessage = message ?? ''
    },
    hideLoading(): void {
      this.loading = false
      this.loadingMessage = ''
    },
    showError(message: string): void {
      this.error = message
    },
    clearError(): void {
      this.error = null
    },
    setStatus(status: string): void {
      this.status = status
    },
  },
})
