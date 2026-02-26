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
    const { destinationStage, orderedIds } = req.body;

    console.log(`📦 Reordenando coluna: ${destinationStage}`);
    console.log(`🔢 Nova ordem de IDs:`, orderedIds);

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "Lista de IDs inválida" });
    }

    // O Prisma atualiza cada card da lista com sua nova posição (index)
    const updates = orderedIds.map((id, index) => {
      return prisma.deal.update({
        where: { id: Number(id) },
        data: { 
          stage: destinationStage, 
          orderIndex: index 
        }
      });
    });

    await Promise.all(updates);

    console.log("✅ Coluna reordenada com sucesso!");
    res.json({ message: "Ordem atualizada" });
  } catch (err) {
    console.error("❌ ERRO AO REORDENAR:", err.message);
    res.status(500).json({ error: "Falha no banco de dados", details: err.message });
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