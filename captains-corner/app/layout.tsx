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
          colorTextSecondary: "#AFC2B4",
          colorInputBackground: "#061024",
          colorInputText: "#E9F2E4",
          // Clerk derives social button borders and text from this. Left dark,
          // "Continue with Google" comes out near-invisible on our background.
          colorNeutral: "#E9F2E4",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "bg-slate1 border border-mint/15",
          headerTitle: "text-chalk",
          headerSubtitle: "text-chalk/60",
          socialButtonsBlockButton:
            "border border-chalk/30 bg-chalk/10 text-chalk hover:bg-chalk/20",
          socialButtonsBlockButtonText: "text-chalk font-medium",
          dividerLine: "bg-chalk/20",
          dividerText: "text-chalk/50",
          formFieldLabel: "text-chalk/80",
          formButtonPrimary: "bg-mint text-ink font-semibold hover:bg-mint/85",
          footerActionText: "text-chalk/60",
          footerActionLink: "text-mint hover:text-mint/80",
        },
      }}
    >
      <html lang="en">
        <body className="font-sans text-chalk antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
