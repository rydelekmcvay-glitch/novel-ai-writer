import { useState } from 'react';
import { Plus, CheckCircle2, Circle, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProjectStore } from '@/stores/projectStore';
import type { Foreshadowing } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const PRIORITY_CONFIG = {
  high: { label: '重要', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  medium: { label: '中等', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  low: { label: '次要', color: 'text-zinc-400', bg: 'bg-zinc-700/30 border-zinc-600/30' },
};

const STATUS_CONFIG = {
  open: { label: '进行中', icon: Circle, color: 'text-blue-400' },
  resolved: { label: '已回收', icon: CheckCircle2, color: 'text-emerald-400' },
  dropped: { label: '已丢弃', icon: XCircle, color: 'text-zinc-500' },
};

interface ForeshadowingPanelProps {
  projectId: string;
}

interface NewForm {
  title: string;
  description: string;
  plantedAt: string;
  priority: 'low' | 'medium' | 'high';
}

const defaultForm: NewForm = { title: '', description: '', plantedAt: '', priority: 'medium' };

export default function ForeshadowingPanel({ projectId }: ForeshadowingPanelProps) {
  const { foreshadowings, createForeshadowing, updateForeshadowing, deleteForeshadowing } = useProjectStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const open = foreshadowings.filter((f) => f.status === 'open');
  const resolved = foreshadowings.filter((f) => f.status !== 'open');

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.plantedAt.trim()) {
      toast.error('请填写完整信息');
      return;
    }
    setSaving(true);
    try {
      await createForeshadowing(projectId, {
        ...form,
        status: 'open',
        resolvedAt: undefined,
      });
      setForm(defaultForm);
      setShowForm(false);
      toast.success('伏笔已记录');
    } catch {
      toast.error('添加失败');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (f: Foreshadowing, status: string) => {
    try {
      await updateForeshadowing(projectId, f.id, { status: status as Foreshadowing['status'] });
      toast.success(status === 'resolved' ? '已标记为回收' : status === 'dropped' ? '已标记为丢弃' : '已重新激活');
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteForeshadowing(projectId, id);
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">伏笔追踪</span>
          {open.length > 0 && (
            <Badge className="h-5 text-xs px-1.5 bg-blue-500/20 text-blue-300 border-blue-500/30">
              {open.length} 条进行中
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(!showForm)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="w-3 h-3" />
          添加伏笔
        </Button>
      </div>

      {showForm && (
        <div className="mx-4 mt-3 p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col gap-2 shrink-0">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="伏笔名称（如：神秘来信）"
            className="h-8 text-sm"
          />
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="描述这条伏笔的内容和意义…"
            rows={2}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Input
              value={form.plantedAt}
              onChange={(e) => setForm({ ...form, plantedAt: e.target.value })}
              placeholder="埋设位置（如：第3章）"
              className="h-8 text-sm flex-1"
            />
            <Select
              value={form.priority}
              onValueChange={(v) => setForm({ ...form, priority: v as NewForm['priority'] })}
            >
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">重要</SelectItem>
                <SelectItem value="medium">中等</SelectItem>
                <SelectItem value="low">次要</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-7 text-xs">取消</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving} className="h-7 text-xs">添加</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {foreshadowings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
            <span>暂无伏笔记录</span>
          </div>
        ) : (
          <>
            {open.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {open.map((f) => (
                  <ForeshadowingCard
                    key={f.id}
                    item={f}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
            {resolved.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mt-2">已完结</p>
                <div className="flex flex-col gap-1.5 opacity-60">
                  {resolved.map((f) => (
                    <ForeshadowingCard
                      key={f.id}
                      item={f}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ForeshadowingCard({
  item,
  onStatusChange,
  onDelete,
}: {
  item: Foreshadowing;
  onStatusChange: (f: Foreshadowing, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
  const StatusIcon = statusCfg.icon;

  return (
    <div className={cn('rounded-lg border p-3', priority.bg)}>
      <div className="flex items-start gap-2">
        <StatusIcon className={cn('w-4 h-4 mt-0.5 shrink-0', statusCfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium">{item.title}</span>
            <span className={cn('text-[10px]', priority.color)}>[{priority.label}]</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.description}</p>
          <p className="text-[10px] text-muted-foreground mt-1">埋设于：{item.plantedAt}</p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {item.status === 'open' && (
            <>
              <button
                onClick={() => onStatusChange(item, 'resolved')}
                className="text-[10px] text-emerald-400 hover:text-emerald-300"
                title="标记为已回收"
              >
                回收
              </button>
              <button
                onClick={() => onStatusChange(item, 'dropped')}
                className="text-[10px] text-zinc-500 hover:text-zinc-400"
                title="标记为已丢弃"
              >
                丢弃
              </button>
            </>
          )}
          {item.status !== 'open' && (
            <button
              onClick={() => onStatusChange(item, 'open')}
              className="text-[10px] text-blue-400 hover:text-blue-300"
            >
              重开
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
