"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

export default function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: IScannerControls | undefined;
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current ?? undefined,
        (result, _err, ctrl) => {
          controls = ctrl;
          if (cancelled || !result) return;
          controls.stop();
          onScanRef.current(result.getText());
        },
      )
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error && e.name === "NotAllowedError"
              ? "Camera access was denied. Allow camera access in your browser settings to scan a barcode."
              : "Couldn't access the camera on this device.",
          );
        }
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-4 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-center text-sm text-gray-600 dark:text-gray-400">
          {error ? "" : "Point the camera at a barcode"}
        </p>
        {error ? (
          <p className="py-8 text-center text-sm text-red-600">{error}</p>
        ) : (
          <video ref={videoRef} className="w-full rounded-lg bg-black" muted playsInline />
        )}
        <button
          onClick={onClose}
          className="mt-3 w-full touch-manipulation rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
