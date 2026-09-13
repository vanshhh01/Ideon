import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, Pause, SkipForward, Flag, HelpCircle, CornerDownRight, 
  ArrowDown
} from 'lucide-react';
import FactCheckBadge from './FactCheckBadge';

export default function DebateArena({
  topic,
  match,
  currentRound,
  totalRounds,
  turns,
  isGenerating,
  activeSpeakerId,
  isPaused,
  onTogglePause,
  onSkipTurn,
  onEndDebateEarly,
  isCrossExamStage
}) {
  const scrollRef = useRef(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);
  const prevTurnsCount = useRef(turns.length);
  const isAutoScrolling = useRef(false);

  // Monitor user scroll position
  const handleScroll = () => {
    if (!scrollRef.current || isAutoScrolling.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    
    const atBottom = distanceToBottom <= 120;
    if (atBottom) {
      setIsScrolledUp(false);
      setNewMessagesWhileScrolled(0);
    } else {
      setIsScrolledUp(true);
    }
  };

  // Handle incoming turns and generation changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const hasNewTurn = turns.length > prevTurnsCount.current;
    prevTurnsCount.current = turns.length;

    if (!isScrolledUp) {
      isAutoScrolling.current = true;
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      const timer = setTimeout(() => {
        isAutoScrolling.current = false;
      }, 350);
      return () => clearTimeout(timer);
    } else if (hasNewTurn) {
      setNewMessagesWhileScrolled(prev => prev + 1);
    }
  }, [turns, isGenerating, isScrolledUp]);

  // Jump to latest message
  const scrollToLatest = () => {
    if (!scrollRef.current) return;
    isAutoScrolling.current = true;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
    setIsScrolledUp(false);
    setNewMessagesWhileScrolled(0);
    setTimeout(() => {
      isAutoScrolling.current = false;
    }, 350);
  };

  if (!match) return null;

  const { debater_a, debater_b } = match;

  // Calculate percentage of debate completed (out of 14 turns)
  const progressPercent = Math.min(100, Math.round((turns.length / 14) * 100));

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-5 flex flex-col h-[calc(100dvh-4.5rem)] sm:h-[calc(100vh-5.5rem)] relative z-10">
      
      {/* Debate Top Bar */}
      <div className="paper-card p-3 sm:p-5 mb-3 bg-[#131211] border border-[var(--rule)] shadow-xl">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          
          {/* Topic & Live Status */}
          <div className="w-full md:flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-semibold tracking-wider uppercase bg-[#1a1917] text-[var(--fg-soft)] border border-[var(--rule)]">
                {isCrossExamStage ? "Cross-Examination" : `Round ${currentRound} of ${totalRounds}`}
              </span>
              <span className="text-[11px] sm:text-xs text-[var(--fg-faint)] font-mono">
                Turn {turns.length} of 14
              </span>
            </div>

            <h2 className="text-sm sm:text-lg font-medium text-[var(--fg)] truncate">
              "{topic}"
            </h2>
          </div>

          {/* Opponent Clash Bar */}
          <div className="w-full md:w-auto flex items-center justify-between sm:justify-start gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#1a1917] border border-[var(--rule)] text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-[var(--fg)] truncate max-w-[85px] sm:max-w-[130px] md:max-w-none">{debater_a.agent.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shrink-0">
                FOR
              </span>
            </div>

            <span className="text-[var(--fg-faint)] font-bold text-xs shrink-0 px-1">VS</span>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase bg-rose-950/60 text-rose-300 border border-rose-500/30 shrink-0">
                AGAINST
              </span>
              <span className="font-semibold text-[var(--fg)] truncate max-w-[85px] sm:max-w-[130px] md:max-w-none">{debater_b.agent.name}</span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-between sm:justify-end pt-1 md:pt-0 border-t md:border-t-0 border-[var(--rule-light)]">
            <button
              onClick={onTogglePause}
              className={`pill-secondary !h-8 sm:!h-9 flex-1 sm:flex-none !px-2.5 sm:!px-3.5 text-xs gap-1 sm:gap-1.5 ${
                isPaused 
                  ? '!bg-emerald-950/40 !text-emerald-300 !border-emerald-500/40' 
                  : ''
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 shrink-0" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 shrink-0" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              onClick={onSkipTurn}
              disabled={isGenerating}
              title="Go to next turn"
              className="pill-secondary !h-8 sm:!h-9 flex-1 sm:flex-none !px-2.5 sm:!px-3.5 text-xs gap-1 sm:gap-1.5 disabled:opacity-40"
            >
              <SkipForward className="w-3.5 h-3.5 shrink-0" />
              <span>Next</span>
            </button>

            <button
              onClick={onEndDebateEarly}
              className="pill-secondary !h-8 sm:!h-9 flex-1 sm:flex-none !px-2.5 sm:!px-3.5 text-xs gap-1 sm:gap-1.5 hover:!bg-white hover:!text-black"
              title="Call judge now"
            >
              <Flag className="w-3.5 h-3.5 shrink-0" />
              <span>Judge</span>
            </button>
          </div>

        </div>

      </div>

      {/* Hairline Progress Bar */}
      <div className="w-full h-[2px] bg-[#1a1917] mb-3 sm:mb-4 overflow-hidden rounded-full">
        <div 
          className="h-full bg-[var(--fg)] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Debate Transcript View with Smart Scroll */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto space-y-4 sm:space-y-5 pr-1 sm:pr-3 pb-8"
        >
          {turns.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 sm:p-8 border border-dashed border-[var(--rule)] rounded-2xl bg-[#131211]/50">
              <p className="font-medium text-[var(--fg)] text-base">Debate starting...</p>
              <p className="text-xs text-[var(--fg-soft)] mt-1 max-w-sm">
                {debater_a.agent.name} is preparing the opening speech for Round 1.
              </p>
            </div>
          )}

          {turns.map((turn, index) => {
            const isSpeakerA = turn.speaker_id === debater_a.agent.id;
            const speakerAgent = isSpeakerA ? debater_a.agent : debater_b.agent;
            const pos = turn.speaker_position;
            const turnNumberFormatted = String(index + 1).padStart(2, '0');

            return (
              <div 
                key={turn.turn_id || turn.turn_index || index}
                className={`flex flex-col w-full ${isSpeakerA ? 'items-start sm:pr-12' : 'items-end sm:pl-12'}`}
              >
                {/* Speaker Header Info */}
                <div className={`flex items-center gap-2 mb-1.5 px-1 max-w-full ${isSpeakerA ? 'flex-row' : 'flex-row-reverse'}`}>
                  <span className="text-xs font-semibold text-[var(--fg)] truncate">{speakerAgent.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${
                    pos === 'FOR'
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-950/50 text-rose-300 border-rose-500/30'
                  }`}>
                    {pos}
                  </span>
                  <span className="text-[10px] text-[var(--fg-faint)] font-mono shrink-0">
                    Turn {turnNumberFormatted} &middot; {turn.is_cross_examination ? "Cross-Exam" : `R${turn.round_number}`}
                  </span>
                </div>

                {/* Speech Card with Stance Accent */}
                <div className={`p-4 sm:p-6 rounded-2xl w-full sm:max-w-2xl text-[14px] sm:text-[14.5px] leading-relaxed border shadow-md transition-all ${
                  isSpeakerA 
                    ? 'bg-[#131211] border-[var(--rule)] border-l-4 border-l-emerald-500/80 text-[var(--fg)] rounded-tl-sm' 
                    : 'bg-[#171614] border-[var(--rule)] border-l-4 border-l-rose-500/80 text-[var(--fg)] rounded-tr-sm'
                }`}>
                  
                  {/* Cross-Exam Question Callout */}
                  {turn.is_cross_examination && turn.cross_exam_question && (
                    <div className="mb-3.5 sm:mb-4 p-3 sm:p-3.5 rounded-xl bg-[#1a1917] border border-[var(--rule)] text-[var(--fg)]">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1 text-purple-300">
                        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Question for {turn.cross_exam_target}:</span>
                      </div>
                      <p className="font-normal italic text-xs sm:text-sm text-[var(--fg)]">
                        "{turn.cross_exam_question}"
                      </p>
                    </div>
                  )}

                  {/* Main Spoken Argument */}
                  <p className="font-normal text-[var(--fg)] text-[14px] sm:text-[15px] leading-[1.65]">
                    {turn.speech}
                  </p>

                  {/* Concession Callout */}
                  {turn.concession && (
                    <div className="mt-3.5 sm:mt-4 p-3 rounded-xl bg-amber-950/20 border-l-2 border-amber-500 text-amber-200 text-xs flex items-start gap-2">
                      <CornerDownRight className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[10px] uppercase tracking-wider text-amber-300 block mb-0.5">
                          Point Conceded
                        </span>
                        <p className="italic text-amber-200">{turn.concession}</p>
                      </div>
                    </div>
                  )}

                  {/* Fact-Checker */}
                  <FactCheckBadge factChecks={turn.fact_checks} />

                </div>
              </div>
            );
          })}

          {/* Typing Deliberation Indicator */}
          {isGenerating && (
            <div className={`flex flex-col w-full ${activeSpeakerId === debater_a.agent.id ? 'items-start sm:pr-12' : 'items-end sm:pl-12'}`}>
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-xs font-medium text-[var(--fg-faint)]">
                  {activeSpeakerId === debater_a.agent.id ? debater_a.agent.name : debater_b.agent.name} is thinking...
                </span>
              </div>
              <div className="px-4 py-3 rounded-xl bg-[#131211] border border-[var(--rule)] flex items-center gap-3 shadow-md">
                <div className="flex items-center gap-1 h-3">
                  <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-pulse delay-75 h-4" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-pulse delay-150 h-2" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-pulse delay-200 h-3.5" />
                </div>
                <span className="text-xs text-[var(--fg-soft)] font-mono">
                  Writing argument...
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Floating "New Message Below" Button */}
        {isScrolledUp && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[90vw]">
            <button
              onClick={scrollToLatest}
              className="pill !h-9 !px-4 text-xs gap-2 shadow-xl truncate w-full"
            >
              <ArrowDown className="w-3.5 h-3.5 animate-bounce shrink-0" />
              <span className="truncate">
                {newMessagesWhileScrolled > 0 
                  ? `${newMessagesWhileScrolled} new message${newMessagesWhileScrolled > 1 ? 's' : ''} below`
                  : 'Jump to latest message'}
              </span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
