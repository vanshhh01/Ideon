import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.agents.agent_profiles import DEFAULT_AGENTS

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "IDEON AI Debate Arena"
    assert "status" in data
    assert "model" in data

def test_api_status_endpoint():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "api_key_configured" in data
    assert data["agent_count"] >= 8

def test_api_agents_endpoint():
    response = client.get("/api/agents")
    assert response.status_code == 200
    agents = response.json()
    assert len(agents) >= 8
    names = [a["name"] for a in agents]
    assert "Marcus" in names
    assert "Sofia" in names
    assert "Alex" in names

def test_matchmaker_api():
    payload = {
        "topic": "Should social media have age restrictions?",
        "opinions": [
            {
                "agent_id": "sofia",
                "agent_name": "Sofia",
                "interested": True,
                "wants_to_debate": True,
                "preferred_position": "FOR",
                "confidence": 0.88,
                "interest_score": 0.92,
                "reason": "Protecting youth mental health is an urgent ethical priority."
            },
            {
                "agent_id": "leo",
                "agent_name": "Leo",
                "interested": True,
                "wants_to_debate": True,
                "preferred_position": "AGAINST",
                "confidence": 0.85,
                "interest_score": 0.89,
                "reason": "Restrictions will only foster black markets and censorship."
            }
        ]
    }
    response = client.post("/api/match", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["debater_a"]["agent"]["id"] in ["sofia", "leo"]
    assert data["debater_b"]["agent"]["id"] in ["sofia", "leo"]
    assert len(data["rationale"]) > 10
