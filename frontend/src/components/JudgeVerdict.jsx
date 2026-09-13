import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Award, Download, FileText, ChevronDown, ChevronUp, CornerDownRight } from 'lucide-react';

export default function JudgeVerdict({ verdict, match, topic, turns = [], onNewDebate }) {
  const [showFullTranscript, setShowFullTranscript] = useState(true);

  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.55 },
        colors: ['#f2f0ec', '#d4af37', '#737373', '#ffffff']
      });
    } catch (e) {
      console.warn("Confetti error", e);
    }
  }, []);

  if (!verdict || !match) return null;

  const { debater_a, debater_b } = match;

  const isWinnerA = debater_a.agent.name === verdict.winner;
  const winnerDebater = isWinnerA ? debater_a : debater_b;
  const opponentDebater = isWinnerA ? debater_b : debater_a;

  const winnerProfile = winnerDebater.agent;
  const winnerPosition = winnerDebater.assigned_position; // "FOR" or "AGAINST"
  const opponentPosition = opponentDebater.assigned_position;

  const winnerScores = verdict.scores[verdict.winner] || {};
  const opponentName = opponentDebater.agent.name;
  const opponentScores = verdict.scores[opponentName] || {};

  const calcAvg = (s) => {
    const vals = Object.values(s);
    if (!vals.length) return "8.5";
    const sum = vals.reduce((a, b) => a + b, 0);
    return (sum / vals.length).toFixed(1);
  };

  const winnerAvg = calcAvg(winnerScores);
  const opponentAvg = calcAvg(opponentScores);

  const criteriaKeys = [
    { key: "logic", label: "Logic & Coherence" },
    { key: "evidence", label: "Evidence & Grounding" },
    { key: "rebuttal", label: "Rebuttal Precision" },
    { key: "clarity", label: "Clarity of Argument" },
    { key: "persuasion", label: "Persuasiveness" },
  ];

  const handleDownloadPDF = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16 relative z-10 print:max-w-none print:p-0 print:m-0">
      
      {/* Printable Executive Dossier Header (Only renders when printing) */}
      <div className="hidden print:block mb-8 pb-6 border-b border-gray-300">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-gray-900">&#10037; IDEON</span>
            <span className="text-xs uppercase tracking-wider text-gray-500 font-mono">Official Debate Dossier</span>
          </div>
          <span className="text-xs text-gray-500 font-mono">{currentDate}</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mt-2">
          Topic: "{topic}"
        </h2>
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-700">
          <div>
            <span className="text-gray-500">Adjudicated Winner: </span>
            <strong className="text-gray-900 font-semibold">{verdict.winner} ({winnerPosition})</strong>
          </div>
          <div>
            <span className="text-gray-500">Final Score: </span>
            <strong>{winnerAvg} / 10.0</strong>
          </div>
          <div>
            <span className="text-gray-500">Total Rounds: </span>
            <strong>{turns.length} Turns</strong>
          </div>
        </div>
      </div>

      {/* Winner Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-[11px] sm:text-[12px] tracking-wide uppercase text-[var(--fg-faint)] font-medium mb-2.5">
          <Trophy className="w-3.5 h-3.5 text-[var(--fg)]" />
          <span>Stage 03 &middot; Official Adjudication</span>
        </div>
        
        {/* Winner Name with explicit FOR or AGAINST position */}
        <h1 className="text-2xl sm:text-5xl font-normal tracking-tight text-[var(--fg)] flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <span>Winner:</span>
          <span className="font-semibold">{verdict.winner}</span>
          <span className={`text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider border shadow-sm ${
            winnerPosition === 'FOR'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-300'
              : 'bg-rose-950/60 text-rose-300 border-rose-500/40 print:bg-rose-50 print:text-rose-800 print:border-rose-300'
          }`}>
            {winnerPosition}
          </span>
        </h1>
        
        <p className="text-xs sm:text-sm text-[var(--fg-soft)] mt-2.5 max-w-lg mx-auto px-2">
          Topic: <span className="text-[var(--fg)] font-medium">"{topic}"</span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 mt-6 no-print w-full sm:w-auto">
          <button
            onClick={handleDownloadPDF}
            className="pill !h-10 !px-5 text-xs gap-2 w-full sm:w-auto justify-center"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF Report</span>
          </button>
          <button
            onClick={onNewDebate}
            className="pill-secondary !h-10 !px-5 text-xs gap-2 w-full sm:w-auto justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Another Debate</span>
          </button>
        </div>
      </div>

      {/* Main Comparison Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        
        {/* Champion Overview */}
        <div className="paper-card p-6 flex flex-col justify-between text-center bg-[#131211]">
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h3 className="text-xl font-medium text-[var(--fg)]">{winnerProfile.name}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                winnerPosition === 'FOR'
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-950/50 text-rose-300 border-rose-500/30'
              }`}>
                {winnerPosition}
              </span>
            </div>
            <p className="text-xs text-[var(--fg-faint)] mb-4">{winnerProfile.tagline}</p>

            <div className="p-4 rounded-xl bg-[#1a1917] border border-[var(--rule-light)] mb-3">
              <span className="text-[11px] text-[var(--fg-faint)] uppercase tracking-wider block font-mono mb-0.5">
                Composite Score
              </span>
              <span className="text-3xl font-semibold text-[var(--fg)]">{winnerAvg}</span>
              <span className="text-xs text-[var(--fg-faint)]"> / 10.0</span>
            </div>
          </div>

          <div className="text-[11px] text-[var(--fg-faint)] font-mono">
            Judge Confidence: {Math.round(verdict.confidence * 100)}%
          </div>
        </div>

        {/* Score Comparison Bars */}
        <div className="md:col-span-2 paper-card p-4 sm:p-6 space-y-4 bg-[#131211]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--rule-light)]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-soft)]">
              Scoring Rubric Breakdown
            </h4>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
              <span className="font-medium text-[var(--fg)]">
                {verdict.winner} ({winnerPosition}): <span className="font-semibold">{winnerAvg}</span>
              </span>
              <span className="text-[var(--fg-faint)]">vs</span>
              <span className="text-[var(--fg-soft)]">
                {opponentName} ({opponentPosition}): <span>{opponentAvg}</span>
              </span>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {criteriaKeys.map(({ key, label }) => {
              const winScore = winnerScores[key] || 8.0;
              const oppScore = opponentScores[key] || 8.0;

              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--fg-soft)] font-medium">{label}</span>
                    <span className="font-mono text-[11px] text-[var(--fg-faint)]">
                      <span className="text-[var(--fg)] font-semibold">{winScore.toFixed(1)}</span>
                      <span className="mx-1">/</span>
                      <span>{oppScore.toFixed(1)}</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-[#22201d] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[var(--fg)] rounded-full"
                        style={{ width: `${winScore * 10}%` }}
                      />
                    </div>
                    <div className="w-full h-1 bg-[#22201d]/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[var(--fg-faint)] rounded-full"
                        style={{ width: `${oppScore * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Clashes Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mb-6">
        <div className="paper-card p-4 text-xs space-y-1.5 bg-[#131211]">
          <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider block">
            Strongest Point
          </span>
          <p className="text-[var(--fg-soft)] leading-relaxed">
            {verdict.strongest_argument}
          </p>
        </div>

        <div className="paper-card p-4 text-xs space-y-1.5 bg-[#131211]">
          <span className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider block">
            Weakest Point
          </span>
          <p className="text-[var(--fg-soft)] leading-relaxed">
            {verdict.weakest_argument}
          </p>
        </div>

        <div className="paper-card p-4 text-xs space-y-1.5 bg-[#131211]">
          <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider block">
            Key Turning Point
          </span>
          <p className="text-[var(--fg-soft)] leading-relaxed">
            {verdict.key_turning_point}
          </p>
        </div>
      </div>

      {/* Judicial Rationale */}
      <div className="paper-card p-4 sm:p-6 mb-8 bg-[#131211]">
        <h4 className="text-xs uppercase font-semibold tracking-wider text-[var(--fg-faint)] mb-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-[var(--fg)] shrink-0" />
          <span>Judge's Explanation &amp; Decision</span>
        </h4>
        <p className="text-[var(--fg)] text-xs sm:text-[14.5px] leading-relaxed">
          {verdict.reasoning}
        </p>
      </div>

      {/* Full Debate Transcript Section */}
      <div className="paper-card p-4 sm:p-6 mb-10 bg-[#131211] border border-[var(--rule)] print:border-none print:shadow-none print:p-0">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-[var(--rule)]">
          <div className="flex items-start sm:items-center gap-2.5">
            <FileText className="w-4 h-4 text-[var(--fg)] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h3 className="text-sm sm:text-base font-medium text-[var(--fg)]">
                Full Debate Transcript ({turns.length} Turns)
              </h3>
              <p className="text-xs text-[var(--fg-faint)]">
                Chronological record of all speeches, rebuttals, and verified claims.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print self-end sm:self-auto">
            <button
              onClick={() => setShowFullTranscript(!showFullTranscript)}
              className="pill-secondary !h-8 !px-3 text-xs gap-1"
            >
              <span>{showFullTranscript ? "Hide" : "Show"}</span>
              {showFullTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showFullTranscript && (
          <div className="space-y-4 sm:space-y-6">
            {turns.length === 0 ? (
              <p className="text-xs text-[var(--fg-faint)] italic">No speeches recorded.</p>
            ) : (
              turns.map((turn, idx) => {
                const isSpeakerA = turn.speaker_id === debater_a.agent.id;
                const speakerAgent = isSpeakerA ? debater_a.agent : debater_b.agent;
                const pos = turn.speaker_position;

                return (
                  <div 
                    key={idx}
                    className={`p-3.5 sm:p-5 rounded-xl border bg-[#171614] border-[var(--rule)] ${
                      pos === 'FOR' ? 'border-l-4 border-l-emerald-500/80' : 'border-l-4 border-l-rose-500/80'
                    }`}
                  >
                    {/* Turn Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2 pb-2 border-b border-[var(--rule-light)] text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--fg)]">{speakerAgent.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          pos === 'FOR' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          [{pos}]
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] sm:text-[11px] text-[var(--fg-faint)]">
                        Turn {String(idx + 1).padStart(2, '0')} &middot; {turn.is_cross_examination ? "Cross-Examination" : `Round ${turn.round_number}`}
                      </span>
                    </div>

                    {/* Cross-Exam Callout */}
                    {turn.is_cross_examination && turn.cross_exam_question && (
                      <div className="mb-3 p-2.5 rounded-lg bg-[#1a1917] border border-[var(--rule-light)] text-xs text-purple-300">
                        <span className="font-semibold block mb-0.5 uppercase text-[10px] tracking-wider">
                          Question asked to {turn.cross_exam_target}:
                        </span>
                        <p className="italic text-[var(--fg)]">"{turn.cross_exam_question}"</p>
                      </div>
                    )}

                    {/* Speech Body */}
                    <p className="text-xs sm:text-[13.5px] leading-relaxed text-[var(--fg-soft)]">
                      {turn.speech}
                    </p>

                    {/* Concession */}
                    {turn.concession && (
                      <div className="mt-3 p-2.5 rounded-lg bg-amber-950/20 border-l-2 border-amber-500 text-xs text-amber-200 flex items-start gap-1.5">
                        <CornerDownRight className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold uppercase text-[10px] block text-amber-300">Point Conceded:</span>
                          <p className="italic">{turn.concession}</p>
                        </div>
                      </div>
                    )}

                    {/* Fact checks */}
                    {turn.fact_checks && turn.fact_checks.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[var(--rule-light)] space-y-1.5">
                        <span className="text-[10px] uppercase font-semibold text-[var(--fg-faint)] tracking-wider block">
                          Verified Claims:
                        </span>
                        {turn.fact_checks.map((fc, fIdx) => (
                          <div key={fIdx} className="text-[11px] p-2.5 rounded bg-[#1a1917] flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-2 border border-[var(--rule-light)]">
                            <div>
                              <span className="text-[var(--fg)] font-medium">"{fc.claim}"</span>
                              <p className="text-[var(--fg-faint)] text-[10.5px] mt-0.5">{fc.explanation}</p>
                            </div>
                            <span className="font-bold text-[10px] uppercase text-emerald-400 shrink-0 self-start">
                              {fc.verdict}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Restart Footer Button */}
      <div className="text-center no-print pb-6">
        <button
          onClick={onNewDebate}
          className="pill !h-11 !px-7 text-[14px] w-full sm:w-auto inline-flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Start Another Debate</span>
        </button>
      </div>

    </div>
  );
}
