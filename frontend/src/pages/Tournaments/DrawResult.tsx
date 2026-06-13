import type { TournamentTeam } from '../../types/tournament'
import { parsePlayers } from '../../types/tournament'

interface DrawResultProps {
  teams: TournamentTeam[]
  matchType?: string
}

const GROUP_COLORS = [
  'bg-orange-50 border-orange-200',
  'bg-green-50 border-green-200',
  'bg-purple-50 border-purple-200',
  'bg-blue-50 border-blue-200',
  'bg-pink-50 border-pink-200',
  'bg-yellow-50 border-yellow-200',
]

export function DrawResult({ teams, matchType = 'TEAM' }: DrawResultProps) {
  const grouped = teams.reduce<Record<number, TournamentTeam[]>>((acc, t) => {
    const g = t.groupNumber ?? 0
    if (!acc[g]) acc[g] = []
    acc[g].push(t)
    return acc
  }, {})

  const groups = Object.entries(grouped)
    .filter(([g]) => Number(g) > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))

  if (groups.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map(([groupNum, groupTeams], idx) => (
        <div key={groupNum} className={`border rounded-xl p-4 ${GROUP_COLORS[idx % GROUP_COLORS.length]}`}>
          <h4 className="font-semibold text-gray-900 mb-3">Grupo {groupNum}</h4>
          <div className="flex flex-col gap-2">
            {groupTeams.map((team) => {
              const players = parsePlayers(team.players)
              return (
                <div key={team.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="font-medium text-sm text-gray-900">{team.name}</p>
                  {matchType === 'TEAM' && players.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {players.map((p, i) => (
                        <div key={i} className="flex items-center gap-1">
                          {p.photo ? (
                            <img src={p.photo} alt={p.name} className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs text-gray-500">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {matchType === 'INDIVIDUAL' && players[0]?.photo && (
                    <img src={players[0].photo} alt={team.name} className="w-8 h-8 rounded-full object-cover mt-1.5 border border-gray-200" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
