# BarberHub Backend

API do BarberHub em NestJS + Prisma (PostgreSQL). O front fica em `/home/reverbo/studing/barberhub-front/barberhub-front` (Next.js).

## Comandos

- `npm run start:dev`: sobe a API com watch (porta `PORT`, padrão 3000)
- `npm run build`: compila com `nest build`
- `npm test`: testes unitários (Jest, arquivos `*.spec.ts`)
- `npm run prisma:generate`: gera o client do Prisma
- `npm run prisma:migrate`: cria e aplica migrations em dev
- `npm run prisma:deploy`: aplica migrations em produção

## Integração com o front

- CORS libera apenas `http://localhost:3001` (`src/main.ts`). Se a origem do front mudar, ajuste ali.
- O front chama a API via proxy `/api/backend/*` (Next.js) ou pelo `NEXT_PUBLIC_API_URL`.
- Login usa cookie `barberhub_access_token` (JWT). O front envia como `Authorization: Bearer`.
- Login com Google: `/clients/google` e `/clients/google/exchange`, com retorno para `FRONTEND_URL`.

## Variáveis de ambiente (`.env`, nunca versionar valores)

`DATABASE_URL`, `DIRECT_URL`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `RESEND_API_KEY`, `RABBITMQ_URL`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_CLIENT_CALLBACK_URL`, `FRONTEND_URL`.

## Convenções

- Módulos em `src/modules/<nome>` (controller, service, dto, mappers, events).
- Eventos de domínio em `events/` de cada módulo.
- Notificações têm worker separado: `npm run start:worker`.
