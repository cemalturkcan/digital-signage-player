export interface PlayerView {
  initialize: (container: HTMLElement) => void
  showImage: (url: string) => Promise<void>
  showVideo: (url: string) => Promise<void>
  transition: (type: 'cut' | 'fade' | 'slide', duration: number) => Promise<void>
  clear: () => void
}

export function createPlayerView(): PlayerView {
  throw new Error('Not implemented: createPlayerView')
}
