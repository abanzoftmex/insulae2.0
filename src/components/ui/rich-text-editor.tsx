"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback } from "react";
import { cn } from "@/shared/utils/cn";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Link2Off,
} from "lucide-react";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  className,
  minHeight = "120px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
          class: "text-brand underline underline-offset-2 hover:text-brand-accent",
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "outline-none w-full px-3 py-2 text-[13px] font-medium text-ink leading-relaxed",
          "[&_strong]:font-bold [&_em]:italic",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5",
          "[&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-brand-accent",
          "[&_p]:min-h-[1em]"
        ),
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. reset form)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (current !== incoming) {
      editor.commands.setContent(incoming, false);
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    // eslint-disable-next-line no-alert
    const url = window.prompt("URL del enlace:", prev ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkToWordIfEmpty().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkToWordIfEmpty().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const tools: Array<{
    label: string;
    icon: React.ReactNode;
    action: () => void;
    active: boolean;
    disabled?: boolean;
  }> = [
    {
      label: "Negrita",
      icon: <Bold className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      label: "Cursiva",
      icon: <Italic className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    {
      label: "Lista con viñetas",
      icon: <List className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      label: "Lista numerada",
      icon: <ListOrdered className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
    {
      label: editor.isActive("link") ? "Quitar enlace" : "Añadir enlace",
      icon: editor.isActive("link") ? <Link2Off className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />,
      action: setLink,
      active: editor.isActive("link"),
    },
  ];

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">
        {label}
      </label>

      <div className="rounded-md border border-line bg-card focus-within:ring-2 focus-within:ring-brand-accent/30 focus-within:border-brand-accent transition-standard overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-line/60 bg-canvas/50">
          {tools.map((tool) => (
            <button
              key={tool.label}
              type="button"
              aria-label={tool.label}
              title={tool.label}
              onMouseDown={(e) => {
                e.preventDefault();
                tool.action();
              }}
              className={cn(
                "h-6 w-6 flex items-center justify-center rounded transition-standard",
                tool.active
                  ? "bg-brand text-white"
                  : "text-ink-soft hover:bg-canvas hover:text-brand"
              )}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Editor area */}
        <EditorContent
          editor={editor}
          style={{ minHeight }}
          className="cursor-text"
          onClick={() => editor.commands.focus()}
        />
      </div>
    </div>
  );
}
