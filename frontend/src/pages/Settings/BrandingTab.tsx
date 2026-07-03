import { useState } from 'react'
import { Save, Palette, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { useBrandingStore, applyBrandingCss } from '../../store/branding.store'
import * as settingsApi from '../../api/settings.api'

const PRESET_COLORS = [
  { label: 'Âmbar', value: '#F2B705' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Roxo', value: '#8b5cf6' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Ciano', value: '#06b6d4' },
  { label: 'Amarelo', value: '#eab308' },
]

export function BrandingTab() {
  const { primaryColor, logoUrl, companyName, setBranding } = useBrandingStore()

  const [color, setColor] = useState(primaryColor)
  const [saving, setSaving] = useState(false)

  function handleColorChange(val: string) {
    setColor(val)
    applyBrandingCss(val)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await settingsApi.upsertBranding({
        primaryColor: color,
        logoUrl,
        companyName,
      })
      setBranding(result)
      applyBrandingCss(result.primaryColor)
      toast.success('Branding salvo com sucesso')
    } catch {
      toast.error('Erro ao salvar branding')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = color !== primaryColor

  return (
    <div className="flex flex-col gap-8 max-w-3xl">

      {/* Cor primária */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Palette size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Cor primária</h2>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl border-2 border-gray-200 shadow-sm shrink-0"
              style={{ backgroundColor: color }}
            />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Código hex</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                      setColor(v)
                      if (/^#[0-9a-fA-F]{6}$/.test(v)) applyBrandingCss(v)
                    }
                  }}
                  className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-mono focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                  placeholder="#F2B705"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Cores predefinidas</p>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleColorChange(p.value)}
                  title={p.label}
                  className="group relative w-9 h-9 rounded-lg border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: p.value,
                    borderColor: color === p.value ? '#111' : 'transparent',
                  }}
                >
                  {color === p.value && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Eye size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Preview</h2>
        </div>
        <div className="flex gap-4 items-start">
          {/* Mini sidebar preview */}
          <div className="w-44 bg-gray-900 rounded-xl overflow-hidden shrink-0">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-700">
              <span className="font-black italic text-base text-white leading-none" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>MK</span>
            </div>
            {['Dashboard', 'Agendamentos', 'Configurações'].map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-2 mx-1.5 my-0.5 px-2.5 py-2 rounded-lg text-xs font-medium"
                style={i === 0 ? { backgroundColor: color, color: '#fff' } : { color: '#9ca3af' }}
              >
                <div className="w-3 h-3 rounded-sm shrink-0" style={i === 0 ? { backgroundColor: 'rgba(255,255,255,0.4)' } : { backgroundColor: '#374151' }} />
                {item}
              </div>
            ))}
          </div>
          {/* Button preview */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Botões</p>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: color }}
            >
              Salvar alterações
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 80%, #000)` }}
            >
              Confirmar
            </button>
            <div
              className="px-3 py-1.5 rounded-full text-xs font-medium text-white inline-flex w-fit"
              style={{ backgroundColor: color }}
            >
              Ativo
            </div>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3 pb-4">
        <Button onClick={handleSave} loading={saving} disabled={!isDirty}>
          <Save size={16} /> Salvar branding
        </Button>
        {isDirty && (
          <p className="text-sm text-amber-600 font-medium">Você tem alterações não salvas</p>
        )}
      </div>
    </div>
  )
}
