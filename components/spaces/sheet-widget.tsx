"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, List } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { SpaceWidget } from "@/lib/space-widgets";

export function SheetWidget({ onSave, widget }: {
  onSave: (widget: { content: Record<string, unknown>; id: string; title: string }) => void;
  widget: SpaceWidget;
}) {
  const [title, setTitle] = useState(widget.title);
  const latestContent = useRef(widget.content);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const editor = useEditor({
    content: widget.content,
    extensions: [StarterKit],
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      latestContent.current = currentEditor.getJSON();
      scheduleSave();
    },
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function scheduleSave(nextTitle = title) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave({ content: latestContent.current, id: widget.id, title: nextTitle }), 700);
  }

  return (
    <article className="sheet-widget">
      <header className="sheet-widget__header">
        <input
          aria-label="Título de la hoja"
          className="sheet-widget__title"
          onBlur={() => scheduleSave()}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <div aria-label="Formato de texto" className="sheet-widget__format">
          <FormatButton active={editor?.isActive("bold")} label="Negrita" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold aria-hidden="true" /></FormatButton>
          <FormatButton active={editor?.isActive("italic")} label="Cursiva" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic aria-hidden="true" /></FormatButton>
          <FormatButton active={editor?.isActive("heading", { level: 2 })} label="Encabezado" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 aria-hidden="true" /></FormatButton>
          <FormatButton active={editor?.isActive("bulletList")} label="Lista" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List aria-hidden="true" /></FormatButton>
        </div>
      </header>
      <EditorContent className="sheet-widget__editor" editor={editor} />
    </article>
  );
}

function FormatButton({ active, children, label, onClick }: {
  active?: boolean; children: React.ReactNode; label: string; onClick: () => void;
}) {
  return <button aria-label={label} className={active ? "is-active" : undefined} onClick={onClick} type="button">{children}</button>;
}
