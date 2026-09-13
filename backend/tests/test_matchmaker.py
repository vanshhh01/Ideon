import pytest
from backend.agents.agent_profiles import DEFAULT_AGENTS, get_agent_by_id
from backend.models.schemas import AgentOpinion
from backend.debate.matchmaker import matchmaker

def test_agents_population():
    assert len(DEFAULT_AGENTS) >= 8
    marcus = get_agent_by_id("marcus")
    assert marcus.name == "Marcus"
    assert "AI" in marcus.interests
    sofia = get_agent_by_id("sofia")
    assert sofia.name == "Sofia"

def test_matchmaker_deterministic_opposing():
    opinions = [
        AgentOpinion(
            agent_id="marcus",
            agent_name="Marcus",
            interested=True,
            wants_to_debate=True,
            preferred_position="FOR",
            confidence=0.9,
            interest_score=0.95,
            reason="Tech innovation must accelerate."
        ),
        AgentOpinion(
            agent_id="sofia",
            agent_name="Sofia",
            interested=True,
            wants_to_debate=True,
            preferred_position="AGAINST",
            confidence=0.85,
            interest_score=0.90,
            reason="Human wellbeing must come first."
        ),
        AgentOpinion(
            agent_id="alex",
            agent_name="Alex",
            interested=False,
            wants_to_debate=False,
            preferred_position="NUANCED",
            confidence=0.5,
            interest_score=0.3,
            reason="Not enough empirical data."
        ),
    ]

    topic = "Should AI replace software engineers?"
    match = matchmaker.select_match(topic, opinions)

    assert match.debater_a.agent.id in ["marcus", "sofia"]
    assert match.debater_b.agent.id in ["marcus", "sofia"]
    # Check that opposing positions are assigned
    positions = {match.debater_a.assigned_position, match.debater_b.assigned_position}
    assert "FOR" in positions
    assert "AGAINST" in positions
    assert len(match.rationale) > 20
