"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "URL to PDF", href: "/url-to-pdf" },
  { label: "Contact", href: "/contact" },
  { label: "FAQs", href: "/faqs" },
  { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #eceae4",
        fontFamily: "ui-sans-serif, system-ui",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 24px",
          height: "58px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo — swap <span> for <img src="/your-logo.png" /> when ready */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
          <span
           
          >
            <Image src="/khanpdf_logo.png" alt="Khan PDF" width={25} height={25} />
          </span>
          <span style={{ fontSize: "16px", fontWeight: 600, color: "#1c1c1c", letterSpacing: "-0.3px" }}>
            Khan<span style={{ color: "#f16625" }}>PDF</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: "4px" }} className="hidden-mobile">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: "14px",
                fontWeight: 400,
                color: "rgba(28,28,28,0.7)",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(28,28,28,0.04)";
                e.currentTarget.style.color = "#1c1c1c";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "rgba(28,28,28,0.7)";
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger — right column */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            display: "none",
            background: "none",
            border: "1px solid #eceae4",
            borderRadius: "6px",
            padding: "6px 8px",
            cursor: "pointer",
            color: "#1c1c1c",
            marginLeft: "auto",
          }}
          className="show-mobile"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderTop: "1px solid #eceae4",
            padding: "12px 24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
          className="show-mobile"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: "15px",
                color: "#1c1c1c",
                textDecoration: "none",
                padding: "10px 12px",
                borderRadius: "6px",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(28,28,28,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
