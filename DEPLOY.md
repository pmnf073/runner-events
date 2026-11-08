# Deploy RunnerEvents

## Stack
- **Frontend:** Vercel (React/Vite)
- **Backend:** Render (Express/Node)
- **Database:** Neon (PostgreSQL)

## 1. Database — Neon (Free, 500MB)

1. Criar conta em https://neon.tech
2. Criar projeto "runner-events"
3. Copiar connection string (ex: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/runner_events`)
4. Definir como `DATABASE_URL` no Render + no `.env` do backend

## 2. Backend — Render (Free, 750h/mes)

1. Criar conta em https://render.com
2. New Web Service → conectar ao repo GitHub
3. Configurar:
   - **Build Command:** `npm install && ./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/prisma generate`
     (gera o cliente Prisma e aplica as migracoes pendentes; se uma migracao falhar, o deploy e cancelado e a versao anterior continua no ar)
   - **Start Command:** `cd backend && npm start`
   - **Root Directory:** `backend` (se Render suportar)
   - **Node Version:** 20+
4. **Environment Variables:**
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/runner_events?sslmode=require
   JWT_SECRET=<gera-um-segredo-aleatorio>
   FRONTEND_URL=https://runner-events.vercel.app
   FRONTEND_PREVIEW_ORIGINS=https://runner-events-*-<scope-vercel>.vercel.app   # opcional: previews do Vercel
   NODE_ENV=production
   PORT=3001
   TEAMUP_ICS_FEED=https://ics.teamup.com/feed/<id>/0.ics   # opcional: sincronizacao horaria
   ```
   Sem `JWT_SECRET` o backend recusa arrancar em producao.

   **Email e recibos (opcional, mas necessario para recuperar password, lembretes e comunicacoes):**
   ```
   RESEND_API_KEY=re_...                                   # conta em https://resend.com
   EMAIL_FROM=Alverca Urban Runners <geral@dominio-do-clube.pt>   # dominio verificado no Resend
   CLUB_NAME=Alverca Urban Runners                         # nome nos emails e nos recibos
   CLUB_NIF=123456789                                      # NIF do clube no recibo (opcional)
   CLUB_ADDRESS=Rua ..., 2615-... Alverca do Ribatejo      # morada no recibo (opcional)
   ```
   - Sem `RESEND_API_KEY`/`EMAIL_FROM` nada e enviado: os emails ficam so no log do backend e a pagina
     de Comunicacoes avisa que o envio nao esta configurado.
   - Os links nos emails usam `FRONTEND_URL`, por isso tem de ser o endereco publico do site.
   - Com o email configurado, o backend envia de hora a hora: aviso de quota a vencer (7 dias antes),
     aviso de quota em atraso (so quotas vencidas nos ultimos 60 dias, para nao avisar dividas antigas
     de uma vez) e lembrete na vespera dos eventos a que o socio respondeu "Vou". Cada aviso e enviado
     uma vez (tabela `NotificationLog`). Quem desativar os emails no perfil nao recebe lembretes nem
     comunicacoes. Com o plano free a dormir, os avisos saem quando o servico acordar.

   **Notificacoes push (opcional, app Android e browsers):**
   ```
   VAPID_PUBLIC_KEY=B...        # gerar uma vez: npx web-push generate-vapid-keys (dentro de backend/)
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=https://www.alvercaurbanrunners.pt   # ou mailto:...; contacto para os servicos de push
   ```
   - Sem as chaves, o perfil nao mostra a seccao Notificacoes e nada e enviado.
   - Nao mudar as chaves depois de haver subscricoes: as existentes deixam de funcionar e cada pessoa
     tem de voltar a ativar no perfil.
   - Envia: novo evento (criado no site ou na sincronizacao do TeamUp; mais de 3 de uma vez viram um
     resumo), lembrete aos socios no dia do treino a partir das 9h (so a quem ainda nao respondeu ao
     RSVP) e lembrete ao staff para marcar presencas, de 15 min antes a 1 h depois do inicio. Os
     lembretes correm de 10 em 10 minutos, por isso com o plano free so sao fiaveis com o workflow
     keepalive ativo (variavel `BACKEND_URL` no GitHub).
   - O recibo em PDF e um comprovativo interno; nao substitui uma fatura-recibo certificada pela AT.
5. **Migracoes:** aplicadas automaticamente pelo Build Command em cada deploy.
6. Seedar admin: `SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node prisma/seed.mjs`
   (ou definir as duas variaveis no ambiente do Render / no `.env`)

7. **Plano free adormece:** sem pedidos durante ~15 minutos o servico para; o pedido seguinte demora
   30-60 s e a sincronizacao horaria do TeamUp nao corre enquanto esta parado. O workflow
   `.github/workflows/keepalive.yml` chama `/api/health` a cada 10 minutos: para o ativar, criar a
   variavel de repositorio `BACKEND_URL` (GitHub → Settings → Secrets and variables → Actions → Variables).
   Notas: um servico sempre acordado gasta ~744 h/mes das 750 h gratuitas da conta Render; o GitHub
   pode atrasar execucoes agendadas e desativa-as em repositorios sem atividade durante 60 dias.
   Alternativa: um plano pago no Render.

## 3. Frontend — Vercel (Free, ilimitado)

1. Criar conta em https://vercel.com
2. Import repo → set **Root Directory**: `frontend`
3. **Environment Variables:**
   ```
   VITE_API_URL=https://runner-events-api.onrender.com
   ```
4. Deploy automatico com push a `main`
5. **Previews:** cada PR recebe um URL de preview. Para o preview falar com a API, marcar `VITE_API_URL`
   tambem para o ambiente **Preview** no Vercel e definir `FRONTEND_PREVIEW_ORIGINS` no Render
   (o `*` corresponde a parte variavel do URL). O preview usa o backend e a base de dados de producao.

## 4. Local Dev

### Backend
```bash
cd backend
cp .env.example .env   # editar com DATABASE_URL e JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
npm test               # testes unitarios (node --test)
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 5. Git Cleanup
```bash
git rm -r --cached backend/node_modules/
git add .
git commit -m "cleanup: remove node_modules from tracking"
```
