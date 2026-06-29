import { useNavigate } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

export default function PrivacidadePage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <Shield size={16} className="text-orange-600" />
            </div>
            <span className="font-semibold text-gray-900">MT Quadras</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
          <p className="text-sm text-gray-400">Última atualização: junho de 2026 · Em conformidade com a LGPD (Lei nº 13.709/2018)</p>
        </div>

        <Section title="1. Quem somos">
          <p>
            O <strong>MT Quadras</strong> é um sistema de gestão de quadras esportivas desenvolvido e operado pela <strong>May Tecnologia</strong>
            ("nós", "nosso"). Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos os dados pessoais
            de nossos clientes (arenas esportivas) e dos usuários finais (clientes das arenas).
          </p>
          <p>
            <strong>Controlador de Dados:</strong> May Tecnologia<br />
            <strong>E-mail de contato (DPO):</strong> privacidade@mtquadras.com.br<br />
            <strong>Encarregado de Dados (DPO):</strong> disponível pelo e-mail acima para exercício de direitos previstos na LGPD.
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <p><strong>2.1 Dados dos administradores e operadores de arenas (clientes do serviço):</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Nome completo e e-mail para autenticação</li>
            <li>Telefone (para recuperação de senha)</li>
            <li>Dados de uso e configuração do sistema</li>
            <li>Registros de auditoria de ações realizadas na plataforma</li>
          </ul>
          <p className="mt-3"><strong>2.2 Dados dos clientes finais das arenas (pessoas que fazem agendamentos):</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Nome completo</li>
            <li>Telefone</li>
            <li>E-mail (opcional)</li>
            <li>Histórico de agendamentos e pagamentos</li>
          </ul>
          <p className="mt-3"><strong>2.3 Dados coletados automaticamente:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Tokens de sessão armazenados localmente no dispositivo (localStorage)</li>
            <li>Logs de acesso para segurança e auditoria</li>
          </ul>
        </Section>

        <Section title="3. Finalidade e base legal do tratamento">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b border-gray-200">Finalidade</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border-b border-gray-200">Base Legal (LGPD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Autenticação e acesso ao sistema', 'Art. 7º, V — execução de contrato'],
                  ['Gestão de agendamentos de quadras', 'Art. 7º, V — execução de contrato'],
                  ['Envio de SMS para recuperação de senha', 'Art. 7º, V — execução de contrato'],
                  ['Auditoria de segurança e conformidade', 'Art. 7º, II — cumprimento de obrigação legal'],
                  ['Melhoria do serviço e análise de uso', 'Art. 7º, IX — legítimo interesse'],
                  ['Comunicações de suporte', 'Art. 7º, V — execução de contrato'],
                ].map(([fin, base]) => (
                  <tr key={fin}>
                    <td className="px-3 py-2 text-gray-700">{fin}</td>
                    <td className="px-3 py-2 text-gray-500">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="4. Compartilhamento de dados">
          <p>Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins comerciais. Os dados podem ser compartilhados apenas nas seguintes situações:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li><strong>Prestadores de serviço:</strong> provedores de infraestrutura (Railway — hospedagem, banco de dados), serviços de SMS para notificações</li>
            <li><strong>Obrigação legal:</strong> quando exigido por autoridade competente ou determinação judicial</li>
            <li><strong>Entre arena e cliente:</strong> os dados do cliente final são acessíveis ao administrador da arena que realizou o agendamento</li>
          </ul>
          <p className="mt-2">Todos os prestadores de serviço são selecionados com base em sua conformidade com padrões de segurança e proteção de dados.</p>
        </Section>

        <Section title="5. Retenção de dados">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Dados de conta (operadores/admins):</strong> pelo período de vigência do contrato + 5 anos após o encerramento</li>
            <li><strong>Dados de agendamentos:</strong> 5 anos a partir da data do agendamento (prazo fiscal)</li>
            <li><strong>Logs de auditoria:</strong> 2 anos</li>
            <li><strong>Tokens de sessão:</strong> até o logout ou expiração automática</li>
            <li><strong>Dados de clientes finais:</strong> pelo tempo necessário à prestação do serviço, com eliminação mediante solicitação</li>
          </ul>
        </Section>

        <Section title="6. Seus direitos como titular de dados (Art. 18, LGPD)">
          <p>Você tem direito a:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-2 mt-2">
            <li><strong>Acesso</strong> — confirmar se tratamos seus dados e obter cópia</li>
            <li><strong>Correção</strong> — solicitar correção de dados incompletos, inexatos ou desatualizados</li>
            <li><strong>Anonimização ou eliminação</strong> — quando os dados forem desnecessários ou tratados com base no consentimento</li>
            <li><strong>Portabilidade</strong> — receber seus dados em formato estruturado</li>
            <li><strong>Revogação do consentimento</strong> — quando o tratamento for baseado nesta base legal</li>
            <li><strong>Oposição</strong> — quando discordar do tratamento por legítimo interesse</li>
            <li><strong>Informação</strong> — conhecer as entidades com quem compartilhamos seus dados</li>
            <li><strong>Petição</strong> — apresentar reclamação à ANPD (Autoridade Nacional de Proteção de Dados)</li>
          </ul>
          <p className="mt-3 bg-orange-50 border border-orange-100 rounded-lg p-3">
            Para exercer qualquer direito, entre em contato pelo módulo de <strong>Suporte</strong> dentro da plataforma ou pelo e-mail <strong>privacidade@mtquadras.com.br</strong>. Responderemos em até 15 dias úteis.
          </p>
        </Section>

        <Section title="7. Segurança dos dados">
          <p>Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Transmissão criptografada via HTTPS (TLS)</li>
            <li>Senhas armazenadas com hash seguro (bcrypt)</li>
            <li>Tokens JWT com expiração curta e rotação de refresh tokens</li>
            <li>Acesso ao banco de dados restrito por credenciais e rede privada</li>
            <li>Registros de auditoria para todas as ações sensíveis</li>
            <li>Acesso de suporte via master key com log obrigatório</li>
          </ul>
          <p className="mt-2">Em caso de incidente de segurança que afete seus dados, notificaremos os titulares e a ANPD nos prazos legais.</p>
        </Section>

        <Section title="8. Cookies e armazenamento local">
          <p>
            O MT Quadras utiliza <strong>armazenamento local do navegador (localStorage)</strong> para manter sua sessão autenticada.
            Não utilizamos cookies de rastreamento, publicidade ou analytics de terceiros. Os dados de sessão são eliminados automaticamente
            ao fazer logout ou quando o token expira.
          </p>
        </Section>

        <Section title="9. Transferência internacional de dados">
          <p>
            Utilizamos a plataforma Railway (EUA) para hospedagem do sistema e banco de dados. Esta transferência ocorre com base nas
            salvaguardas previstas no Art. 33 da LGPD, considerando as garantias contratuais e técnicas oferecidas pelo prestador.
          </p>
        </Section>

        <Section title="10. Menores de idade">
          <p>
            Nossos serviços são destinados a pessoas maiores de 18 anos. Não coletamos intencionalmente dados de menores de 18 anos.
            Caso identifiquemos que dados de menores foram coletados sem consentimento dos responsáveis, procederemos com a eliminação imediata.
          </p>
        </Section>

        <Section title="11. Alterações nesta política">
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. Alterações relevantes serão comunicadas aos usuários por e-mail
            ou notificação dentro da plataforma. O uso continuado do serviço após as alterações implica aceitação da nova versão.
          </p>
        </Section>

        <div className="border-t border-gray-200 pt-6 text-sm text-gray-400 text-center">
          <p>MT Quadras — May Tecnologia · privacidade@mtquadras.com.br</p>
          <p className="mt-1">Lei Geral de Proteção de Dados Pessoais — Lei nº 13.709/2018</p>
        </div>
      </div>
    </div>
  )
}
