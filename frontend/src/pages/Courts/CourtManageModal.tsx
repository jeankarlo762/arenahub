import { Plus, Pencil, Settings2, Power, PowerOff } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { Court } from '../../types/court'

interface CourtManageModalProps {
  open: boolean
  onClose: () => void
  courts: Court[]
  activatingId: string | null
  onNew: () => void
  onEdit: (court: Court) => void
  onConfigure: (court: Court) => void
  onActivate: (court: Court) => void
  onDeactivate: (court: Court) => void
}

export function CourtManageModal({
  open,
  onClose,
  courts,
  activatingId,
  onNew,
  onEdit,
  onConfigure,
  onActivate,
  onDeactivate,
}: CourtManageModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurar Quadras"
      size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-500">Crie, edite e configure suas quadras.</p>
          <Button size="sm" onClick={onNew}>
            <Plus size={15} /> Nova Quadra
          </Button>
        </div>

        {courts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma quadra cadastrada ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {courts.map((court) => (
              <div
                key={court.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{court.name}</p>
                    <Badge label={court.active ? 'Ativa' : 'Inativa'} status={court.active ? 'active' : 'inactive'} />
                  </div>
                  <p className="text-xs text-gray-400">{court.type}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => onEdit(court)}>
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onConfigure(court)}>
                    <Settings2 size={14} /> Configurar
                  </Button>
                  {court.active ? (
                    <Button variant="ghost" size="sm" onClick={() => onDeactivate(court)} title="Desativar">
                      <PowerOff size={14} className="text-red-500" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onActivate(court)}
                      loading={activatingId === court.id}
                      title="Ativar"
                    >
                      <Power size={14} className="text-green-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
