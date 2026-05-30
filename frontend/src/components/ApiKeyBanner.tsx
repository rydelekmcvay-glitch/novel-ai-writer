import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

export default function ApiKeyBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <span className="text-amber-200/90 flex-1">
        尚未配置 API Key，AI 写作功能暂时无法使用。
      </span>
      <Button asChild size="sm" variant="outline" className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10 gap-1 shrink-0">
        <Link to="/settings">
          前往配置 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </Button>
    </div>
  );
}
