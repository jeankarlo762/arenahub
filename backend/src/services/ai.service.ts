import { env } from '../config/env'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `Você é um Diretor de Arte e Copywriter sênior especializado em Marketing Esportivo e mídias sociais. Sua função é criar conceitos visuais detalhados, estruturas de layout e textos de conversão (copy) para posts e flyers de Instagram anunciando campeonatos esportivos.

Seu objetivo é gerar designs que transmitam energia, profissionalismo, competitividade e urgência para maximizar as inscrições e o engajamento.

Adapte o tom de voz ao esporte (Ex: E-sports pede algo mais neon/tecnológico; Futebol pede algo mais vibrante/gramado; Crossfit pede algo mais bruto/industrial; Beach Tennis pede algo mais dinâmico/solar).

IMPORTANTE: Responda APENAS com um objeto JSON válido, sem markdown, sem texto adicional, sem \`\`\`json. Siga EXATAMENTE esta estrutura:
{
  "headline": "TÍTULO PRINCIPAL — máximo 5 palavras, agressivo, em MAIÚSCULAS, que gere urgência e desejo",
  "subtitle": "Subtítulo complementar com informação essencial (pode mencionar local/data/formato)",
  "accentColor": "#HEXCODE — cor de destaque que combine com o esporte e contraste bem (diferente do laranja padrão)",
  "style": "Moderno|Premium|Urbano|Futurista|Vibrante|Tropical|Industrial",
  "instagramCaption": "Legenda completa para Instagram com emojis estratégicos, técnica AIDA (Atenção, Interesse, Desejo, Ação), quebras de linha reais, CTA claro no final. Mínimo 150 palavras.",
  "hashtags": ["#hashtag1", "#hashtag2", "...exatamente 20 hashtags relevantes ao esporte, evento e região"]
}`

export interface TournamentConcept {
  headline: string
  subtitle: string
  accentColor: string
  style: string
  instagramCaption: string
  hashtags: string[]
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
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
  if (!env.ANTHROPIC_API_KEY) {
    throw Object.assign(
      new Error('Serviço de IA não configurado. Adicione ANTHROPIC_API_KEY nas variáveis de ambiente.'),
      { statusCode: 503 },
    )
  }

  const matchTypeLabel = data.matchType === 'INDIVIDUAL' ? 'Individual'
    : data.matchType === 'DOUBLES' ? 'Duplas' : 'Equipes'

  const dateRange = data.startDate === data.endDate
    ? formatDate(data.startDate)
    : `${formatDate(data.startDate)} a ${formatDate(data.endDate)}`

  const userMessage = `Crie o conceito criativo e copy para o seguinte campeonato:

**Nome do Torneio:** ${data.name}
**Modalidade Esportiva:** ${data.sport}
**Formato:** ${matchTypeLabel}
**Data:** ${dateRange}
**Número de Vagas:** ${data.maxTeams}
${data.prizeInfo ? `**Premiação:** ${data.prizeInfo}` : ''}
${data.description ? `**Descrição:** ${data.description}` : ''}
${data.companyName ? `**Organizador:** ${data.companyName}` : ''}

Gere o conceito visual, copy de impacto e legenda completa para Instagram.`

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw Object.assign(
      new Error(errBody.error?.message ?? 'Erro ao chamar API de IA'),
      { statusCode: 502 },
    )
  }

  const body = await res.json() as { content: Array<{ type: string; text: string }> }
  const text = (body.content[0]?.text ?? '').trim()

  try {
    return JSON.parse(text) as TournamentConcept
  } catch {
    // Try extracting JSON if the model added any surrounding text
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as TournamentConcept
      } catch {}
    }
    throw Object.assign(new Error('Resposta inválida da IA — JSON não pôde ser parseado'), { statusCode: 502 })
  }
}
