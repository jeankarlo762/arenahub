import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { ServiceForm } from './ServiceForm'
import type { Service } from '../../api/services.api'
import * as servicesApi from '../../api/services.api'
import { formatCurrency } from '../../utils/format'

export function ServicesTab() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<Service | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await servicesApi.listServices()
      setServices(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const columns = [
    { key: 'name', header: 'Nome', cell: (s: Service) => <span className="font-medium">{s.name}</span> },
    { key: 'description', header: 'Descrição', cell: (s: Service) => s.description ?? '—' },
    { key: 'price', header: 'Preço Padrão', cell: (s: Service) => formatCurrency(Number(s.defaultPrice)) },
    {
      key: 'status',
      header: 'Status',
      cell: (s: Service) => (
        <Badge label={s.active ? 'Ativo' : 'Inativo'} status={s.active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (s: Service) => (
        <Button variant="ghost" size="sm" onClick={() => { setSelected(s); setFormOpen(true) }}>
          <Pencil size={14} />
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setSelected(undefined); setFormOpen(true) }}>
          <Plus size={14} /> Novo Serviço
        </Button>
      </div>
      <Table columns={columns} data={services} keyExtractor={(s) => s.name} loading={loading} />
      <ServiceForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
        service={selected}
      />
    </div>
  )
}
