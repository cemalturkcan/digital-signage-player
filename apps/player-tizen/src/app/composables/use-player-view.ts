export interface PlayerView {
  initialize: (container: HTMLElement) => void
  showImage: (url: string) => Promise<void>
  showVideo: (url: string) => Promise<void>
  transition: (type: 'cut' | 'fade' | 'slide', duration: number) => Promise<void>
  clear: () => void
}

export function usePlayerView(): PlayerView {
  let container: HTMLElement | null = null
  let currentElement: HTMLElement | null = null

  return {
    initialize(target: HTMLElement): void {
      container = target
      container.innerHTML = ''
      currentElement = null
    },

    showImage(url: string): Promise<void> {
      return new Promise((resolve) => {
        if (!container) {
          resolve()
          return
        }
        const img = document.createElement('img')
        img.src = url
        img.style.width = '100%'
        img.style.height = '100%'
        img.style.objectFit = 'contain'
        img.onload = () => resolve()
        img.onerror = () => resolve()
        container.innerHTML = ''
        container.appendChild(img)
        currentElement = img
      })
    },

    showVideo(url: string): Promise<void> {
      return new Promise((resolve) => {
        if (!container) {
          resolve()
          return
        }
        const video = document.createElement('video')
        video.src = url
        video.autoplay = true
        video.muted = true
        video.playsInline = true
        video.style.width = '100%'
        video.style.height = '100%'
        video.style.objectFit = 'contain'
        video.onloadedmetadata = () => resolve()
        video.onerror = () => resolve()
        container.innerHTML = ''
        container.appendChild(video)
        currentElement = video
      })
    },

    transition(type: 'cut' | 'fade' | 'slide', duration: number): Promise<void> {
      return new Promise((resolve) => {
        if (!container || !currentElement || duration <= 0) {
          setTimeout(resolve, duration)
          return
        }
        if (type === 'fade') {
          currentElement.style.transition = `opacity ${duration}ms`
          currentElement.style.opacity = '0'
        }
        else if (type === 'slide') {
          currentElement.style.transition = `transform ${duration}ms`
          currentElement.style.transform = 'translateX(-100%)'
        }
        setTimeout(() => {
          if (currentElement) {
            currentElement.style.transition = ''
            currentElement.style.opacity = ''
            currentElement.style.transform = ''
          }
          resolve()
        }, duration)
      })
    },

    clear(): void {
      if (container) {
        container.innerHTML = ''
      }
      currentElement = null
    },
  }
}
