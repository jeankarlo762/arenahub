export type TournamentStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
export type MatchType = 'INDIVIDUAL' | 'DOUBLES' | 'TEAM'

export interface TournamentPlayer {
  name: string
  photo?: string
}

export interface TournamentTeam {
  id: string
  tournamentId: string
  name: string
  players: string   // JSON string of TournamentPlayer[] (or legacy string[])
  groupNumber?: number
  finalPosition?: number | null
  createdAt: string
}

export interface TournamentCourt {
  id: string
  name: string
  type: string
}

export interface Tournament {
  id: string
  name: string
  description?: string
  sport: string
  startDate: string
  endDate: string
  status: TournamentStatus
  matchType: MatchType
  maxTeams: number
  prizeInfo?: string
  imageUrl?: string
  champion?: string | null
  courtId?: string | null
  court?: TournamentCourt | null
  teams: TournamentTeam[]
  _count?: { teams: number }
  pointsFirst: number
  pointsSecond: number
  pointsThird: number
  bracketData?: string | null
  createdAt: string
  updatedAt: string
}

/** Parse the players JSON string (supports both legacy string[] and new TournamentPlayer[]) */
export function parsePlayers(playersJson: string): TournamentPlayer[] {
  try {
    const parsed = JSON.parse(playersJson)
    if (!Array.isArray(parsed) || parsed.length === 0) return []
    if (typeof parsed[0] === 'string') {
      return (parsed as string[]).map((name) => ({ name }))
    }
    return parsed as TournamentPlayer[]
  } catch {
    return []
  }
}
