import { useState, useRef } from 'react'
import { LifeBuoy, X, Paperclip, Loader2, CheckCircle2 } from 'lucide-react'
import { createSupportTicket } from '../../api/support.api'
import toast from 'react-hot-toast'

export function SupportTicketButton() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState<{ name: string; base64: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTitle('')
    setDescription('')
    setAttachment(null)
    setSent(false)
  }

  function handleClose() {
    setOpen(false)
    setTimeout(reset, 300)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setAttachment({ name: file.name, base64 })
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setLoading(true)
    try {
      await createSupportTicket({
        title: title.trim(),
        description: description.trim(),
        attachmentBase64: attachment?.base64 ?? null,
        attachmentName: attachment?.name ?? null,
      })
      setSent(true)
    } catch {
      toast.error('Erro ao enviar ticket. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Abrir ticket de suporte"
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <LifeBuoy size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <LifeBuoy size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Abrir Ticket de Suporte</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nossa equipe responderá em breve</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 px-6">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Ticket enviado!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nossa equipe irá analisar seu chamado.</p>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Descreva o problema em poucas palavras"
                    maxLength={200}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva detalhadamente o que aconteceu, passos para reproduzir o problema, etc."
                    rows={5}
                    maxLength={5000}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600 transition resize-none"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{description.length}/5000</p>
                </div>

                {/* Attachment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Anexo <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional, máx. 5 MB)</span>
                  </label>
                  {attachment ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                      <Paperclip size={16} className="text-orange-500 dark:text-orange-400 shrink-0" />
                      <span className="text-sm text-orange-700 dark:text-orange-300 truncate flex-1">{attachment.name}</span>
                      <button
                        type="button"
                        onClick={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = '' }}
                        className="text-orange-400 dark:text-orange-500 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-orange-400 dark:hover:border-orange-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                    >
                      <Paperclip size={16} />
                      Clique para anexar um arquivo
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf,.txt,.csv,.xlsx,.xls,.docx,.doc"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Footer */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !title.trim() || !description.trim()}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Enviar Ticket'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
