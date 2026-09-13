import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import AnimatedBackground from './components/AnimatedBackground';
import TopicInput from './components/TopicInput';
import AgentRoster from './components/AgentRoster';
import MatchFound from './components/MatchFound';
import DebateArena from './components/DebateArena';
import JudgeVerdict from './components/JudgeVerdict';

import { 
  getSystemStatus, fetchAgents, gatherOpinions, matchDebaters, 
  executeDebateTurn, judgeDebate 
} from './services/api';

const STAGES = {
  TOPIC: 'TOPIC',
  OPINIONS: 'OPINIONS',
  MATCHUP: 'MATCHUP',
  DEBATE: 'DEBATE',
  VERDICT: 'VERDICT'
};

export default function App() {
  const [currentStage, setCurrentStage] = useState(STAGES.TOPIC);
  const [status, setStatus] = useState(null);
  const [agents, setAgents] = useState([]);
  const [topic, setTopic] = useState("");
  const [opinions, setOpinions] = useState([]);
  const [match, setMatch] = useState(null);
  const [turns, setTurns] = useState([]);
  const [verdict, setVerdict] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTurn, setIsGeneratingTurn] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auto-play timer ref for debate turns
  const autoPlayRef = useRef(null);
  const turnsRef = useRef(turns);
  const isPausedRef = useRef(isPaused);
  const isGeneratingRef = useRef(isGeneratingTurn);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isGeneratingRef.current = isGeneratingTurn;
  }, [isGeneratingTurn]);

  // Load system status and default agents on mount
  const refreshStatusAndAgents = useCallback(async () => {
    try {
      const s = await getSystemStatus();
      setStatus(s);
      const agList = await fetchAgents();
      setAgents(agList);
    } catch (err) {
      console.warn("Initial load warning:", err);
    }
  }, []);

  useEffect(() => {
    refreshStatusAndAgents();
  }, [refreshStatusAndAgents]);

  // Handler: Start topic opinion phase
  const handleTopicSubmit = async (selectedTopic) => {
    setTopic(selectedTopic);
    setOpinions([]);
    setMatch(null);
    setTurns([]);
    setVerdict(null);
    setErrorMessage(null);
    setCurrentStage(STAGES.OPINIONS);
    setIsLoading(true);

    try {
      const data = await gatherOpinions(selectedTopic);
      setOpinions(data.opinions);
    } catch (err) {
      setErrorMessage(err.message || "Failed to gather opinions from agents");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Run deterministic matchmaker or accept custom/random matchup
  const handleProceedToMatch = async (customMatch = null) => {
    if (customMatch) {
      setMatch(customMatch);
      setCurrentStage(STAGES.MATCHUP);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const matchResult = await matchDebaters(topic, opinions);
      setMatch(matchResult);
      setCurrentStage(STAGES.MATCHUP);
    } catch (err) {
      setErrorMessage(err.message || "Matchmaker failed to pair agents");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Enter Arena
  const handleEnterArena = () => {
    setCurrentStage(STAGES.DEBATE);
    setTurns([]);
    setIsPaused(false);
    // Start Turn 1
    setTimeout(() => {
      advanceDebateTurn();
    }, 600);
  };

  // Handler: Judge AI evaluation
  const triggerJudging = async () => {
    if (!match) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const payload = {
        topic,
        debater_a_id: match.debater_a.agent.id,
        debater_a_name: match.debater_a.agent.name,
        debater_a_position: match.debater_a.assigned_position,
        debater_b_id: match.debater_b.agent.id,
        debater_b_name: match.debater_b.agent.name,
        debater_b_position: match.debater_b.assigned_position,
        turns: turnsRef.current
      };

      const verdictData = await judgeDebate(payload);
      setVerdict(verdictData);
      setCurrentStage(STAGES.VERDICT);
    } catch (err) {
      setErrorMessage(err.message || "Failed to adjudicate debate");
    } finally {
      setIsLoading(false);
    }
  };

  // Turn calculation and execution
  const advanceDebateTurn = async () => {
    if (isGeneratingRef.current || !match) return;

    const currentTurns = turnsRef.current;
    const { debater_a, debater_b } = match;

    // Total normal rounds: 5 rounds (each has 2 turns = 10 turns)
    // Cross-examination: 4 turns (Turns 11, 12, 13, 14)
    // Total debate turns = 14
    const turnCount = currentTurns.length;

    if (turnCount >= 14) {
      // Finished debate, invoke Judge!
      triggerJudging();
      return;
    }

    setIsGeneratingTurn(true);

    let roundNumber = 1;
    let speaker = debater_a;
    let opponent = debater_b;
    let isCrossExam = false;
    let isAskingQuestion = false;
    let answeringQuestion = null;

    if (turnCount < 10) {
      // Standard rounds 1 to 5
      roundNumber = Math.floor(turnCount / 2) + 1;
      const isTurnA = turnCount % 2 === 0;
      speaker = isTurnA ? debater_a : debater_b;
      opponent = isTurnA ? debater_b : debater_a;
    } else {
      // Cross-Examination phase (Turns 10, 11, 12, 13 => 0-indexed)
      isCrossExam = true;
      roundNumber = 6; // Cross-exam marker
      if (turnCount === 10) {
        // Debater A asks Debater B
        speaker = debater_a;
        opponent = debater_b;
        isAskingQuestion = true;
      } else if (turnCount === 11) {
        // Debater B answers Debater A
        speaker = debater_b;
        opponent = debater_a;
        const lastTurn = currentTurns[10];
        answeringQuestion = lastTurn?.cross_exam_question || lastTurn?.speech;
      } else if (turnCount === 12) {
        // Debater B asks Debater A
        speaker = debater_b;
        opponent = debater_a;
        isAskingQuestion = true;
      } else if (turnCount === 13) {
        // Debater A answers Debater B
        speaker = debater_a;
        opponent = debater_b;
        const lastTurn = currentTurns[12];
        answeringQuestion = lastTurn?.cross_exam_question || lastTurn?.speech;
      }
    }

    setActiveSpeakerId(speaker.agent.id);

    try {
      const turnPayload = {
        topic,
        round_number: roundNumber,
        current_speaker_id: speaker.agent.id,
        opponent_id: opponent.agent.id,
        speaker_position: speaker.assigned_position,
        opponent_position: opponent.assigned_position,
        previous_turns: currentTurns,
        is_cross_examination: isCrossExam,
        cross_exam_question_for_opponent: isAskingQuestion,
        answering_question: answeringQuestion
      };

      const newTurn = await executeDebateTurn(turnPayload);
      setTurns(prev => [...prev, newTurn]);
    } catch (err) {
      setErrorMessage(err.message || "Error generating debate speech turn");
    } finally {
      setIsGeneratingTurn(false);
      setActiveSpeakerId(null);
    }
  };

  // Auto-advance loop when not paused
  useEffect(() => {
    if (currentStage !== STAGES.DEBATE) return;
    if (isPaused || isGeneratingTurn) return;

    if (turns.length >= 14) {
      const judgeTimer = setTimeout(() => {
        triggerJudging();
      }, 500);
      return () => clearTimeout(judgeTimer);
    }

    // Interval to advance next turn automatically
    autoPlayRef.current = setTimeout(() => {
      if (!isPausedRef.current && !isGeneratingRef.current) {
        advanceDebateTurn();
      }
    }, 2800);

    return () => clearTimeout(autoPlayRef.current);
  }, [turns.length, isPaused, isGeneratingTurn, currentStage]);

  // Reset entire debate flow
  const handleReset = () => {
    clearTimeout(autoPlayRef.current);
    setCurrentStage(STAGES.TOPIC);
    setTopic("");
    setOpinions([]);
    setMatch(null);
    setTurns([]);
    setVerdict(null);
    setErrorMessage(null);
    setIsPaused(false);
  };

  const currentRoundNum = Math.min(5, Math.floor(turns.length / 2) + 1);
  const isCrossExamActive = turns.length >= 10;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--shade)] text-[var(--fg)] relative selection:bg-[#0d0c0b] selection:text-[#ffffff] print:bg-white print:text-black">
      {/* Animated Floating Generative Pattern */}
      <AnimatedBackground />

      {/* Editorial Grain Overlay */}
      <div className="editorial-grain" aria-hidden="true" />
      
      {/* Top Navigation */}
      <Navbar onReset={handleReset} />

      {/* Global Error Notification */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto mt-4 px-4 w-full relative z-10">
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm flex items-center justify-between gap-3 shadow-sm">
            <span>{errorMessage}</span>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="text-xs uppercase font-semibold text-red-300 hover:text-white underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Flow Stage Router */}
      <main className="flex-1 relative z-10">
        {currentStage === STAGES.TOPIC && (
          <TopicInput
            onSubmit={handleTopicSubmit}
            isLoading={isLoading}
          />
        )}

        {currentStage === STAGES.OPINIONS && (
          <AgentRoster
            topic={topic}
            agents={agents}
            opinions={opinions}
            isLoading={isLoading}
            onProceedToMatch={handleProceedToMatch}
            canProceed={opinions.length > 0 && !isLoading}
          />
        )}

        {currentStage === STAGES.MATCHUP && (
          <MatchFound
            match={match}
            topic={topic}
            onEnterArena={handleEnterArena}
          />
        )}

        {currentStage === STAGES.DEBATE && (
          <DebateArena
            topic={topic}
            match={match}
            currentRound={currentRoundNum}
            totalRounds={5}
            turns={turns}
            isGenerating={isGeneratingTurn}
            activeSpeakerId={activeSpeakerId}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onSkipTurn={advanceDebateTurn}
            onEndDebateEarly={triggerJudging}
            isCrossExamStage={isCrossExamActive}
          />
        )}

        {currentStage === STAGES.VERDICT && (
          <JudgeVerdict
            verdict={verdict}
            match={match}
            topic={topic}
            turns={turns}
            onNewDebate={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[var(--rule)] text-center text-xs tracking-wider text-[var(--fg-faint)] relative z-10">
        IDEON. Made with love by Vansh
      </footer>

    </div>
  );
}
