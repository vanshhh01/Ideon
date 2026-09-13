import logging
from typing import List, Tuple, Dict, Any, Optional
from backend.models.agent import AgentProfile
from backend.models.schemas import AgentOpinion, MatchResult, MatchedDebater, PositionType
from backend.agents.agent_profiles import AGENTS_MAP, DEFAULT_AGENTS

logger = logging.getLogger("ideon.matchmaker")

class Matchmaker:
    """Deterministic matchmaker selecting two optimal debate combatants."""

    PERSONALITY_CONTRAST_PAIRS = {
        ("marcus", "sofia"): 25,  # Aggressive Tech vs Empathetic Humanist
        ("alex", "maya"): 25,    # Empirical Skeptic vs Audacious Visionary
        ("daniel", "leo"): 20,   # Moral Dialectician vs Sarcastic Contrarian
        ("emma", "zara"): 22,    # Pragmatic Realist vs Planetary Sentinel
        ("marcus", "daniel"): 18, # Tech Meritocracy vs Moral Ethics
        ("sofia", "leo"): 18,    # Empathy vs Cynical Satire
        ("alex", "marcus"): 16,  # Empirical rigor vs Bold tech ambition
        ("maya", "emma"): 15,    # Visionary optimism vs Grounded trade-offs
    }

    @staticmethod
    def _topic_expertise_overlap(agent: AgentProfile, topic: str) -> float:
        """Score based on how closely agent's interests and values match words in the topic."""
        topic_lower = topic.lower()
        score = 0.0
        for interest in agent.interests:
            if interest.lower() in topic_lower:
                score += 15.0
            for word in interest.lower().split():
                if len(word) > 3 and word in topic_lower:
                    score += 5.0

        for val in agent.values:
            if val.lower() in topic_lower:
                score += 10.0

        return min(score, 30.0)

    @classmethod
    def select_match(cls, topic: str, opinions: List[AgentOpinion]) -> MatchResult:
        """Deterministic selection of two combatants based on topic, stances, and personalities."""
        # Filter candidates who want to debate
        candidates = [op for op in opinions if op.wants_to_debate and op.interested]
        if len(candidates) < 2:
            # Fallback if fewer than 2 volunteered
            candidates = sorted(opinions, key=lambda o: (o.interest_score, o.confidence), reverse=True)[:2]
            if len(candidates) < 2:
                # Absolute fallback using default agents
                op_a = AgentOpinion(
                    agent_id="marcus",
                    agent_name="Marcus",
                    interested=True,
                    wants_to_debate=True,
                    preferred_position="FOR",
                    confidence=0.9,
                    interest_score=0.9,
                    reason="Technology and disruption are paramount."
                )
                op_b = AgentOpinion(
                    agent_id="sofia",
                    agent_name="Sofia",
                    interested=True,
                    wants_to_debate=True,
                    preferred_position="AGAINST",
                    confidence=0.85,
                    interest_score=0.85,
                    reason="Human wellbeing and ethics must lead."
                )
                candidates = [op_a, op_b]

        best_score = -1.0
        best_pair: Optional[Tuple[AgentOpinion, AgentOpinion]] = None
        best_positions: Tuple[PositionType, PositionType] = ("FOR", "AGAINST")

        # Evaluate every unique candidate pair
        for i in range(len(candidates)):
            for j in range(i + 1, len(candidates)):
                op1 = candidates[i]
                op2 = candidates[j]
                agent1 = AGENTS_MAP.get(op1.agent_id)
                agent2 = AGENTS_MAP.get(op2.agent_id)
                if not agent1 or not agent2:
                    continue

                # 1. Base interest and confidence score (up to 30 pts)
                combined_interest = (op1.interest_score + op2.interest_score) * 10
                combined_conf = (op1.confidence + op2.confidence) * 5
                base_score = combined_interest + combined_conf

                # 2. Position compatibility (Opposing is best: +50 pts; Nuanced vs Stance: +25 pts; Same stance: +5 pts)
                pos1 = op1.preferred_position
                pos2 = op2.preferred_position

                if (pos1 == "FOR" and pos2 == "AGAINST"):
                    stance_score = 50.0
                    assigned = ("FOR", "AGAINST")
                elif (pos1 == "AGAINST" and pos2 == "FOR"):
                    stance_score = 50.0
                    assigned = ("AGAINST", "FOR")
                elif (pos1 in ("FOR", "AGAINST") and pos2 == "NUANCED"):
                    stance_score = 30.0
                    assigned = (pos1, "AGAINST" if pos1 == "FOR" else "FOR")
                elif (pos2 in ("FOR", "AGAINST") and pos1 == "NUANCED"):
                    stance_score = 30.0
                    assigned = ("AGAINST" if pos2 == "FOR" else "FOR", pos2)
                else:
                    # Both preferred same stance or both nuanced
                    stance_score = 10.0
                    # Assign opposing based on confidence
                    if op1.confidence >= op2.confidence:
                        assigned = (pos1 if pos1 in ("FOR", "AGAINST") else "FOR",
                                    "AGAINST" if pos1 == "FOR" else "FOR")
                    else:
                        assigned = ("AGAINST" if pos2 == "FOR" else "FOR",
                                    pos2 if pos2 in ("FOR", "AGAINST") else "AGAINST")

                # 3. Topic expertise overlap (up to 30 pts each)
                overlap1 = cls._topic_expertise_overlap(agent1, topic)
                overlap2 = cls._topic_expertise_overlap(agent2, topic)
                expertise_score = overlap1 + overlap2

                # 4. Personality contrast bonus (up to 25 pts)
                contrast_key1 = (agent1.id, agent2.id)
                contrast_key2 = (agent2.id, agent1.id)
                contrast_score = cls.PERSONALITY_CONTRAST_PAIRS.get(
                    contrast_key1,
                    cls.PERSONALITY_CONTRAST_PAIRS.get(contrast_key2, 10.0)
                )

                total_pair_score = base_score + stance_score + expertise_score + contrast_score

                if total_pair_score > best_score:
                    best_score = total_pair_score
                    best_pair = (op1, op2)
                    best_positions = assigned

        if not best_pair:
            # Fallback to first two
            best_pair = (candidates[0], candidates[1])
            best_positions = ("FOR", "AGAINST")
            best_score = 80.0

        op_a, op_b = best_pair
        agent_a = AGENTS_MAP[op_a.agent_id]
        agent_b = AGENTS_MAP[op_b.agent_id]
        pos_a, pos_b = best_positions

        # Build readable explanation rationale
        rationale = (
            f"{agent_a.name} was selected due to their {', '.join(agent_a.interests[:2])} domain focus "
            f"and {agent_a.debate_style.lower()} advocacy for the {pos_a} position. "
            f"{agent_b.name} was paired as an ideal counterweight, bringing a {pos_b} perspective grounded "
            f"in {', '.join(agent_b.values[:2])} and {agent_b.debate_style.lower()}."
        )

        return MatchResult(
            debater_a=MatchedDebater(
                agent=agent_a,
                assigned_position=pos_a,
                opinion=op_a
            ),
            debater_b=MatchedDebater(
                agent=agent_b,
                assigned_position=pos_b,
                opinion=op_b
            ),
            match_score=round(best_score, 1),
            rationale=rationale
        )

matchmaker = Matchmaker()
