import type { Project, KnowledgeItem, Chapter, Foreshadowing, Feedback, ModelInfo } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Settings
export const settingsApi = {
  getAll: () => request<Record<string, string>>('/settings'),
  update: (key: string, value: string) =>
    request<{ success: boolean }>(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  check: () => request<{ hasApiKey: boolean; providers: string[] }>('/settings/check'),
  getModels: () => request<ModelInfo[]>('/settings/models'),
};

// Projects
export const projectsApi = {
  list: () => request<Project[]>('/projects'),
  create: (data: { title: string; description?: string; genre?: string }) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<Project>(`/projects/${id}`),
  update: (id: string, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
};

// Knowledge
export const knowledgeApi = {
  list: (projectId: string) => request<KnowledgeItem[]>(`/projects/${projectId}/knowledge`),
  create: (projectId: string, data: Omit<KnowledgeItem, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) =>
    request<KnowledgeItem>(`/projects/${projectId}/knowledge`, { method: 'POST', body: JSON.stringify(data) }),
  update: (projectId: string, id: string, data: Partial<KnowledgeItem>) =>
    request<KnowledgeItem>(`/projects/${projectId}/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (projectId: string, id: string) =>
    request<{ success: boolean }>(`/projects/${projectId}/knowledge/${id}`, { method: 'DELETE' }),
};

// Chapters
export const chaptersApi = {
  list: (projectId: string) => request<Chapter[]>(`/projects/${projectId}/chapters`),
  listDeleted: (projectId: string) =>
    request<Chapter[]>(`/projects/${projectId}/chapters/deleted`),
  create: (projectId: string, data: { number: number; title: string; summary?: string; targetWordCount?: number; notes?: string }) =>
    request<Chapter>(`/projects/${projectId}/chapters`, { method: 'POST', body: JSON.stringify(data) }),
  get: (projectId: string, id: string) => request<Chapter>(`/projects/${projectId}/chapters/${id}`),
  update: (projectId: string, id: string, data: Partial<Chapter>) =>
    request<Chapter>(`/projects/${projectId}/chapters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (projectId: string, id: string) =>
    request<{ success: boolean }>(`/projects/${projectId}/chapters/${id}`, { method: 'DELETE' }),
  restore: (projectId: string, id: string) =>
    request<Chapter>(`/projects/${projectId}/chapters/${id}/restore`, { method: 'POST' }),
  permanentDelete: (projectId: string, id: string) =>
    request<{ success: boolean }>(`/projects/${projectId}/chapters/${id}/permanent`, { method: 'DELETE' }),
  getVersions: (projectId: string, id: string) =>
    request<{ id: string; content: string; createdAt: string }[]>(`/projects/${projectId}/chapters/${id}/versions`),
  restoreVersion: (projectId: string, id: string, versionId: string) =>
    request<Chapter>(`/projects/${projectId}/chapters/${id}/restore/${versionId}`, { method: 'POST' }),
};

// Foreshadowing
export const foreshadowingApi = {
  list: (projectId: string) => request<Foreshadowing[]>(`/projects/${projectId}/foreshadowing`),
  create: (projectId: string, data: Omit<Foreshadowing, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) =>
    request<Foreshadowing>(`/projects/${projectId}/foreshadowing`, { method: 'POST', body: JSON.stringify(data) }),
  update: (projectId: string, id: string, data: Partial<Foreshadowing>) =>
    request<Foreshadowing>(`/projects/${projectId}/foreshadowing/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (projectId: string, id: string) =>
    request<{ success: boolean }>(`/projects/${projectId}/foreshadowing/${id}`, { method: 'DELETE' }),
};

// Feedback
export const feedbackApi = {
  list: (projectId: string) => request<Feedback[]>(`/projects/${projectId}/feedback`),
  create: (projectId: string, data: { content: string; chapterId?: string; category?: string }) =>
    request<Feedback>(`/projects/${projectId}/feedback`, { method: 'POST', body: JSON.stringify(data) }),
  markApplied: (projectId: string, id: string, applied: boolean) =>
    request<Feedback>(`/projects/${projectId}/feedback/${id}`, { method: 'PUT', body: JSON.stringify({ applied }) }),
  delete: (projectId: string, id: string) =>
    request<{ success: boolean }>(`/projects/${projectId}/feedback/${id}`, { method: 'DELETE' }),
};

// Generation
export const generateApi = {
  stream: (data: {
    projectId: string; chapterNumber: number; chapterSummary: string;
    modelId: string; targetWordCount?: number; chapterNotes?: string;
  }) =>
    fetch(`${BASE}/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  summarize: (data: { projectId: string; fromChapter: number; toChapter: number; modelId: string }) =>
    request<{ success: boolean; summary: string }>('/generate/summarize', { method: 'POST', body: JSON.stringify(data) }),

  contextPreview: (data: { projectId: string; chapterNumber: number; chapterSummary: string; modelId: string }) =>
    request<{ estimatedTokens: number; contextWindowPct: number; warningLevel: 'ok' | 'warn' | 'critical'; contextWindow: number }>(
      '/generate/context-preview', { method: 'POST', body: JSON.stringify(data) }
    ),

  contextVerify: (data: {
    projectId: string; chapterNumber: number; chapterSummary: string;
    modelId: string; targetWordCount?: number; chapterNotes?: string;
  }) =>
    request<{
      systemPrompt: string; userMessage: string; estimatedTokens: number;
      contextWindowPct: number; warningLevel: string; contextWindow: number;
    }>('/generate/context-verify', { method: 'POST', body: JSON.stringify(data) }),
};
