import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PGRKAM AI Career Assistant",
  description: "SIH1305 project foundation",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
