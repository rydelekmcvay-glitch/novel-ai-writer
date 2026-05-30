import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// List active chapters (not deleted)
router.get('/:projectId/chapters', async (req, res) => {
  try {
    const chapters = await prisma.chapter.findMany({
      where: { projectId: req.params.projectId, deletedAt: null },
      orderBy: { number: 'asc' },
      select: {
        id: true, number: true, title: true, summary: true,
        status: true, wordCount: true, targetWordCount: true,
        notes: true, createdAt: true, updatedAt: true,
      },
    });
    res.json(chapters);
  } catch {
    res.status(500).json({ error: 'Failed to load chapters' });
  }
});

// List deleted chapters (recycle bin)
router.get('/:projectId/chapters/deleted', async (req, res) => {
  try {
    // Auto-clean chapters deleted more than 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.chapter.deleteMany({
      where: {
        projectId: req.params.projectId,
        deletedAt: { not: null, lt: sevenDaysAgo },
      },
    });

    const chapters = await prisma.chapter.findMany({
      where: { projectId: req.params.projectId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true, number: true, title: true, status: true,
        wordCount: true, deletedAt: true,
      },
    });
    res.json(chapters);
  } catch {
    res.status(500).json({ error: 'Failed to load recycle bin' });
  }
});

router.post('/:projectId/chapters', async (req, res) => {
  const { number, title, summary, targetWordCount, notes } = req.body as {
    number: number; title: string; summary?: string;
    targetWordCount?: number; notes?: string;
  };
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  try {
    const chapter = await prisma.chapter.create({
      data: {
        projectId: req.params.projectId,
        number: number || 1,
        title: title.trim(),
        summary: summary || '',
        targetWordCount: targetWordCount || null,
        notes: notes || null,
      },
    });
    res.status(201).json(chapter);
  } catch {
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

router.get('/:projectId/chapters/:id', async (req, res) => {
  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: req.params.id },
      include: { versions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    res.json(chapter);
  } catch {
    res.status(500).json({ error: 'Failed to load chapter' });
  }
});

router.put('/:projectId/chapters/:id', async (req, res) => {
  const { title, summary, content, status, targetWordCount, notes } = req.body as {
    title?: string; summary?: string; content?: string; status?: string;
    targetWordCount?: number; notes?: string;
  };
  try {
    if (content !== undefined) {
      const existing = await prisma.chapter.findUnique({
        where: { id: req.params.id }, select: { content: true },
      });
      if (existing?.content && existing.content !== content) {
        await prisma.chapterVersion.create({
          data: { chapterId: req.params.id, content: existing.content },
        });
      }
    }

    const wordCount = content
      ? content.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length
      : undefined;

    const chapter = await prisma.chapter.update({
      where: { id: req.params.id },
      data: {
        title, summary, content, status,
        targetWordCount: targetWordCount === undefined ? undefined : (targetWordCount || null),
        notes: notes === undefined ? undefined : (notes || null),
        ...(wordCount !== undefined && { wordCount }),
      },
    });
    res.json(chapter);
  } catch {
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// Soft delete → move to recycle bin
router.delete('/:projectId/chapters/:id', async (req, res) => {
  try {
    await prisma.chapter.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// Restore from recycle bin
router.post('/:projectId/chapters/:id/restore', async (req, res) => {
  try {
    const chapter = await prisma.chapter.update({
      where: { id: req.params.id },
      data: { deletedAt: null },
    });
    res.json(chapter);
  } catch {
    res.status(500).json({ error: 'Failed to restore chapter' });
  }
});

// Permanent delete
router.delete('/:projectId/chapters/:id/permanent', async (req, res) => {
  try {
    await prisma.chapter.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to permanently delete chapter' });
  }
});

// Version history
router.get('/:projectId/chapters/:id/versions', async (req, res) => {
  try {
    const versions = await prisma.chapterVersion.findMany({
      where: { chapterId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(versions);
  } catch {
    res.status(500).json({ error: 'Failed to load versions' });
  }
});

router.post('/:projectId/chapters/:id/restore/:versionId', async (req, res) => {
  try {
    const version = await prisma.chapterVersion.findUnique({
      where: { id: req.params.versionId },
    });
    if (!version) return res.status(404).json({ error: 'Version not found' });
    const chapter = await prisma.chapter.update({
      where: { id: req.params.id },
      data: { content: version.content },
    });
    res.json(chapter);
  } catch {
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

export { router as chaptersRouter };
