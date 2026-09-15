import * as ToastPrimitive from "@radix-ui/react-toast";
import { useCallback, useMemo, useState } from "react";

import { cn } from "../../lib/cn.js";
import { ToastContext } from "./toast-context.js";

const TONE = {
  success: "border-l-success",
  error: "border-l-danger",
  warning: "border-l-warning",
  info: "border-l-info",
};

let nextId = 0;

export function ToastProvider({ children, duration = 5000 }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(
    (id) => setToasts((current) => current.filter((t) => t.id !== id)),
    [],
  );

  const toast = useCallback((options) => {
    const id = ++nextId;
    const next =
      typeof options === "string" ? { title: options, tone: "info" } : { tone: "info", ...options };
    setToasts((current) => [...current, { ...next, id }]);
    return id;
  }, []);

  const value = useMemo(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ tone: "success", title, description }),
      error: (title, description) => toast({ tone: "error", title, description }),
      warning: (title, description) => toast({ tone: "warning", title, description }),
      info: (title, description) => toast({ tone: "info", title, description }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={duration}>
        {children}

        {toasts.map(({ id, title, description, tone }) => (
          <ToastPrimitive.Root
            key={id}
            open
            onOpenChange={(open) => !open && dismiss(id)}
            className={cn(
              "flex items-start gap-3 rounded-md border border-line border-l-4 bg-surface p-4 shadow-card",
              "data-[state=closed]:opacity-0 data-[state=closed]:transition-opacity",
              TONE[tone] ?? TONE.info,
            )}
          >
            <div className="min-w-0 flex-1">
              {title ? (
                <ToastPrimitive.Title className="text-sm font-semibold text-ink">
                  {title}
                </ToastPrimitive.Title>
              ) : null}
              {description ? (
                <ToastPrimitive.Description className="mt-0.5 text-sm text-ink-muted">
                  {description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss"
              className="shrink-0 rounded-sm px-1 text-ink-subtle hover:text-ink"
            >
              &times;
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-100 flex w-[min(24rem,100vw-2rem)] flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
