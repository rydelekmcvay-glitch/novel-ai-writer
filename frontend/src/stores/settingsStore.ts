import { create } from 'zustand';
import { settingsApi } from '../api/client';
import type { ModelInfo } from '../types';

interface SettingsState {
  hasApiKey: boolean;
  configuredProviders: string[];
  models: ModelInfo[];
  selectedModelId: string;
  settings: Record<string, string>;
  loading: boolean;

  loadSettings: () => Promise<void>;
  loadModels: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  setSelectedModel: (modelId: string) => void;
  checkApiKey: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hasApiKey: false,
  configuredProviders: [],
  models: [],
  selectedModelId: 'claude-sonnet-4-6',
  settings: {},
  loading: false,

  loadSettings: async () => {
    set({ loading: true });
    try {
      const [settings, check] = await Promise.all([
        settingsApi.getAll(),
        settingsApi.check(),
      ]);
      set({
        settings,
        hasApiKey: check.hasApiKey,
        configuredProviders: check.providers,
      });
    } finally {
      set({ loading: false });
    }
  },

  loadModels: async () => {
    try {
      const models = await settingsApi.getModels();
      set({ models });
      // Auto-select first available model
      const { selectedModelId } = get();
      const current = models.find((m) => m.id === selectedModelId);
      if (!current?.available) {
        const first = models.find((m) => m.available);
        if (first) set({ selectedModelId: first.id });
      }
    } catch {
      // ignore
    }
  },

  updateSetting: async (key, value) => {
    await settingsApi.update(key, value);
    await get().loadSettings();
    await get().loadModels();
  },

  setSelectedModel: (modelId) => set({ selectedModelId: modelId }),

  checkApiKey: async () => {
    const check = await settingsApi.check();
    set({ hasApiKey: check.hasApiKey, configuredProviders: check.providers });
  },
}));
