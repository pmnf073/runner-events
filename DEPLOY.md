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
   ```
5. **Migracoes:** aplicadas automaticamente pelo Build Command em cada deploy.
6. Seedar admin: `SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node prisma/seed.mjs`
   (ou definir as duas variaveis no ambiente do Render / no `.env`)

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
cp .env.example .env   # editar com DATABASE_URL local
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
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
