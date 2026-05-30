import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useProjectStore } from '@/stores/projectStore';
import { KNOWLEDGE_TYPE_LABELS, KNOWLEDGE_TYPE_DESCRIPTIONS, type KnowledgeType } from '@/types';
import type { KnowledgeItem } from '@/types';
import toast from 'react-hot-toast';

const TYPES: KnowledgeType[] = ['outline', 'worldbuilding', 'character', 'style', 'restriction'];

interface KnowledgeEditorProps {
  projectId: string;
}

interface EditState {
  id: string | null; // null = new
  type: KnowledgeType;
  title: string;
  content: string;
}

export default function KnowledgeEditor({ projectId }: KnowledgeEditorProps) {
  const { knowledge, createKnowledge, updateKnowledge, deleteKnowledge } = useProjectStore();
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<KnowledgeType>('outline');

  const byType = (t: KnowledgeType) => knowledge.filter((k) => k.type === t);

  const startNew = (type: KnowledgeType) => {
    setEditState({ id: null, type, title: '', content: '' });
    setActiveTab(type);
  };

  const startEdit = (item: KnowledgeItem) => {
    setEditState({ id: item.id, type: item.type as KnowledgeType, title: item.title, content: item.content });
  };

  const cancelEdit = () => setEditState(null);

  const handleSave = async () => {
    if (!editState) return;
    if (!editState.title.trim()) { toast.error('请填写标题'); return; }
    setSaving(true);
    try {
      if (editState.id) {
        await updateKnowledge(projectId, editState.id, {
          title: editState.title.trim(),
          content: editState.content,
        });
        toast.success('已更新');
      } else {
        await createKnowledge(projectId, {
          type: editState.type,
          title: editState.title.trim(),
          content: editState.content,
          itemOrder: byType(editState.type).length,
        });
        toast.success('已添加');
      }
      setEditState(null);
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (k: KnowledgeItem) => {
    if (!confirm(`确认删除「${k.title}」？`)) return;
    try {
      await deleteKnowledge(projectId, k.id);
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as KnowledgeType)} className="flex flex-col h-full">
        <div className="px-4 pt-4 shrink-0 border-b border-border">
          <TabsList className="w-full flex h-auto p-1 gap-1 flex-wrap">
            {TYPES.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs flex-1 min-w-[4rem] h-8">
                {KNOWLEDGE_TYPE_LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TYPES.map((type) => (
          <TabsContent key={type} value={type} className="flex-1 overflow-hidden mt-0 flex flex-col" style={{ minHeight: 0 }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <p className="text-xs text-muted-foreground">{KNOWLEDGE_TYPE_DESCRIPTIONS[type]}</p>
              {editState?.type !== type && (
                <Button size="sm" variant="outline" onClick={() => startNew(type)} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" />
                  添加
                </Button>
              )}
            </div>

            {/* Edit form */}
            {editState && editState.type === type && (
              <div className="mx-4 mb-3 p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-2 shrink-0">
                <Input
                  value={editState.title}
                  onChange={(e) => setEditState({ ...editState, title: e.target.value })}
                  placeholder="标题"
                  className="h-8 text-sm"
                />
                <Textarea
                  value={editState.content}
                  onChange={(e) => setEditState({ ...editState, content: e.target.value })}
                  placeholder={`填写${KNOWLEDGE_TYPE_LABELS[type]}内容…`}
                  className="text-sm"
                  rows={6}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs gap-1">
                    <X className="w-3 h-3" /> 取消
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1">
                    <Save className="w-3 h-3" /> 保存
                  </Button>
                </div>
              </div>
            )}

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {byType(type).length === 0 && !editState ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                  <span>暂无内容</span>
                  <Button size="sm" variant="ghost" onClick={() => startNew(type)} className="text-xs">
                    + 添加第一条
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {byType(type).map((item) => (
                    <KnowledgeCard
                      key={item.id}
                      item={item}
                      isEditing={editState?.id === item.id}
                      onEdit={() => startEdit(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function KnowledgeCard({
  item,
  isEditing,
  onEdit,
  onDelete,
}: {
  item: KnowledgeItem;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const preview = item.content.length > 100 ? item.content.slice(0, 100) + '…' : item.content;

  if (isEditing) return null;

  return (
    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          className="flex-1 flex items-center gap-2 text-left"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="text-sm font-medium">{item.title}</span>
          {collapsed ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
          ) : (
            <ChevronUp className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
          )}
        </button>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="px-3 pb-3 border-t border-border">
          <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed pt-2">
            {item.content || <span className="text-muted-foreground italic">（空）</span>}
          </p>
        </div>
      )}
      {collapsed && item.content && (
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground">{preview}</p>
        </div>
      )}
    </div>
  );
}
