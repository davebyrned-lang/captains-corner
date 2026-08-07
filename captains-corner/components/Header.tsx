"use client";

import Image from "next/image";
import { useState } from "react";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { BRAND } from "@/lib/brand";

export default function Header({ plan }: { plan?: string }) {
  const [opening, setOpening] = useState(false);

  async function openBilling() {
    setOpening(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else alert(data.error ?? "Could not open billing.");
    } catch {
      alert("Could not reach the billing page.");
    } finally {
      setOpening(false);
    }
  }

  const label =
    plan === "premium" ? "Premier" : plan === "classic" ? "Classic" : null;

  return (
    <header className="mb-8 flex items-center gap-3">
      <a href="/" className="flex items-center gap-2.5">
        <Image
          src="/logo-small.png"
          alt=""
          width={36}
          height={36}
          className="rounded-lg"
          priority
        />
        <span className="text-sm font-bold tracking-tight text-chalk">
          {BRAND.name}
        </span>
      </a>

      {label && (
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            label === "Premier"
              ? "bg-mint/20 text-mint"
              : "bg-teal/20 text-teal"
          }`}
        >
          {label}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {label && (
          <button
            onClick={openBilling}
            disabled={opening}
            className="rounded-lg px-3 py-2 text-xs text-chalk/50 transition hover:text-chalk disabled:opacity-50"
          >
            {opening ? "Opening…" : "Billing"}
          </button>
        )}
        <SignedOut>
          <SignInButton mode="modal">
            <button className="rounded-lg px-3 py-2 text-sm text-chalk/70 transition hover:text-chalk">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mint/85">
              Sign up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton
            appearance={{ elements: { avatarBox: "h-8 w-8" } }}
            afterSignOutUrl="/"
          />
        </SignedIn>
      </div>
    </header>
  );
}
