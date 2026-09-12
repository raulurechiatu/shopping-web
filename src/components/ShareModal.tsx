"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useDialog } from "@/lib/DialogProvider";

export default function ShareModal({
  title,
  description,
  code,
  joinPath,
  mailSubject,
  shareText,
  onClose,
  onShareWithHousehold,
}: {
  title: string;
  description: string;
  code: string;
  joinPath: string;
  mailSubject: string;
  shareText: (joinUrl: string) => string;
  onClose: () => void;
  onShareWithHousehold?: () => Promise<void> | void;
}) {
  const { alertDialog } = useDialog();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [householdState, setHouseholdState] = useState<"idle" | "sharing" | "shared" | "error">("idle");
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}${joinPath}` : "";
  const messageBody = shareText(joinUrl);

  useEffect(() => {
    if (!joinUrl) return;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, { width: 200, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        // Non-critical — the code and link still work without it.
      });
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  // navigator.clipboard.writeText can fail silently (insecure context,
  // permissions, or inside an installed iOS PWA), so fall back to the
  // legacy execCommand approach, and only if both fail do we tell the user
  // instead of the button just doing nothing.
  async function copy(text: string, which: "code" | "link") {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopied(which);
        setTimeout(() => setCopied(null), 2000);
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(textarea);

      if (ok) {
        setCopied(which);
        setTimeout(() => setCopied(null), 2000);
      } else {
        await alertDialog(`Couldn't copy automatically. Here it is to copy by hand:\n\n${text}`);
      }
    }
  }

  async function share() {
    try {
      await navigator.share({ title: mailSubject, text: messageBody });
    } catch {
      // User cancelled the share sheet or it's unsupported; ignore.
    }
  }

  async function shareWithHousehold() {
    if (!onShareWithHousehold || householdState === "sharing") return;
    setHouseholdState("sharing");
    setHouseholdError(null);
    try {
      await onShareWithHousehold();
      setHouseholdState("shared");
    } catch (err) {
      setHouseholdState("error");
      setHouseholdError(err instanceof Error ? err.message : "Couldn't share with your household.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-2xl text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>

        <button
          onClick={() => copy(code, "code")}
          className="mx-auto mt-5 block w-fit touch-manipulation rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4 hover:border-gray-400 dark:hover:border-gray-500"
        >
          <span className="font-mono text-4xl font-bold tracking-[0.25em] text-gray-900 dark:text-gray-100">
            {copied === "code" ? "Copied!" : code}
          </span>
        </button>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Tap the code to copy it</p>

        {qrDataUrl && (
          <div className="mx-auto mt-3 w-fit rounded-xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR code for ${joinUrl}`} width={160} height={160} />
          </div>
        )}

        <button
          onClick={() => copy(joinUrl, "link")}
          className="mt-3 flex w-full touch-manipulation items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-left"
        >
          <span className="flex-1 truncate text-xs text-gray-500 dark:text-gray-400">{joinUrl}</span>
          <span className="shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">
            {copied === "link" ? "Copied!" : "Copy link"}
          </span>
        </button>

        <div className="mt-5 flex flex-col gap-2">
          {canShare && (
            <button
              onClick={share}
              className="touch-manipulation rounded-lg bg-[#2b3a55] px-4 py-3 text-sm font-medium text-white hover:bg-[#1f2c42]"
            >
              Share...
            </button>
          )}
          {onShareWithHousehold && (
            <>
              <button
                onClick={shareWithHousehold}
                disabled={householdState === "sharing" || householdState === "shared"}
                className="touch-manipulation rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                {householdState === "sharing"
                  ? "Sharing..."
                  : householdState === "shared"
                    ? "Shared with household ✓"
                    : "🏠 Share with household"}
              </button>
              {householdError && <p className="text-sm text-red-600">{householdError}</p>}
            </>
          )}
          <button
            onClick={onClose}
            className="touch-manipulation px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
