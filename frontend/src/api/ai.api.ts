import api from './axios'

export interface TournamentConcept {
  headline: string
  subtitle: string
  accentColor: string
  style: string
  instagramCaption: string
  hashtags: string[]
}

export async function generateTournamentConcept(data: {
  name: string
  sport: string
  startDate: string
  endDate: string
  maxTeams: number
  matchType: string
  prizeInfo?: string
  description?: string
  companyName?: string
}): Promise<TournamentConcept> {
  const res = await api.post<TournamentConcept>('/ai/tournament-concept', data)
  return res.data
}
