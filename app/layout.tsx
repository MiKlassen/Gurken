import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gurken Treffen",
  description: "Internes Buchungssystem für das Stimme-Stämme-Treffen.",
  icons: {
    icon: "/assets/chungus.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
