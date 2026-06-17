import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { X, Camera } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import * as playersApi from '../../api/players.api'
import type { Player } from '../../api/players.api'

interface PlayerFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  player?: Player | null
}

export function PlayerForm({ open, onClose, onSuccess, player }: PlayerFormProps) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [photo, setPhoto] = useState('')
  const [saving, setSaving] = useState(false)

  const editing = !!player && player.registered

  useEffect(() => {
    if (open) {
      setName(player?.name ?? '')
      setAge(player?.age != null ? String(player.age) : '')
      setPhoto(player?.photo ?? '')
    }
  }, [open, player])

  function loadPhoto(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens'); return }
    const reader = new FileReader()
    reader.onload = (e) => setPhoto(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Nome obrigatório'); return }
    const ageNum = age.trim() ? parseInt(age, 10) : null
    if (ageNum != null && (isNaN(ageNum) || ageNum < 0 || ageNum > 120)) {
      toast.error('Idade inválida')
      return
    }
    setSaving(true)
    try {
      const payload = { name: name.trim(), age: ageNum, photo: photo || null }
      if (editing && player) {
        await playersApi.updatePlayer(player.id, payload)
        toast.success('Jogador atualizado')
      } else {
        await playersApi.createPlayer(payload)
        toast.success('Jogador cadastrado')
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao salvar jogador')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar Jogador' : 'Cadastrar Jogador'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) loadPhoto(file)
              }
              input.click()
            }}
            className="relative shrink-0 w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors group"
            title="Foto do jogador"
          >
            {photo ? (
              <img src={photo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 group-hover:bg-orange-50">
                <Camera size={22} className="text-gray-400 group-hover:text-orange-400" />
              </div>
            )}
          </button>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-700">Foto do jogador</p>
            <p className="text-xs text-gray-400">Clique no círculo para escolher uma imagem</p>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto('')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors w-fit"
              >
                <X size={12} /> Remover foto
              </button>
            )}
          </div>
        </div>

        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do jogador"
        />

        <Input
          label="Idade (opcional)"
          type="number"
          min={0}
          max={120}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="ex: 25"
        />
      </div>
    </Modal>
  )
}
