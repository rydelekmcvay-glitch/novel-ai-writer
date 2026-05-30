import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const VALID_TYPES = ['outline', 'worldbuilding', 'character', 'style', 'restriction'];

router.get('/:projectId/knowledge', async (req, res) => {
  try {
    const items = await prisma.knowledgeItem.findMany({
      where: { projectId: req.params.projectId },
      orderBy: [{ type: 'asc' }, { itemOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Failed to load knowledge items' });
  }
});

router.post('/:projectId/knowledge', async (req, res) => {
  const { type, title, content, itemOrder } = req.body as {
    type: string;
    title: string;
    content: string;
    itemOrder?: number;
  };
  if (!VALID_TYPES.includes(type))
    return res.status(400).json({ error: 'Invalid type' });
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  try {
    const item = await prisma.knowledgeItem.create({
      data: {
        projectId: req.params.projectId,
        type,
        title: title.trim(),
        content: content || '',
        itemOrder: itemOrder || 0,
      },
    });
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: 'Failed to create knowledge item' });
  }
});

router.put('/:projectId/knowledge/:id', async (req, res) => {
  const { title, content, itemOrder } = req.body as {
    title?: string;
    content?: string;
    itemOrder?: number;
  };
  try {
    const item = await prisma.knowledgeItem.update({
      where: { id: req.params.id },
      data: { title, content, itemOrder },
    });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to update knowledge item' });
  }
});

router.delete('/:projectId/knowledge/:id', async (req, res) => {
  try {
    await prisma.knowledgeItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete knowledge item' });
  }
});

export { router as knowledgeRouter };
