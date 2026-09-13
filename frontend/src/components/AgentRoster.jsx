import React, { useState } from 'react';
import { ArrowRight, Shuffle, Cpu, UserCheck } from 'lucide-react';

export default function AgentRoster({ 
  topic, 
  agents, 
  opinions, 
  isLoading, 
  onProceedToMatch, 
  canProceed 
}) {
  const [matchMode, setMatchMode] = useState('auto'); // 'auto' | 'random' | 'manual'
  const [selectedForId, setSelectedForId] = useState(null);
  const [selectedAgainstId, setSelectedAgainstId] = useState(null);

  const getOpinionForAgent = (agentId) => {
    const op = opinions?.find(o => o.agent_id === agentId);
    if (!op) return null;
    const pos = op.preferred_position === "AGAINST" ? "AGAINST" : "FOR";
    return { ...op, preferred_position: pos };
  };

  // Handler: Random pairing
  const handleRandomPairing = () => {
    if (!agents || agents.length < 2) return;
    const shuffled = [...agents].sort(() => 0.5 - Math.random());
    const agentA = shuffled[0];
    const agentB = shuffled[1];
    const opA = getOpinionForAgent(agentA.id) || { reason: "Argues the affirmative side", confidence: 0.85, preferred_position: "FOR" };
    const opB = getOpinionForAgent(agentB.id) || { reason: "Argues the counter side", confidence: 0.85, preferred_position: "AGAINST" };

    const randomMatch = {
      debater_a: {
        agent: agentA,
        assigned_position: "FOR",
        opinion: { ...opA, preferred_position: "FOR" }
      },
      debater_b: {
        agent: agentB,
        assigned_position: "AGAINST",
        opinion: { ...opB, preferred_position: "AGAINST" }
      },
      rationale: `Random pairing between ${agentA.name} and ${agentB.name}.`,
      match_score: "Random Pair"
    };

    onProceedToMatch(randomMatch);
  };

  // Handler: Manual confirm
  const handleConfirmManual = () => {
    if (!selectedForId || !selectedAgainstId || selectedForId === selectedAgainstId) return;
    const agentA = agents.find(a => a.id === selectedForId);
    const agentB = agents.find(a => a.id === selectedAgainstId);
    const opA = getOpinionForAgent(agentA.id) || { reason: "Argues FOR", confidence: 0.9, preferred_position: "FOR" };
    const opB = getOpinionForAgent(agentB.id) || { reason: "Argues AGAINST", confidence: 0.9, preferred_position: "AGAINST" };

    const manualMatch = {
      debater_a: {
        agent: agentA,
        assigned_position: "FOR",
        opinion: { ...opA, preferred_position: "FOR" }
      },
      debater_b: {
        agent: agentB,
        assigned_position: "AGAINST",
        opinion: { ...opB, preferred_position: "AGAINST" }
      },
      rationale: `You chose ${agentA.name} to argue FOR, and ${agentB.name} to argue AGAINST.`,
      match_score: "Your Selection"
    };

    onProceedToMatch(manualMatch);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 relative z-10">
      
      {/* Stage Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--rule)]">
        <div>
          <div className="inline-flex items-center gap-2 text-[12px] tracking-wide uppercase text-[var(--fg-faint)] font-medium mb-1.5">
            Step 1 &middot; Agent Stances
          </div>
          <h2 className="text-xl sm:text-2xl font-normal tracking-tight text-[var(--fg)]">
            Topic: <span className="font-medium text-[var(--fg)]">"{topic}"</span>
          </h2>
          <p className="text-xs sm:text-sm text-[var(--fg-soft)] mt-1">
            Every AI agent takes a firm side. You can auto-match, randomly roll, or manually pick opponents.
          </p>
        </div>

        {/* Pairing Mode Selectors */}
        {canProceed && (
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex w-full sm:w-auto p-1 rounded-full bg-[#1a1917] border border-[var(--rule)]">
              <button
                onClick={() => setMatchMode('auto')}
                className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  matchMode === 'auto' 
                    ? 'bg-[var(--fg)] text-[var(--shade)] shadow-sm' 
                    : 'text-[var(--fg-soft)] hover:text-[var(--fg)]'
                }`}
              >
                Auto Match
              </button>
              <button
                onClick={() => setMatchMode('random')}
                className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  matchMode === 'random' 
                    ? 'bg-[var(--fg)] text-[var(--shade)] shadow-sm' 
                    : 'text-[var(--fg-soft)] hover:text-[var(--fg)]'
                }`}
              >
                Random Pair
              </button>
              <button
                onClick={() => setMatchMode('manual')}
                className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  matchMode === 'manual' 
                    ? 'bg-[var(--fg)] text-[var(--shade)] shadow-sm' 
                    : 'text-[var(--fg-soft)] hover:text-[var(--fg)]'
                }`}
              >
                Pick Manually
              </button>
            </div>

            <div className="w-full sm:w-auto flex sm:inline-flex">
              {matchMode === 'auto' && (
                <button
                  onClick={() => onProceedToMatch()}
                  className="pill !h-9 !px-4 text-xs gap-1.5 w-full sm:w-auto justify-center"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Pair Opponents</span>
                </button>
              )}

              {matchMode === 'random' && (
                <button
                  onClick={handleRandomPairing}
                  className="pill !h-9 !px-4 text-xs gap-1.5 w-full sm:w-auto justify-center"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Roll Random</span>
                </button>
              )}

              {matchMode === 'manual' && (
                <button
                  onClick={handleConfirmManual}
                  disabled={!selectedForId || !selectedAgainstId || selectedForId === selectedAgainstId}
                  className="pill !h-9 !px-4 text-xs gap-1.5 disabled:opacity-30 w-full sm:w-auto justify-center"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Confirm Debaters</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual Selection Notification Banner */}
      {matchMode === 'manual' && (
        <div className="mb-6 p-4 rounded-xl bg-[#1a1917] border border-[var(--rule)] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[var(--fg-soft)]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-semibold text-[var(--fg)]">Manual Selection:</span>
            <span>Click <strong>Pick FOR</strong> on one agent, and <strong>Pick AGAINST</strong> on another.</span>
          </div>
          <div className="flex items-center gap-2.5 font-mono text-[11px] pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--rule-light)]">
            <span className={selectedForId ? "text-emerald-400 font-semibold" : "text-[var(--fg-faint)]"}>
              FOR: {selectedForId ? agents.find(a => a.id === selectedForId)?.name : "(None)"}
            </span>
            <span>&middot;</span>
            <span className={selectedAgainstId ? "text-rose-400 font-semibold" : "text-[var(--fg-faint)]"}>
              AGAINST: {selectedAgainstId ? agents.find(a => a.id === selectedAgainstId)?.name : "(None)"}
            </span>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 p-4 mb-8 rounded-xl bg-[#131211] border border-[var(--rule)] text-[var(--fg-soft)] shadow-sm">
          <div className="w-4 h-4 border-2 border-[var(--fg)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wide">
            Asking AI agents for their stances...
          </span>
        </div>
      )}

      {/* Agent Opinion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const opinion = getOpinionForAgent(agent.id);
          const isReady = !!opinion;

          const isSelectedFor = selectedForId === agent.id;
          const isSelectedAgainst = selectedAgainstId === agent.id;

          let cardBorder = "border-[var(--rule)]";
          if (isSelectedFor) cardBorder = "!border-emerald-500 ring-1 ring-emerald-500/50";
          if (isSelectedAgainst) cardBorder = "!border-rose-500 ring-1 ring-rose-500/50";

          const isFor = opinion?.preferred_position === "FOR";

          return (
            <div 
              key={agent.id}
              className={`paper-card p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 min-h-[220px] ${cardBorder} ${
                isReady ? 'bg-[#131211]' : 'bg-[#131211]/60 opacity-60'
              }`}
            >
              <div>
                {/* Header (No Avatar / No PFP text) */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-medium text-sm text-[var(--fg)] leading-tight">
                      {agent.name}
                    </h3>
                    <p className="text-[11px] text-[var(--fg-faint)] leading-tight mt-0.5">{agent.tagline}</p>
                  </div>

                  {opinion && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                      isFor 
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' 
                        : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                    }`}>
                      {opinion.preferred_position}
                    </span>
                  )}
                </div>

                {/* Stance statement */}
                {opinion ? (
                  <p className="text-xs text-[var(--fg-soft)] leading-relaxed italic bg-[#1a1917] p-3 rounded-xl border border-[var(--rule-light)] mb-3">
                    "{opinion.reason}"
                  </p>
                ) : (
                  <p className="text-xs text-[var(--fg-faint)] italic p-3 mb-3">
                    Deciding stance...
                  </p>
                )}
              </div>

              {/* Bottom: Manual Pick Controls OR Confidence */}
              <div className="pt-3 border-t border-[var(--rule-light)]">
                {matchMode === 'manual' ? (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        if (selectedAgainstId === agent.id) setSelectedAgainstId(null);
                        setSelectedForId(selectedForId === agent.id ? null : agent.id);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors cursor-pointer text-center ${
                        isSelectedFor 
                          ? 'bg-emerald-500 text-black border-emerald-400 font-semibold' 
                          : 'bg-emerald-950/20 text-emerald-300 border-emerald-500/20 hover:bg-emerald-950/40'
                      }`}
                    >
                      {isSelectedFor ? '✓ Picked FOR' : 'Pick FOR'}
                    </button>
                    <button
                      onClick={() => {
                        if (selectedForId === agent.id) setSelectedForId(null);
                        setSelectedAgainstId(selectedAgainstId === agent.id ? null : agent.id);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors cursor-pointer text-center ${
                        isSelectedAgainst 
                          ? 'bg-rose-500 text-black border-rose-400 font-semibold' 
                          : 'bg-rose-950/20 text-rose-300 border-rose-500/20 hover:bg-rose-950/40'
                      }`}
                    >
                      {isSelectedAgainst ? '✓ Picked AGAINST' : 'Pick AGAINST'}
                    </button>
                  </div>
                ) : (
                  opinion && (
                    <div className="flex items-center justify-between text-[11px] text-[var(--fg-faint)] font-mono">
                      <span>Confidence</span>
                      <span className="text-[var(--fg-soft)] font-medium">{Math.round(opinion.confidence * 100)}%</span>
                    </div>
                  )
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
