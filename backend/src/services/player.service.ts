import { prisma } from '../config/database'
import { CreatePlayerInput, UpdatePlayerInput } from '../schemas/player.schema'

interface RankingStats {
  name: string
  points: number
  tournamentCount: number
  tournaments: { tournamentName: string; position: number | null; points: number; date: string }[]
}

/**
 * Aggregates points and tournaments-played per participant name from finished
 * tournaments. Mirrors the scoring used by the legacy ranking endpoint.
 */
async function buildRankingMap(): Promise<Map<string, RankingStats>> {
  const tournaments = await prisma.tournament.findMany({
    where: { status: 'FINISHED' },
    include: { teams: true },
    orderBy: { endDate: 'desc' },
  })

  const map = new Map<string, RankingStats>()
  for (const t of tournaments) {
    const scoring: Record<number, number> = { 1: t.pointsFirst, 2: t.pointsSecond, 3: t.pointsThird }
    for (const team of t.teams) {
      const key = team.name.trim().toLowerCase()
      const pts = team.finalPosition != null ? (scoring[team.finalPosition] ?? 0) : 0
      const entry = map.get(key) ?? { name: team.name, points: 0, tournamentCount: 0, tournaments: [] }
      entry.points += pts
      entry.tournamentCount += 1
      entry.tournaments.push({
        tournamentName: t.name,
        position: team.finalPosition,
        points: pts,
        date: t.endDate.toISOString().slice(0, 10),
      })
      map.set(key, entry)
    }
  }
  return map
}

export interface PlayerWithStats {
  id: string
  name: string
  age: number | null
  photo: string | null
  points: number
  tournamentCount: number
  tournaments: { tournamentName: string; position: number | null; points: number; date: string }[]
  registered: boolean
}

/**
 * Returns the unified players list: every registered player merged with their
 * tournament stats, plus any tournament participant not yet registered.
 * Sorted by points desc, then tournaments desc, then name.
 */
export async function listPlayers(): Promise<PlayerWithStats[]> {
  const [players, ranking] = await Promise.all([
    prisma.player.findMany({ orderBy: { name: 'asc' } }),
    buildRankingMap(),
  ])

  const result: PlayerWithStats[] = []
  const usedKeys = new Set<string>()

  for (const p of players) {
    const key = p.name.trim().toLowerCase()
    const stats = ranking.get(key)
    usedKeys.add(key)
    result.push({
      id: p.id,
      name: p.name,
      age: p.age,
      photo: p.photo,
      points: stats?.points ?? 0,
      tournamentCount: stats?.tournamentCount ?? 0,
      tournaments: stats?.tournaments ?? [],
      registered: true,
    })
  }

  // Tournament participants that were never registered as players
  for (const [key, stats] of ranking.entries()) {
    if (usedKeys.has(key)) continue
    result.push({
      id: `unregistered:${key}`,
      name: stats.name,
      age: null,
      photo: null,
      points: stats.points,
      tournamentCount: stats.tournamentCount,
      tournaments: stats.tournaments,
      registered: false,
    })
  }

  return result.sort((a, b) =>
    b.points - a.points ||
    b.tournamentCount - a.tournamentCount ||
    a.name.localeCompare(b.name),
  )
}

export async function createPlayer(input: CreatePlayerInput) {
  return prisma.player.create({
    data: {
      name: input.name,
      age: input.age ?? null,
      photo: input.photo ?? null,
    },
  })
}

export async function updatePlayer(id: string, input: UpdatePlayerInput) {
  return prisma.player.update({
    where: { id },
    data: {
      name: input.name,
      age: input.age === undefined ? undefined : (input.age ?? null),
      photo: input.photo === undefined ? undefined : (input.photo ?? null),
    },
  })
}

export async function deletePlayer(id: string) {
  return prisma.player.delete({ where: { id } })
}
