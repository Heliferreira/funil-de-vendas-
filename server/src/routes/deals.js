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
    console.error("❌ ERRO AO BUSCAR NEGÓCIOS:", err.message);
    res.status(500).json({ error: "Erro interno no servidor", details: err.message });
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
    console.error("❌ ERRO AO CRIAR NEGÓCIO:", err.message);
    res.status(500).json({ error: "Erro ao salvar", details: err.message });
  }
});

// 3. REORDENAR (DRAG & DROP)
router.post('/reorder', async (req, res) => {
  try {
    const { destinationStage, orderedIds } = req.body;

    console.log(`📦 Reordenando coluna: ${destinationStage}`);

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "Lista de IDs inválida" });
    }

    // Atualiza cada card usando ID como STRING
    const updates = orderedIds.map((id, index) => {
      return prisma.deal.update({
        where: { id: String(id) },
        data: { 
          stage: destinationStage, 
          orderIndex: index 
        }
      });
    });

    await Promise.all(updates);

    console.log("✅ Coluna reordenada com sucesso no banco!");
    res.json({ message: "Ordem atualizada" });
  } catch (err) {
    console.error("❌ ERRO NO PRISMA AO REORDENAR:", err.message);
    res.status(500).json({ error: "Falha no banco de dados", details: err.message });
  }
});

// 4. ATUALIZAR DADOS DO CARD (MODAL DE EDIÇÃO)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const updated = await prisma.deal.update({
      where: { id: String(id) }, // Corrigido para String
      data
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ ERRO AO ATUALIZAR:", err.message);
    res.status(500).json({ error: "Erro ao atualizar", details: err.message });
  }
});

// 5. EXCLUIR NEGÓCIO
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.deal.delete({
      where: { id: String(id) } // Corrigido para String
    });
    res.status(204).send();
  } catch (err) {
    console.error("❌ ERRO AO EXCLUIR:", err.message);
    res.status(500).json({ error: "Erro ao excluir", details: err.message });
  }
});

export default router;