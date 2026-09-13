import asyncio
import sys
from pathlib import Path

# Ensure root directory is on path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(root_dir / "backend"))

from backend.config import settings
from backend.services.groq_service import groq_service
from backend.agents.agent_profiles import DEFAULT_AGENTS, get_agent_by_id
from backend.agents.base_agent import BaseAgent
from backend.debate.matchmaker import matchmaker
from backend.debate.debate_engine import debate_engine
from backend.debate.judge import judge
from backend.models.schemas import DebateTurnRequest, DebateTurn

async def run_end_to_end_test():
    print("=" * 60)
    print("  IDEON AUTOMATED END-TO-END DEBATE AGENT TEST")
    print("=" * 60)
    print(f"Active Model: {groq_service.current_model}")
    print(f"API Key Configured: {groq_service.is_configured}")

    topic = "Should governments implement universal basic income (UBI)?"
    print(f"\n[1/5] Gathering opinions on: '{topic}'...")

    # Test autonomous opinion generation on first 2 agents
    opinions = []
    for agent_profile in DEFAULT_AGENTS[:4]:
        agent = BaseAgent(agent_profile)
        op = await agent.evaluate_topic(topic)
        opinions.append(op)
        print(f"  - {op.agent_name}: {op.preferred_position} (confidence: {op.confidence}, interest: {op.interest_score})")
        print(f"    Reason: {op.reason}")

    print("\n[2/5] Running deterministic matchmaking...")
    match = matchmaker.select_match(topic, opinions)
    print(f"  Match: {match.debater_a.agent.name} ({match.debater_a.assigned_position}) vs {match.debater_b.agent.name} ({match.debater_b.assigned_position})")
    print(f"  Score: {match.match_score}")
    print(f"  Rationale: {match.rationale}")

    print("\n[3/5] Generating Turn 1 (Opening argument & live fact-check)...")
    turn1_req = DebateTurnRequest(
        topic=topic,
        round_number=1,
        current_speaker_id=match.debater_a.agent.id,
        opponent_id=match.debater_b.agent.id,
        speaker_position=match.debater_a.assigned_position,
        opponent_position=match.debater_b.assigned_position,
        previous_turns=[]
    )
    turn1 = await debate_engine.execute_turn(turn1_req)
    print(f"  Speaker: {turn1.speaker_name} ({turn1.speaker_position})")
    print(f"  Speech: {turn1.speech}")
    print(f"  Fact-Checks: {len(turn1.fact_checks)} claim(s)")
    for fc in turn1.fact_checks:
        print(f"    - [{fc.verdict}] \"{fc.claim}\" -> {fc.explanation}")

    print("\n[4/5] Generating Turn 2 (Rebuttal argument)...")
    turn2_req = DebateTurnRequest(
        topic=topic,
        round_number=1,
        current_speaker_id=match.debater_b.agent.id,
        opponent_id=match.debater_a.agent.id,
        speaker_position=match.debater_b.assigned_position,
        opponent_position=match.debater_a.assigned_position,
        previous_turns=[turn1]
    )
    turn2 = await debate_engine.execute_turn(turn2_req)
    print(f"  Speaker: {turn2.speaker_name} ({turn2.speaker_position})")
    print(f"  Speech: {turn2.speech}")

    print("\n[5/5] Invoking Impartial Judge AI...")
    verdict = await judge.evaluate_debate(
        topic=topic,
        debater_a_id=match.debater_a.agent.id,
        debater_a_name=match.debater_a.agent.name,
        debater_a_pos=match.debater_a.assigned_position,
        debater_b_id=match.debater_b.agent.id,
        debater_b_name=match.debater_b.agent.name,
        debater_b_pos=match.debater_b.assigned_position,
        turns=[turn1, turn2]
    )
    print(f"  Winner: {verdict.winner}")
    print(f"  Confidence: {verdict.confidence}")
    print(f"  Turning Point: {verdict.key_turning_point}")
    print(f"  Reasoning: {verdict.reasoning}")
    print(f"  Scores: {verdict.scores}")

    print("\n" + "=" * 60)
    print("  ALL 5 DEBATE PHASES PASSED WITH ZERO ERRORS!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_end_to_end_test())
