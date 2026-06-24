import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gurken Treffen",
  description: "Internes Buchungssystem für das Stimme-Stämme-Treffen.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Gurken Treffen",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/assets/chungus.png",
    apple: "/assets/chungus.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <ServiceWorkerRegistration />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
