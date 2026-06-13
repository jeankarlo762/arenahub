import api from './axios'
import type { Tournament, TournamentStatus, TournamentPlayer } from '../types/tournament'

export async function listTournaments(): Promise<Tournament[]> {
  const res = await api.get<Tournament[]>('/tournaments')
  return res.data
}

export async function getTournament(id: string): Promise<Tournament> {
  const res = await api.get<Tournament>(`/tournaments/${id}`)
  return res.data
}

export async function createTournament(data: {
  name: string
  description?: string
  sport: string
  startDate: string
  endDate: string
  matchType?: string
  maxTeams: number
  prizeInfo?: string
  courtId?: string | null
}): Promise<Tournament> {
  const res = await api.post<Tournament>('/tournaments', data)
  return res.data
}

export async function updateTournament(id: string, data: Partial<Tournament>): Promise<Tournament> {
  const res = await api.put<Tournament>(`/tournaments/${id}`, data)
  return res.data
}

export async function updateTournamentStatus(id: string, status: TournamentStatus): Promise<Tournament> {
  const res = await api.patch<Tournament>(`/tournaments/${id}/status`, { status })
  return res.data
}

export async function addTeam(
  tournamentId: string,
  data: { name: string; players: TournamentPlayer[] },
) {
  const res = await api.post(`/tournaments/${tournamentId}/teams`, data)
  return res.data
}

export async function setChampion(tournamentId: string, champion: string | null): Promise<Tournament> {
  const res = await api.patch<Tournament>(`/tournaments/${tournamentId}/champion`, { champion })
  return res.data
}

export async function removeTeam(tournamentId: string, teamId: string) {
  const res = await api.delete(`/tournaments/${tournamentId}/teams/${teamId}`)
  return res.data
}

/** Randomly seeds all participants into bracket positions */
export async function performDraw(tournamentId: string): Promise<Tournament> {
  const res = await api.post<Tournament>(`/tournaments/${tournamentId}/draw`, {})
  return res.data
}

/** For DOUBLES: randomly pairs individual players into duplas */
export async function drawPairs(tournamentId: string): Promise<Tournament> {
  const res = await api.post<Tournament>(`/tournaments/${tournamentId}/draw/pairs`)
  return res.data
}

/** For TEAM: randomly groups individual players into teams of N */
export async function drawTeamGroups(tournamentId: string, playersPerTeam: number): Promise<Tournament> {
  const res = await api.post<Tournament>(`/tournaments/${tournamentId}/draw/teams`, { playersPerTeam })
  return res.data
}
