import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function FactCheckBadge({ factChecks }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!factChecks || factChecks.length === 0) return null;

  const getVerdictStyle = (verdict) => {
    switch (verdict) {
      case 'SUPPORTED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          badgeClass: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
          label: 'Supported'
        };
      case 'QUESTIONABLE':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          badgeClass: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
          label: 'Questionable'
        };
      case 'FALSE':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
          badgeClass: 'bg-rose-950/40 text-rose-300 border-rose-500/30',
          label: 'Disputed'
        };
      case 'OPINION':
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 text-blue-400" />,
          badgeClass: 'bg-blue-950/40 text-blue-300 border-blue-500/30',
          label: 'Opinion'
        };
      case 'UNVERIFIABLE':
      default:
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />,
          badgeClass: 'bg-white/5 text-neutral-400 border-white/10',
          label: 'Unverified'
        };
    }
  };

  return (
    <div className="mt-3.5 pt-3 border-t border-[var(--rule-light)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1 text-xs text-[var(--fg-soft)] hover:text-[var(--fg)] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--fg-soft)]" />
          <span>Live Fact-Check Verification ({factChecks.length})</span>
        </span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-2.5">
          {factChecks.map((item, idx) => {
            const style = getVerdictStyle(item.verdict);
            return (
              <div 
                key={idx}
                className="p-3 rounded-xl bg-[#1a1917] border border-[var(--rule)] text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {style.icon}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${style.badgeClass}`}>
                      {item.verdict}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--fg-faint)] font-mono">
                    {Math.round(item.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-[var(--fg-soft)] text-xs font-normal">
                  <span className="text-[var(--fg)] font-medium">Claim: </span>
                  <span className="italic text-[var(--fg)]">"{item.claim}"</span>
                </p>
                <p className="text-xs text-[var(--fg-soft)] leading-relaxed">
                  {item.explanation}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
