import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useRef, useState } from "react";

import { Button } from "./Button.jsx";
import { ConfirmContext } from "./confirm-context.js";

const DEFAULTS = {
  title: "Are you sure?",
  description: null,
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  tone: "primary",
};

/**
 * Promise-based confirmation, so a destructive handler reads as a straight
 * line: `if (!(await confirm({...}))) return;`
 */
export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(
    (next = {}) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setOptions({ ...DEFAULTS, ...next });
      }),
    [],
  );

  const settle = useCallback((answer) => {
    resolveRef.current?.(answer);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Dialog.Root open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-modal"
            onEscapeKeyDown={() => settle(false)}
          >
            <Dialog.Title className="text-lg font-semibold text-ink">
              {options?.title}
            </Dialog.Title>

            {options?.description ? (
              <Dialog.Description className="mt-2 text-sm text-ink-muted">
                {options.description}
              </Dialog.Description>
            ) : (
              // Radix warns when Content has no Description; keep it for a11y.
              <Dialog.Description className="sr-only">
                Confirm or cancel this action.
              </Dialog.Description>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => settle(false)}>
                {options?.cancelLabel}
              </Button>
              <Button variant={options?.tone} onClick={() => settle(true)} autoFocus>
                {options?.confirmLabel}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}
