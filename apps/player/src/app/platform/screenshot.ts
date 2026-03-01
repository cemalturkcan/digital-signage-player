import html2canvas from 'html2canvas'

const HTML2CANVAS_TIMEOUT_MS = 2500

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(blob => resolve(blob ?? null), 'image/png')
    }
    catch {
      resolve(null)
    }
  })
}

async function renderWithHtml2Canvas(
  target: HTMLElement,
  options: Parameters<typeof html2canvas>[1],
): Promise<HTMLCanvasElement | null> {
  try {
    return await Promise.race([
      html2canvas(target, options),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), HTML2CANVAS_TIMEOUT_MS)
      }),
    ])
  }
  catch {
    return null
  }
}

async function waitForStableFrame(): Promise<void> {
  if (typeof document === 'undefined' || typeof window === 'undefined')
    return

  if ('fonts' in document)
    await document.fonts.ready.catch(() => {})

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

function getAppCaptureTarget(): HTMLElement | null {
  const appContainer = document.getElementById('app-container')
  if (appContainer)
    return appContainer

  const appRoot = document.getElementById('app')
  if (appRoot)
    return appRoot

  return document.body
}

export async function captureAppScreenshot(): Promise<Blob | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return null

  await waitForStableFrame()

  const target = getAppCaptureTarget()
  if (!target)
    return null

  const rect = target.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width || target.clientWidth || window.innerWidth || 1))
  const height = Math.max(
    1,
    Math.floor(rect.height || target.clientHeight || window.innerHeight || 1),
  )
  const scale = Math.max(1, window.devicePixelRatio || 1)

  const baseOptions = {
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
    scale,
    width,
    height,
    windowWidth: Math.max(width, document.documentElement.clientWidth || width),
    windowHeight: Math.max(height, document.documentElement.clientHeight || height),
  } satisfies Parameters<typeof html2canvas>[1]

  const canvas
    = (await renderWithHtml2Canvas(target, { ...baseOptions, foreignObjectRendering: true }))
      ?? (await renderWithHtml2Canvas(target, { ...baseOptions, foreignObjectRendering: false }))

  if (!canvas)
    return null

  return await toBlob(canvas)
}
