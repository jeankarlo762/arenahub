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

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, className, min, max, disabled, ...props }, ref) => {
    const id = useId()

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          type="date"
          ref={ref}
          id={id}
          disabled={disabled}
          min={min !== undefined ? String(min) : undefined}
          max={max !== undefined ? String(max) : undefined}
          className={cn(
            'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
            'transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-400',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  },
)

DatePicker.displayName = 'DatePicker'
