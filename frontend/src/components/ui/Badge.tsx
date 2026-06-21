import { cn } from '../../utils/cn'

type Variant = 'green' | 'red' | 'sky' | 'yellow' | 'gray' | 'purple' | 'orange' | 'teal'

const variants: Record<Variant, string> = {
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  sky: 'bg-sky-100 text-sky-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
  orange: 'bg-orange-100 text-orange-800',
  teal: 'bg-teal-100 text-teal-800',
}

const STATUS_VARIANTS: Record<string, Variant> = {
  CONFIRMED: 'green',
  CANCELLED: 'red',
  COMPLETED: 'sky',
  NO_SHOW: 'gray',
  PENDING: 'yellow',
  PAID: 'green',
  REFUNDED: 'purple',
  DRAFT: 'gray',
  OPEN: 'sky',
  IN_PROGRESS: 'orange',
  FINISHED: 'green',
  active: 'green',
  inactive: 'gray',
}

interface BadgeProps {
  label: string
  status?: string
  variant?: Variant
  className?: string
}

export function Badge({ label, status, variant, className }: BadgeProps) {
  const resolvedVariant = variant ?? (status ? STATUS_VARIANTS[status] ?? 'gray' : 'gray')
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[resolvedVariant],
        className,
      )}
    >
      {label}
    </span>
  )
}
