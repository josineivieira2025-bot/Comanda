# Orbe Restaurant OS

Plataforma operacional para restaurantes com frontend React, API Express, PostgreSQL/Prisma, autenticação JWT, eventos Socket.io e aplicativo Flutter para garçons.

## Estrutura

```text
frontend/   React + Vite + Tailwind + React Router
backend/    Node.js + Express + JWT + Socket.io + Prisma
mobile/     Flutter (aplicativo do garçom)
database/   PostgreSQL local via Docker Compose
```

## Pré-requisitos

- Node.js 20+
- Docker Desktop ou PostgreSQL 16+
- Flutter 3.24+ para executar o aplicativo móvel

## Desenvolvimento local

1. Instale as dependências:

```bash
npm install
```

2. Inicie o PostgreSQL:

```bash
docker compose -f database/docker-compose.yml up -d
```

3. Configure o backend:

```bash
copy backend\.env.example backend\.env
npm run db:migrate
npm run db:seed
```

4. Configure o frontend:

```bash
copy frontend\.env.example frontend\.env
```

5. Inicie frontend e backend juntos:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health
- Login inicial: `admin@orbe.com`
- Senha inicial: `admin123`

## Migrações e seed

```bash
npm run db:migrate
npm run db:seed
```

O schema Prisma está em `backend/prisma/schema.prisma`. Nunca execute `prisma migrate dev` diretamente no Render; o deploy utiliza `prisma migrate deploy`.

## Autenticação e perfis

A API usa `Authorization: Bearer <token>`. Os perfis disponíveis são `ADMIN`, `MANAGER`, `WAITER`, `KITCHEN` e `CASHIER`. Rotas administrativas validam o perfil no backend, não apenas na interface.

## Tempo real

O Socket.io autentica com o mesmo JWT e separa os eventos por restaurante. Eventos principais:

- `order:created`
- `order:updated`
- `table:changed`
- `tab:opened`
- `tab:closed`
- `stock:changed`
- `service:called`

## Rotas públicas

- `/cardapio` consulta o cardápio publicado pela API.
- `/mesa/:id` consulta a mesa, cria pedidos e envia chamadas de garçom/conta.
- `/garcom` é protegido e oferece a operação compacta do salão.

## Flutter

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:3001/api --dart-define=SOCKET_URL=http://10.0.2.2:3001
```

Use `10.0.2.2` no emulador Android. Para aparelho físico, use o IP local da máquina.

## Deploy no Render

O arquivo `render.yaml` cria:

- PostgreSQL gerenciado
- Serviço web da API
- Site estático do frontend com fallback para React Router

No primeiro deploy, execute o seed uma vez no shell do backend:

```bash
npm run db:seed
```

Depois ajuste `FRONTEND_URL`, `VITE_API_URL` e `VITE_SOCKET_URL` caso os nomes públicos dos serviços sejam diferentes.

## Segurança antes da produção

- Troque a senha inicial imediatamente.
- Use um `JWT_SECRET` exclusivo e longo.
- Configure domínio e HTTPS.
- Restrinja CORS ao domínio oficial.
- Adicione rate limiting, recuperação de senha, logs e backups automáticos.
