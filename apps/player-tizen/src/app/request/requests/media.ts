export async function fetchMediaBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`)
  }
  return response.blob()
}
