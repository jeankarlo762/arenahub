import { z } from 'zod'

export const createTournamentSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  sport: z.string().min(1, 'Esporte obrigatório'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  matchType: z.enum(['INDIVIDUAL', 'DOUBLES', 'TEAM']).default('TEAM'),
  maxTeams: z.number().int().positive('Máximo de equipes deve ser positivo'),
  prizeInfo: z.string().optional(),
  imageUrl: z.string().optional(),
  courtId: z.string().optional().nullable(),
  pointsFirst: z.number().int().min(0).optional(),
  pointsSecond: z.number().int().min(0).optional(),
  pointsThird: z.number().int().min(0).optional(),
})

export const bracketMatchSchema = z.object({
  round: z.number().int().min(0),
  matchIndex: z.number().int().min(0),
  winnerId: z.string().nullable(),
})

export const saveBracketSchema = z.object({
  match: bracketMatchSchema,
})

export const updateTeamPositionSchema = z.object({
  finalPosition: z.number().int().min(1).nullable(),
})

export const updateTournamentSchema = createTournamentSchema.partial()

export const tournamentStatusSchema = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']),
})

export const addTeamSchema = z.object({
  name: z.string().min(1, 'Nome da equipe obrigatório'),
  players: z.array(
    z.object({
      name: z.string().min(1),
      photo: z.string().optional(),
    }),
  ).min(1, 'Pelo menos um jogador'),
})

export const setChampionSchema = z.object({
  champion: z.string().nullable(),
})

export const drawSchema = z.object({
  numGroups: z.number().int().positive().optional(),
})

export const drawTeamGroupsSchema = z.object({
  playersPerTeam: z.number().int().min(2).default(5),
})

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>
export type AddTeamInput = z.infer<typeof addTeamSchema>
export type DrawInput = z.infer<typeof drawSchema>
export type SetChampionInput = z.infer<typeof setChampionSchema>
export type DrawTeamGroupsInput = z.infer<typeof drawTeamGroupsSchema>
export type SaveBracketInput = z.infer<typeof saveBracketSchema>
export type UpdateTeamPositionInput = z.infer<typeof updateTeamPositionSchema>
