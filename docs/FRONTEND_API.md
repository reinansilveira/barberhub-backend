# Contrato da API — BarberHub

Documento extraído do código em `2026-07-19`. Base local: `http://localhost:3000`; Swagger: `http://localhost:3000/api`.

## Convenções globais

- JSON, datas em ISO-8601. IDs são UUIDs (salvo quando o DTO não valida explicitamente).
- Rotas não marcadas como públicas exigem `Authorization: Bearer <access_token>`.
- Apenas as rotas abaixo sinalizadas como **públicas** não exigem token. Não há autorização por papel (`ADMIN`, `PROFESSIONAL`, `CLIENT`) no backend: qualquer JWT válido acessa todas as rotas protegidas.
- CORS atual permite somente `http://localhost:3001`, com `credentials: true`.
- O `ValidationPipe` remove campos desconhecidos e retorna `400` se qualquer campo extra for enviado. Portanto, envie somente os campos documentados.
- Erros têm o envelope `{ "statusCode": number, "message": string | object }`. Erros de validação normalmente têm `message` como objeto/array do Nest; regras de negócio retornam mensagens textuais.
- Listagens de `active` retornam ativos por padrão. Para inativos use `?active=false`; qualquer outro valor equivale a ativos.
- Valores `Decimal` retornados pelo Prisma podem chegar serializados como string/objeto, exceto `Appointment.price`, que é convertido para número pelo mapper. O front deve normalizar valores monetários.

## Enumerações

| Campo | Valores |
|---|---|
| `UserRole` | `ADMIN`, `PROFESSIONAL`, `CLIENT` |
| `AppointmentStatus` | `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| `PaymentStatus` | `PENDING`, `PAID`, `REFUNDED`, `FAILED`, `PARTIAL` |
| `PaymentMethod` | `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `PIX`, `TRANSFER` |
| `NotificationStatus` | `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `READ` |
| `NotificationType` | `EMAIL`, `SMS`, `WHATSAPP`, `PUSH` |
| `Gender` | `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` |

## Autenticação e sessão

| Método e rota | Acesso | Body | Retorno / regra |
|---|---|---|---|
| `POST /auth/login` | Público | `{ email, password }` | `{ access_token, refresh_token }`. E-mail válido; senha com 6+ caracteres. Usuário precisa existir e estar ativo. Access token expira em 15 min (padrão); refresh, 7 dias. |
| `POST /auth/refresh` | Público | `{ refresh_token }` | Novo par de tokens. Refresh é de uso único: após renovar, o anterior é revogado. |
| `POST /auth/validate` | Público | `{ token }` | `{ valid: true, user: { id, email } }` se válido e usuário ativo. |
| `POST /auth/start` | Público | `{ phone }` | `{ clientId, message: "Código enviado" }`. Telefone somente dígitos, 10–11 caracteres; exige cliente já cadastrado. Máximo de 3 solicitações a cada 15 min; OTP expira em 5 min. |
| `POST /auth/verify-code` | Público | `{ phone, code }` | `{ id, name, phone, phoneVerifiedAt }`. Código tem exatamente 6 dígitos e é consumido após validação. |

Fluxo de refresh: ao receber `401` por access token expirado, chamar `/auth/refresh`, salvar ambos os novos tokens e repetir a requisição original. Se falhar, encerrar a sessão.

## Usuários

Modelo retornado: `User = { id, email, password, name, phone?, avatar?, role, active, emailVerified, lastLoginAt?, createdAt, updatedAt, resetCode?, resetCodeExpires? }`. **A API atualmente expõe hash de senha e códigos de reset nas respostas de usuário; o front não deve exibi-los nem persistí-los.**

| Método e rota | Acesso | Entrada | Regras |
|---|---|---|---|
| `GET /users?active=false` | Token | query opcional | Lista usuários, mais recentes primeiro. |
| `GET /users/:id` | Token | — | `400` se não encontrado. |
| `POST /users` | Público | `{ email, password, name, phone?, role? }` | E-mail único; senha 6+; `role` é enum. Retorna usuário criado. |
| `PUT /users/:id` | Token | mesmo body de criação | Body é integral na prática; senha é sempre re-hasheada. |
| `DELETE /users/:id` | Token | — | Soft delete: `active=false`. |
| `PUT /users/:id/password` | Token | `{ currentPassword, newPassword }` | Nova senha 6+; valida a atual. |
| `POST /users/forgot-password` | Público | `{ email }` | Gera e envia código por e-mail; expira em 15 min. |
| `POST /users/verify-code` | Público | `{ email, code }` | Código tem 6 caracteres; não o consome. |
| `POST /users/reset-password` | Público | `{ email, code, newPassword }` | Valida código e expiração, redefine senha e consome o código. |

## Clientes

`Client` completo possui também campos internos opcionais (`cpf`, endereço, nascimento etc.), mas os endpoints aceitam somente os campos abaixo.

| Método e rota | Acesso | Entrada | Retorno / regra |
|---|---|---|---|
| `GET /clients/:id?active=false` | Público | — | Retorna cliente ou `null` quando não encontrado/fora do filtro. |
| `POST /clients` | Público | `{ name, phone, email? }` | `name` obrigatório; `phone` com 10–11 dígitos e único; e-mail válido se presente. Retorna `{ id, name, phone, email?, createdAt }`. |
| `PATCH /clients/:id` | Público | `{ name, phone, email? }` | Todos os três são efetivamente obrigatórios pelo DTO; não verifica conflito de telefone antes de gravar. |
| `DELETE /clients/:id` | Público | — | Soft delete: `active=false` e limpa `reengagementSentAt`; resposta HTTP `204` sem body. |

## Profissionais, serviços e vínculo

| Método e rota | Acesso | Entrada | Retorno / regra |
|---|---|---|---|
| `GET /professionals?active=false` | Público | — | Profissionais com objeto `user` completo incluído; ordenação decrescente de criação. |
| `GET /professionals/:id?active=false` | Público | — | Inclui `user`. O filtro `active` é aceito mas não é aplicado na implementação. |
| `POST /professionals` | Token | `{ userId, specialty?, bio?, experience?, commission? }` | `userId` precisa existir e só pode ter um profissional. `experience` inteiro >=0; `commission` >=0. |
| `PUT /professionals/:id` | Token | mesmos campos, exceto `userId` não é atualizado | Atualiza campos enviados; 404 se não existir. |
| `DELETE /professionals/:id` | Token | — | Soft delete (`active=false`). |
| `GET /services?active=false` | Token | — | Lista serviços. |
| `GET /services/:id?active=false` | Token | — | 404 se não existir no filtro. |
| `POST /services` | Token | `{ name, price, description?, duration?, category?, image? }` | `price >= 0`; duração, se enviada, é inteiro >=1. Se omitida, backend grava `0`. |
| `PUT /services/:id` | Token | mesmo body | Embora alguns DTOs sejam opcionais, `name` e `price` são requeridos. |
| `DELETE /services/:id` | Token | — | Soft delete (`active=false`). |
| `GET /professional-services?professionalId=:id&active=false` | Token | queries opcionais | Retorna vínculo, `service` e `professional` incluídos. |
| `POST /professional-services` | Token | `{ professionalId, serviceId, customPrice?, customDuration?, active? }` | Ambos devem existir; par profissional/serviço é único; preço >=0; duração inteira >=1. |
| `PUT /professional-services/:professionalId/:serviceId` | Token | qualquer subconjunto do body acima | Atualiza vínculo existente. |
| `DELETE /professional-services/:professionalId/:serviceId` | Token | — | Soft delete do vínculo (`active=false`). |

Preço e duração usados no agendamento são `customPrice/customDuration` do vínculo quando existirem; caso contrário, são os dados do serviço.

## Agenda e slots

`dayOfWeek`: `0=domingo` até `6=sábado`. Horas devem estar em `HH:mm` de 00:00 a 23:59.

| Método e rota | Acesso | Entrada | Retorno / regra |
|---|---|---|---|
| `GET /schedules?professionalId=:id&active=false` | Token | queries opcionais | Agenda semanal/exceções, ordenada por dia e hora. |
| `GET /schedules/:id` | Token | — | 400 se não encontrado. |
| `POST /schedules` | Token | `{ professionalId, schedules: [{ dayOfWeek?, date?, startTime, endTime, breakStart?, breakEnd? }] }` | Exige pelo menos um item. Não valida se o profissional existe, sobreposição, intervalo ou pausa. `date` é exceção para data específica. |
| `PUT /schedules/:id` | Token | um `ScheduleItem` | `startTime` e `endTime` são obrigatórios mesmo na edição; outros campos preservam valor atual quando omitidos. |
| `DELETE /schedules/:id` | Token | — | Soft delete (`active=false`). |
| `GET /slots?professionalId=:id&date=YYYY-MM-DD` | Token | ambos obrigatórios na prática | Retorna somente disponíveis: `[{ id, startsAt }]`, ordenados. |
| `POST /slots` | Token | `{ professionalId, startsAt }` **ou** `{ professionalId, slots: [startsAt...] }` | `professionalId` UUID. Exige ao menos um dos horários e uma agenda ativa no mesmo dia (rotina semanal ou data específica). Horário duplicado gera 409. Lote retorna `{ created, skipped }` e não falha inteiro. |
| `DELETE /slots/:id` | Token | — | Remove só se estiver disponível; sucesso `204` sem body. |

Importante: a validação de slot verifica apenas se existe uma agenda no dia; ela **não** confere se `startsAt` está entre `startTime/endTime` nem respeita a pausa. O front deve aplicar essas regras de UX se necessário, mas deve sempre usar o `slotId` retornado por `GET /slots` no agendamento.

## Agendamentos

Resposta normalizada:

```json
{
  "id": "uuid",
  "scheduledAt": "2026-07-20T13:00:00.000Z",
  "duration": 30,
  "price": 50,
  "status": "PENDING",
  "notes": null,
  "cancelReason": null,
  "client": { "id": "uuid", "name": "...", "phone": "...", "email": "..." },
  "professional": { "id": "uuid", "name": "...", "email": "...", "phone": null },
  "service": { "id": "uuid", "name": "..." }
}
```

| Método e rota | Acesso | Entrada | Retorno / regra |
|---|---|---|---|
| `GET /appointments?status=PENDING` | Token | status opcional | Lista com o formato acima, mais recentes primeiro. Status não é validado no DTO. |
| `GET /appointments/:id` | Token | — | 404 se não encontrado. |
| `POST /appointments` | Token | `{ clientId, professionalId, serviceId, slotId, notes? }` | Todos os IDs exceto `notes` são obrigatórios; `slotId` UUID v4. Cliente deve existir **e ter e-mail**; profissional ativo; serviço deve estar ativo e vinculado/ativo para o profissional; slot precisa pertencer ao profissional e estar disponível. Cria sempre em `PENDING`, usa o horário do slot e o ocupa atomicamente. |
| `PUT /appointments/:id/cancel` | Token | `{ reason? }` (`reason` texto até 255) | Não permite cancelar duas vezes; exige e-mail do cliente e e-mail + telefone do profissional. Muda para `CANCELLED`, grava motivo e libera o slot. |

Não há endpoint implementado para confirmar, iniciar, concluir ou marcar falta de um agendamento; apesar de os status existirem, a API expõe apenas criação e cancelamento.

## Pagamentos

| Método e rota | Acesso | Entrada | Retorno / regra |
|---|---|---|---|
| `GET /payments?status=PAID` | Token | status opcional | Lista pagamentos com `appointment` incluído. |
| `GET /payments/:id` | Token | — | Inclui `appointment`; 400 se não existir. |
| `POST /payments` | Token | `{ appointmentId, method, discount?, notes? }` | Agendamento deve existir e não estar cancelado; só 1 pagamento por agendamento. `amount` vem do preço do agendamento; `discount >= 0`; `finalAmount = amount - discount` e não pode ser negativo; status inicial `PENDING`. |
| `PATCH /payments/:id/status` | Token | `{ status }` | Se `PAID`, preenche `paidAt`; se `REFUNDED`, `refundedAt`. Não há máquina de estados adicional. |
| `DELETE /payments/:id` | Token | — | Exclusão definitiva; erro Prisma se inexistente. |

## Avaliações, notificações e configurações

| Método e rota | Acesso | Entrada | Retorno / regra |
|---|---|---|---|
| `GET /reviews` | Token | — | Lista avaliações, mais recentes primeiro. |
| `POST /reviews` | Token | `{ appointmentId, rating, comment? }` | `appointmentId` UUID; nota inteira 1–5. Agendamento deve existir e estar `COMPLETED`; só uma avaliação por agendamento. Cliente e profissional são derivados do agendamento. |
| `PATCH /reviews/:id/response` | Token | `{ response }` | Texto obrigatório; grava `respondedAt`. ID inexistente gera erro Prisma não tratado. |
| `GET /notifications?status=SENT&type=EMAIL` | Token | queries opcionais | Lista notificações. |
| `GET /notifications/:id` | Token | — | 400 se não existir. |
| `POST /notifications` | Token | `{ recipient, type, subject?, message, appointmentId?, metadata? }` | `type` é enum; `appointmentId`, se presente, deve existir; `metadata` precisa ser objeto JSON. Cria como `PENDING`. |
| `PATCH /notifications/:id/status` | Token | `{ status, errorMessage? }` | Status enum. Preenche automaticamente `sentAt`, `deliveredAt` ou `readAt` conforme o novo status. |
| `GET /configurations` | Token | — | Lista configurações, mais recentes primeiro. |
| `POST /configurations` | Token | `{ key, value, description?, type?, category? }` | `key` única; `value` string (inclusive para números/bools serializados). |
| `PUT /configurations/:key` | Token | mesmo body | Atualiza pelo `key` da rota; body também exige `key`, e pode tentar alterar a chave. |

## Fluxos recomendados para o front

1. **Área pública de reserva:** buscar profissionais ativos → buscar serviços/vínculos do profissional → buscar slots disponíveis por data → criar cliente (se necessário) → criar agendamento com `slotId`.
2. **Login administrativo:** `POST /auth/login`; anexar access token em todas as chamadas privadas; renovar com refresh quando necessário.
3. **Cadastro de agenda:** criar profissional a partir de um `User` já criado → criar horários semanais em `/schedules` → gerar slots explícitos em `/slots`. A agenda não gera slots automaticamente.
4. **Pós-atendimento:** a avaliação só ficará possível quando algum processo interno alterar o agendamento para `COMPLETED`; esse endpoint não existe hoje.

## Pontos a alinhar antes de integrar em produção

- Clientes e vários dados cadastrais são públicos: `POST/PATCH/DELETE /clients` e `GET /clients/:id` não pedem JWT.
- `POST /users` também é público e aceita `role`, inclusive `ADMIN`; isso é crítico se a API estiver exposta.
- Não há escopo de permissão por perfil, nem uso do usuário do JWT ao criar agendamento (`createdById` nunca é preenchido pelo controller).
- A CORS atual bloqueia um front hospedado fora de `localhost:3001`.
- O Swagger em `/api` ajuda na exploração, mas parte dos schemas/respostas não está anotada de forma completa; este documento reflete a implementação.
