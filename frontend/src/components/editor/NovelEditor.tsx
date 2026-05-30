import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useCallback } from 'react';
import { Bold, Italic, UnderlineIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface NovelEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  readonly?: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  streamedContent?: string;
}

export default function NovelEditor({
  content,
  onChange,
  onSave,
  readonly = false,
  placeholder = '正文内容将在此处显示，生成后可直接编辑…',
  isStreaming = false,
  streamedContent = '',
}: NovelEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content,
    editable: !readonly && !isStreaming,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // When streaming, show plain text
  // After streaming, set editor content
  useEffect(() => {
    if (!editor) return;
    if (isStreaming) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor, isStreaming]);

  // Keyboard shortcut Ctrl+S
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    },
    [onSave]
  );

  const copyContent = useCallback(() => {
    const text = editor?.getText() || '';
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('已复制到剪贴板'))
      .catch(() => toast.error('复制失败'));
  }, [editor]);

  const wordCount = editor?.storage.characterCount?.characters() || 0;

  if (isStreaming) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="streaming-text font-serif text-base leading-loose text-zinc-200 typing-cursor"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {streamedContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      {!readonly && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            data-active={editor?.isActive('bold')}
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </Button>
          <div className="flex-1" />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => editor?.chain().focus().undo().run()}
            title="撤销"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">{wordCount} 字</span>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className={cn(
            'h-full px-8 py-6',
            readonly && 'cursor-default'
          )}
        />
      </div>

      {/* Footer actions */}
      {!readonly && content && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border shrink-0 bg-card/50">
          <span className="text-xs text-muted-foreground">Ctrl+S 保存</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={copyContent} className="h-7 text-xs">
              复制正文
            </Button>
            {onSave && (
              <Button size="sm" onClick={onSave} className="h-7 text-xs">
                保存
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
