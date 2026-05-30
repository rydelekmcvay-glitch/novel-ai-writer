import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { chapters: true, knowledgeItems: true } },
      },
    });
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

router.post('/', async (req, res) => {
  const { title, description, genre } = req.body as {
    title: string;
    description?: string;
    genre?: string;
  };
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  try {
    const project = await prisma.project.create({
      data: { title: title.trim(), description, genre },
    });
    res.status(201).json(project);
  } catch {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { chapters: true, knowledgeItems: true, foreshadowings: true },
        },
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to load project' });
  }
});

router.put('/:id', async (req, res) => {
  const { title, description, genre, status } = req.body as {
    title?: string;
    description?: string;
    genre?: string;
    status?: string;
  };
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { title, description, genre, status },
    });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export { router as projectsRouter };
