"use client";

import { createContext, useCallback, useContext, useState } from "react";

type DialogState =
  | {
      type: "confirm";
      message: string;
      confirmText: string;
      danger: boolean;
      resolve: (value: boolean) => void;
    }
  | {
      type: "alert";
      message: string;
      resolve: (value: void) => void;
    };

const DialogContext = createContext<{
  confirmDialog: (message: string, options?: { confirmText?: string; danger?: boolean }) => Promise<boolean>;
  alertDialog: (message: string) => Promise<void>;
} | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const confirmDialog = useCallback(
    (message: string, options?: { confirmText?: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) => {
        setDialog({
          type: "confirm",
          message,
          confirmText: options?.confirmText ?? "Delete",
          danger: options?.danger ?? true,
          resolve,
        });
      }),
    [],
  );

  const alertDialog = useCallback(
    (message: string) =>
      new Promise<void>((resolve) => {
        setDialog({ type: "alert", message, resolve });
      }),
    [],
  );

  function close(result: boolean) {
    if (!dialog) return;
    if (dialog.type === "confirm") dialog.resolve(result);
    else dialog.resolve();
    setDialog(null);
  }

  return (
    <DialogContext.Provider value={{ confirmDialog, alertDialog }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-hand text-lg text-gray-900 dark:text-gray-100">{dialog.message}</p>
            <div className="mt-5 flex flex-col gap-2">
              {dialog.type === "confirm" ? (
                <>
                  <button
                    onClick={() => close(true)}
                    className={`touch-manipulation rounded-lg px-4 py-3 text-sm font-medium text-white ${
                      dialog.danger
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-[#2b3a55] hover:bg-[#1f2c42]"
                    }`}
                  >
                    {dialog.confirmText}
                  </button>
                  <button
                    onClick={() => close(false)}
                    className="touch-manipulation rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => close(true)}
                  className="touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-3 text-sm font-medium text-white hover:bg-[#1f2c42]"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
  return ctx;
}
