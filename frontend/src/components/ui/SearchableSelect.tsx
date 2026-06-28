import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

export interface SearchableSelectOption {
  value: string
  label: string
  sub?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  disabled,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sub ?? '').toLowerCase().includes(query.toLowerCase()),
      )
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(optionValue: string) {
    onChange(optionValue)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
  }

  function handleOpen() {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className="w-full flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-left transition-colors hover:border-orange-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selected ? (
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate block">{selected.label}</span>
              {selected.sub && <span className="text-xs text-gray-400 dark:text-gray-500">{selected.sub}</span>}
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {selected && (
              <span
                onClick={handleClear}
                className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors cursor-pointer"
              >
                <X size={13} />
              </span>
            )}
            <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
          </div>
        </button>
      ) : (
        /* Search input */
        <div className="flex items-center gap-2 rounded-lg border border-orange-400 ring-1 ring-orange-200 bg-white dark:bg-gray-800 px-3 py-2">
          <Search size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto..."
            className="flex-1 text-sm outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">Nenhum produto encontrado</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex flex-col items-start px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left ${
                  opt.value === value ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                {opt.sub && <span className="text-xs text-gray-400 dark:text-gray-500">{opt.sub}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
