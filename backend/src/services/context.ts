import { PrismaClient } from '@prisma/client';
import { estimateTokens } from './ai';

const prisma = new PrismaClient();

export interface GenerationContext {
  systemPrompt: string;
  userMessage: string;
  estimatedTokens: number;
  contextWindowPct: number;
  warningLevel: 'ok' | 'warn' | 'critical';
}

export interface GenerationContextInput {
  projectId: string;
  chapterNumber: number;
  chapterSummary: string;
  targetWordCount?: number;
  chapterNotes?: string;
  modelContextWindow: number;
}

export async function buildGenerationContext(
  projectId: string,
  chapterNumber: number,
  chapterSummary: string,
  modelContextWindow: number,
  targetWordCount?: number,
  chapterNotes?: string
): Promise<GenerationContext> {
  const [knowledgeItems, recentChapters, summaries, foreshadowings, feedbacks] =
    await Promise.all([
      prisma.knowledgeItem.findMany({
        where: { projectId },
        orderBy: [{ type: 'asc' }, { itemOrder: 'asc' }],
      }),
      prisma.chapter.findMany({
        where: {
          projectId,
          number: { lt: chapterNumber },
          content: { not: null },
        },
        orderBy: { number: 'desc' },
        take: 3,
      }),
      prisma.contextSummary.findMany({
        where: { projectId },
        orderBy: { toChapter: 'desc' },
        take: 3,
      }),
      prisma.foreshadowing.findMany({
        where: { projectId, status: 'open' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      }),
      prisma.feedback.findMany({
        where: { projectId, applied: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

  const byType = (type: string) =>
    knowledgeItems
      .filter((k) => k.type === type)
      .map((k) => `【${k.title}】\n${k.content}`)
      .join('\n\n');

  const outline = byType('outline');
  const worldbuilding = byType('worldbuilding');
  const character = byType('character');
  const style = byType('style');
  const restriction = byType('restriction');

  const priorityLabel: Record<string, string> = {
    high: '★重要',
    medium: '◎中等',
    low: '○次要',
  };

  const foreshadowingSection =
    foreshadowings.length > 0
      ? `\n═══════════════════════════════════════
【当前未回收伏笔（写作时必须注意，切勿遗忘）】
${foreshadowings
  .map(
    (f, i) =>
      `${i + 1}. [${priorityLabel[f.priority] || f.priority}] ${f.title}：${f.description}（埋设于：${f.plantedAt}）`
  )
  .join('\n')}`
      : '';

  const feedbackSection =
    feedbacks.length > 0
      ? `\n═══════════════════════════════════════
【读者反馈与改进要求（请在后续写作中体现）】
${feedbacks.map((f, i) => `${i + 1}. [${f.category || '通用'}] ${f.content}`).join('\n')}`
      : '';

  const systemPrompt = `你是一位专业的长篇小说写作助手，具备深厚的文学功底。你需要严格依据以下资料库进行正文写作，保持风格高度一致、情节逻辑严密、伏笔有序布置与回收。

═══════════════════════════════════════
【总大纲与章节规划】
${outline || '（未设置，请先在资料库中添加大纲）'}

═══════════════════════════════════════
【世界观背景】
${worldbuilding || '（未设置）'}

═══════════════════════════════════════
【人物设定】
${character || '（未设置）'}

═══════════════════════════════════════
【写作风格参考（请严格模仿以下文风）】
${style || '（未设置）'}

═══════════════════════════════════════
【写作禁忌与硬性要求】
${restriction || '（未设置）'}
${foreshadowingSection}
${feedbackSection}

═══════════════════════════════════════
【核心写作准则】
1. 严格遵守所有人物设定，角色的言行必须符合其性格特征
2. 对话要自然流畅，体现角色性格差异
3. 心理描写细腻，展现人物内心世界
4. 场景描写生动具体，增强沉浸感
5. 节奏把控得当，张弛有度
6. 直接输出正文内容，不加任何说明、标注或提示`;

  const summarySection =
    summaries.length > 0
      ? `【历史前情提要（已压缩存档）】
${summaries
  .sort((a, b) => a.fromChapter - b.fromChapter)
  .map((s) => `第${s.fromChapter}章—第${s.toChapter}章摘要：\n${s.summary}`)
  .join('\n\n')}

`
      : '';

  const recentSection =
    recentChapters.length > 0
      ? `【近期章节内容（直接上下文）】
${recentChapters
  .reverse()
  .map(
    (c) =>
      `第${c.number}章《${c.title}》\n${c.content?.substring(0, 1000) || ''}${(c.content?.length || 0) > 1000 ? '...' : ''}`
  )
  .join('\n\n')}

`
      : '';

  const wordCountInstruction = targetWordCount
    ? `目标字数：${targetWordCount} 字（中文字符数，请严格控制在目标字数的 ±15% 范围内）`
    : '字数：请根据细纲丰富程度自行把握，通常 1500-3000 字';

  const notesSection = chapterNotes
    ? `本章特别要求：\n${chapterNotes}\n`
    : '';

  const userMessage = `${summarySection}${recentSection}【当前写作任务】
请根据以上全部资料，写作第${chapterNumber}章正文。

本章细纲：
${chapterSummary}

${notesSection}${wordCountInstruction}

请直接开始输出正文，不需要章节标题，不需要任何前言或说明：`;

  const estimatedTokens = estimateTokens(systemPrompt + userMessage);
  const pct = Math.round((estimatedTokens / modelContextWindow) * 100);
  const warningLevel: GenerationContext['warningLevel'] =
    pct >= 90 ? 'critical' : pct >= 70 ? 'warn' : 'ok';

  return {
    systemPrompt,
    userMessage,
    estimatedTokens,
    contextWindowPct: pct,
    warningLevel,
  };
}

export async function shouldAutoSummarize(
  projectId: string,
  modelContextWindow: number
): Promise<{ needed: boolean; fromChapter: number; toChapter: number }> {
  const chapters = await prisma.chapter.findMany({
    where: { projectId, content: { not: null } },
    orderBy: { number: 'asc' },
  });

  if (chapters.length < 5) return { needed: false, fromChapter: 0, toChapter: 0 };

  const totalTokens = chapters.reduce(
    (sum, c) => sum + estimateTokens(c.content || ''),
    0
  );

  if (totalTokens > modelContextWindow * 0.6) {
    const midIdx = Math.floor(chapters.length * 0.4);
    return {
      needed: true,
      fromChapter: chapters[0].number,
      toChapter: chapters[midIdx].number,
    };
  }

  return { needed: false, fromChapter: 0, toChapter: 0 };
}
