import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AVAILABLE_MODELS } from '../services/ai';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  try {
    const settings = await prisma.settings.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      if (s.key.includes('api_key') && s.value?.length > 8) {
        result[s.key] = s.value.substring(0, 6) + '••••••••' + s.value.slice(-4);
      } else {
        result[s.key] = s.value;
      }
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

router.put('/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body as { value: string };
  if (value === undefined) {
    return res.status(400).json({ error: 'value is required' });
  }
  try {
    await prisma.settings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

router.get('/check', async (_req, res) => {
  try {
    const keys = await prisma.settings.findMany({
      where: { key: { contains: 'api_key' } },
    });
    const configured = keys
      .filter((k) => k.value && k.value.length > 10)
      .map((k) => k.key.replace('_api_key', ''));
    res.json({ hasApiKey: configured.length > 0, providers: configured });
  } catch {
    res.status(500).json({ error: 'Failed to check settings' });
  }
});

router.get('/models', async (_req, res) => {
  try {
    const keys = await prisma.settings.findMany({
      where: { key: { contains: 'api_key' } },
    });
    const configuredProviders = new Set(
      keys
        .filter((k) => k.value?.length > 10)
        .map((k) => k.key.replace('_api_key', ''))
    );

    const models = Object.entries(AVAILABLE_MODELS).map(([id, meta]) => ({
      id,
      ...meta,
      available: configuredProviders.has(meta.provider),
    }));
    res.json(models);
  } catch {
    res.status(500).json({ error: 'Failed to load models' });
  }
});

// Get raw API key for generation use (internal use)
export async function getApiKey(provider: string): Promise<string | null> {
  const setting = await prisma.settings.findUnique({
    where: { key: `${provider}_api_key` },
  });
  return setting?.value || null;
}

export { router as settingsRouter };
