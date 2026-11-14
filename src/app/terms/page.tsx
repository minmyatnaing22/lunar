import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
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
            <FileText className="w-5 h-5 text-sky-400" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Legal and Compliance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Terms and Conditions</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Effective Date: November 2026 | LunarSight Planning Application
          </p>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the LunarSight application, you acknowledge that you have read,
              understood, and agree to be bound by these Terms and Conditions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              2. Scientific and Educational Use
            </h2>
            <p>
              LunarSight is designed as an educational and preliminary mission-architecture planning
              application for the NASA Space Apps Challenge. Calculations regarding solar
              illumination, Earth visibility, and radio line-of-sight are mathematical simulations
              based on simplified ephemeris and digital elevation models.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              3. Operational Disclaimer
            </h2>
            <p>
              This tool does not constitute certified flight software. Numerical suitability scores
              and ranking metrics represent decision-support heuristics and must not be interpreted
              as a guarantee of lunar landing safety or mission success. Operational flight planning
              demands dedicated mission trajectory analysis and high-resolution hazard avoidance
              assessments.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              4. Intellectual Property and Open Science
            </h2>
            <p>
              All underlying astronomical algorithms, public lunar cartographic coordinates, and
              mission models comply with NASA and IAU public scientific guidelines. Code and assets
              are provided under open research terms for hackathon review and scientific evaluation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
