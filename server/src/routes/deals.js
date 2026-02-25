import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Listar todos
router.get('/', async (req, res) => {
  try {
    const { stage, priority, q } = req.query;
    const where = {};
    if (stage) where.stage = stage;
    if (priority) where.priority = priority;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { contact: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }
    const deals = await prisma.deal.findMany({
      where,
      orderBy: [{ stage: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(deals);
  } catch (err) {
    console.error("❌ ERRO AO BUSCAR NEGÓCIOS:", err); // Log crucial para a Render
    res.status(500).json({ error: "Erro interno no servidor", details: String(err) });
  }
});

// Criar
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log("📥 Recebendo novo negócio:", data);

    const maxIndex = await prisma.deal.aggregate({
      where: { stage: data.stage },
      _max: { orderIndex: true }
    });
    const orderIndex = (maxIndex._max.orderIndex ?? -1) + 1;
    const created = await prisma.deal.create({
      data: { ...data, orderIndex }
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("❌ ERRO AO CRIAR NEGÓCIO:", err);
    res.status(500).json({ error: "Erro ao salvar", details: String(err) });
  }
});

// Os demais métodos (PUT, DELETE, REORDER) seguem a mesma lógica de console.error...
// Adicione console.error(err) em todos os catch abaixo para não trabalhar no escuro!

export default router;