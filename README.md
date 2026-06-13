# ArenaHub — Sistema de Gestão de Quadras Esportivas

Sistema completo para gerenciamento de quadras esportivas, incluindo agendamentos, torneios e controle financeiro.

## Pré-requisitos

- Node.js 20+
- npm 9+

## Como rodar localmente

### 1. Clone / entre no diretório

```bash
cd arenamk
```

### 2. Backend

```bash
cd backend

# Copiar variáveis de ambiente
cp .env.example .env

# Instalar dependências
npm install

# Criar banco de dados e rodar migrations
npm run db:migrate

# Popular com dados iniciais
npm run db:seed

# Iniciar servidor de desenvolvimento
npm run dev
```

O servidor inicia em `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação abre em `http://localhost:5173`.

## Credenciais de acesso (seed)

| Email | Senha | Perfil |
|---|---|---|
| admin@quadras.com | admin123 | Administrador |
| operador@quadras.com | op123456 | Operador |

## Estrutura de pastas

```
arenamk/
├── backend/
│   ├── prisma/          # Schema e migrations do banco
│   ├── src/
│   │   ├── config/      # Env, JWT, Prisma client
│   │   ├── controllers/ # Handlers HTTP por domínio
│   │   ├── middlewares/ # Auth, error handler
│   │   ├── routes/      # Registro de rotas
│   │   ├── schemas/     # Validação Zod
│   │   ├── services/    # Lógica de negócio
│   │   ├── utils/       # Helpers (password, token, date)
│   │   └── server.ts    # Entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/         # Funções de chamada à API
    │   ├── components/  # UI base + layout
    │   ├── pages/       # Uma pasta por página
    │   ├── store/       # Zustand (auth, ui)
    │   ├── types/       # Interfaces TypeScript
    │   └── utils/       # Formatadores, helpers
    └── package.json
```

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | Ambiente |
| `PORT` | `3001` | Porta do servidor |
| `DATABASE_URL` | `file:./dev.db` | URL do banco (SQLite dev / PostgreSQL prod) |
| `JWT_SECRET` | — | Segredo para access tokens |
| `JWT_REFRESH_SECRET` | — | Segredo para refresh tokens |
| `JWT_EXPIRES_IN` | `15m` | Expiração do access token |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Expiração do refresh token |
| `FRONTEND_URL` | `http://localhost:5173` | URL do frontend (CORS) |

### Frontend (`frontend/.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001/api` | URL base da API |

## API — Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Renovar token |
| GET | `/api/courts` | Listar quadras |
| GET | `/api/courts/:id/availability?date=` | Horários disponíveis |
| GET | `/api/bookings` | Listar agendamentos |
| POST | `/api/bookings` | Criar agendamento |
| PATCH | `/api/bookings/:id/status` | Alterar status |
| POST | `/api/bookings/:id/payment` | Registrar pagamento |
| GET | `/api/tournaments` | Listar torneios |
| POST | `/api/tournaments/:id/draw` | Sortear grupos |
| GET | `/api/financial/summary` | Resumo financeiro |

## Stack técnica

**Backend:** Node.js 20, TypeScript strict, Fastify, Prisma (SQLite → PostgreSQL), Zod, JWT, bcryptjs

**Frontend:** React 18, TypeScript strict, Vite, Tailwind CSS, React Router v6, Zustand, Axios, React Hook Form + Zod, Recharts, Lucide React
