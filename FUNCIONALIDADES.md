# ArenaHub — Funcionalidades e Roadmap

Documento de referência das funcionalidades presentes no sistema e sugestões de evolução.
Última atualização: junho/2026.

---

## ✅ Funcionalidades presentes

### Acesso e conta
- **Multi-arena (multi-tenant):** cada arena tem seus próprios dados isolados.
- **Perfis de acesso:** Administrador, Operador e Super Administrador.
- **Login seguro:** autenticação com JWT e sessão persistente.
- **Recuperação de senha:** via código enviado por SMS.
- **Modo escuro / claro.**
- **PWA:** instala como aplicativo no celular e no computador.

### Quadras
- Cadastro de quadras (modalidade, capacidade, preço por horário, duração do slot, foto, descrição).
- Configuração de horários de funcionamento por dia da semana.
- Ativar/desativar quadras.

### Agendamentos
- Lista com filtros (cliente, data de criação, quadra, status).
- **Ordenação:** por data de criação (mais recente), crescente e decrescente. *(novo)*
- Visão em **calendário** por quadra.
- **Histórico** de agendamentos concluídos com exportação em **CSV**.
- Controle de status: Confirmado, Concluído, Cancelado, Não compareceu.
- Registro de pagamento por agendamento (dinheiro, cartão, PIX, transferência).
- Prevenção de conflito de horário e double booking.

### Agendamento automático (link público)
- Página pública onde o cliente reserva sozinho, sem app e sem criar conta.
- Consulta de disponibilidade em tempo real.
- **Notificação automática no WhatsApp** ao confirmar a reserva. *(mensagem personalizável)*
- **Auto-cadastro do cliente** na plataforma ao agendar. *(novo)*

### Clientes
- Cadastro com nome, sobrenome e telefone.
- Busca por nome ou telefone.
- Histórico do cliente: agendamentos, consumo no bar e total gasto.

### Mensalistas *(antes "Locação")*
- Cadastro de clientes recorrentes com horário fixo.
- Planos (mensal, trimestral, semestral, anual ou personalizado) e recorrência diária/mensal.
- Controle de mensalidades e pagamentos, com alerta de mensalidade em atraso.
- Relatório de mensalistas ativos/inativos e receita estimada.

### Bar / Lanchonete
- Cadastro de produtos e categorias, com preço de custo e venda.
- Comandas por cliente/mesa, integradas ao caixa.
- Registro de transações e pagamentos parciais.

### Torneios
- Criação de torneios (individual, duplas ou times).
- Chaveamento automático e visualização em bracket.
- **Modo TV** para exibição em telão.
- Times, jogadores e pontuação configurável.

### Financeiro
- Entradas e saídas por origem (Quadras, Bar, Mensalistas).
- Configuração de taxas por método de pagamento.
- Controle do que foi pago e do que está pendente.

### Relatórios
- Receita diária.
- Ocupação e faturamento por origem.
- Ranking de produtos do bar e de quadras com mais mensalistas.

### Administração e suporte
- **Auditoria:** trilha de todas as ações (criação, edição, exclusão).
- **Suporte:** abertura de tickets com anexo, direto da plataforma.
- **Integrações:** conexão do WhatsApp via QR Code (Baileys) e editor da mensagem de confirmação.
- **Branding:** cor primária, logo e nome de exibição por arena.
- **Super Admin:** gestão de arenas, usuários, financeiro (MRR), auditoria global, segurança (master key) e suporte.
- **Conformidade LGPD:** política de privacidade, termos de uso e banner de consentimento.

---

## 💡 Sugestões de novas funcionalidades

### Reduzir faltas e aumentar ocupação
- **Lembrete automático no WhatsApp** algumas horas antes do horário (reduz no-show).
- **Confirmação de presença** pelo WhatsApp (botão "Vou / Não vou").
- **Fila de espera** para horários lotados — avisa o cliente quando vagar.
- **Recuperação de clientes inativos:** alerta de quem não reserva há X dias + mensagem automática.
- **Relatório de no-show por cliente**, com opção de exigir sinal de quem falta muito.

### Pagamentos
- **Pagamento online no agendamento automático** (PIX/cartão) — cobrança de sinal ou valor total antecipado.
- **Cobrança automática de mensalistas** (link de pagamento recorrente) + aviso de vencimento.
- **Comprovante/recibo** enviado por WhatsApp após o pagamento.
- **Painel de inadimplência** consolidado.

### Relacionamento com o cliente
- **Programa de fidelidade / pontos** por reservas e consumo.
- **Cupons e promoções por horário** (ex.: happy hour em horários vazios).
- **Aniversariantes do mês** (informativo) + mensagem automática de parabéns.
- **Avaliação pós-jogo (NPS)** para medir satisfação.

### Operação
- **Notificação ao dono** a cada nova reserva pelo link público.
- **Check-in por QR Code** na entrada da arena.
- **Controle de estoque do bar** com alerta de baixo estoque.
- **Gestão de aulas/professores** (agenda de aulinhas, turmas e planos).
- **Integração com Google Calendar / agenda do celular.**
- **Emissão de nota fiscal (NFC-e).**

### Informativos e painéis
- **Metas mensais** e comparativo mês a mês no Dashboard.
- **Horários de pico** (mapa de calor de ocupação por dia/hora).
- **DRE simplificado** (receita, custo, lucro) no financeiro.
- **Exportação de clientes** em CSV.
- **Resumo diário automático** enviado ao dono no WhatsApp (reservas, caixa, pendências).

---

> Priorização sugerida (maior impacto x menor esforço):
> 1. Lembrete + confirmação de presença no WhatsApp
> 2. Notificação ao dono a cada nova reserva
> 3. Pagamento online / sinal no agendamento automático
> 4. Cobrança automática e painel de inadimplência de mensalistas
