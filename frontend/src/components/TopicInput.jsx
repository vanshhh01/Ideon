import React, { useState } from 'react';
import { Dices, ArrowRight } from 'lucide-react';

const SUGGESTED_TOPICS = [
  "Should AI replace software engineers?",
  "Is college still necessary today?",
  "Should governments strictly regulate AI?",
  "Is remote work better than office work?",
  "Should social media have strict age limits?"
];

export default function TopicInput({ onSubmit, isLoading }) {
  const [topic, setTopic] = useState("");

  const handleRandomize = () => {
    const randomIndex = Math.floor(Math.random() * SUGGESTED_TOPICS.length);
    setTopic(SUGGESTED_TOPICS[randomIndex]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topic.trim()) {
      onSubmit(topic.trim());
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-20 text-center relative z-10">
      
      {/* Eyebrow */}
      <div className="inline-flex items-center justify-center gap-2 text-[11.5px] sm:text-[12.5px] tracking-wider uppercase text-[var(--fg-faint)] font-medium mb-3 sm:mb-4">
        <span>IDEON is an AI Debate Platform</span>
      </div>

      {/* Main Display Headline */}
      <h1 className="font-normal text-[clamp(28px,5.5vw,60px)] leading-[1.08] tracking-[-0.03em] text-[var(--fg)] max-w-2xl mx-auto mb-3 sm:mb-4 text-balance">
        Watch AI agents debate any topic.
      </h1>

      <p className="text-[clamp(14px,1.2vw,17px)] leading-relaxed text-[var(--fg-soft)] max-w-xl mx-auto mb-8 sm:mb-10 text-pretty px-2">
        Type any question or proposition. AI agents pick a side, debate it out round by round, and an AI judge decides who made the stronger case.
      </p>

      {/* Main Topic Input Box */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#131211] p-2 sm:p-2.5 rounded-2xl sm:rounded-full border border-[var(--rule)] shadow-lg focus-within:border-[var(--fg-soft)] transition-all">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Type any debate question or topic..."
            disabled={isLoading}
            className="w-full px-3.5 sm:px-4 py-2.5 bg-transparent text-[var(--fg)] placeholder-[var(--fg-faint)] text-base sm:text-[15px] focus:outline-none"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end px-1 pb-1 sm:p-0">
            <button
              type="button"
              onClick={handleRandomize}
              title="Pick a random topic"
              className="p-2.5 text-[var(--fg-soft)] hover:text-[var(--fg)] hover:bg-white/5 rounded-full transition-colors cursor-pointer shrink-0"
            >
              <Dices className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!topic.trim() || isLoading}
              className="pill !h-10 !px-5 text-[13.5px] w-full sm:w-auto gap-2 justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#0a0908] border-t-transparent rounded-full animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Start Debate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Suggested Topics Tags */}
      <div className="max-w-2xl mx-auto">
        <p className="text-[11.5px] uppercase tracking-wider font-medium text-[var(--fg-faint)] mb-3">
          Popular topics to try
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SUGGESTED_TOPICS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setTopic(item)}
              className="pill-secondary !h-8 !px-3.5 text-xs text-[var(--fg-soft)] hover:text-[var(--fg)]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
