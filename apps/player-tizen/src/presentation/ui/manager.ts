export interface UIManager {
  initialize: () => void
  showLoading: (message?: string) => void
  hideLoading: () => void
  showError: (message: string) => void
  setStatus: (status: string) => void
}

let uiManagerInstance: UIManager | null = null

function createUIManagerInternal(): UIManager {
  throw new Error('Not implemented: createUIManager')
}

export function createUIManager(): UIManager {
  if (!uiManagerInstance) {
    uiManagerInstance = createUIManagerInternal()
  }
  return uiManagerInstance
}

export function getUIManager(): UIManager {
  if (!uiManagerInstance) {
    throw new Error('Not implemented: getUIManager')
  }
  return uiManagerInstance
}

export function resetUIManager(): void {
  uiManagerInstance = null
}
