import { useEffect, useState } from 'react';
import { Eye, EyeOff, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settingsStore';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  {
    key: 'anthropic',
    name: 'Anthropic (Claude)',
    envKey: 'anthropic_api_key',
    placeholder: 'sk-ant-api03-…',
    docUrl: 'https://console.anthropic.com/settings/keys',
    models: ['Claude Opus 4', 'Claude Sonnet 4.6', 'Claude Haiku 4.5'],
    description: '最强的长上下文理解，200K tokens，推荐用于正式写作',
  },
  {
    key: 'openai',
    name: 'OpenAI (GPT)',
    envKey: 'openai_api_key',
    placeholder: 'sk-…',
    docUrl: 'https://platform.openai.com/api-keys',
    models: ['GPT-4o', 'GPT-4o Mini', 'GPT-4 Turbo'],
    description: '稳定可靠，128K tokens，支持中文写作',
  },
  {
    key: 'deepseek',
    name: 'DeepSeek (国产)',
    envKey: 'deepseek_api_key',
    placeholder: 'sk-…',
    docUrl: 'https://platform.deepseek.com/api_keys',
    models: ['DeepSeek Chat (V3)', 'DeepSeek Reasoner (R1)'],
    description: '国内大模型，价格实惠，中文表达自然流畅',
  },
];

export default function SettingsPage() {
  const { settings, configuredProviders, loadSettings, loadModels, updateSetting } = useSettingsStore();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
    loadModels();
  }, []);

  const handleSave = async (envKey: string) => {
    const value = keys[envKey]?.trim();
    if (!value) { toast.error('请填写 API Key'); return; }
    setSaving({ ...saving, [envKey]: true });
    try {
      await updateSetting(envKey, value);
      setKeys({ ...keys, [envKey]: '' });
      toast.success('API Key 已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving({ ...saving, [envKey]: false });
    }
  };

  const handleClear = async (envKey: string) => {
    if (!confirm('确认清除此 API Key？')) return;
    try {
      await updateSetting(envKey, '');
      toast.success('已清除');
    } catch {
      toast.error('操作失败');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">设置</h1>
          <p className="text-muted-foreground text-sm mt-1">配置 AI 模型接入，开始智能写作</p>
        </div>

        {/* API Keys section */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">API Key 配置</h2>

          {PROVIDERS.map((provider) => {
            const isConfigured = configuredProviders.includes(provider.key);
            const maskedValue = settings[provider.envKey];

            return (
              <div
                key={provider.key}
                className={cn(
                  'rounded-xl border p-5 flex flex-col gap-4 transition-colors',
                  isConfigured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card'
                )}
              >
                {/* Provider header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {isConfigured ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{provider.name}</h3>
                        {isConfigured && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                            已配置
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                    </div>
                  </div>
                  <a
                    href={provider.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                  >
                    获取 Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Models */}
                <div className="flex flex-wrap gap-1.5">
                  {provider.models.map((m) => (
                    <span key={m} className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                      {m}
                    </span>
                  ))}
                </div>

                {/* Current key */}
                {isConfigured && maskedValue && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <span className="text-xs text-muted-foreground font-mono flex-1">{maskedValue}</span>
                    <button
                      onClick={() => handleClear(provider.envKey)}
                      className="text-xs text-destructive hover:underline"
                    >
                      清除
                    </button>
                  </div>
                )}

                {/* Input new key */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={show[provider.envKey] ? 'text' : 'password'}
                      value={keys[provider.envKey] || ''}
                      onChange={(e) => setKeys({ ...keys, [provider.envKey]: e.target.value })}
                      placeholder={isConfigured ? '输入新 Key 以替换' : provider.placeholder}
                      className="pr-9 font-mono text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(provider.envKey)}
                    />
                    <button
                      type="button"
                      onClick={() => setShow({ ...show, [provider.envKey]: !show[provider.envKey] })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {show[provider.envKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={() => handleSave(provider.envKey)}
                    disabled={saving[provider.envKey]}
                    size="sm"
                    className="shrink-0 h-9"
                  >
                    {saving[provider.envKey] ? '保存中…' : '保存'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy notice */}
        <div className="mt-6 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
          <p className="text-xs text-muted-foreground leading-relaxed">
            🔒 <strong className="text-foreground">隐私说明：</strong>
            API Key 仅存储在本地数据库中，不会上传至任何第三方服务器。
            所有 AI 请求直接从你的浏览器发往对应的 AI 服务商。
          </p>
        </div>
      </div>
    </div>
  );
}
