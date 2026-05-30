import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Square, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { generateApi } from '@/api/client';
import { useSettingsStore } from '@/stores/settingsStore';
import { useProjectStore } from '@/stores/projectStore';
import { KNOWLEDGE_TYPE_LABELS } from '@/types';
import type { Chapter, KnowledgeType } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const REQUIRED_TYPES: KnowledgeType[] = ['outline', 'worldbuilding', 'character'];

interface GenerationPanelProps {
  projectId: string;
  chapter: Chapter;
  onGenerated: (content: string) => void;
  onStreamStart: () => void;
  onStreamToken: (token: string) => void;
  onStreamEnd: () => void;
  isStreaming: boolean;
  onSummaryChange?: (v: string) => void;
  onTargetWordCountChange?: (v: number | undefined) => void;
  onNotesChange?: (v: string) => void;
}

interface ContextInfo {
  estimatedTokens: number;
  contextWindowPct: number;
  warningLevel: 'ok' | 'warn' | 'critical';
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
};

const DEFAULT_WORD_COUNTS = [1000, 1500, 2000, 3000, 5000];

export default function GenerationPanel({
  projectId, chapter, onGenerated, onStreamStart, onStreamToken, onStreamEnd,
  isStreaming, onSummaryChange, onTargetWordCountChange, onNotesChange,
}: GenerationPanelProps) {
  const { models, selectedModelId, setSelectedModel } = useSettingsStore();
  const [summary, setSummary] = useState(chapter.summary || '');
  const [targetWordCount, setTargetWordCount] = useState<string>(
    chapter.targetWordCount ? String(chapter.targetWordCount) : ''
  );
  const [notes, setNotes] = useState(chapter.notes || '');
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check required knowledge items
  const { knowledge } = useProjectStore();
  const missingRequired = REQUIRED_TYPES.filter(
    (t) => !knowledge.some((k) => k.type === t && k.content.trim())
  );

  // Reset when chapter changes
  useEffect(() => {
    setSummary(chapter.summary || '');
    setTargetWordCount(chapter.targetWordCount ? String(chapter.targetWordCount) : '');
    setNotes(chapter.notes || '');
  }, [chapter.id]);

  // Propagate changes up
  useEffect(() => { onSummaryChange?.(summary); }, [summary]);
  useEffect(() => {
    const n = parseInt(targetWordCount);
    onTargetWordCountChange?.(isNaN(n) ? undefined : n);
  }, [targetWordCount]);
  useEffect(() => { onNotesChange?.(notes); }, [notes]);

  const availableModels = models.filter((m) => m.available);

  const getTargetWordCountNum = () => {
    const n = parseInt(targetWordCount);
    return isNaN(n) ? undefined : n;
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedModelId) { toast.error('请先选择模型'); return; }
    if (missingRequired.length > 0) {
      toast.error(`请先在资料库中填写：${missingRequired.map(t => KNOWLEDGE_TYPE_LABELS[t]).join('、')}`, { duration: 4000 });
      return;
    }
    if (!summary.trim()) { toast.error('请先填写本章细纲'); return; }

    abortRef.current = new AbortController();
    onStreamStart();
    let fullContent = '';

    try {
      const response = await generateApi.stream({
        projectId,
        chapterNumber: chapter.number,
        chapterSummary: summary,
        modelId: selectedModelId,
        targetWordCount: getTargetWordCountNum(),
        chapterNotes: notes || undefined,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '生成失败');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const event = JSON.parse(data);
            if (event.type === 'token') {
              fullContent += event.content;
              onStreamToken(event.content);
            } else if (event.type === 'context_info') {
              setContextInfo({
                estimatedTokens: event.estimatedTokens,
                contextWindowPct: event.contextWindowPct,
                warningLevel: event.warningLevel,
              });
            } else if (event.type === 'warning') {
              toast(event.message, { icon: '⚠️', duration: 6000 });
            } else if (event.type === 'auto_summarize_suggestion') {
              toast(event.message, { icon: '📦', duration: 8000 });
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch {
            // skip malformed events
          }
        }
      }

      onStreamEnd();
      onGenerated(fullContent);
      toast.success('生成完成');
    } catch (err: unknown) {
      onStreamEnd();
      const msg = err instanceof Error ? err.message : '生成失败';
      if (msg !== 'AbortError') toast.error(msg);
    }
  }, [projectId, chapter, summary, notes, targetWordCount, selectedModelId,
      onStreamStart, onStreamToken, onStreamEnd, onGenerated]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    onStreamEnd();
    toast('已停止生成', { icon: '⏹' });
  }, [onStreamEnd]);

  const groupedModels = availableModels.reduce<Record<string, typeof availableModels>>(
    (acc, m) => {
      const g = PROVIDER_LABELS[m.provider] || m.provider;
      if (!acc[g]) acc[g] = [];
      acc[g].push(m);
      return acc;
    }, {}
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Model selector */}
      <Select value={selectedModelId} onValueChange={setSelectedModel} disabled={isStreaming}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedModels).map(([group, ms]) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {ms.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          {availableModels.length === 0 && (
            <SelectItem value="_none" disabled>无可用模型（请先配置 API Key）</SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Chapter summary */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">本章细纲 *</label>
        <Textarea
          value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder="填写本章要发生的情节要点、关键场景、人物行动…"
          className="text-sm resize-none" rows={4} disabled={isStreaming}
        />
      </div>

      {/* Target word count */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">目标字数</label>
        <Input
          type="number" value={targetWordCount}
          onChange={(e) => setTargetWordCount(e.target.value)}
          placeholder="如：3000（不填则AI自行把握）"
          className="h-8 text-xs" disabled={isStreaming}
        />
        <div className="flex flex-wrap gap-1 mt-1.5">
          {DEFAULT_WORD_COUNTS.map((n) => (
            <button key={n} type="button"
              onClick={() => setTargetWordCount(String(n))}
              disabled={isStreaming}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded border transition-colors',
                targetWordCount === String(n)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              )}>
              {n >= 10000 ? `${n / 10000}万` : n}
            </button>
          ))}
        </div>
      </div>

      {/* Extra notes */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">本章特殊要求</label>
        <Textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="AI写作时的附加指令，如：多写内心独白、节奏要缓慢、结尾设置悬念…"
          className="text-xs resize-none" rows={2} disabled={isStreaming}
        />
      </div>

      {/* Context info */}
      {contextInfo && (
        <div className={cn(
          'flex flex-col gap-1 p-2.5 rounded-lg text-xs',
          contextInfo.warningLevel === 'critical' && 'bg-red-500/10 border border-red-500/30',
          contextInfo.warningLevel === 'warn' && 'bg-amber-500/10 border border-amber-500/30',
          contextInfo.warningLevel === 'ok' && 'bg-zinc-800/50 border border-zinc-700/50'
        )}>
          <div className="flex items-center gap-1.5">
            {contextInfo.warningLevel === 'ok'
              ? <Info className="w-3 h-3 text-zinc-400" />
              : <AlertTriangle className={cn('w-3 h-3', contextInfo.warningLevel === 'critical' ? 'text-red-400' : 'text-amber-400')} />}
            <span className={cn(
              contextInfo.warningLevel === 'critical' && 'text-red-300',
              contextInfo.warningLevel === 'warn' && 'text-amber-300',
              contextInfo.warningLevel === 'ok' && 'text-zinc-400'
            )}>
              上下文 {contextInfo.contextWindowPct}%（{contextInfo.estimatedTokens.toLocaleString()} tokens）
            </span>
          </div>
          <Progress value={contextInfo.contextWindowPct} className={cn(
            'h-1',
            contextInfo.warningLevel === 'critical' && '[&>div]:bg-red-400',
            contextInfo.warningLevel === 'warn' && '[&>div]:bg-amber-400'
          )} />
        </div>
      )}

      {/* Required knowledge check */}
      {missingRequired.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/8 p-3 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-300">资料库未填写完整，无法生成</p>
              <p className="text-[11px] text-amber-400/80 mt-0.5 leading-relaxed">
                正文写作需要以下内容作为依据，缺失将导致 AI 无法把握故事方向：
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {missingRequired.map((t) => (
              <div key={t} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-xs text-amber-200 flex-1">
                  {KNOWLEDGE_TYPE_LABELS[t]}
                  <span className="text-amber-500 ml-1">（未填写）</span>
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              // Navigate to knowledge tab via custom event
              window.dispatchEvent(new CustomEvent('switch-to-knowledge'));
            }}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
          >
            前往资料库填写 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Generate button */}
      {!isStreaming ? (
        <Button
          onClick={handleGenerate}
          disabled={!availableModels.length || missingRequired.length > 0}
          className={cn('gap-2 h-9', missingRequired.length > 0 && 'opacity-40 cursor-not-allowed')}
        >
          <Sparkles className="w-4 h-4" /> 生成正文
        </Button>
      ) : (
        <Button variant="outline" onClick={handleStop} className="gap-2 h-9 border-zinc-600">
          <Square className="w-4 h-4" /> 停止生成
        </Button>
      )}
    </div>
  );
}
