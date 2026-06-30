interface MKLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  className?: string
}

const sizes = {
  xs: 'text-base',
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-6xl',
}

export function MTLogo({ size = 'md', color = '#F2B705', className = '' }: MKLogoProps) {
  return (
    <span
      className={`font-black italic tracking-tighter leading-none select-none ${sizes[size]} ${className}`}
      style={{ color, fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}
    >
      MK
    </span>
  )
}
