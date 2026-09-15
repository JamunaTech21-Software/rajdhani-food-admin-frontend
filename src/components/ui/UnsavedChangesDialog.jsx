import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "./Button.jsx";

/** Rendered when a `useBlocker` has stopped a navigation away from a dirty form. */
export function UnsavedChangesDialog({ blocker }) {
  const open = blocker.state === "blocked";

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && blocker.reset?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-modal">
          <Dialog.Title className="text-lg font-semibold text-ink">
            Leave without saving?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-ink-muted">
            You have changes on this page that have not been saved. Leaving now discards them.
          </Dialog.Description>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => blocker.reset?.()}>
              Stay on this page
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              Discard changes
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
