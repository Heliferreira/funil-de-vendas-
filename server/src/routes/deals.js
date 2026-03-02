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
        { email: { contains: q, mode: 'insensitive' } }, // Busca também por e-mail
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

// 2. CRIAR NOVO NEGÓCIO (UNITÁRIO)
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    
    // Busca o último index da coluna para manter a ordem
    const maxIndex = await prisma.deal.aggregate({
      where: { stage: data.stage },
      _max: { orderIndex: true }
    });
    const orderIndex = (maxIndex._max.orderIndex ?? -1) + 1;

    // Criando com conversão de valor para número
    const created = await prisma.deal.create({
      data: { 
        ...data, 
        value: parseFloat(data.value) || 0, // Resolve o problema do R$ 0,00
        orderIndex 
      }
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("❌ ERRO AO CRIAR NEGÓCIOS:", err.message);
    res.status(500).json({ error: "Erro ao salvar", details: err.message });
  }
});

// 3. IMPORTAÇÃO EM MASSA (BULK)
router.post('/bulk', async (req, res) => {
  try {
    const { deals } = req.body;

    if (!deals || !Array.isArray(deals)) {
      return res.status(400).json({ error: "Dados inválidos para importação" });
    }

    const maxIndex = await prisma.deal.aggregate({
      where: { stage: 'LEAD' },
      _max: { orderIndex: true }
    });
    
    let currentOrder = (maxIndex._max.orderIndex ?? -1) + 1;

    // Ajuste crucial: Converte valores de texto para número durante a importação
    const dealsWithOrder = deals.map((deal) => ({
      ...deal,
      value: parseFloat(deal.value) || 0, // Garante que os leads importados apareçam no gráfico
      orderIndex: currentOrder++
    }));

    const result = await prisma.deal.createMany({
      data: dealsWithOrder,
      skipDuplicates: true
    });

    console.log(`✅ ${result.count} leads importados com sucesso!`);
    res.status(201).json(result);
  } catch (err) {
    console.error("❌ ERRO NA IMPORTAÇÃO EM MASSA:", err.message);
    res.status(500).json({ error: "Falha ao importar dados", details: err.message });
  }
});

// 4. ATUALIZAR DADOS (EDITAR)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const updated = await prisma.deal.update({
      where: { id: String(id) },
      data: {
        ...data,
        value: data.value ? parseFloat(data.value) : 0 // Garante número na edição
      }
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ ERRO AO ATUALIZAR:", err.message);
    res.status(500).json({ error: "Erro ao atualizar", details: err.message });
  }
});

// 5. REORDENAR (DRAG & DROP)
router.post('/reorder', async (req, res) => {
  try {
    const { destinationStage, orderedIds } = req.body;

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
    res.json({ message: "Ordem atualizada" });
  } catch (err) {
    console.error("❌ ERRO AO REORDENAR:", err.message);
    res.status(500).json({ error: "Falha ao reordenar", details: err.message });
  }
});

// 6. EXCLUIR NEGÓCIO
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.deal.delete({
      where: { id: String(id) }
    });
    res.status(204).send();
  } catch (err) {
    console.error("❌ ERRO AO EXCLUIR:", err.message);
    res.status(500).json({ error: "Erro ao excluir", details: err.message });
  }
});

export default router;