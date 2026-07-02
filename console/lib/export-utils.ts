export function downloadBase64File(contentBase64: string, filename: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
