import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import dealsRouter from './routes/deals.js';

import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// middlewares básicos
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// DESATIVA CACHE (evita 304 e tela branca)
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// healthcheck
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ROTAS DA API sempre ANTES do React
app.use('/api/deals', dealsRouter);

// servir frontend (React build)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.join(__dirname, '../../client/dist');

app.use(express.static(staticDir, {
  etag: false,
  lastModified: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  }
}));

// catch-all para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// 404 de segurança para qualquer coisa não capturada (em teoria nunca chega aqui)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// >>> MUITO IMPORTANTE: manter o servidor ouvindo
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
