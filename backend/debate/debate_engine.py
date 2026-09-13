import uuid
import logging
from typing import Dict, Any, List, Optional
from backend.models.schemas import (
    DebateTurnRequest, DebateTurn, FactCheckClaim, PositionType
)
from backend.agents.agent_profiles import get_agent_by_id
from backend.agents.base_agent import BaseAgent
from backend.debate.fact_checker import fact_checker

logger = logging.getLogger("ideon.debate_engine")

class DebateEngine:
    """Orchestrates rounds, turn-taking, cross-examinations, and fact checks."""

    async def execute_turn(self, req: DebateTurnRequest) -> DebateTurn:
        speaker_profile = get_agent_by_id(req.current_speaker_id)
        opponent_profile = get_agent_by_id(req.opponent_id)

        agent = BaseAgent(speaker_profile)

        # Call Agent to formulate debate argument
        turn_data = await agent.debate_turn(
            topic=req.topic,
            assigned_position=req.speaker_position,
            round_number=req.round_number,
            opponent_profile=opponent_profile,
            opponent_position=req.opponent_position,
            previous_turns=req.previous_turns,
            is_cross_examination=req.is_cross_examination,
            asking_question_for_opponent=req.cross_exam_question_for_opponent,
            answering_question=req.answering_question
        )

        speech = str(turn_data.get("speech", "")).strip()
        main_arg = str(turn_data.get("main_argument", speech[:80])).strip()
        evidence = str(turn_data.get("evidence", "Logical necessity and real-world parallels.")).strip()
        counterarg = str(turn_data.get("counterargument", "Direct challenge to opponent premise.")).strip()
        concession = turn_data.get("concession")
        if concession and str(concession).lower() in ("none", "null", "no", "false", ""):
            concession = None
        elif concession:
            concession = str(concession).strip()

        cross_question = turn_data.get("cross_exam_question")
        if cross_question:
            cross_question = str(cross_question).strip()

        # Run Fact Checker on the spoken text
        fact_checks = []
        try:
            fact_checks = await fact_checker.analyze_speech(
                speaker_name=speaker_profile.name,
                speech=speech,
                topic=req.topic
            )
        except Exception as e:
            logger.warning(f"Fact checking non-fatal error: {e}")

        turn_index = len(req.previous_turns) + 1
        return DebateTurn(
            turn_id=str(uuid.uuid4()),
            round_number=req.round_number,
            turn_index=turn_index,
            speaker_id=speaker_profile.id,
            speaker_name=speaker_profile.name,
            speaker_position=req.speaker_position,
            speech=speech,
            main_argument=main_arg,
            evidence=evidence,
            counterargument=counterarg,
            concession=concession,
            fact_checks=fact_checks,
            is_cross_examination=req.is_cross_examination,
            cross_exam_question=cross_question if req.cross_exam_question_for_opponent else None,
            cross_exam_target=opponent_profile.name if req.cross_exam_question_for_opponent else None
        )

debate_engine = DebateEngine()
