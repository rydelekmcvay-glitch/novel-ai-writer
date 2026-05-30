import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/:projectId/feedback', async (req, res) => {
  try {
    const feedback = await prisma.feedback.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(feedback);
  } catch {
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

router.post('/:projectId/feedback', async (req, res) => {
  const { content, chapterId, category } = req.body as {
    content: string;
    chapterId?: string;
    category?: string;
  };
  if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

  try {
    const item = await prisma.feedback.create({
      data: {
        projectId: req.params.projectId,
        content: content.trim(),
        chapterId,
        category,
      },
    });
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

router.put('/:projectId/feedback/:id', async (req, res) => {
  const { applied } = req.body as { applied: boolean };
  try {
    const item = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { applied },
    });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

router.delete('/:projectId/feedback/:id', async (req, res) => {
  try {
    await prisma.feedback.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export { router as feedbackRouter };
