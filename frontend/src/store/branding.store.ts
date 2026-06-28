import { create } from 'zustand'

export interface BrandingData {
  primaryColor: string
  logoUrl: string | null
  companyName: string | null
}

interface BrandingState extends BrandingData {
  loaded: boolean
  setBranding: (data: Partial<BrandingData>) => void
  setLoaded: () => void
}

export const useBrandingStore = create<BrandingState>((set) => ({
  primaryColor: '#F2B705',
  logoUrl: null,
  companyName: null,
  loaded: false,
  setBranding: (data) => set((s) => ({ ...s, ...data })),
  setLoaded: () => set({ loaded: true }),
}))

const BRAND_STYLE_ID = 'brand-theme'

export function applyBrandingCss(color: string) {
  let el = document.getElementById(BRAND_STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = BRAND_STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = `
    :root { --brand: ${color}; }
    .bg-orange-500, .hover\\:bg-orange-500:hover { background-color: var(--brand) !important; }
    .bg-orange-600, .hover\\:bg-orange-600:hover { background-color: color-mix(in srgb, var(--brand) 80%, #000) !important; }
    .bg-orange-400 { background-color: color-mix(in srgb, var(--brand) 85%, #fff) !important; }
    .bg-orange-100 { background-color: color-mix(in srgb, var(--brand) 15%, #fff) !important; }
    .bg-orange-50 { background-color: color-mix(in srgb, var(--brand) 8%, #fff) !important; }
    .text-orange-500, .hover\\:text-orange-500:hover { color: var(--brand) !important; }
    .text-orange-600 { color: color-mix(in srgb, var(--brand) 80%, #000) !important; }
    .text-orange-700 { color: color-mix(in srgb, var(--brand) 65%, #000) !important; }
    .text-orange-800 { color: color-mix(in srgb, var(--brand) 50%, #000) !important; }
    .border-orange-500 { border-color: var(--brand) !important; }
    .border-orange-200 { border-color: color-mix(in srgb, var(--brand) 30%, #fff) !important; }
    .focus\\:border-orange-400:focus { border-color: var(--brand) !important; }
    .focus\\:ring-orange-200:focus { --tw-ring-color: color-mix(in srgb, var(--brand) 30%, transparent) !important; }
    .ring-orange-200 { --tw-ring-color: color-mix(in srgb, var(--brand) 30%, transparent) !important; }
  `
}
