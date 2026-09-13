import sys
from pathlib import Path

# Add project root and backend dir to sys.path so uvicorn main:app works from both backend/ and root
_backend_dir = Path(__file__).resolve().parent
_root_dir = _backend_dir.parent
for _p in [str(_backend_dir), str(_root_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import asyncio
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import settings
from backend.models.schemas import (
    TopicRequest, AgentOpinion, OpinionPhaseResponse, MatchmakerRequest,
    MatchResult, DebateTurnRequest, DebateTurn, JudgeRequest, JudgeVerdict,
    StatusResponse
)
from backend.models.agent import AgentProfile
from backend.agents.agent_profiles import DEFAULT_AGENTS, AGENTS_MAP
from backend.agents.base_agent import BaseAgent
from backend.debate.matchmaker import matchmaker
from backend.debate.debate_engine import debate_engine
from backend.debate.judge import judge
from backend.services.groq_service import groq_service

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ideon.main")

app = FastAPI(
    title="IDEON — AI Debate Arena API",
    description="Multi-agent debate arena powered by Groq LLMs",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for local dev & testing flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UpdateSettingsRequest(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None

@app.get("/")
async def root():
    return {
        "app": "IDEON AI Debate Arena",
        "status": "online",
        "model": groq_service.current_model,
        "api_configured": groq_service.is_configured
    }

@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    return StatusResponse(
        status="ready" if groq_service.is_configured else "needs_api_key",
        model=groq_service.current_model,
        api_key_configured=groq_service.is_configured,
        agent_count=len(DEFAULT_AGENTS)
    )

@app.get("/api/models")
async def list_models():
    """Return available models verified or accessible from Groq."""
    models = await groq_service.list_accessible_models()
    return {"current_model": groq_service.current_model, "available_models": models}

@app.post("/api/settings")
async def update_settings(req: UpdateSettingsRequest):
    """Allow updating API key or model directly from frontend UI, persisting to .env."""
    groq_service.update_credentials(api_key=req.api_key, model=req.model)
    
    # Persist to backend/.env
    try:
        env_path = Path(__file__).resolve().parent / ".env"
        lines = []
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

        key_written = False
        model_written = False
        new_lines = []
        for line in lines:
            if line.startswith("GROQ_API_KEY=") and req.api_key:
                new_lines.append(f"GROQ_API_KEY={req.api_key.strip()}\n")
                key_written = True
            elif line.startswith("GROQ_MODEL=") and req.model:
                new_lines.append(f"GROQ_MODEL={req.model.strip()}\n")
                model_written = True
            else:
                new_lines.append(line)

        if not key_written and req.api_key:
            new_lines.append(f"GROQ_API_KEY={req.api_key.strip()}\n")
        if not model_written and req.model:
            new_lines.append(f"GROQ_MODEL={req.model.strip()}\n")

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    except Exception as e:
        logger.warning(f"Could not persist settings to .env: {e}")

    return {
        "success": True,
        "model": groq_service.current_model,
        "api_key_configured": groq_service.is_configured
    }

@app.get("/api/agents", response_model=List[AgentProfile])
async def list_agents():
    """Retrieve all available default agent profiles."""
    return DEFAULT_AGENTS

@app.post("/api/opinions", response_model=OpinionPhaseResponse)
async def gather_opinions(req: TopicRequest):
    """Concurrently send the debate topic to all agents to gather independent stances."""
    logger.info(f"Gathering opinions for topic: '{req.topic}' across {len(DEFAULT_AGENTS)} agents.")

    async def _evaluate_single(profile: AgentProfile) -> AgentOpinion:
        agent = BaseAgent(profile)
        return await agent.evaluate_topic(req.topic)

    # Gather asynchronously in parallel
    tasks = [_evaluate_single(agent) for agent in DEFAULT_AGENTS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    opinions: List[AgentOpinion] = []
    for i, res in enumerate(results):
        profile = DEFAULT_AGENTS[i]
        if isinstance(res, Exception):
            logger.error(f"Error gathering opinion for {profile.name}: {res}")
            # Resilient fallback
            opinions.append(AgentOpinion(
                agent_id=profile.id,
                agent_name=profile.name,
                interested=True,
                wants_to_debate=True,
                preferred_position="FOR" if i % 2 == 0 else "AGAINST",
                confidence=profile.base_confidence,
                interest_score=0.85,
                reason=f"As {profile.name}, I am eager to debate this critical issue."
            ))
        else:
            opinions.append(res)

    # Ensure ideological balance for a genuine debate:
    # If the council overwhelmingly agrees (e.g. all or nearly all agents pick AGAINST or FOR),
    # contrarian and bold agents step up as Devil's Advocates to ensure both sides are championed!
    for_ops = [op for op in opinions if op.preferred_position == "FOR"]
    against_ops = [op for op in opinions if op.preferred_position == "AGAINST"]
    contrarian_priority = ["leo", "kairos", "marcus", "maya", "alex", "daniel", "emma", "sofia"]

    if len(for_ops) < 3:
        needed = 3 - len(for_ops)
        # Sort against candidates by contrarian priority
        candidates = sorted(against_ops, key=lambda o: contrarian_priority.index(o.agent_id) if o.agent_id in contrarian_priority else 99)
        for op in candidates[:needed]:
            op.preferred_position = "FOR"
            op.reason = f"Stepping up as Devil's Advocate to challenge the council's consensus and argue the affirmative case."

    elif len(against_ops) < 3:
        needed = 3 - len(against_ops)
        candidates = sorted(for_ops, key=lambda o: contrarian_priority.index(o.agent_id) if o.agent_id in contrarian_priority else 99)
        for op in candidates[:needed]:
            op.preferred_position = "AGAINST"
            op.reason = f"Stepping up as Devil's Advocate: Consensus should always be challenged, and I will defend the counter-case."

    return OpinionPhaseResponse(
        topic=req.topic,
        opinions=opinions
    )

@app.post("/api/match", response_model=MatchResult)
async def match_agents(req: MatchmakerRequest):
    """Run deterministic matchmaking algorithm to pair optimal opposing debaters."""
    logger.info(f"Running matchmaker for topic: '{req.topic}' with {len(req.opinions)} opinions.")
    try:
        match_result = matchmaker.select_match(req.topic, req.opinions)
        return match_result
    except Exception as e:
        logger.exception(f"Matchmaker failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Matchmaker failed: {str(e)}"
        )

@app.post("/api/debate/turn", response_model=DebateTurn)
async def generate_debate_turn(req: DebateTurnRequest):
    """Execute a single debate turn with fact-checking."""
    logger.info(f"Debate turn requested: Round {req.round_number} | Speaker: {req.current_speaker_id} ({req.speaker_position})")
    try:
        turn = await debate_engine.execute_turn(req)
        return turn
    except Exception as e:
        logger.exception(f"Error in debate turn generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate debate turn: {str(e)}"
        )

@app.post("/api/judge", response_model=JudgeVerdict)
async def judge_debate(req: JudgeRequest):
    """Submit full debate transcript to Judge AI for scoring and declaration of winner."""
    logger.info(f"Judging debate between {req.debater_a_name} and {req.debater_b_name} with {len(req.turns)} turns.")
    try:
        verdict = await judge.evaluate_debate(
            topic=req.topic,
            debater_a_id=req.debater_a_id,
            debater_a_name=req.debater_a_name,
            debater_a_pos=req.debater_a_position,
            debater_b_id=req.debater_b_id,
            debater_b_name=req.debater_b_name,
            debater_b_pos=req.debater_b_position,
            turns=req.turns
        )
        return verdict
    except Exception as e:
        logger.exception(f"Error during judging: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Judging failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
