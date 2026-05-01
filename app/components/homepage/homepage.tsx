"use client";

import Link from "next/link";

const badges = [
  { label: "100% Free", dot: "bg-green-500", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  { label: "No Sign-up", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { label: "Secure & Private", dot: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
];

export default function Homepage() {
  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "ui-sans-serif, system-ui" }}>

      {/* ── Hero ── */}
      <section className="max-w-3xl mx-auto px-6 pt-14 pb-20 text-center">

        {/* H1 */}
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-gray-900 mb-5 leading-tight tracking-tight mx-auto"
          style={{ letterSpacing: "-1.5px", maxWidth: "820px" }}
        >
          Turn Any Public URLs into a Downloadable PDF Online
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto mb-8">
          Khan PDF helps you convert public docs URLs into clean, downloadable
          PDF files. Paste a website or docs link, start the conversion, and save the page
          as a PDF for reports, records, sharing, or offline reading.
        </p>

        {/* Badges — below H1 + description */}
        <div className="flex flex-wrap justify-center gap-2 mb-16">
          {badges.map(({ label, dot, bg, text, border }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border ${bg} ${text} ${border}`}
            >
              <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
              {label}
            </span>
          ))}
        </div>

        {/* ── Tool card — 2:1 ratio, centered ── */}
        <div className="flex justify-center">
          <Link href="/url-to-pdf" className="w-full block" style={{ maxWidth: "560px" }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-200 rounded-2xl px-6 py-6 sm:px-8 sm:py-0 sm:h-32 cursor-pointer transition-all duration-150 hover:border-gray-400 hover:shadow-xl shadow-md">

              {/* Icon + text */}
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-gray-900 mb-1 leading-snug">
                    Convert Any URL to PDF
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Turn any URL into a clean PDF in seconds.
                  </p>
                </div>
              </div>

              {/* CTA button */}
              <span
                className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shrink-0 self-start sm:self-auto"
                style={{
                  boxShadow:
                    "rgba(255,255,255,0.2) 0px 0.5px 0px 0px inset, rgba(0,0,0,0.2) 0px 0px 0px 0.5px inset, rgba(0,0,0,0.05) 0px 1px 2px 0px",
                }}
              >
                Convert Now
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        </div>

      </section>
    </main>
  );
}
