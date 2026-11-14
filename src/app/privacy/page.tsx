import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-sky-400 hover:text-sky-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Mission Control</span>
        </Link>

        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-sky-400" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Legal and Compliance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Effective Date: November 2026 | LunarSight Planning Application
          </p>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              1. Overview
            </h2>
            <p>
              LunarSight is a scientific mission-planning tool developed for the NASA Space Apps
              Challenge. We respect user privacy and operate this application with transparent,
              minimal data collection practices.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              2. Information Processed
            </h2>
            <p>
              LunarSight operates primarily on client-side simulation logic. Any custom candidate
              landing coordinates, date and time inputs, and mission priority weighting preferences
              entered by the user remain local to the user session. We do not transmit or sell
              personal identifiable information.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              3. Astronomical Data Sources
            </h2>
            <p>
              Topographical, ephemeris, and orbital calculation algorithms utilize publicly
              available scientific datasets provided by NASA, the Jet Propulsion Laboratory (JPL),
              and the United States Geological Survey (USGS).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              4. Cookies and Local Storage
            </h2>
            <p>
              This application does not employ tracking cookies for commercial advertising.
              Standard browser memory may be used strictly to retain simulation parameters during
              active planning sessions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              5. Contact
            </h2>
            <p>
              For scientific inquiries or questions regarding this tool, please refer to the
              official team repository.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
