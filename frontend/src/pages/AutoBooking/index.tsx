import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { Copy, Check, Link, RefreshCw, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

async function getBookingSlug(): Promise<{ slug: string | null }> {
  const res = await api.get('/settings/booking-slug')
  return res.data
}

async function setBookingSlug(slug?: string): Promise<{ slug: string }> {
  const res = await api.put('/settings/booking-slug', { slug })
  return res.data
}

export default function AutoBookingPage() {
  const [slug, setSlug] = useState<string | null>(null)
  const [slugInput, setSlugInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const publicUrl = slug ? `${window.location.origin}/booking/${slug}` : null

  useEffect(() => {
    getBookingSlug()
      .then(({ slug }) => {
        setSlug(slug)
        setSlugInput(slug ?? '')
      })
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [])

  async function handleGenerate() {
    setSaving(true)
    try {
      const { slug: newSlug } = await setBookingSlug()
      setSlug(newSlug)
      setSlugInput(newSlug)
      toast.success('Link gerado com sucesso')
    } catch {
      toast.error('Erro ao gerar link')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    const trimmed = slugInput.trim()
    if (!trimmed || trimmed.length < 3) {
      toast.error('O slug deve ter pelo menos 3 caracteres')
      return
    }
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      toast.error('Apenas letras minúsculas, números e hífen')
      return
    }
    setSaving(true)
    try {
      const { slug: newSlug } = await setBookingSlug(trimmed)
      setSlug(newSlug)
      setSlugInput(newSlug)
      toast.success('Link salvo')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <Layout title="Agendamento Automático">
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
      </Layout>
    )
  }

  return (
    <Layout title="Agendamento Automático">
      <div className="flex flex-col gap-6 max-w-2xl">

        {/* Explanation */}
        <Card>
          <div className="flex items-start gap-3">
            <Link size={20} className="text-orange-500 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Como funciona</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gere um link personalizado e compartilhe com seus clientes. Eles poderão ver as quadras disponíveis,
                escolher data e horário e fazer um agendamento sem precisar entrar em contato.
              </p>
            </div>
          </div>
        </Card>

        {/* Slug config */}
        <Card>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Configurar link</h2>

          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Slug personalizado"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="ex: minha-arena"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Apenas letras minúsculas, números e hífen</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} loading={saving} disabled={!slugInput.trim()}>
                Salvar slug
              </Button>
              <Button variant="secondary" onClick={handleGenerate} loading={saving}>
                <RefreshCw size={14} />
                Gerar automaticamente
              </Button>
            </div>
          </div>
        </Card>

        {/* Link display */}
        {slug && publicUrl && (
          <Card>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Link para clientes</h2>

            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
              <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-mono truncate">{publicUrl}</p>
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg transition-all shrink-0 ${
                  copied ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Copiar link"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors shrink-0"
                title="Abrir link"
              >
                <ExternalLink size={15} />
              </a>
            </div>

            <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium text-gray-700 dark:text-gray-300">O cliente poderá:</p>
              <ul className="flex flex-col gap-1 ml-4 list-disc text-gray-500 dark:text-gray-400">
                <li>Ver todas as quadras ativas da sua arena</li>
                <li>Escolher a data e horário desejado</li>
                <li>Verificar a disponibilidade em tempo real</li>
                <li>Confirmar o agendamento com nome e telefone</li>
              </ul>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}