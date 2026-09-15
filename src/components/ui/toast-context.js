import { createContext, useContext } from "react";

// Separate from Toast.jsx so that file exports components only — otherwise
// react-refresh cannot hot-reload it.
export const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
