import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

import { Button } from "../../components/ui/Button.jsx";
import { Textarea } from "../../components/ui/Field.jsx";

const SUGGESTIONS = [
  "Not about this product",
  "Contains contact details or spam",
  "Offensive or inappropriate language",
  "Duplicate of another review",
];

/**
 * Collects the rejection reason the API requires.
 *
 * The reason is stored on the review and is the only record of *why* something
 * was turned down, so it is a required field rather than an optional note. The
 * suggestions are there because a queue of twenty rejections otherwise produces
 * twenty differently-worded versions of "spam".
 */
export function RejectDialog({ open, onOpenChange, count = 1, onConfirm, isPending }) {
  const [reason, setReason] = useState("");

  // Clear on each opening, adjusted during render rather than in an effect,
  // which would cascade a second pass.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setReason("");
  }

  const trimmed = reason.trim();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(30rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-modal">
          <Dialog.Title className="text-lg font-semibold text-ink">
            {count === 1 ? "Reject this review?" : `Reject ${count} reviews?`}
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm text-ink-muted">
            {count === 1
              ? "The reason is kept with the review."
              : "The same reason is recorded against every one of them."}
          </Dialog.Description>

          <div className="mt-4">
            <Textarea
              label="Reason"
              required
              rows={3}
              autoFocus
              maxLength={512}
              placeholder="Why is this being rejected?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setReason(suggestion)}
                  className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-muted hover:border-line-strong hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!trimmed || isPending}
              loading={isPending}
              onClick={() => onConfirm(trimmed)}
            >
              {isPending ? "Rejecting…" : count === 1 ? "Reject" : `Reject ${count}`}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
