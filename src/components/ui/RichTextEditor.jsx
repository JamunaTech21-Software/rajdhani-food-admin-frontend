import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { useId } from "react";

import { cn } from "../../lib/cn.js";
import { cleanPastedHtml, looksLikeOfficePaste } from "../../lib/pasteCleaner.js";

function ToolbarButton({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the selection
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-8 place-items-center rounded-sm",
        active ? "bg-brand-tint text-brand" : "text-ink-muted hover:bg-ground hover:text-ink",
        disabled && "opacity-40",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Rich text for the product content tabs.
 *
 * The API stores these fields as sanitised HTML and treats null as "hide this
 * tab" on the public site, so an editor clearing a field must produce null
 * rather than the "<p></p>" TipTap leaves behind.
 */
export function RichTextEditor({ label, value, onChange, hint, error, onPasteCleaned }) {
  const id = useId();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value ?? "",
    editorProps: {
      attributes: {
        id,
        class:
          "prose-admin min-h-40 w-full px-3 py-2.5 text-sm text-ink focus:outline-none",
      },

      // Word and Google Docs paste a wrapper of inline styles, class names and
      // namespaced tags. ProseMirror's schema drops most of it, but a <style>
      // block's CSS would arrive as body text and Google Docs' wrapper would
      // turn the whole paste bold — so it is pre-filtered here.
      transformPastedHTML: (html) => {
        const cleaned = cleanPastedHtml(html);
        if (looksLikeOfficePaste(html)) onPasteCleaned?.();
        return cleaned;
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.isEmpty ? null : instance.getHTML());
    },
  });

  function toggleLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href ?? "";
    const href = window.prompt("Link URL", previous);
    if (href === null) return;
    if (href === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>

      <div
        className={cn(
          "overflow-hidden rounded-md border bg-surface",
          error ? "border-danger" : "border-line focus-within:border-line-strong",
        )}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b border-line p-1">
          <ToolbarButton
            label="Bold"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold size={15} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic size={15} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Heading"
            active={editor?.isActive("heading", { level: 2 })}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 size={15} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>

          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

          <ToolbarButton
            label="Bullet list"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List size={15} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={15} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={editor?.isActive("blockquote")}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={15} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton label="Link" active={editor?.isActive("link")} onClick={toggleLink}>
            <LinkIcon size={15} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>

          <span className="ml-auto flex items-center gap-0.5">
            <ToolbarButton
              label="Undo"
              disabled={!editor?.can().undo()}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 size={15} strokeWidth={2} aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton
              label="Redo"
              disabled={!editor?.can().redo()}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 size={15} strokeWidth={2} aria-hidden="true" />
            </ToolbarButton>
          </span>
        </div>

        <EditorContent editor={editor} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
