import { Link, useNavigate } from 'react-router-dom'
import { FileText, ArrowLeft } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

export default function TermosPage() {
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
              <FileText size={16} className="text-orange-600" />
            </div>
            <span className="font-semibold text-gray-900">MT Quadras</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Termos de Uso</h1>
          <p className="text-sm text-gray-400">Última atualização: junho de 2026 · Regidos pela legislação brasileira</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
          Ao criar uma conta ou utilizar o MT Quadras, você declara ter lido, compreendido e aceito integralmente estes Termos de Uso e nossa <Link to="/privacidade" className="underline font-medium">Política de Privacidade</Link>.
        </div>

        <Section title="1. Descrição do serviço">
          <p>
            O <strong>MT Quadras</strong>, desenvolvido pela <strong>May Tecnologia</strong>, é uma plataforma SaaS (Software como Serviço)
            de gestão de quadras esportivas que oferece funcionalidades de agendamento, controle financeiro, gestão de torneios,
            bar/comandas, locações e relatórios para arenas esportivas ("Clientes").
          </p>
          <p>
            O acesso é fornecido mediante plano de assinatura contratado diretamente com a May Tecnologia. O serviço está disponível
            via navegador web e aplicativo progressivo (PWA).
          </p>
        </Section>

        <Section title="2. Aceitação dos termos">
          <p>
            Estes Termos regem o uso do MT Quadras por parte dos administradores e operadores de arenas ("Usuários"). O uso continuado da
            plataforma implica aceitação integral destes termos. Caso não concorde, você deve cessar o uso imediatamente e notificar a May Tecnologia.
          </p>
        </Section>

        <Section title="3. Cadastro e responsabilidades do usuário">
          <p>Para utilizar o MT Quadras, o Cliente é responsável por:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Fornecer informações verídicas, precisas e atualizadas no cadastro</li>
            <li>Manter a confidencialidade de suas credenciais de acesso</li>
            <li>Notificar a May Tecnologia imediatamente em caso de acesso não autorizado</li>
            <li>Garantir que todos os operadores adicionados à plataforma conheçam e aceitem estes Termos</li>
            <li>Cumprir a LGPD e demais legislações aplicáveis ao tratar dados dos seus próprios clientes pela plataforma</li>
          </ul>
        </Section>

        <Section title="4. Uso permitido e vedações">
          <p>É permitido usar o MT Quadras para:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Gestão das operações da sua arena esportiva</li>
            <li>Agendamento de quadras para seus clientes</li>
            <li>Controle financeiro, relatórios e gestão de equipe</li>
          </ul>
          <p className="mt-3">É <strong>vedado</strong>:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-2 mt-2">
            <li>Sublicenciar, vender, revender ou transferir o acesso ao serviço a terceiros</li>
            <li>Usar a plataforma para atividades ilegais ou que violem direitos de terceiros</li>
            <li>Tentar acessar sistemas, contas ou dados não autorizados</li>
            <li>Realizar engenharia reversa, descompilar ou copiar o software</li>
            <li>Introduzir vírus, malware ou qualquer código malicioso</li>
            <li>Usar o serviço de forma a sobrecarregar a infraestrutura (ataques de negação de serviço)</li>
            <li>Coletar dados de outros usuários sem autorização</li>
          </ul>
        </Section>

        <Section title="5. Plano de assinatura e pagamento">
          <p>
            O uso do MT Quadras está sujeito ao pagamento da mensalidade acordada no momento da contratação.
            O não pagamento em até 30 dias após o vencimento poderá resultar na suspensão temporária ou encerramento do acesso.
            Valores e condições de pagamento são definidos em contrato separado entre o Cliente e a May Tecnologia.
          </p>
        </Section>

        <Section title="6. Disponibilidade e suporte">
          <p>
            A May Tecnologia empreenderá esforços razoáveis para manter o MT Quadras disponível. No entanto, não garantimos
            disponibilidade ininterrupta, especialmente em casos de manutenção programada, falhas de infraestrutura de terceiros
            ou situações de força maior.
          </p>
          <p>
            Suporte técnico é prestado exclusivamente pelo canal de tickets dentro da plataforma. O prazo de resposta é de até
            2 dias úteis para chamados padrão.
          </p>
        </Section>

        <Section title="7. Dados e propriedade">
          <p>
            <strong>Seus dados pertencem a você.</strong> Os dados inseridos na plataforma (clientes, agendamentos, financeiro etc.)
            são de propriedade do Cliente. A May Tecnologia atua como operadora desses dados, conforme definido na LGPD.
          </p>
          <p>
            Ao encerrar o contrato, o Cliente poderá solicitar exportação dos seus dados em até 30 dias. Após esse prazo,
            os dados serão anonimizados ou eliminados, conforme a Política de Privacidade.
          </p>
          <p>
            <strong>O software e a marca MT Quadras</strong> são de propriedade exclusiva da May Tecnologia.
            Estes Termos não transferem qualquer direito de propriedade intelectual ao Cliente.
          </p>
        </Section>

        <Section title="8. Confidencialidade">
          <p>
            Ambas as partes comprometem-se a manter em sigilo as informações confidenciais da outra parte. A May Tecnologia
            não divulgará dados do Cliente a terceiros, exceto conforme previsto na Política de Privacidade ou por obrigação legal.
          </p>
        </Section>

        <Section title="9. Limitação de responsabilidade">
          <p>
            A May Tecnologia não se responsabiliza por:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Perdas de negócio decorrentes de indisponibilidade do serviço por causas fora de seu controle</li>
            <li>Danos causados por uso indevido da plataforma pelo Cliente ou seus operadores</li>
            <li>Decisões de negócio tomadas com base em dados ou relatórios do sistema</li>
            <li>Falhas em integrações com serviços de terceiros (gateways de pagamento, SMS, etc.)</li>
          </ul>
          <p className="mt-2">
            Em qualquer caso, a responsabilidade total da May Tecnologia fica limitada ao valor pago pelo Cliente nos últimos 3 meses de serviço.
          </p>
        </Section>

        <Section title="10. Rescisão">
          <p>
            Qualquer das partes pode encerrar o contrato mediante aviso prévio de 30 dias. A May Tecnologia pode suspender ou
            encerrar o acesso imediatamente em caso de violação grave destes Termos, incluindo uso não autorizado, fraude ou falta de pagamento.
          </p>
        </Section>

        <Section title="11. Alterações nos termos">
          <p>
            Podemos atualizar estes Termos a qualquer momento. Alterações materiais serão comunicadas com no mínimo 15 dias de antecedência
            por e-mail ou notificação na plataforma. O uso continuado após a vigência das alterações implica aceitação.
          </p>
        </Section>

        <Section title="12. Legislação aplicável e foro">
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo o Marco Civil da Internet (Lei nº 12.965/2014),
            o Código de Defesa do Consumidor (Lei nº 8.078/1990) e a LGPD (Lei nº 13.709/2018).
          </p>
          <p>
            Fica eleito o foro da comarca de domicílio da May Tecnologia para resolução de quaisquer litígios decorrentes destes Termos,
            com renúncia a qualquer outro, por mais privilegiado que seja.
          </p>
        </Section>

        <Section title="13. Contato">
          <p>
            Para dúvidas sobre estes Termos, entre em contato pelo módulo de Suporte na plataforma ou pelo e-mail <strong>contato@mtquadras.com.br</strong>.
          </p>
        </Section>

        <div className="border-t border-gray-200 pt-6 text-sm text-gray-400 text-center">
          <p>MT Quadras — May Tecnologia</p>
          <p className="mt-1">
            <Link to="/privacidade" className="hover:text-gray-600 transition-colors">Política de Privacidade</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
