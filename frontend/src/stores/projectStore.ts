import { create } from 'zustand';
import {
  projectsApi,
  knowledgeApi,
  chaptersApi,
  foreshadowingApi,
  feedbackApi,
} from '../api/client';
import type { Project, KnowledgeItem, Chapter, Foreshadowing, Feedback } from '../types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  knowledge: KnowledgeItem[];
  chapters: Chapter[];
  currentChapter: Chapter | null;
  foreshadowings: Foreshadowing[];
  feedbacks: Feedback[];
  loadingProjects: boolean;
  loadingData: boolean;

  // Projects
  loadProjects: () => Promise<void>;
  createProject: (data: { title: string; description?: string; genre?: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;

  // Project data
  loadProjectData: (projectId: string) => Promise<void>;

  // Knowledge
  createKnowledge: (projectId: string, data: Omit<KnowledgeItem, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateKnowledge: (projectId: string, id: string, data: Partial<KnowledgeItem>) => Promise<void>;
  deleteKnowledge: (projectId: string, id: string) => Promise<void>;

  // Chapters
  createChapter: (projectId: string, data: { number: number; title: string; summary?: string; targetWordCount?: number; notes?: string }) => Promise<Chapter>;
  updateChapter: (projectId: string, id: string, data: Partial<Chapter>) => Promise<void>;
  deleteChapter: (projectId: string, id: string) => Promise<void>;
  setCurrentChapter: (chapter: Chapter | null) => void;
  loadChapterFull: (projectId: string, id: string) => Promise<void>;

  // Foreshadowing
  createForeshadowing: (projectId: string, data: Omit<Foreshadowing, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateForeshadowing: (projectId: string, id: string, data: Partial<Foreshadowing>) => Promise<void>;
  deleteForeshadowing: (projectId: string, id: string) => Promise<void>;

  // Feedback
  createFeedback: (projectId: string, data: { content: string; chapterId?: string; category?: string }) => Promise<void>;
  markFeedbackApplied: (projectId: string, id: string, applied: boolean) => Promise<void>;
  deleteFeedback: (projectId: string, id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  knowledge: [],
  chapters: [],
  currentChapter: null,
  foreshadowings: [],
  feedbacks: [],
  loadingProjects: false,
  loadingData: false,

  loadProjects: async () => {
    set({ loadingProjects: true });
    try {
      const projects = await projectsApi.list();
      set({ projects });
    } finally {
      set({ loadingProjects: false });
    }
  },

  createProject: async (data) => {
    const project = await projectsApi.create(data);
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  updateProject: async (id, data) => {
    const updated = await projectsApi.update(id, data);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? updated : p)),
      currentProject: s.currentProject?.id === id ? updated : s.currentProject,
    }));
  },

  deleteProject: async (id) => {
    await projectsApi.delete(id);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProject: s.currentProject?.id === id ? null : s.currentProject,
    }));
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  loadProjectData: async (projectId) => {
    set({ loadingData: true });
    try {
      const [knowledge, chapters, foreshadowings, feedbacks] = await Promise.all([
        knowledgeApi.list(projectId),
        chaptersApi.list(projectId),
        foreshadowingApi.list(projectId),
        feedbackApi.list(projectId),
      ]);
      set({ knowledge, chapters, foreshadowings, feedbacks });
    } finally {
      set({ loadingData: false });
    }
  },

  createKnowledge: async (projectId, data) => {
    const item = await knowledgeApi.create(projectId, data);
    set((s) => ({ knowledge: [...s.knowledge, item] }));
  },

  updateKnowledge: async (projectId, id, data) => {
    const item = await knowledgeApi.update(projectId, id, data);
    set((s) => ({
      knowledge: s.knowledge.map((k) => (k.id === id ? item : k)),
    }));
  },

  deleteKnowledge: async (projectId, id) => {
    await knowledgeApi.delete(projectId, id);
    set((s) => ({ knowledge: s.knowledge.filter((k) => k.id !== id) }));
  },

  createChapter: async (projectId, data) => {
    const chapter = await chaptersApi.create(projectId, data);
    set((s) => ({
      chapters: [...s.chapters, chapter].sort((a, b) => a.number - b.number),
    }));
    return chapter;
  },

  updateChapter: async (projectId, id, data) => {
    const chapter = await chaptersApi.update(projectId, id, data);
    set((s) => ({
      chapters: s.chapters.map((c) => (c.id === id ? chapter : c)),
      currentChapter: s.currentChapter?.id === id ? chapter : s.currentChapter,
    }));
  },

  deleteChapter: async (projectId, id) => {
    await chaptersApi.delete(projectId, id);
    set((s) => ({
      chapters: s.chapters.filter((c) => c.id !== id),
      currentChapter: s.currentChapter?.id === id ? null : s.currentChapter,
    }));
  },

  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),

  loadChapterFull: async (projectId, id) => {
    const chapter = await chaptersApi.get(projectId, id);
    set({ currentChapter: chapter });
    set((s) => ({
      chapters: s.chapters.map((c) => (c.id === id ? chapter : c)),
    }));
  },

  createForeshadowing: async (projectId, data) => {
    const item = await foreshadowingApi.create(projectId, data);
    set((s) => ({ foreshadowings: [...s.foreshadowings, item] }));
  },

  updateForeshadowing: async (projectId, id, data) => {
    const item = await foreshadowingApi.update(projectId, id, data);
    set((s) => ({
      foreshadowings: s.foreshadowings.map((f) => (f.id === id ? item : f)),
    }));
  },

  deleteForeshadowing: async (projectId, id) => {
    await foreshadowingApi.delete(projectId, id);
    set((s) => ({
      foreshadowings: s.foreshadowings.filter((f) => f.id !== id),
    }));
  },

  createFeedback: async (projectId, data) => {
    const item = await feedbackApi.create(projectId, data);
    set((s) => ({ feedbacks: [item, ...s.feedbacks] }));
  },

  markFeedbackApplied: async (projectId, id, applied) => {
    const item = await feedbackApi.markApplied(projectId, id, applied);
    set((s) => ({
      feedbacks: s.feedbacks.map((f) => (f.id === id ? item : f)),
    }));
  },

  deleteFeedback: async (projectId, id) => {
    await feedbackApi.delete(projectId, id);
    set((s) => ({ feedbacks: s.feedbacks.filter((f) => f.id !== id) }));
  },
}));
