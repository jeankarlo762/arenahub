import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trophy, Search, Crown } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { TournamentForm } from './TournamentForm'
import type { Tournament } from '../../types/tournament'
import * as tournamentsApi from '../../api/tournaments.api'
import { TOURNAMENT_STATUS_LABELS } from '../../utils/format'
import { formatDate } from '../../utils/date'

const MATCH_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  DOUBLES: 'Duplas',
  TEAM: 'Equipes',
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await tournamentsApi.listTournaments()
      setTournaments(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search.trim()
    ? tournaments.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.sport.toLowerCase().includes(search.toLowerCase())
      )
    : tournaments

  return (
    <Layout title="Torneios">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar torneio ou esporte..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
            />
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Novo Torneio
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" className="text-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Trophy size={48} />}
            title={search ? 'Nenhum torneio encontrado' : 'Nenhum torneio cadastrado'}
            action={!search ? { label: 'Novo Torneio', onClick: () => setFormOpen(true) } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col cursor-pointer hover:border-orange-300 hover:shadow-md transition-all overflow-hidden"
                onClick={() => navigate(`/tournaments/${t.id}`)}
              >
                {/* Tournament image */}
                {t.imageUrl ? (
                  <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={t.imageUrl} alt={t.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="h-20 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
                    <Trophy size={32} className="text-white opacity-60" />
                  </div>
                )}

                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                      <p className="text-sm text-gray-500">{t.sport} · {MATCH_TYPE_LABELS[t.matchType] ?? 'Equipes'}</p>
                    </div>
                    <Badge label={TOURNAMENT_STATUS_LABELS[t.status]} status={t.status} />
                  </div>

                  <div className="text-sm text-gray-600 flex flex-col gap-1">
                    <p>{formatDate(t.startDate)} – {formatDate(t.endDate)}</p>
                    <p>{t._count?.teams ?? t.teams?.length ?? 0} / {t.maxTeams} participantes</p>
                    {t.prizeInfo && <p className="text-xs text-gray-400 truncate">{t.prizeInfo}</p>}
                  </div>

                  {/* Champion banner */}
                  {t.champion && (
                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      <Crown size={14} className="text-yellow-500 shrink-0" />
                      <span className="text-sm font-semibold text-yellow-700 truncate">{t.champion}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TournamentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={load}
      />
    </Layout>
  )
}
