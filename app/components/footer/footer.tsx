"use client";

import Link from "next/link";

const links = [
  { label: "Home", href: "/" },
  { label: "URL to PDF", href: "/url-to-pdf" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#1c1c1c",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        fontFamily: "ui-sans-serif, system-ui",
      }}
    >
      <div
        style={{
          width: "100%",
          margin: "0",
          padding: "40px 24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Brand line */}
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0, maxWidth: "480px" }}>
          <span style={{ color: "#ff911d", fontWeight: 600 }}>Khan PDF</span>{" "}
          helps you convert public URL into clean PDF files for saving, sharing, and offline use.
        </p>

        {/* Nav links */}
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "6px 4px", alignItems: "center" }}>
          {links.map((link, i) => (
            <span key={link.href} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Link
                href={link.href}
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.65)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ff911d")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
              >
                {link.label}
              </Link>
              {i < links.length - 1 && (
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>|</span>
              )}
            </span>
          ))}
        </nav>

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

        {/* Bottom row */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", margin: 0 }}>
            © 2026 Khan PDF. All rights reserved.
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Works best with public URL that do not require login.
          </p>
        </div>
      </div>
    </footer>
  );
}
