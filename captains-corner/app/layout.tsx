import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Captain's Corner — FPL mini-league strategist",
  description:
    "Enter your FPL team ID and get an evidence-based gameweek review built to win your mini-league, not the template.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans text-chalk antialiased">{children}</body>
    </html>
  );
}
