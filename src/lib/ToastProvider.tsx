"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = { id: number; message: string; icon?: string; undoLabel?: string };
type PendingUndo = { timer: ReturnType<typeof setTimeout>; onUndo: () => void };

const UNDO_WINDOW_MS = 5000;

const ToastContext = createContext<{
  showToast: (message: string, icon?: string) => void;
  showUndoToast: (
    message: string,
    handlers: { onUndo: () => void; onExpire: () => void },
    icon?: string,
  ) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const pendingUndosRef = useRef<Map<number, PendingUndo>>(new Map());

  const showToast = useCallback((message: string, icon?: string) => {
    const id = ++idRef.current;
    setToasts((current) => [...current, { id, message, icon }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Delays the real commit (e.g. a DB delete) for a few seconds behind an
  // "Undo" button, instead of acting immediately — the caller's onExpire
  // only runs if the window passes with no click.
  const showUndoToast = useCallback(
    (message: string, handlers: { onUndo: () => void; onExpire: () => void }, icon?: string) => {
      const id = ++idRef.current;
      const timer = setTimeout(() => {
        pendingUndosRef.current.delete(id);
        setToasts((current) => current.filter((t) => t.id !== id));
        handlers.onExpire();
      }, UNDO_WINDOW_MS);
      pendingUndosRef.current.set(id, { timer, onUndo: handlers.onUndo });
      setToasts((current) => [...current, { id, message, icon, undoLabel: "Undo" }]);
    },
    [],
  );

  function handleUndoClick(id: number) {
    const pending = pendingUndosRef.current.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingUndosRef.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
    pending.onUndo();
  }

  return (
    <ToastContext.Provider value={{ showToast, showUndoToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-[90vw] items-center gap-3 rounded-full bg-gray-900/95 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-800/95"
          >
            <span>
              {t.icon && <span className="mr-1.5">{t.icon}</span>}
              {t.message}
            </span>
            {t.undoLabel && (
              <button
                onClick={() => handleUndoClick(t.id)}
                className="shrink-0 touch-manipulation font-semibold text-amber-300 hover:text-amber-200"
              >
                {t.undoLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
