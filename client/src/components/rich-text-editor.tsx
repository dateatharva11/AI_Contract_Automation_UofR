import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Highlight } from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Placeholder } from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link as LinkIcon, Highlighter, Table as TableIcon, Undo, Redo } from 'lucide-react';
import { PlaceholderMark } from '@/lib/tiptap-extensions/placeholder-mark';

interface RichTextEditorProps {
  htmlContent: string;
  placeholderData: Record<string, any>;
  onChange: (htmlContent: string, updatedData: Record<string, any>) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor({ 
  htmlContent, 
  placeholderData, 
  onChange, 
  placeholder, 
  disabled 
}: RichTextEditorProps) {
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      PlaceholderMark,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Highlight,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...',
      }),
    ],
    content: htmlContent,
    onUpdate: ({ editor }) => {
      const updatedHtml = editor.getHTML();
      const updatedData = extractDataFromHTML(updatedHtml);
      onChange(updatedHtml, updatedData);
    },
    editable: !disabled,
  });

  // Function to extract data from HTML with data-field attributes
  const extractDataFromHTML = (html: string): Record<string, any> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const data: Record<string, any> = {};
    
    doc.querySelectorAll('[data-field]').forEach(el => {
      const key = el.getAttribute('data-field');
      if (key) {
        data[key] = el.textContent || '';
      }
    });
    
    return { ...placeholderData, ...data };
  };

  // Function to inject placeholder data into HTML template
  const injectDataIntoHTML = useCallback((templateHTML: string, data: Record<string, any>): string => {
    let result = templateHTML;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  }, []);

  // Update editor content when props change
  useEffect(() => {
    if (editor && htmlContent && editor.getHTML() !== htmlContent) {
      const injectedContent = injectDataIntoHTML(htmlContent, placeholderData);
      editor.commands.setContent(injectedContent, false);
    }
  }, [htmlContent, placeholderData, editor, injectDataIntoHTML]);

  if (!editor) {
    return null;
  }

  const toggleLink = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
  };

  return (
    <div className="flex flex-col w-full h-full border rounded-md overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/50">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-muted' : ''}
            disabled={disabled}
            title="Bold"
            type="button"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-muted' : ''}
            disabled={disabled}
            title="Italic"
            type="button"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'bg-muted' : ''}
            disabled={disabled}
            title="Underline"
            type="button"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}
            disabled={disabled}
            title="Align Left"
            type="button"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}
            disabled={disabled}
            title="Align Center"
            type="button"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}
            disabled={disabled}
            title="Align Right"
            type="button"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-muted' : ''}
            disabled={disabled}
            title="Bullet List"
            type="button"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-muted' : ''}
            disabled={disabled}
            title="Ordered List"
            type="button"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLink}
            className={editor.isActive('link') ? 'bg-muted' : ''}
            disabled={disabled}
            title="Insert Link"
            type="button"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={editor.isActive('highlight') ? 'bg-muted' : ''}
            disabled={disabled}
            title="Highlight"
            type="button"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            disabled={disabled}
            title="Insert Table"
            type="button"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={disabled || !editor.can().undo()}
            title="Undo"
            type="button"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={disabled || !editor.can().redo()}
            title="Redo"
            type="button"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div id="editor-content" className="flex-1 overflow-y-auto p-4 prose prose-sm dark:prose-invert max-w-none focus:outline-none">
        <EditorContent editor={editor} className="h-full min-h-[200px]" />
      </div>
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror {
          height: 100%;
          outline: none;
        }
        .ProseMirror [data-field] {
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          cursor: text;
        }
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          min-width: 1em;
          border: 1px solid #ced4da;
          padding: 3px 5px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror table th {
          font-weight: bold;
          text-align: left;
          background-color: #f8f9fa;
        }
        .dark .ProseMirror table td,
        .dark .ProseMirror table th {
          border-color: #495057;
        }
        .dark .ProseMirror table th {
          background-color: #343a40;
        }
      `}</style>
    </div>
  );
}