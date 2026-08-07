import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Leadgyűjtő",
  description: "Google Places alapú, egyszemélyes leadgyűjtő alkalmazás."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
