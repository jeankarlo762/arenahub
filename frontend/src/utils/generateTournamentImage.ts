interface TournamentImageData {
  name: string
  sport: string
  startDate: string
  endDate: string
  maxTeams: number
  matchType: string
  prizeInfo?: string
  // AI-generated enhancements (optional)
  headline?: string
  subtitle?: string
  accentColor?: string
}

interface BrandingData {
  primaryColor: string
  logoUrl: string | null
  companyName: string | null
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 249, g: 115, b: 22 }
}

function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`
}

function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function generateTournamentImage(data: TournamentImageData, branding: BrandingData): Promise<string> {
  return new Promise((resolve, reject) => {
    const SIZE = 1080
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const rawCtx = canvas.getContext('2d')
    if (!rawCtx) { reject(new Error('Canvas not supported')); return }
    const ctx: CanvasRenderingContext2D = rawCtx

    const color = branding.primaryColor || '#f97316'
    const accent = data.accentColor || '#ffffff'
    const hasAI = !!(data.headline)

    function drawCanvas(logoImg?: HTMLImageElement) {
      // ── Background ──────────────────────────────────────────────────────
      const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE)
      grad.addColorStop(0, color)
      grad.addColorStop(0.6, darkenHex(color, 55))
      grad.addColorStop(1, darkenHex(color, 95))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, SIZE, SIZE)

      // Decorative circles
      ctx.save()
      ctx.globalAlpha = 0.1
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(-80, -80, 420, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(SIZE + 80, SIZE + 80, 340, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(SIZE * 0.88, SIZE * 0.12, 220, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(SIZE * 0.06, SIZE * 0.7, 150, 0, Math.PI * 2); ctx.fill()
      ctx.restore()

      // AI accent diagonal stripe (only when AI data is available)
      if (hasAI) {
        ctx.save()
        ctx.globalAlpha = 0.07
        ctx.fillStyle = accent
        ctx.beginPath()
        ctx.moveTo(SIZE * 0.6, 0)
        ctx.lineTo(SIZE, 0)
        ctx.lineTo(SIZE * 0.3, SIZE)
        ctx.lineTo(0, SIZE)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      // Bottom dark overlay
      const overlayGrad = ctx.createLinearGradient(0, SIZE * 0.5, 0, SIZE)
      overlayGrad.addColorStop(0, 'rgba(0,0,0,0)')
      overlayGrad.addColorStop(1, 'rgba(0,0,0,0.6)')
      ctx.fillStyle = overlayGrad
      ctx.fillRect(0, 0, SIZE, SIZE)

      let y = 76

      // ── Logo / Company Name ──────────────────────────────────────────────
      if (logoImg) {
        const logoSize = 108
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.beginPath()
        ctx.arc(SIZE / 2, y + logoSize / 2, logoSize / 2 + 16, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        ctx.drawImage(logoImg, SIZE / 2 - logoSize / 2, y, logoSize, logoSize)
        y += logoSize + 44
      } else {
        const compName = (branding.companyName || 'ArenaHub').toUpperCase()
        ctx.font = 'bold 28px Arial, sans-serif'
        const pillW = ctx.measureText(compName).width + 52
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        roundRectPath(ctx, SIZE / 2 - pillW / 2, y, pillW, 50, 25)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(compName, SIZE / 2, y + 25)
        ctx.restore()
        y += 74
      }

      // ── Trophy ──────────────────────────────────────────────────────────
      ctx.font = '70px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fillText('🏆', SIZE / 2, y + 64)
      y += 84

      if (hasAI) {
        // ── AI MODE: Headline + name as subtitle ──────────────────────────

        // "TORNEIO" label
        ctx.font = 'bold 24px Arial, sans-serif'
        ctx.fillStyle = toRgba(accent, 0.85)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText('T  O  R  N  E  I  O', SIZE / 2, y)
        y += 46

        // AI Headline — main impactful text
        const headlineUpper = (data.headline || data.name).toUpperCase()
        ctx.font = 'bold 88px Arial, sans-serif'
        const headlineLines = wrapText(ctx, headlineUpper, SIZE - 80)
        const headlineFontSize = headlineLines.length > 2 ? 66 : 88
        ctx.font = `bold ${headlineFontSize}px Arial, sans-serif`
        const headlineLineH = headlineFontSize + 14

        // Text shadow for depth
        ctx.save()
        ctx.shadowColor = 'rgba(0,0,0,0.4)'
        ctx.shadowBlur = 12
        ctx.shadowOffsetY = 4
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        headlineLines.forEach((line, i) => ctx.fillText(line, SIZE / 2, y + i * headlineLineH))
        ctx.restore()
        y += headlineLines.length * headlineLineH + 16

        // Tournament name as subtitle (smaller, accent color)
        ctx.font = `italic 30px Arial, sans-serif`
        ctx.fillStyle = toRgba(accent, 0.9)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        const nameLines = wrapText(ctx, data.name, SIZE - 160)
        nameLines.forEach((line, i) => ctx.fillText(line, SIZE / 2, y + i * 38))
        y += nameLines.length * 38 + 30

        // AI Subtitle
        if (data.subtitle) {
          ctx.font = '26px Arial, sans-serif'
          ctx.fillStyle = 'rgba(255,255,255,0.75)'
          ctx.textAlign = 'center'
          const subLines = wrapText(ctx, data.subtitle, SIZE - 120)
          subLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, SIZE / 2, y + i * 34))
          y += Math.min(subLines.length, 2) * 34 + 22
        }
      } else {
        // ── BASIC MODE: Tournament name as main text ──────────────────────

        ctx.font = 'bold 26px Arial, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.textAlign = 'center'
        ctx.fillText('T  O  R  N  E  I  O', SIZE / 2, y)
        y += 50

        const nameUpper = data.name.toUpperCase()
        ctx.font = 'bold 88px Arial, sans-serif'
        const nameLines = wrapText(ctx, nameUpper, SIZE - 100)
        const nameFontSize = nameLines.length > 2 ? 62 : 86
        ctx.font = `bold ${nameFontSize}px Arial, sans-serif`
        const nameLineH = nameFontSize + 16
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        nameLines.forEach((line, i) => ctx.fillText(line, SIZE / 2, y + i * nameLineH))
        y += nameLines.length * nameLineH + 36
      }

      // ── Sport badge ──────────────────────────────────────────────────────
      const sportText = data.sport.toUpperCase()
      ctx.font = 'bold 30px Arial, sans-serif'
      const sportPillW = ctx.measureText(sportText).width + 60
      ctx.save()
      // Use accent color for badge when AI-enhanced
      ctx.fillStyle = hasAI ? toRgba(accent, 0.25) : 'rgba(255,255,255,0.2)'
      roundRectPath(ctx, SIZE / 2 - sportPillW / 2, y, sportPillW, 58, 29)
      ctx.fill()
      if (hasAI) {
        ctx.strokeStyle = toRgba(accent, 0.6)
        ctx.lineWidth = 2
        roundRectPath(ctx, SIZE / 2 - sportPillW / 2, y, sportPillW, 58, 29)
        ctx.stroke()
      }
      ctx.fillStyle = hasAI ? accent : '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(sportText, SIZE / 2, y + 29)
      ctx.restore()
      y += 80

      // ── Dates ────────────────────────────────────────────────────────────
      ctx.textBaseline = 'alphabetic'
      ctx.font = '34px Arial, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.textAlign = 'center'
      const datesStr = data.startDate === data.endDate
        ? formatDate(data.startDate)
        : `${formatDate(data.startDate)}  —  ${formatDate(data.endDate)}`
      ctx.fillText(`📅  ${datesStr}`, SIZE / 2, y)
      y += 50

      // ── Match type + vacancies ───────────────────────────────────────────
      const matchLabel = data.matchType === 'INDIVIDUAL' ? 'Individual'
        : data.matchType === 'DOUBLES' ? 'Duplas' : 'Equipes'
      ctx.font = '28px Arial, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'center'
      ctx.fillText(`${matchLabel}  ·  ${data.maxTeams} vagas`, SIZE / 2, y)
      y += 50

      // ── Prize ────────────────────────────────────────────────────────────
      if (data.prizeInfo) {
        const prize = data.prizeInfo.length > 55 ? data.prizeInfo.slice(0, 55) + '...' : data.prizeInfo
        ctx.font = 'bold 28px Arial, sans-serif'
        ctx.fillStyle = '#FFE066'
        ctx.textAlign = 'center'
        ctx.fillText(`🏅  ${prize}`, SIZE / 2, y)
      }

      // ── Footer ───────────────────────────────────────────────────────────
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, SIZE - 88, SIZE, 88)
      ctx.restore()

      ctx.font = 'bold 28px Arial, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(branding.companyName || 'ArenaHub', SIZE / 2, SIZE - 44)

      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }

    if (branding.logoUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => drawCanvas(img)
      img.onerror = () => drawCanvas()
      img.src = branding.logoUrl
    } else {
      drawCanvas()
    }
  })
}
