export interface Project {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  _count?: { chapters: number; knowledgeItems: number; foreshadowings: number };
}

export interface KnowledgeItem {
  id: string;
  projectId: string;
  type: 'outline' | 'worldbuilding' | 'character' | 'style' | 'restriction';
  title: string;
  content: string;
  itemOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  number: number;
  title: string;
  summary?: string;
  content?: string;
  status: 'draft' | 'generated' | 'edited' | 'final';
  wordCount: number;
  targetWordCount?: number;
  notes?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  versions?: ChapterVersion[];
}

export interface ChapterVersion {
  id: string;
  chapterId: string;
  content: string;
  note?: string;
  createdAt: string;
}

export interface Foreshadowing {
  id: string;
  projectId: string;
  title: string;
  description: string;
  plantedAt: string;
  resolvedAt?: string;
  status: 'open' | 'resolved' | 'dropped';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  projectId: string;
  chapterId?: string;
  content: string;
  category?: string;
  applied: boolean;
  createdAt: string;
}

export interface ContextSummary {
  id: string;
  projectId: string;
  summary: string;
  fromChapter: number;
  toChapter: number;
  createdAt: string;
}

export interface ModelInfo {
  id: string;
  provider: 'anthropic' | 'openai' | 'deepseek';
  label: string;
  contextWindow: number;
  available: boolean;
}

export type KnowledgeType = KnowledgeItem['type'];

export const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeType, string> = {
  outline: '大纲规划',
  worldbuilding: '世界观',
  character: '人物设定',
  style: '风格参考',
  restriction: '写作禁忌',
};

export const KNOWLEDGE_TYPE_DESCRIPTIONS: Record<KnowledgeType, string> = {
  outline: '总大纲、分卷大纲、章节规划',
  worldbuilding: '地理、历史、规则体系、势力',
  character: '角色性格、外貌、背景、关系',
  style: '对话、心理、场景描写参考例文',
  restriction: '禁止出现的内容、写法、词汇',
};
