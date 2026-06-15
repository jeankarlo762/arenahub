import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn'

interface DatePickerProps {
  label?: string
  error?: string
  value?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (e: any) => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBlur?: (e: any) => any
  name?: string
  min?: string | number
  max?: string | number
  disabled?: boolean
  className?: string
  id?: string
}

function generateDateOptions(min?: string | number, max?: string | number) {
  const options: { value: string; label: string }[] = []

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  start.setDate(today.getDate() - 365)

  const end = new Date(today)
  end.setDate(today.getDate() + 90)

  const minDate = min ? new Date(String(min) + 'T00:00:00') : null
  const maxDate = max ? new Date(String(max) + 'T00:00:00') : null

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (minDate && d < minDate) continue
    if (maxDate && d > maxDate) continue

    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const value = `${yyyy}-${mm}-${dd}`
    const label = `${days[d.getDay()]}, ${dd} ${months[d.getMonth()]} ${yyyy}`
    options.push({ value, label })
  }

  return options
}

export const DatePicker = forwardRef<HTMLSelectElement, DatePickerProps>(
  ({ label, error, className, min, max, disabled, ...props }, ref) => {
    const id = useId()
    const options = generateDateOptions(min, max)

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
            'transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-400',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        >
          <option value="">Selecione uma data...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  },
)

DatePicker.displayName = 'DatePicker'
