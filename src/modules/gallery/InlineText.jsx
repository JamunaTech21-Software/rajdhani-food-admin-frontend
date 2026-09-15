import { useState } from "react";

import { cn } from "../../lib/cn.js";

/**
 * Click-to-edit text that saves on blur or Enter and reverts on Escape.
 *
 * RTPP-45 asks for caption editing "without opening a modal" — for a grid where
 * the job is captioning twenty images in a row, a dialog per image is the wrong
 * shape entirely.
 */
export function InlineText({ value, onSave, placeholder, label, multiline = false, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function begin() {
    setDraft(value ?? "");
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next !== (value ?? "").trim()) onSave(next || null);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(value ?? "");
      setEditing(false);
    }
    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={begin}
        aria-label={`Edit ${label}`}
        className={cn(
          "w-full truncate rounded-sm px-1 py-0.5 text-left",
          "hover:bg-ground focus-visible:bg-ground",
          value ? "text-ink" : "text-ink-subtle italic",
          className,
        )}
      >
        {value || placeholder}
      </button>
    );
  }

  const Tag = multiline ? "textarea" : "input";

  return (
    <Tag
      autoFocus
      aria-label={label}
      value={draft}
      rows={multiline ? 2 : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className={cn(
        "w-full rounded-sm border border-brand bg-surface px-1 py-0.5 text-sm text-ink outline-none",
        className,
      )}
    />
  );
}
