import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spinner } from '../../components/ui/Spinner'
import { TournamentDetail } from './TournamentDetail'
import type { Tournament } from '../../types/tournament'
import * as tournamentsApi from '../../api/tournaments.api'

export default function TournamentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const data = await tournamentsApi.getTournament(id)
      setTournament(data)
    } catch {
      navigate('/tournaments')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" className="text-orange-500" />
      </div>
    )
  }

  if (!tournament) return null

  return <TournamentDetail tournament={tournament} onRefresh={load} />
}
