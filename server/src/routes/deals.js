import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// 1. LISTAR TODOS OS NEGÓCIOS
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
      ];
    }
    const deals = await prisma.deal.findMany({
      where,
      orderBy: [{ stage: 'asc' }, { orderIndex: 'asc' }],
    });
    res.json(deals);
  } catch (err) {
    console.error("❌ ERRO AO BUSCAR NEGÓCIOS:", err);
    res.status(500).json({ error: "Erro interno no servidor", details: String(err) });
  }
});

// 2. CRIAR NOVO NEGÓCIO
router.post('/', async (req, res) => {
  try {
    const data = req.body;
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

// 3. REORDENAR (DRAG & DROP) - Esta era a peça que faltava!
router.post('/reorder', async (req, res) => {
  try {
    const { id, newStage, newIndex } = req.body;
    console.log(`🔄 Movendo Card ${id} para ${newStage} na posição ${newIndex}`);

    const updated = await prisma.deal.update({
      where: { id: Number(id) },
      data: {
        stage: newStage,
        orderIndex: newIndex
      }
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ ERRO AO REORDENAR:", err);
    res.status(500).json({ error: "Erro ao reordenar", details: String(err) });
  }
});

// 4. ATUALIZAR DADOS DO CARD (MODAL DE EDIÇÃO)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.deal.update({
      where: { id: Number(id) },
      data
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ ERRO AO ATUALIZAR:", err);
    res.status(500).json({ error: "Erro ao atualizar" });
  }
});

// 5. EXCLUIR NEGÓCIO
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.deal.delete({
      where: { id: Number(id) }
    });
    res.status(204).send();
  } catch (err) {
    console.error("❌ ERRO AO EXCLUIR:", err);
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

export default router;