export interface ModulesConfig {
  admin: string[]
  operator: string[]
}

export const ALL_MODULES = [
  { key: 'courts',       label: 'Quadras' },
  { key: 'bookings',     label: 'Agendamentos' },
  { key: 'tournaments',  label: 'Torneios' },
  { key: 'clients',      label: 'Clientes' },
  { key: 'rentals',      label: 'Locação' },
  { key: 'bar',          label: 'Bar' },
  { key: 'comandas',     label: 'Comandas' },
  { key: 'financial',    label: 'Financeiro' },
  { key: 'reports',      label: 'Relatórios' },
  { key: 'auto_booking', label: 'Agend. Automático' },
  { key: 'audit',        label: 'Auditoria' },
  { key: 'settings',     label: 'Configurações' },
]

export const DEFAULT_MODULES_CONFIG: ModulesConfig = {
  admin:    ALL_MODULES.map((m) => m.key),
  operator: ['courts', 'bookings', 'tournaments', 'clients', 'rentals'],
}

export function parseModulesConfig(raw: string | null | undefined): ModulesConfig {
  if (!raw) return DEFAULT_MODULES_CONFIG
  try {
    return JSON.parse(raw) as ModulesConfig
  } catch {
    return DEFAULT_MODULES_CONFIG
  }
}
