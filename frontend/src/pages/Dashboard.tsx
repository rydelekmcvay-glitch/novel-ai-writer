import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Trash2, Clock, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ApiKeyBanner from '@/components/ApiKeyBanner';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate, formatWordCount } from '@/lib/utils';
import type { Project } from '@/types';
import toast from 'react-hot-toast';

const GENRES = ['玄幻', '修仙', '武侠', '都市', '科幻', '悬疑', '言情', '历史', '奇幻', '恐怖', '其他'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, loadingProjects, loadProjects, createProject, deleteProject } = useProjectStore();
  const { hasApiKey, loadSettings, loadModels } = useSettingsStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', genre: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
    loadSettings();
    loadModels();
  }, []);

  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('请填写书名'); return; }
    setCreating(true);
    try {
      const project = await createProject(form);
      setShowCreate(false);
      setForm({ title: '', description: '', genre: '' });
      navigate(`/project/${project.id}`);
      toast.success('项目已创建');
    } catch {
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (!confirm(`确认删除《${project.title}》？此操作不可撤销。`)) return;
    try {
      await deleteProject(project.id);
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">我的书库</h1>
            <p className="text-muted-foreground text-sm mt-1">管理你的长篇小说项目</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            新建项目
          </Button>
        </div>

        {!hasApiKey && <ApiKeyBanner />}

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索项目…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {loadingProjects ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-4 text-muted-foreground">
            <BookOpen className="w-12 h-12 opacity-20" />
            <div className="text-center">
              <p className="font-medium">{search ? '没有找到匹配的项目' : '还没有任何项目'}</p>
              {!search && (
                <p className="text-sm mt-1">
                  <button className="text-primary hover:underline" onClick={() => setShowCreate(true)}>
                    创建第一个项目
                  </button>
                  ，开始你的创作之旅
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/project/${project.id}`)}
                onDelete={(e) => handleDelete(e, project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建小说项目</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">书名 *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="请输入书名"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">简介</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="一句话介绍这本书"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">类型</label>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, genre: form.genre === g ? '' : g })}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      form.genre === g
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? '创建中…' : '创建项目'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectCard({
  project,
  onClick,
  onDelete,
}: {
  project: Project;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const chapterCount = project._count?.chapters || 0;

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer p-5 flex flex-col gap-3"
    >
      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Genre tag */}
      {project.genre && (
        <span className="text-[10px] text-primary border border-primary/30 rounded-full px-2 py-0.5 w-fit bg-primary/5">
          {project.genre}
        </span>
      )}

      {/* Title */}
      <div>
        <h3 className="font-semibold text-base leading-tight">{project.title}</h3>
        {project.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {chapterCount} 章
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(project.updatedAt)}
        </span>
      </div>
    </div>
  );
}
