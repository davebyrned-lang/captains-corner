import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND.name} ${BRAND.descriptor}`,
  description: BRAND.subhead,
  icons: { icon: "/icon.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    title: `${BRAND.name} ${BRAND.descriptor}`,
    description: BRAND.subhead,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#C5E659",
          colorBackground: "#0C1730",
          colorText: "#E9F2E4",
          colorInputBackground: "#061024",
          colorInputText: "#E9F2E4",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en">
        <body className="font-sans text-chalk antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
