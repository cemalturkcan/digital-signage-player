export interface UIManager {
  initialize: () => void
  showLoading: (message?: string) => void
  hideLoading: () => void
  showError: (message: string) => void
  setStatus: (status: string) => void
}

function initialize(): void {
  throw new Error('Not implemented: initialize')
}

function showLoading(message?: string): void {
  void message
  throw new Error('Not implemented: showLoading')
}

function hideLoading(): void {
  throw new Error('Not implemented: hideLoading')
}

function showError(message: string): void {
  void message
  throw new Error('Not implemented: showError')
}

function setStatus(status: string): void {
  void status
  throw new Error('Not implemented: setStatus')
}

export const uiManager: UIManager = {
  initialize,
  showLoading,
  hideLoading,
  showError,
  setStatus,
}
