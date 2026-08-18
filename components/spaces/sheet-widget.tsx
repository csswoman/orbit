"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, List } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { OrbitItem } from "@/lib/orbit-item";

export function SheetWidget({ editing, onSave, item }: {
  editing: boolean;
  item: OrbitItem;
  onSave: (item: { body: Record<string, unknown>; id: string; title: string }) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const latestContent = useRef(item.body);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const editor = useEditor({
    content: item.body,
    editable: editing,
    editorProps: {
      handleKeyDown: (_view, event) => {
        event.stopPropagation();
        return false;
      },
    },
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

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editing);
    if (editing) editor.commands.focus("end");
  }, [editor, editing]);

  function scheduleSave(nextTitle = title) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave({ body: latestContent.current, id: item.id, title: nextTitle }), 700);
  }

  return (
    <article className={`sheet-widget${editing ? " is-editing" : ""}`} data-no-dnd={editing ? true : undefined}>
      <header className="sheet-widget__header">
        {editing ? (
          <input
            aria-label="Título de la hoja"
            className="sheet-widget__title"
            onBlur={() => scheduleSave()}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            value={title}
          />
        ) : (
          <p className="sheet-widget__title">{title}</p>
        )}
        {editing ? (
          <div aria-label="Formato de texto" className="sheet-widget__format">
            <FormatButton active={editor?.isActive("bold")} label="Negrita" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold aria-hidden="true" /></FormatButton>
            <FormatButton active={editor?.isActive("italic")} label="Cursiva" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic aria-hidden="true" /></FormatButton>
            <FormatButton active={editor?.isActive("heading", { level: 2 })} label="Encabezado" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 aria-hidden="true" /></FormatButton>
            <FormatButton active={editor?.isActive("bulletList")} label="Lista" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List aria-hidden="true" /></FormatButton>
          </div>
        ) : null}
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
