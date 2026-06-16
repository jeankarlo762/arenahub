import { prisma } from '../config/database'
import {
  CreateTournamentInput,
  UpdateTournamentInput,
  AddTeamInput,
  DrawInput,
  SetChampionInput,
  SaveBracketInput,
} from '../schemas/tournament.schema'

export async function listTournaments() {
  return prisma.tournament.findMany({
    include: {
      _count: { select: { teams: true } },
      court: { select: { id: true, name: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: { orderBy: [{ groupNumber: 'asc' }, { createdAt: 'asc' }] },
      court: { select: { id: true, name: true, type: true } },
    },
  })

  if (!tournament) {
    throw Object.assign(new Error('Torneio não encontrado'), { statusCode: 404 })
  }

  return tournament
}

export async function createTournament(input: CreateTournamentInput) {
  return prisma.tournament.create({
    data: {
      name: input.name,
      description: input.description,
      sport: input.sport,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      matchType: input.matchType,
      maxTeams: input.maxTeams,
      prizeInfo: input.prizeInfo,
      courtId: input.courtId ?? null,
      pointsFirst: input.pointsFirst ?? 3,
      pointsSecond: input.pointsSecond ?? 2,
      pointsThird: input.pointsThird ?? 1,
    },
  })
}

export async function updateTournament(id: string, input: UpdateTournamentInput) {
  await getTournament(id)
  return prisma.tournament.update({
    where: { id },
    data: {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    },
  })
}

export async function updateTournamentStatus(id: string, status: string) {
  await getTournament(id)
  return prisma.tournament.update({ where: { id }, data: { status: status as never } })
}

export async function addTeam(tournamentId: string, input: AddTeamInput) {
  const tournament = await getTournament(tournamentId)

  if (tournament.teams.length >= tournament.maxTeams) {
    throw Object.assign(new Error('Número máximo de equipes atingido'), { statusCode: 409 })
  }

  return prisma.tournamentTeam.create({
    data: {
      tournamentId,
      name: input.name,
      players: JSON.stringify(input.players),
    },
  })
}

export async function removeTeam(tournamentId: string, teamId: string) {
  const team = await prisma.tournamentTeam.findFirst({
    where: { id: teamId, tournamentId },
  })

  if (!team) {
    throw Object.assign(new Error('Equipe não encontrada'), { statusCode: 404 })
  }

  return prisma.tournamentTeam.delete({ where: { id: teamId } })
}

export async function setChampion(tournamentId: string, input: SetChampionInput) {
  await getTournament(tournamentId)
  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { champion: input.champion },
  })
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function parsePlayers(json: string): { name: string; photo?: string }[] {
  try {
    const p = JSON.parse(json)
    if (!Array.isArray(p) || p.length === 0) return []
    if (typeof p[0] === 'string') return p.map((n: string) => ({ name: n }))
    return p as { name: string; photo?: string }[]
  } catch { return [] }
}

/** Randomly seeds all participants into bracket positions (groupNumber = seed 1..N) */
export async function performDraw(tournamentId: string, _input: DrawInput) {
  const tournament = await getTournament(tournamentId)
  const teams = tournament.teams
  if (teams.length === 0) {
    throw Object.assign(new Error('Nenhum participante inscrito'), { statusCode: 400 })
  }

  const shuffled = shuffle(teams)
  await prisma.$transaction(
    shuffled.map((team, i) =>
      prisma.tournamentTeam.update({ where: { id: team.id }, data: { groupNumber: i + 1 } }),
    ),
  )
  return getTournament(tournamentId)
}

/** For DOUBLES: randomly pairs individual player registrations into duplas */
export async function drawPairs(tournamentId: string) {
  const tournament = await getTournament(tournamentId)
  if (tournament.matchType !== 'DOUBLES') {
    throw Object.assign(new Error('Apenas para torneios de duplas'), { statusCode: 400 })
  }
  const teams = tournament.teams
  if (teams.length < 2) {
    throw Object.assign(new Error('Mínimo 2 participantes para sortear duplas'), { statusCode: 400 })
  }

  const shuffled = shuffle(teams)
  const updates: ReturnType<typeof prisma.tournamentTeam.update>[] = []
  const toDelete: string[] = []

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const a = shuffled[i]
    const b = shuffled[i + 1]
    const playersA = parsePlayers(a.players)
    const playersB = parsePlayers(b.players)
    const combined = [...playersA, ...playersB]
    const nameA = playersA[0]?.name ?? a.name
    const nameB = playersB[0]?.name ?? b.name
    updates.push(
      prisma.tournamentTeam.update({
        where: { id: a.id },
        data: {
          name: `${nameA} / ${nameB}`,
          players: JSON.stringify(combined),
          groupNumber: null,
        },
      }),
    )
    toDelete.push(b.id)
  }

  if (toDelete.length > 0) {
    await prisma.$transaction([
      ...updates,
      prisma.tournamentTeam.deleteMany({ where: { id: { in: toDelete } } }),
    ])
  } else {
    await prisma.$transaction(updates)
  }

  return getTournament(tournamentId)
}

/** For TEAM: randomly groups individual player registrations into teams of playersPerTeam */
export async function drawTeamGroups(tournamentId: string, playersPerTeam: number) {
  const tournament = await getTournament(tournamentId)
  if (tournament.matchType !== 'TEAM') {
    throw Object.assign(new Error('Apenas para torneios de equipes'), { statusCode: 400 })
  }
  const teams = tournament.teams
  if (teams.length < playersPerTeam) {
    throw Object.assign(new Error(`Mínimo ${playersPerTeam} participantes`), { statusCode: 400 })
  }

  const shuffled = shuffle(teams)
  const updates: ReturnType<typeof prisma.tournamentTeam.update>[] = []
  const toDelete: string[] = []

  for (let i = 0; i < shuffled.length; i += playersPerTeam) {
    const group = shuffled.slice(i, i + playersPerTeam)
    if (group.length < 2) break
    const combined = group.flatMap(t => parsePlayers(t.players))
    const teamNum = Math.floor(i / playersPerTeam) + 1
    const [leader, ...rest] = group
    updates.push(
      prisma.tournamentTeam.update({
        where: { id: leader.id },
        data: {
          name: `Equipe ${teamNum}`,
          players: JSON.stringify(combined),
          groupNumber: null,
        },
      }),
    )
    toDelete.push(...rest.map(t => t.id))
  }

  if (toDelete.length > 0) {
    await prisma.$transaction([
      ...updates,
      prisma.tournamentTeam.deleteMany({ where: { id: { in: toDelete } } }),
    ])
  } else {
    await prisma.$transaction(updates)
  }

  return getTournament(tournamentId)
}

interface BracketMatch {
  round: number
  matchIndex: number
  winnerId: string | null
}

export async function saveBracketMatch(tournamentId: string, input: SaveBracketInput) {
  const tournament = await getTournament(tournamentId)
  const existing: BracketMatch[] = tournament.bracketData ? JSON.parse(tournament.bracketData) : []

  const idx = existing.findIndex(
    (m) => m.round === input.match.round && m.matchIndex === input.match.matchIndex,
  )

  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...input.match }
  } else {
    existing.push(input.match)
  }

  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { bracketData: JSON.stringify(existing) },
    include: { teams: true, court: { select: { id: true, name: true, type: true } } },
  })
}

export async function updateTeamPosition(tournamentId: string, teamId: string, finalPosition: number | null) {
  const team = await prisma.tournamentTeam.findFirst({ where: { id: teamId, tournamentId } })
  if (!team) throw Object.assign(new Error('Equipe não encontrada'), { statusCode: 404 })
  return prisma.tournamentTeam.update({ where: { id: teamId }, data: { finalPosition } })
}

export async function getPlayerRanking() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: 'FINISHED' },
    include: { teams: true },
    orderBy: { endDate: 'desc' },
  })

  const playerMap = new Map<string, {
    name: string
    points: number
    tournaments: { tournamentName: string; position: number | null; points: number; date: string }[]
  }>()

  for (const t of tournaments) {
    const scoring: Record<number, number> = { 1: t.pointsFirst, 2: t.pointsSecond, 3: t.pointsThird }
    for (const team of t.teams) {
      const key = team.name
      const pts = team.finalPosition != null ? (scoring[team.finalPosition] ?? 0) : 0
      const entry = playerMap.get(key) ?? { name: team.name, points: 0, tournaments: [] }
      entry.points += pts
      entry.tournaments.push({
        tournamentName: t.name,
        position: team.finalPosition,
        points: pts,
        date: t.endDate.toISOString().slice(0, 10),
      })
      playerMap.set(key, entry)
    }
  }

  return Array.from(playerMap.values())
    .sort((a, b) => b.points - a.points)
    .map((p, i) => ({ ...p, rank: i + 1 }))
}
