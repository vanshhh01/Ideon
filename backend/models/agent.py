from typing import List, Optional
from pydantic import BaseModel, Field

class AgentProfile(BaseModel):
    id: str
    name: str
    tagline: str
    avatar: str
    personality: str
    interests: List[str]
    values: List[str]
    debate_style: str
    base_confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    willingness: float = Field(default=0.9, ge=0.0, le=1.0)
    color: str = "#3B82F6"
    badge_bg: str = "from-cyan-500/20 to-blue-500/20"
