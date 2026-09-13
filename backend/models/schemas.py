from typing import List, Dict, Optional, Literal, Any
from pydantic import BaseModel, Field
from backend.models.agent import AgentProfile

PositionType = Literal["FOR", "AGAINST", "NUANCED"]
VerdictType = Literal["SUPPORTED", "QUESTIONABLE", "FALSE", "OPINION", "UNVERIFIABLE"]

class TopicRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500)
    rounds: Optional[int] = Field(default=5, ge=1, le=10)

class AgentOpinion(BaseModel):
    agent_id: str
    agent_name: str
    interested: bool
    wants_to_debate: bool
    preferred_position: PositionType
    confidence: float = Field(ge=0.0, le=1.0)
    interest_score: float = Field(ge=0.0, le=1.0)
    reason: str

class OpinionPhaseResponse(BaseModel):
    topic: str
    opinions: List[AgentOpinion]

class MatchmakerRequest(BaseModel):
    topic: str
    opinions: List[AgentOpinion]

class MatchedDebater(BaseModel):
    agent: AgentProfile
    assigned_position: PositionType
    opinion: AgentOpinion

class MatchResult(BaseModel):
    debater_a: MatchedDebater
    debater_b: MatchedDebater
    match_score: float
    rationale: str

class FactCheckClaim(BaseModel):
    claim: str
    verdict: VerdictType
    explanation: str
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)

class DebateTurn(BaseModel):
    turn_id: str
    round_number: int
    turn_index: int
    speaker_id: str
    speaker_name: str
    speaker_position: PositionType
    speech: str
    main_argument: str
    evidence: str
    counterargument: str
    concession: Optional[str] = None
    fact_checks: List[FactCheckClaim] = []
    is_cross_examination: bool = False
    cross_exam_question: Optional[str] = None
    cross_exam_target: Optional[str] = None

class DebateTurnRequest(BaseModel):
    topic: str
    round_number: int
    current_speaker_id: str
    opponent_id: str
    speaker_position: PositionType
    opponent_position: PositionType
    previous_turns: List[DebateTurn] = []
    is_cross_examination: bool = False
    cross_exam_question_for_opponent: bool = False
    answering_question: Optional[str] = None

class JudgeRequest(BaseModel):
    topic: str
    debater_a_id: str
    debater_a_name: str
    debater_a_position: PositionType
    debater_b_id: str
    debater_b_name: str
    debater_b_position: PositionType
    turns: List[DebateTurn]

class AgentScores(BaseModel):
    logic: float
    evidence: float
    rebuttal: float
    clarity: float
    persuasion: float
    average: Optional[float] = None

class JudgeVerdict(BaseModel):
    winner: str
    winner_id: str
    scores: Dict[str, Dict[str, float]]
    strongest_argument: str
    weakest_argument: str
    key_turning_point: str
    reasoning: str
    confidence: float

class StatusResponse(BaseModel):
    status: str
    model: str
    api_key_configured: bool
    agent_count: int
