import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Connectly — Connect Smarter. Chat Safer.",
  description: "AI-powered messaging that protects you from harmful conversations in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}