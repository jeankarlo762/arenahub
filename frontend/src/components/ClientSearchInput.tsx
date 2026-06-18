import { useState, useEffect, useRef } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPhone } from '../utils/format'
import type { Client } from '../types/client'
import * as clientsApi from '../api/clients.api'

interface ClientSearchInputProps {
  value: string
  onChange: (name: string, clientId?: string) => void
  error?: string
  label?: string
}

export function ClientSearchInput({ value, onChange, error, label = 'Cliente *' }: ClientSearchInputProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      try { setResults(await clientsApi.listClients(query)) } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectClient(c: Client) {
    const name = `${c.firstName} ${c.lastName}`
    setQuery(name)
    onChange(name, c.id)
    setResults([])
    setOpen(false)
    setCreating(false)
  }

  function handleInput(v: string) {
    setQuery(v)
    onChange(v, undefined)
    setOpen(true)
    setCreating(false)
  }

  async function handleCreateNew() {
    if (!newFirst.trim() || !newLast.trim()) { toast.error('Nome e sobrenome obrigatórios'); return }
    try {
      const client = await clientsApi.createClient({ firstName: newFirst, lastName: newLast, phone: newPhone || undefined })
      selectClient(client)
      setNewFirst(''); setNewLast(''); setNewPhone('')
      toast.success('Cliente cadastrado')
    } catch { toast.error('Erro ao cadastrar cliente') }
  }

  return (
    <div className="flex flex-col gap-1" ref={wrapRef}>
      <label className="text-sm font-medium text-gray-700">{label}</label>

      {/* Input + results dropdown */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar ou digitar nome..."
          className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors ${error ? 'border-red-300 focus:border-red-400' : 'border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200'}`}
        />

        {/* Search results — absolute, inside the relative wrapper */}
        {open && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            {results.map((c) => (
              <button key={c.id} type="button" onClick={() => selectClient(c)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 text-left transition-colors">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-orange-700">{c.firstName[0]}{c.lastName[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                  {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Cadastrar novo cliente — inline (não absoluto, não bloqueia campos acima) */}
      {query.trim().length >= 2 && !creating && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="self-start flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-medium mt-0.5"
        >
          <UserPlus size={13} /> Cadastrar novo cliente
        </button>
      )}

      {creating && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Novo cliente</p>
            <button type="button" onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={newFirst} onChange={e => setNewFirst(e.target.value)} placeholder="Nome *"
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 bg-white" />
            <input value={newLast} onChange={e => setNewLast(e.target.value)} placeholder="Sobrenome *"
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 bg-white" />
          </div>
          <input value={newPhone} onChange={e => setNewPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999"
            inputMode="tel" className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 bg-white" />
          <button type="button" onClick={handleCreateNew}
            className="bg-orange-500 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-orange-600 transition-colors">
            Cadastrar
          </button>
        </div>
      )}
    </div>
  )
}
