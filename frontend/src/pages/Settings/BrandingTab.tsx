import { useState, useRef } from 'react'
import { resizeImageToDataUrl } from '../../utils/image'
import { Upload, RotateCcw, Save, Palette, ImageIcon, Eye, Type } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { useBrandingStore, applyBrandingCss } from '../../store/branding.store'
import * as settingsApi from '../../api/settings.api'

const PRESET_COLORS = [
  { label: 'Laranja', value: '#f97316' },
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
  const [logo, setLogo] = useState<string | null>(logoUrl)
  const [name, setName] = useState(companyName ?? '')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleColorChange(val: string) {
    setColor(val)
    applyBrandingCss(val)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const resized = await resizeImageToDataUrl(file, 256, 0.85)
      setLogo(resized)
    } catch {
      toast.error('Erro ao processar imagem. Use PNG ou JPG.')
    }
  }

  function handleRemoveLogo() {
    setLogo(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await settingsApi.upsertBranding({
        primaryColor: color,
        logoUrl: logo,
        companyName: name || null,
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

  const isDirty = color !== primaryColor || logo !== logoUrl || (name || null) !== companyName

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

      {/* Logo */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <ImageIcon size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Logo</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="flex items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {logo ? (
              <img src={logo} alt="Logo preview" className="max-h-28 max-w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Upload size={28} />
                <p className="text-sm font-medium">Clique para fazer upload</p>
                <p className="text-xs">PNG, JPG, SVG — máx. 500 KB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {logo && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Trocar logo
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRemoveLogo}>
                <RotateCcw size={14} /> Remover
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Nome da empresa */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Type size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Nome da plataforma</h2>
        </div>
        <div className="flex flex-col gap-1 max-w-xs">
          <label className="text-sm font-medium text-gray-700">Nome exibido na sidebar</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="MT Quadras"
            maxLength={80}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
          />
          <p className="text-xs text-gray-400">Aparece na sidebar quando não há logo configurado</p>
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
              {logo
                ? <img src={logo} alt="Logo" className="h-6 max-w-[110px] object-contain" />
                : <span className="font-bold text-sm text-white tracking-tight">{name || 'MT Quadras'}</span>}
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
