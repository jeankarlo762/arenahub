import api from './axios'

export interface PlayerTournamentEntry {
  tournamentName: string
  position: number | null
  points: number
  date: string
  matchType: string
  sport: string
}

export interface Player {
  id: string
  name: string
  age: number | null
  photo: string | null
  points: number
  tournamentCount: number
  tournaments: PlayerTournamentEntry[]
  registered: boolean
}

export async function listPlayers(): Promise<Player[]> {
  const res = await api.get<Player[]>('/players')
  return res.data
}

export async function createPlayer(data: {
  name: string
  age?: number | null
  photo?: string | null
}): Promise<Player> {
  const res = await api.post<Player>('/players', data)
  return res.data
}

export async function updatePlayer(
  id: string,
  data: { name?: string; age?: number | null; photo?: string | null },
): Promise<Player> {
  const res = await api.put<Player>(`/players/${id}`, data)
  return res.data
}

export async function deletePlayer(id: string): Promise<void> {
  await api.delete(`/players/${id}`)
}
