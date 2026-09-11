"use client";

import { useState } from "react";

export default function ShareModal({
  title,
  description,
  code,
  joinPath,
  mailSubject,
  shareText,
  onClose,
}: {
  title: string;
  description: string;
  code: string;
  joinPath: string;
  mailSubject: string;
  shareText: (joinUrl: string) => string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}${joinPath}` : "";
  const messageBody = shareText(joinUrl);

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); ignore.
    }
  }

  async function share() {
    try {
      await navigator.share({ title: mailSubject, text: messageBody });
    } catch {
      // User cancelled the share sheet or it's unsupported; ignore.
    }
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(messageBody)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-2xl text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>

        <div className="mx-auto mt-5 w-fit rounded-xl border-2 border-dashed border-gray-300 bg-white px-6 py-4">
          <span className="font-mono text-4xl font-bold tracking-[0.25em] text-gray-900">
            {code}
          </span>
        </div>

        <button
          onClick={() => copy(joinUrl, "link")}
          className="mt-3 flex w-full touch-manipulation items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left"
        >
          <span className="flex-1 truncate text-xs text-gray-500">{joinUrl}</span>
          <span className="shrink-0 text-xs font-medium text-gray-700">
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
          <a
            href={mailtoHref}
            className="touch-manipulation rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Email invite
          </a>
          <button
            onClick={() => copy(code, "code")}
            className="touch-manipulation rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copied === "code" ? "Copied!" : "Copy code"}
          </button>
          <button
            onClick={onClose}
            className="touch-manipulation px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
