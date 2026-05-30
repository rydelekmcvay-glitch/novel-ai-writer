import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/:projectId/foreshadowing', async (req, res) => {
  try {
    const items = await prisma.foreshadowing.findMany({
      where: { projectId: req.params.projectId },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    });
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Failed to load foreshadowing' });
  }
});

router.post('/:projectId/foreshadowing', async (req, res) => {
  const { title, description, plantedAt, priority } = req.body as {
    title: string;
    description: string;
    plantedAt: string;
    priority?: string;
  };
  if (!title?.trim() || !description?.trim() || !plantedAt?.trim()) {
    return res.status(400).json({ error: 'title, description, plantedAt are required' });
  }
  try {
    const item = await prisma.foreshadowing.create({
      data: {
        projectId: req.params.projectId,
        title: title.trim(),
        description: description.trim(),
        plantedAt: plantedAt.trim(),
        priority: priority || 'medium',
      },
    });
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: 'Failed to create foreshadowing' });
  }
});

router.put('/:projectId/foreshadowing/:id', async (req, res) => {
  const { title, description, plantedAt, resolvedAt, status, priority } = req.body as {
    title?: string;
    description?: string;
    plantedAt?: string;
    resolvedAt?: string;
    status?: string;
    priority?: string;
  };
  try {
    const item = await prisma.foreshadowing.update({
      where: { id: req.params.id },
      data: { title, description, plantedAt, resolvedAt, status, priority },
    });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to update foreshadowing' });
  }
});

router.delete('/:projectId/foreshadowing/:id', async (req, res) => {
  try {
    await prisma.foreshadowing.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete foreshadowing' });
  }
});

export { router as foreshadowingRouter };
