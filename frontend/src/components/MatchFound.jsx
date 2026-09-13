import React from 'react';
import { ArrowRight, Swords } from 'lucide-react';

export default function MatchFound({ match, topic, onEnterArena }) {
  if (!match) return null;

  const { debater_a, debater_b, rationale } = match;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16 relative z-10">
      
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 text-[11px] sm:text-[12px] tracking-wide uppercase text-[var(--fg-faint)] font-medium mb-1.5">
          Step 2 &middot; Match Selected
        </div>
        <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-[var(--fg)]">
          Today's Debaters
        </h2>
        <p className="text-[var(--fg-soft)] text-xs sm:text-sm mt-1 max-w-lg mx-auto">
          Topic: <span className="text-[var(--fg)] font-medium">"{topic}"</span>
        </p>
      </div>

      {/* Versus Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 relative mb-6">
        
        {/* Central VS Badge (Desktop) */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#1a1917] border border-[var(--rule)] items-center justify-center text-xs font-mono font-bold text-[var(--fg)] shadow-xl">
          VS
        </div>

        {/* Debater A (FOR) */}
        <div className="paper-card p-4 sm:p-6 flex flex-col justify-between bg-[#131211] border-l-4 border-l-emerald-500/80">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-medium text-[var(--fg)]">{debater_a.agent.name}</h3>
                <p className="text-xs text-[var(--fg-faint)]">{debater_a.agent.tagline}</p>
              </div>

              <span className="px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
                {debater_a.assigned_position}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-[var(--fg-soft)]">
              <div className="p-3.5 rounded-xl bg-[#1a1917] border border-[var(--rule-light)]">
                <span className="text-[var(--fg-faint)] block text-[10px] uppercase font-semibold mb-1">Their Stance:</span>
                <p className="italic text-[var(--fg)]">"{debater_a.opinion.reason}"</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--fg-faint)] pt-1 font-mono">
                <span>Confidence</span>
                <span className="text-[var(--fg-soft)] font-medium">{Math.round(debater_a.opinion.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile VS Badge */}
        <div className="md:hidden flex items-center justify-center -my-2">
          <span className="w-8 h-8 rounded-full bg-[#1a1917] border border-[var(--rule)] flex items-center justify-center text-[11px] font-mono font-bold text-[var(--fg-soft)] shadow-md">
            VS
          </span>
        </div>

        {/* Debater B (AGAINST) */}
        <div className="paper-card p-4 sm:p-6 flex flex-col justify-between bg-[#131211] border-l-4 border-l-rose-500/80">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-medium text-[var(--fg)]">{debater_b.agent.name}</h3>
                <p className="text-xs text-[var(--fg-faint)]">{debater_b.agent.tagline}</p>
              </div>

              <span className="px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider bg-rose-950/50 text-rose-300 border border-rose-500/30">
                {debater_b.assigned_position}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-[var(--fg-soft)]">
              <div className="p-3.5 rounded-xl bg-[#1a1917] border border-[var(--rule-light)]">
                <span className="text-[var(--fg-faint)] block text-[10px] uppercase font-semibold mb-1">Their Stance:</span>
                <p className="italic text-[var(--fg)]">"{debater_b.opinion.reason}"</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--fg-faint)] pt-1 font-mono">
                <span>Confidence</span>
                <span className="text-[var(--fg-soft)] font-medium">{Math.round(debater_b.opinion.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Pairing Rationale Card */}
      <div className="p-4 rounded-xl bg-[#131211] border border-[var(--rule)] text-xs text-[var(--fg-soft)] mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <p className="leading-relaxed">
          <span className="font-semibold text-[var(--fg)]">Why this matchup: </span>
          {rationale}
        </p>
      </div>

      {/* Enter Arena CTA */}
      <div className="text-center">
        <button
          onClick={onEnterArena}
          className="pill !h-11 !px-7 text-[14px] w-full sm:w-auto inline-flex items-center justify-center gap-2"
        >
          <span>Enter the Debate</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
