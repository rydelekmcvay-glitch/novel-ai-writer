import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, ChevronRight, BookText, Library, GitBranch,
  Copy, Save, CheckCheck, Layers, Trash2, RotateCcw, Eye,
  X, AlertTriangle, Trash, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import NovelEditor from '@/components/editor/NovelEditor';
import GenerationPanel from '@/components/editor/GenerationPanel';
import KnowledgeEditor from '@/components/editor/KnowledgeEditor';
import ForeshadowingPanel from '@/components/editor/ForeshadowingPanel';
import FeedbackPanel from '@/components/editor/FeedbackPanel';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { projectsApi, chaptersApi, generateApi } from '@/api/client';
import type { Chapter } from '@/types';
import { formatWordCount, formatDateTime, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿', generated: '已生成', edited: '已编辑', final: '终稿',
};

const DEFAULT_WORD_COUNTS = [1000, 1500, 2000, 3000, 5000];

export default function ProjectPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentProject, chapters, currentChapter,
    loadProjectData, setCurrentProject, setCurrentChapter,
    loadChapterFull, createChapter, updateChapter, deleteChapter,
  } = useProjectStore();
  const { loadModels, selectedModelId } = useSettingsStore();

  const [mainTab, setMainTab] = useState('write');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [saving, setSaving] = useState(false);

  // New chapter dialog
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterForm, setNewChapterForm] = useState({
    title: '', summary: '', targetWordCount: '', notes: '',
  });

  // Recycle bin
  const [deletedChapters, setDeletedChapters] = useState<Chapter[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  // Context verification dialog
  const [showVerify, setShowVerify] = useState(false);
  const [verifyData, setVerifyData] = useState<{ systemPrompt: string; userMessage: string; estimatedTokens: number; contextWindowPct: number; warningLevel: string } | null>(null);
  const [loadingVerify, setLoadingVerify] = useState(false);

  // Generation data from panel
  const [genSummary, setGenSummary] = useState('');
  const [genTargetWords, setGenTargetWords] = useState<number | undefined>();
  const [genNotes, setGenNotes] = useState('');

  const streamAccumRef = useRef('');

  // Load project + data
  useEffect(() => {
    if (!projectId) return;
    loadModels();
    // Load project title
    projectsApi.get(projectId)
      .then((project) => setCurrentProject(project))
      .catch(() => {});
    loadProjectData(projectId);
  }, [projectId]);

  // Listen for navigate-to-knowledge event from GenerationPanel
  useEffect(() => {
    const handler = () => setMainTab('knowledge');
    window.addEventListener('switch-to-knowledge', handler);
    return () => window.removeEventListener('switch-to-knowledge', handler);
  }, []);

  // Sync editor when chapter changes
  useEffect(() => {
    setEditorContent(currentChapter?.content || '');
  }, [currentChapter?.id]);

  const handleSelectChapter = useCallback(async (chapter: Chapter) => {
    if (!projectId) return;
    setCurrentChapter(chapter);
    await loadChapterFull(projectId, chapter.id);
    setMainTab('write');
  }, [projectId, loadChapterFull, setCurrentChapter]);

  const handleStreamStart = useCallback(() => {
    streamAccumRef.current = '';
    setStreamedContent('');
    setIsStreaming(true);
  }, []);

  const handleStreamToken = useCallback((token: string) => {
    streamAccumRef.current += token;
    setStreamedContent(streamAccumRef.current);
  }, []);

  const handleStreamEnd = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const handleGenerated = useCallback(async (content: string) => {
    if (!projectId || !currentChapter) return;
    const htmlContent = content
      .split('\n\n').filter((p) => p.trim())
      .map((p) => `<p>${p.trim()}</p>`).join('');
    setEditorContent(htmlContent);
    try {
      await updateChapter(projectId, currentChapter.id, { content: htmlContent, status: 'generated' });
    } catch { /* saved in editor */ }
  }, [projectId, currentChapter, updateChapter]);

  const handleSaveContent = useCallback(async () => {
    if (!projectId || !currentChapter) return;
    setSaving(true);
    try {
      await updateChapter(projectId, currentChapter.id, { content: editorContent, status: 'edited' });
      toast.success('已保存');
    } catch { toast.error('保存失败'); }
    finally { setSaving(false); }
  }, [projectId, currentChapter, editorContent, updateChapter]);

  const handleCopyContent = useCallback(() => {
    const text = editorContent.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ');
    navigator.clipboard.writeText(text)
      .then(() => toast.success('已复制到剪贴板'))
      .catch(() => toast.error('复制失败'));
  }, [editorContent]);

  const handleDeleteChapter = useCallback(async (chapterId: string, title: string) => {
    if (!projectId) return;
    if (!confirm(`将第章《${title}》移入回收站？可在「章节管理」回收站中恢复。`)) return;
    try {
      await deleteChapter(projectId, chapterId);
      toast.success('已移入回收站');
    } catch { toast.error('删除失败'); }
  }, [projectId, deleteChapter]);

  const handleCreateChapter = async () => {
    if (!projectId || !newChapterForm.title.trim()) { toast.error('请填写章节标题'); return; }
    const nextNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.number)) + 1 : 1;
    const twc = parseInt(newChapterForm.targetWordCount);
    try {
      const ch = await createChapter(projectId, {
        number: nextNum,
        title: newChapterForm.title.trim(),
        summary: newChapterForm.summary,
        targetWordCount: isNaN(twc) ? undefined : twc,
        notes: newChapterForm.notes || undefined,
      });
      setShowNewChapter(false);
      setNewChapterForm({ title: '', summary: '', targetWordCount: '', notes: '' });
      await handleSelectChapter(ch);
      toast.success('章节已创建');
    } catch { toast.error('创建失败'); }
  };

  const loadDeletedChapters = useCallback(async () => {
    if (!projectId) return;
    setLoadingDeleted(true);
    try {
      const data = await chaptersApi.listDeleted(projectId);
      setDeletedChapters(data);
    } catch { toast.error('加载回收站失败'); }
    finally { setLoadingDeleted(false); }
  }, [projectId]);

  useEffect(() => {
    if (mainTab === 'chapters') loadDeletedChapters();
  }, [mainTab]);

  const handleRestoreChapter = async (id: string) => {
    if (!projectId) return;
    try {
      await chaptersApi.restore(projectId, id);
      await loadProjectData(projectId);
      await loadDeletedChapters();
      toast.success('已恢复');
    } catch { toast.error('恢复失败'); }
  };

  const handlePermanentDelete = async (id: string, title: string) => {
    if (!confirm(`永久删除《${title}》？此操作无法撤销。`)) return;
    if (!projectId) return;
    try {
      await chaptersApi.permanentDelete(projectId, id);
      await loadDeletedChapters();
      toast.success('已永久删除');
    } catch { toast.error('删除失败'); }
  };

  // Context verification
  const handleVerifyContext = async () => {
    if (!projectId || !currentChapter || !selectedModelId) {
      toast.error('请先选择章节和模型');
      return;
    }
    setLoadingVerify(true);
    setShowVerify(true);
    try {
      const data = await generateApi.contextVerify({
        projectId,
        chapterNumber: currentChapter.number,
        chapterSummary: genSummary || currentChapter.summary || '（细纲待填写）',
        modelId: selectedModelId,
        targetWordCount: genTargetWords,
        chapterNotes: genNotes || undefined,
      });
      setVerifyData(data);
    } catch (e) {
      toast.error('加载失败');
      setShowVerify(false);
    } finally { setLoadingVerify(false); }
  };

  if (!projectId) return null;

  const openForeshadowings = useProjectStore.getState().foreshadowings.filter(f => f.status === 'open').length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Chapter list */}
      <div className="w-56 border-r border-border flex flex-col shrink-0 bg-card/30">
        <div className="px-3 py-3 border-b border-border shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 书库
          </button>
          <h2 className="font-semibold text-sm truncate" title={currentProject?.title || ''}>
            {currentProject?.title || <span className="text-muted-foreground italic text-xs">加载中…</span>}
          </h2>
          {currentProject?.genre && (
            <span className="text-[10px] text-muted-foreground">{currentProject.genre}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {chapters.map((ch) => (
            <div key={ch.id} className="group relative">
              <button
                onClick={() => handleSelectChapter(ch)}
                className={cn(
                  'w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors pr-8',
                  currentChapter?.id === ch.id
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <span className="text-[10px] text-muted-foreground w-6 shrink-0 mt-0.5">{ch.number}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ch.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn(
                      'text-[9px] px-1 rounded',
                      ch.status === 'final' && 'bg-emerald-500/20 text-emerald-400',
                      ch.status === 'edited' && 'bg-blue-500/20 text-blue-400',
                      ch.status === 'generated' && 'bg-amber-500/20 text-amber-400',
                      ch.status === 'draft' && 'bg-zinc-700/50 text-zinc-500',
                    )}>
                      {STATUS_LABEL[ch.status]}
                    </span>
                    {ch.wordCount > 0 && (
                      <span className="text-[9px] text-muted-foreground">{formatWordCount(ch.wordCount)}</span>
                    )}
                    {ch.targetWordCount && (
                      <span className="text-[9px] text-zinc-600">/{formatWordCount(ch.targetWordCount)}</span>
                    )}
                  </div>
                </div>
                {currentChapter?.id === ch.id && (
                  <ChevronRight className="w-3 h-3 shrink-0 text-primary mt-0.5" />
                )}
              </button>
              {/* Delete button on hover */}
              <button
                onClick={() => handleDeleteChapter(ch.id, ch.title)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                title="移入回收站"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border shrink-0">
          <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 h-8" onClick={() => setShowNewChapter(true)}>
            <Plus className="w-3.5 h-3.5" /> 新增章节
          </Button>
        </div>
      </div>

      {/* Right: Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0 bg-card/20">
          {[
            { id: 'write', icon: BookText, label: '写作' },
            { id: 'knowledge', icon: Library, label: '资料库' },
            { id: 'memory', icon: GitBranch, label: `伏笔${openForeshadowings > 0 ? ` (${openForeshadowings})` : ''}` },
            { id: 'chapters', icon: Layers, label: '章节管理' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                mainTab === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* WRITE TAB */}
        {mainTab === 'write' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Generation panel */}
            <div className="w-64 border-r border-border overflow-y-auto shrink-0">
              {currentChapter ? (
                <>
                  <GenerationPanel
                    projectId={projectId}
                    chapter={currentChapter}
                    onGenerated={handleGenerated}
                    onStreamStart={handleStreamStart}
                    onStreamToken={handleStreamToken}
                    onStreamEnd={handleStreamEnd}
                    isStreaming={isStreaming}
                    onSummaryChange={setGenSummary}
                    onTargetWordCountChange={setGenTargetWords}
                    onNotesChange={setGenNotes}
                  />
                  {/* Verify context button */}
                  <div className="px-4 pb-3">
                    <Button
                      size="sm" variant="outline"
                      className="w-full h-7 text-xs gap-1.5 border-zinc-700 text-zinc-400 hover:text-primary hover:border-primary/40"
                      onClick={handleVerifyContext}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> 验证资料库注入
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                  <BookText className="w-10 h-10 opacity-20 mb-2" />
                  <p>请先从左侧选择章节</p>
                </div>
              )}
            </div>

            {/* Editor area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {currentChapter ? (
                <>
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-border shrink-0">
                    <div>
                      <span className="text-xs text-muted-foreground mr-2">第{currentChapter.number}章</span>
                      <span className="font-medium text-sm">{currentChapter.title}</span>
                      {currentChapter.targetWordCount && (
                        <span className="text-xs text-muted-foreground ml-2">
                          目标 {formatWordCount(currentChapter.targetWordCount)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editorContent && !isStreaming && (
                        <>
                          <Button size="sm" variant="ghost" onClick={handleCopyContent} className="h-7 text-xs gap-1.5">
                            <Copy className="w-3.5 h-3.5" /> 复制
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleSaveContent} disabled={saving} className="h-7 text-xs gap-1.5">
                            {saving ? <CheckCheck className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                            保存
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <NovelEditor
                      content={editorContent} onChange={setEditorContent} onSave={handleSaveContent}
                      isStreaming={isStreaming} streamedContent={streamedContent}
                    />
                  </div>
                  <div className="px-5 py-3 border-t border-border shrink-0">
                    <FeedbackPanel projectId={projectId} chapterId={currentChapter.id} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BookText className="w-16 h-16 opacity-10 mx-auto mb-3" />
                    <p>选择章节开始写作</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {mainTab === 'knowledge' && (
          <div className="flex-1 overflow-hidden"><KnowledgeEditor projectId={projectId} /></div>
        )}

        {mainTab === 'memory' && (
          <div className="flex-1 overflow-hidden"><ForeshadowingPanel projectId={projectId} /></div>
        )}

        {mainTab === 'chapters' && (
          <ChaptersManager
            projectId={projectId}
            deletedChapters={deletedChapters}
            loadingDeleted={loadingDeleted}
            onRestore={handleRestoreChapter}
            onPermanentDelete={handlePermanentDelete}
          />
        )}
      </div>

      {/* New chapter dialog */}
      <Dialog open={showNewChapter} onOpenChange={setShowNewChapter}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新增章节</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">章节标题 *</label>
              <Input value={newChapterForm.title} onChange={(e) => setNewChapterForm({ ...newChapterForm, title: e.target.value })}
                placeholder="例：月下初遇" autoFocus />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">细纲（本章情节概要）</label>
              <Textarea value={newChapterForm.summary} onChange={(e) => setNewChapterForm({ ...newChapterForm, summary: e.target.value })}
                placeholder="本章要发生的情节概要、关键场景…" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">目标字数</label>
                <div className="flex flex-col gap-1.5">
                  <Input type="number" value={newChapterForm.targetWordCount}
                    onChange={(e) => setNewChapterForm({ ...newChapterForm, targetWordCount: e.target.value })}
                    placeholder="如：3000" />
                  <div className="flex flex-wrap gap-1">
                    {DEFAULT_WORD_COUNTS.map((n) => (
                      <button key={n} type="button"
                        onClick={() => setNewChapterForm({ ...newChapterForm, targetWordCount: String(n) })}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded border transition-colors',
                          newChapterForm.targetWordCount === String(n)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40'
                        )}>
                        {n >= 10000 ? `${n / 10000}万` : n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">本章特殊要求</label>
                <Textarea value={newChapterForm.notes} onChange={(e) => setNewChapterForm({ ...newChapterForm, notes: e.target.value })}
                  placeholder="AI写作时的附加指令，如：多写内心独白、节奏要缓慢…" rows={3} className="text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewChapter(false)}>取消</Button>
            <Button onClick={handleCreateChapter}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context verification dialog */}
      <Dialog open={showVerify} onOpenChange={setShowVerify}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              资料库注入验证
            </DialogTitle>
          </DialogHeader>
          {loadingVerify ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">构建上下文中…</div>
          ) : verifyData ? (
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
              {/* Stats */}
              <div className={cn(
                'flex items-center gap-3 p-3 rounded-lg text-sm',
                verifyData.warningLevel === 'critical' && 'bg-red-500/10 border border-red-500/30',
                verifyData.warningLevel === 'warn' && 'bg-amber-500/10 border border-amber-500/30',
                verifyData.warningLevel === 'ok' && 'bg-emerald-500/10 border border-emerald-500/30',
              )}>
                <Eye className="w-4 h-4 text-primary shrink-0" />
                <span>上下文共约 <strong>{verifyData.estimatedTokens.toLocaleString()}</strong> tokens，占用模型上下文窗口 <strong>{verifyData.contextWindowPct}%</strong></span>
              </div>

              <p className="text-xs text-muted-foreground">
                以下是即将发送给 AI 的完整系统提示，你可以确认资料库内容是否被正确注入：
              </p>

              <div className="rounded-lg border border-border bg-zinc-900/50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">系统提示（资料库注入部分）</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(verifyData.systemPrompt).then(() => toast.success('已复制'))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    复制
                  </button>
                </div>
                <pre className="text-xs text-zinc-300 p-3 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-96 font-sans">
                  {verifyData.systemPrompt}
                </pre>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowVerify(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChaptersManager({
  projectId, deletedChapters, loadingDeleted, onRestore, onPermanentDelete,
}: {
  projectId: string;
  deletedChapters: Chapter[];
  loadingDeleted: boolean;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string, title: string) => void;
}) {
  const { chapters, updateChapter } = useProjectStore();
  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">章节管理</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              共 {chapters.length} 章 · {formatWordCount(totalWords)}
            </span>
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowRecycleBin(!showRecycleBin)}
            >
              <Trash className="w-3 h-3" />
              回收站 {deletedChapters.length > 0 && `(${deletedChapters.length})`}
            </Button>
          </div>
        </div>

        {/* Recycle bin */}
        {showRecycleBin && (
          <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trash className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">回收站</span>
              <span className="text-xs text-muted-foreground ml-1">（7天后自动永久删除）</span>
            </div>
            {loadingDeleted ? (
              <p className="text-xs text-muted-foreground">加载中…</p>
            ) : deletedChapters.length === 0 ? (
              <p className="text-xs text-muted-foreground">回收站为空</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {deletedChapters.map((ch) => (
                  <div key={ch.id} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <span className="text-xs text-muted-foreground w-6 text-right">{ch.number}</span>
                    <span className="text-sm flex-1 line-through text-zinc-500">{ch.title}</span>
                    {ch.deletedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        删除于 {formatDateTime(ch.deletedAt)}
                      </span>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onRestore(ch.id)} className="h-6 text-xs gap-1 text-emerald-400 hover:text-emerald-300">
                      <RotateCcw className="w-3 h-3" /> 恢复
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onPermanentDelete(ch.id, ch.title)} className="h-6 text-xs gap-1 text-destructive hover:text-destructive/80">
                      <X className="w-3 h-3" /> 删除
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active chapters */}
        <div className="flex flex-col gap-2">
          {chapters.map((ch) => (
            <div key={ch.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-colors">
              <span className="text-muted-foreground text-sm w-8 text-right shrink-0">{ch.number}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{ch.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {ch.summary && <p className="text-xs text-muted-foreground truncate max-w-xs">{ch.summary}</p>}
                  {ch.targetWordCount && (
                    <span className="text-[10px] text-zinc-500">
                      目标 {formatWordCount(ch.targetWordCount)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {ch.wordCount > 0 && <span className="text-xs text-muted-foreground">{formatWordCount(ch.wordCount)}</span>}
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded',
                  ch.status === 'final' && 'bg-emerald-500/20 text-emerald-400',
                  ch.status === 'edited' && 'bg-blue-500/20 text-blue-400',
                  ch.status === 'generated' && 'bg-amber-500/20 text-amber-400',
                  ch.status === 'draft' && 'bg-zinc-700/50 text-zinc-400',
                )}>
                  {STATUS_LABEL[ch.status]}
                </span>
                <button
                  onClick={async () => { await updateChapter(projectId, ch.id, { status: 'final' }); toast.success('已标记为终稿'); }}
                  className="text-muted-foreground hover:text-emerald-400 p-1 rounded transition-colors" title="标记为终稿"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
