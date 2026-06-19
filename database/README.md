# Banco de dados

O schema canônico está em `backend/prisma/schema.prisma`.

```bash
docker compose -f database/docker-compose.yml up -d
cp backend/.env.example backend/.env
npm run db:migrate
npm run db:seed
```

O Prisma cria e versiona todas as tabelas operacionais, incluindo sessões de caixa e chamadas de atendimento.
