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

// Teste de conexão com o banco ao iniciar
async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Conectado ao banco de dados com sucesso!");
  } catch (err) {
    console.error("❌ ERRO CRÍTICO: Não foi possível conectar ao banco:", err);
  }
}
testConnection();

// === AJUSTE NO CORS PARA LIBERAR O FRONT-END ===
// Substitua o app.use(cors()) antigo por este:
app.use(cors({
  origin: true, // Permite qualquer origem que solicite
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan('dev'));

// DESATIVA CACHE
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
    res.json({ ok: true, message: "Banco operacional" });
  } catch (err) {
    console.error("🚨 Erro no Healthcheck:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ROTAS DA API
app.use('/deals', (req, res, next) => {
  console.log(`📡 Requisição recebida: ${req.method} ${req.url}`);
  next();
}, dealsRouter);

// servir frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.join(__dirname, '../../client/dist');

app.use(express.static(staticDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Servidor voando na porta ${PORT}`));