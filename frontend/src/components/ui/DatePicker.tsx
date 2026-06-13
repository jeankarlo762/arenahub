import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="date"
          className={cn(
            'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
            'transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-400',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
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
