import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Kalam, Patrick_Hand } from "next/font/google";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { DialogProvider } from "@/lib/DialogProvider";
import { ToastProvider } from "@/lib/ToastProvider";
import OfflineBanner from "@/components/OfflineBanner";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var pref = localStorage.getItem("theme");
    var isDark = pref === "dark" || ((pref === "system" || !pref) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Handwriting-style fonts for the notebook look. latin-ext keeps Romanian
// diacritics (ă, â, î, ș, ț) rendering correctly.
const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Shopping List",
  description: "A real-time shared shopping list",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Shopping List",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b3a55",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${kalam.variable} ${patrickHand.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <DialogProvider>
            <ToastProvider>
              <OfflineBanner />
              <ServiceWorkerRegistrar />
              {children}
            </ToastProvider>
          </DialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
