import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/stores/projectStore';
import { formatDateTime } from '@/lib/utils';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { projects, chapters, loadProjects } = useProjectStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  // Get recent chapters across all projects
  const recentChapters = [...chapters]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 50);

  const filtered = recentChapters.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-8 pt-8 pb-4 shrink-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">历史记录</h1>
          <p className="text-muted-foreground text-sm mt-1">最近编辑的章节</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索章节内容…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
            <Clock className="w-12 h-12 opacity-20" />
            <p>还没有任何历史记录</p>
            <button
              className="text-primary text-sm hover:underline"
              onClick={() => navigate('/')}
            >
              前往书库创建项目
            </button>
          </div>
        ) : (
          <div className="max-w-2xl space-y-3">
            {/* Show recent projects */}
            <h3 className="text-sm text-muted-foreground mb-2">最近的项目</h3>
            {projects.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/project/${p.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-left group"
              >
                <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(p.updatedAt)}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
