import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Listar todos (com filtros opcionais)
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
    res.status(500).json({ error: String(err) });
  }
});

// Criar
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    // Obtém o maior orderIndex do estágio para jogar no fim
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
    res.status(500).json({ error: String(err) });
  }
});

// Atualizar
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.deal.update({
      where: { id },
      data,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Deletar
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.deal.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Reordenar e mover via DnD (múltiplas atualizações)
router.post('/reorder', async (req, res) => {
  try {
    const { sourceStage, destinationStage, orderedIds } = req.body;
    // orderedIds: array de IDs na ordem final da coluna de destino
    // Se mudou de coluna, atualiza o stage de todos para o destino
    const updates = [];
    for (let i = 0; i < orderedIds.length; i++) {
      updates.push(prisma.deal.update({
        where: { id: orderedIds[i] },
        data: {
          stage: destinationStage,
          orderIndex: i
        }
      }));
    }
    await prisma.$transaction(updates);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
