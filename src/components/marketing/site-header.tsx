"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { APP_NAME } from "@/lib/constants";

type SiteHeaderProps = {
  signedIn?: boolean;
};

export function SiteHeader({ signedIn = false }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const authHref = signedIn ? "/dashboard" : "/sign-in";
  const authLabel = signedIn ? "Dashboard" : "Sign in";
  const navItems = [
    { href: "#product", label: "Product" },
    { href: "#trust", label: "Trust" },
    { href: "#process", label: "Process" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <header className="marketing-header">
      <Link href="/" className="marketing-brand" aria-label={`${APP_NAME} home`}>
        <div className="marketing-brand-mark">
          DL
        </div>
        <div>
          <div className="marketing-brand-name">{APP_NAME}</div>
          <div className="marketing-brand-tagline">
            Trust-first review
          </div>
        </div>
      </Link>

      <nav className="marketing-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="marketing-nav-link">
            {item.label}
          </Link>
        ))}
        <Link href={authHref} className="marketing-nav-cta">
          {authLabel}
        </Link>
      </nav>

      <button
        type="button"
        className="marketing-menu-button"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
      </button>

      {mobileOpen ? (
        <div className="marketing-mobile-menu">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="marketing-mobile-link" onClick={() => setMobileOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href={authHref} className="marketing-mobile-cta" onClick={() => setMobileOpen(false)}>
            {authLabel}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
