import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { streamGenerate, AVAILABLE_MODELS, ModelConfig, generateSummary } from '../services/ai';
import { buildGenerationContext, shouldAutoSummarize } from '../services/context';
import { getApiKey } from './settings';

const router = Router();
const prisma = new PrismaClient();

router.post('/stream', async (req: Request, res: Response) => {
  const { projectId, chapterNumber, chapterSummary, modelId, targetWordCount, chapterNotes } = req.body as {
    projectId: string;
    chapterNumber: number;
    chapterSummary: string;
    modelId: string;
    targetWordCount?: number;
    chapterNotes?: string;
  };

  if (!projectId || !chapterNumber || !chapterSummary || !modelId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const modelMeta = AVAILABLE_MODELS[modelId];
  if (!modelMeta) {
    return res.status(400).json({ error: 'Invalid model' });
  }

  const apiKey = await getApiKey(modelMeta.provider);
  if (!apiKey) {
    return res.status(400).json({
      error: `No API key configured for ${modelMeta.provider}. Please configure it in Settings.`,
    });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const ctx = await buildGenerationContext(
      projectId,
      chapterNumber,
      chapterSummary,
      modelMeta.contextWindow,
      targetWordCount,
      chapterNotes
    );

    // Warn client about context usage
    sendEvent({
      type: 'context_info',
      estimatedTokens: ctx.estimatedTokens,
      contextWindowPct: ctx.contextWindowPct,
      warningLevel: ctx.warningLevel,
    });

    if (ctx.warningLevel === 'critical') {
      sendEvent({
        type: 'warning',
        message:
          '上下文已接近极限（>90%），建议在本章完成后立即执行历史摘要压缩，以保证后续章节的写作质量。',
      });
    }

    const modelConfig: ModelConfig = {
      provider: modelMeta.provider,
      model: modelId,
      apiKey,
      maxTokens: 4000,
    };

    let fullContent = '';

    for await (const token of streamGenerate(ctx.systemPrompt, ctx.userMessage, modelConfig)) {
      fullContent += token;
      sendEvent({ type: 'token', content: token });
    }

    sendEvent({ type: 'done', totalChars: fullContent.length });

    // Check if auto-summarize is needed
    const autoSum = await shouldAutoSummarize(projectId, modelMeta.contextWindow);
    if (autoSum.needed) {
      sendEvent({
        type: 'auto_summarize_suggestion',
        fromChapter: autoSum.fromChapter,
        toChapter: autoSum.toChapter,
        message: `历史内容已较多，建议将第${autoSum.fromChapter}章至第${autoSum.toChapter}章压缩为摘要，以保持上下文清晰。`,
      });
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    sendEvent({ type: 'error', message });
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Summarize chapters and save as ContextSummary
router.post('/summarize', async (req: Request, res: Response) => {
  const { projectId, fromChapter, toChapter, modelId } = req.body as {
    projectId: string;
    fromChapter: number;
    toChapter: number;
    modelId: string;
  };

  if (!projectId || !fromChapter || !toChapter || !modelId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const modelMeta = AVAILABLE_MODELS[modelId];
  if (!modelMeta) return res.status(400).json({ error: 'Invalid model' });

  const apiKey = await getApiKey(modelMeta.provider);
  if (!apiKey) return res.status(400).json({ error: 'No API key configured' });

  try {
    const chapters = await prisma.chapter.findMany({
      where: {
        projectId,
        number: { gte: fromChapter, lte: toChapter },
        content: { not: null },
      },
      orderBy: { number: 'asc' },
    });

    const combinedContent = chapters
      .map((c) => `第${c.number}章《${c.title}》\n${c.content}`)
      .join('\n\n---\n\n');

    const modelConfig: ModelConfig = {
      provider: modelMeta.provider,
      model: modelId,
      apiKey,
      maxTokens: 800,
    };

    const summary = await generateSummary(combinedContent, modelConfig);

    await prisma.contextSummary.create({
      data: { projectId, summary, fromChapter, toChapter },
    });

    res.json({ success: true, summary });
  } catch {
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get context preview (tokens estimate without generating)
router.post('/context-preview', async (req: Request, res: Response) => {
  const { projectId, chapterNumber, chapterSummary, modelId } = req.body as {
    projectId: string;
    chapterNumber: number;
    chapterSummary: string;
    modelId: string;
  };

  const modelMeta = AVAILABLE_MODELS[modelId];
  if (!modelMeta) return res.status(400).json({ error: 'Invalid model' });

  try {
    const ctx = await buildGenerationContext(
      projectId,
      chapterNumber,
      chapterSummary || '（细纲待填写）',
      modelMeta.contextWindow
    );
    res.json({
      estimatedTokens: ctx.estimatedTokens,
      contextWindowPct: ctx.contextWindowPct,
      warningLevel: ctx.warningLevel,
      contextWindow: modelMeta.contextWindow,
    });
  } catch {
    res.status(500).json({ error: 'Failed to preview context' });
  }
});

// Context verification: return full system prompt for user inspection
router.post('/context-verify', async (req: Request, res: Response) => {
  const { projectId, chapterNumber, chapterSummary, modelId, targetWordCount, chapterNotes } = req.body as {
    projectId: string;
    chapterNumber: number;
    chapterSummary: string;
    modelId: string;
    targetWordCount?: number;
    chapterNotes?: string;
  };

  const modelMeta = AVAILABLE_MODELS[modelId];
  if (!modelMeta) return res.status(400).json({ error: 'Invalid model' });

  try {
    const ctx = await buildGenerationContext(
      projectId,
      chapterNumber,
      chapterSummary || '（细纲待填写）',
      modelMeta.contextWindow,
      targetWordCount,
      chapterNotes
    );
    res.json({
      systemPrompt: ctx.systemPrompt,
      userMessage: ctx.userMessage,
      estimatedTokens: ctx.estimatedTokens,
      contextWindowPct: ctx.contextWindowPct,
      warningLevel: ctx.warningLevel,
      contextWindow: modelMeta.contextWindow,
    });
  } catch {
    res.status(500).json({ error: 'Failed to build context' });
  }
});

export { router as generateRouter };
