# Funnel App – Funil de Vendas (Intermediário, uso pessoal)

Aplicação completa (frontend + backend) para gerenciar funil de vendas com estágios **Lead → Qualificado → Proposta → Negociação → Fechado**, com **drag & drop**, **CRUD**, **filtros**, **selos de prioridade**, **contadores e somatórios**, **dashboard com gráfico** e **seed de dados**.

## Stack
- **Frontend**: React (Vite) + Tailwind CSS + @hello-pangea/dnd + Chart.js
- **Backend**: Node.js + Express + Prisma
- **Banco**: PostgreSQL
- Deploy sugerido: **Render** (backend) e **Vercel/Netlify** (frontend) — ou ambos no Render.

---

## Como rodar localmente

### 1) Backend
1. Crie um banco Postgres local ou use um em nuvem (Render/Supabase/etc.).
2. Copie `server/.env.example` para `server/.env` e ajuste a variável `DATABASE_URL`.
3. No diretório `server/`:
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run seed   # opcional: cria dados de exemplo
   npm run dev
   ```

### 2) Frontend
No diretório `client/`:
```bash
npm install
npm run dev
```
Abra o endereço indicado (geralmente `http://localhost:5173`).

> O frontend usa a variável `VITE_API_BASE_URL` definida no arquivo `client/.env.example`. Copie para `client/.env` e ajuste se necessário (por padrão, aponta para `http://localhost:4000`).

---

## Deploy no Render (resumo)
- Suba este repositório no GitHub.
- Crie um **Render PostgreSQL** (free) e copie a `External Database URL` para a `DATABASE_URL` do backend.
- Crie um **Web Service** para `server/` com:
  - **Build Command:** `npm install && npx prisma generate && npm run build && npx prisma migrate deploy`
  - **Start Command:** `npm start`
- Configure a variável de ambiente `DATABASE_URL` no Render.
- (Opcional) Execute `npm run seed` no Shell do Render para inserir exemplos.
- Crie outro **Static Site** no Render (ou Vercel/Netlify) apontando para `client/`:
  - **Build Command:** `npm install && npm run build`
  - **Publish Directory:** `dist`
  - Configure `VITE_API_BASE_URL` com a URL do backend no Render.

---

## Estrutura
```
funnel-app/
  client/       # React + Tailwind + DnD + Chart.js
  server/       # Express + Prisma + PostgreSQL
```

Bom proveito! 🚀

---

## 🔹 Usando apenas o servidor (tudo em http://localhost:4000)
1. Rode o build do React:
   ```bash
   cd client
   npm run build
   ```
   Isso cria `client/dist/`.
2. No diretório `server/`:
   ```bash
   npm run dev
   ```
3. Agora abra http://localhost:4000 e você verá o frontend React servido pelo Express.

