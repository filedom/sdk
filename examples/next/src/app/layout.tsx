import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "filedom Next.js" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full bg-background font-sans text-foreground">{children}</body>
    </html>
  );
}
