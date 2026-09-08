import { useEffect } from "react";
import type { ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { plainTextToHtml } from "@/lib/rich-text";

type Props = {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  className?: string;
};

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  minHeightClass = "min-h-[7rem]",
  className,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
    ],
    content: plainTextToHtml(value || ""),
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus:outline-none",
          "[&_p]:my-1 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5",
          minHeightClass,
        ),
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      onChange(html);
    },
  });

  // Sync externe (chargement document) sans écraser la frappe en cours
  useEffect(() => {
    if (!editor) return;
    const next = plainTextToHtml(value || "");
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (next === current) return;
    if (next === "" && editor.isEmpty) return;
    // Ne resync que si le contenu externe change vraiment (édition / reset)
    const normalizedNext = next.replace(/\s+/g, " ").trim();
    const normalizedCurrent = current.replace(/\s+/g, " ").trim();
    if (normalizedNext === normalizedCurrent) return;
    editor.commands.setContent(next || "<p></p>", false);
  }, [value, editor]);

  if (!editor) {
    return (
      <label className={cn("block", className)}>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="mt-1.5 h-24 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
      </label>
    );
  }

  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5 overflow-hidden rounded-xl border border-border/60 bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border/50 bg-muted/30 px-1.5 py-1">
          <ToolbarButton
            title="Gras"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Italique"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Souligné"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            title="Liste à puces"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Liste numérotée"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>
    </label>
  );
}
