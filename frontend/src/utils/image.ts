/**
 * Reads an image File, resizes it down to `maxSize` (longest edge) and returns a
 * compressed JPEG data URL. Keeps base64 payloads small so they don't blow past
 * the API body limit when embedded in JSON (e.g. tournament player photos).
 */
export function resizeImageToDataUrl(file: File, maxSize = 512, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Arquivo não é uma imagem'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Falha ao ler imagem'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Falha ao carregar imagem'))
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas não suportado'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
