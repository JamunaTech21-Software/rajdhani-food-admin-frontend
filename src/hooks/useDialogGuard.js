import { useCallback } from "react";

import { useConfirm } from "../components/ui/confirm-context.js";

/**
 * The unsaved-changes guard for a form inside a dialog (§18.3).
 *
 * `useUnsavedGuard` covers a form that owns a *route* — it blocks the router and
 * `beforeunload`. A dialog has no route to leave, so closing it is the moment
 * work is lost, and that needed its own guard.
 *
 * Eight dialogs were each calling `window.confirm` for this. That works, but:
 *
 *   - it is an unstyled OS dialog in the middle of a themed app;
 *   - it blocks the main thread, freezing any in-flight save;
 *   - a browser can suppress it outright once a user ticks "prevent this page
 *     from creating additional dialogs", at which point the guard silently
 *     stops existing and work is lost with no warning at all.
 *
 * That last one is the reason this is worth replacing rather than leaving.
 *
 * Returns a close handler to hand straight to `<Dialog.Root onOpenChange>`.
 */
export function useDialogGuard({ isDirty, isSaving, onOpenChange, what = "these changes" }) {
  const confirm = useConfirm();

  return useCallback(
    async (next) => {
      // Only closing needs guarding, and never mid-save: the mutation is
      // already in flight and its own success handler closes the dialog.
      if (next || !isDirty || isSaving) {
        onOpenChange(next);
        return;
      }

      const discard = await confirm({
        title: "Discard your changes?",
        description: `You have unsaved changes to ${what}. Closing now loses them.`,
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        tone: "danger",
      });

      if (discard) onOpenChange(false);
    },
    [confirm, isDirty, isSaving, onOpenChange, what],
  );
}
