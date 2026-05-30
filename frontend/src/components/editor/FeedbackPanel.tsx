import { useState } from 'react';
import { MessageSquarePlus, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProjectStore } from '@/stores/projectStore';
import type { Feedback } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';

const CATEGORIES = [
  { value: 'style', label: '文风问题' },
  { value: 'logic', label: '逻辑漏洞' },
  { value: 'character', label: '人物偏差' },
  { value: 'pacing', label: '节奏问题' },
  { value: 'other', label: '其他' },
];

interface FeedbackPanelProps {
  projectId: string;
  chapterId?: string;
}

export default function FeedbackPanel({ projectId, chapterId }: FeedbackPanelProps) {
  const { feedbacks, createFeedback, markFeedbackApplied, deleteFeedback } = useProjectStore();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('other');
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const relevantFeedbacks = chapterId
    ? feedbacks.filter((f) => f.chapterId === chapterId || !f.chapterId)
    : feedbacks;

  const activeFeedbacks = relevantFeedbacks.filter((f) => !f.applied);
  const appliedFeedbacks = relevantFeedbacks.filter((f) => f.applied);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('请填写反馈内容');
      return;
    }
    setSubmitting(true);
    try {
      await createFeedback(projectId, { content: content.trim(), chapterId, category });
      setContent('');
      toast.success('反馈已记录，将在下次生成时自动应用');
    } catch {
      toast.error('提交反馈失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkApplied = async (f: Feedback) => {
    try {
      await markFeedbackApplied(projectId, f.id, !f.applied);
      toast.success(f.applied ? '已标记为待应用' : '已标记为已解决');
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFeedback(projectId, id);
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">反馈与改进</span>
          {activeFeedbacks.length > 0 && (
            <Badge className="h-5 text-xs px-1.5">{activeFeedbacks.length} 条待应用</Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Submit form */}
          <div className="p-4 flex flex-col gap-2.5">
            <p className="text-xs text-muted-foreground">
              指出当前章节的问题，AI 将在下次写作时自动融入改进
            </p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="例如：男主角说话太正式，不符合其性格设定；打斗场景描写太平淡…"
              className="text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleSubmit} disabled={submitting} className="h-8 text-xs">
                提交反馈
              </Button>
            </div>
          </div>

          {/* Active feedbacks */}
          {activeFeedbacks.length > 0 && (
            <div className="border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground mb-2">待应用反馈</p>
              <div className="flex flex-col gap-1.5">
                {activeFeedbacks.map((f) => (
                  <FeedbackItem
                    key={f.id}
                    feedback={f}
                    onToggle={() => handleMarkApplied(f)}
                    onDelete={() => handleDelete(f.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Applied feedbacks */}
          {appliedFeedbacks.length > 0 && (
            <div className="border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground mb-2">已解决</p>
              <div className="flex flex-col gap-1.5 opacity-50">
                {appliedFeedbacks.slice(0, 3).map((f) => (
                  <FeedbackItem
                    key={f.id}
                    feedback={f}
                    onToggle={() => handleMarkApplied(f)}
                    onDelete={() => handleDelete(f.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackItem({
  feedback,
  onToggle,
  onDelete,
}: {
  feedback: Feedback;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.value === feedback.category);
  return (
    <div className={cn('flex items-start gap-2 p-2 rounded-lg', feedback.applied ? 'bg-zinc-800/30' : 'bg-zinc-800/60')}>
      <button
        onClick={onToggle}
        className={cn(
          'mt-0.5 w-4 h-4 rounded shrink-0 border flex items-center justify-center transition-colors',
          feedback.applied
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
            : 'border-zinc-600 hover:border-primary'
        )}
      >
        {feedback.applied && <Check className="w-2.5 h-2.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-relaxed text-zinc-300">{feedback.content}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {cat && <span className="text-[10px] text-muted-foreground">{cat.label}</span>}
          <span className="text-[10px] text-muted-foreground">{formatDateTime(feedback.createdAt)}</span>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
