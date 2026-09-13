import logging
from typing import Dict, Any, List, Optional
from backend.models.agent import AgentProfile
from backend.models.schemas import AgentOpinion, PositionType, DebateTurn
from backend.services.groq_service import groq_service

logger = logging.getLogger("ideon.base_agent")

class BaseAgent:
    def __init__(self, profile: AgentProfile):
        self.profile = profile

    def _build_identity_prompt(self) -> str:
        interests_str = ", ".join(self.profile.interests)
        values_str = ", ".join(self.profile.values)
        return (
            f"You are {self.profile.name}, {self.profile.tagline}.\n"
            f"Personality: {self.profile.personality}\n"
            f"Key Interests: {interests_str}\n"
            f"Core Values: {values_str}\n"
            f"Debate Style: {self.profile.debate_style}\n"
            f"Base Confidence: {self.profile.base_confidence:.2f}\n"
        )

    async def evaluate_topic(self, topic: str) -> AgentOpinion:
        """Independently evaluate whether the agent is interested in debating this topic and their stance."""
        system_prompt = (
            f"{self._build_identity_prompt()}\n"
            "You are evaluating a potential debate topic to decide whether you want to participate.\n"
            "STYLE REQUIREMENT: Use VERY SIMPLE, everyday words and SHORT sentences. No big words or academic jargon.\n"
            "Respond strictly in JSON format with exactly the following keys:\n"
            "{\n"
            '  "interested": boolean,\n'
            '  "wants_to_debate": boolean,\n'
            '  "preferred_position": "FOR" | "AGAINST",\n'
            '  "confidence": float between 0.0 and 1.0,\n'
            '  "interest_score": float between 0.0 and 1.0,\n'
            '  "reason": "1 short, simple sentence in plain English explaining your stance"\n'
            "}\n"
            "Be true to your personality and values. If the topic aligns with your interests, your interest_score should be high.\n"
            "STRICT MANDATE: You MUST take a definitive side: either 'FOR' or 'AGAINST'. NEVER choose 'NUANCED' or neutral, regardless of the topic."
        )

        user_prompt = f'The debate topic is: "{topic}"\nChoose strictly FOR or AGAINST. Provide your evaluation strictly as JSON.'

        try:
            data = await groq_service.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.75,
                max_tokens=400
            )

            # Normalization and robust validation - strictly FOR or AGAINST
            interested = bool(data.get("interested", True))
            wants_to_debate = bool(data.get("wants_to_debate", True))
            raw_pos = str(data.get("preferred_position", "FOR")).upper().strip()
            if any(k in raw_pos for k in ["AGAINST", "CON", "OPPOSE", "DISAGREE", "NO"]):
                position: PositionType = "AGAINST"
            else:
                position: PositionType = "FOR"

            # Parse confidence
            raw_conf = data.get("confidence", self.profile.base_confidence)
            try:
                conf = float(raw_conf)
                if conf > 1.0:
                    conf = conf / 100.0
                confidence = max(0.1, min(1.0, conf))
            except (ValueError, TypeError):
                confidence = self.profile.base_confidence

            # Parse interest score
            raw_interest = data.get("interest_score", 0.8)
            try:
                inter = float(raw_interest)
                if inter > 1.0:
                    inter = inter / 100.0
                interest_score = max(0.1, min(1.0, inter))
            except (ValueError, TypeError):
                interest_score = 0.8

            reason = str(data.get("reason", f"As {self.profile.name}, I have strong views on this matter."))

            return AgentOpinion(
                agent_id=self.profile.id,
                agent_name=self.profile.name,
                interested=interested,
                wants_to_debate=wants_to_debate,
                preferred_position=position,
                confidence=round(confidence, 2),
                interest_score=round(interest_score, 2),
                reason=reason
            )

        except Exception as e:
            logger.warning(f"Error evaluating topic for {self.profile.name}: {e}. Falling back to default stance.")
            # Deterministic fallback stance in case of network/API error
            return AgentOpinion(
                agent_id=self.profile.id,
                agent_name=self.profile.name,
                interested=True,
                wants_to_debate=True,
                preferred_position="FOR" if "Marcus" in self.profile.name or "Maya" in self.profile.name else "AGAINST",
                confidence=self.profile.base_confidence,
                interest_score=0.85,
                reason=f"As {self.profile.name}, my values ({', '.join(self.profile.values[:2])}) compel me to speak on this."
            )

    async def debate_turn(
        self,
        topic: str,
        assigned_position: PositionType,
        round_number: int,
        opponent_profile: AgentProfile,
        opponent_position: PositionType,
        previous_turns: List[DebateTurn],
        is_cross_examination: bool = False,
        asking_question_for_opponent: bool = False,
        answering_question: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate an in-character debate argument, counterargument, concession, or cross-examination."""
        identity = self._build_identity_prompt()

        # Build transcript context
        transcript_lines = []
        for t in previous_turns:
            prefix = f"[Round {t.round_number} | {t.speaker_name} ({t.speaker_position})]"
            if t.is_cross_examination and t.cross_exam_question:
                transcript_lines.append(f"{prefix} Question asked: {t.cross_exam_question}")
            transcript_lines.append(f"{prefix}: {t.speech}")
        
        transcript_str = "\n".join(transcript_lines) if transcript_lines else "No previous arguments yet. You are opening the debate!"

        if is_cross_examination:
            if asking_question_for_opponent:
                system_prompt = (
                    f"{identity}\n"
                    f"You are in the CROSS-EXAMINATION round of a debate on: \"{topic}\".\n"
                    f"Your assigned stance is: {assigned_position}.\n"
                    f"Your opponent is {opponent_profile.name} (holding stance: {opponent_position}).\n\n"
                    "CRITICAL RULES — SIMPLE & SHORT LANGUAGE:\n"
                    "1. Use VERY SIMPLE, everyday words. Avoid academic jargon, big words, or complex metaphors.\n"
                    "2. Your spoken text MUST be only 1 to 2 short sentences asking your question directly.\n"
                    "Respond strictly in JSON format:\n"
                    "{\n"
                    '  "main_argument": "1 simple line on the flaw you are pointing out",\n'
                    '  "evidence": "1 simple reason or plain real-world fact",\n'
                    '  "counterargument": "Why their side struggles with this",\n'
                    '  "concession": null,\n'
                    '  "cross_exam_question": "Your single short, simple question",\n'
                    '  "speech": "Your spoken text in 1 to 2 short, simple sentences delivering the question"\n'
                    "}"
                )
                user_prompt = f"Previous debate transcript:\n{transcript_str}\n\nAsk your short, simple cross-examination question to {opponent_profile.name}."
            else:
                system_prompt = (
                    f"{identity}\n"
                    f"You are in the CROSS-EXAMINATION round of a debate on: \"{topic}\".\n"
                    f"Your assigned stance is: {assigned_position}.\n"
                    f"Your opponent {opponent_profile.name} just asked you this question:\n"
                    f'"{answering_question}"\n\n'
                    "CRITICAL RULES — SIMPLE & SHORT LANGUAGE:\n"
                    "1. Answer in strictly 2 short sentences.\n"
                    "2. Use plain, simple English words that anyone can understand instantly.\n"
                    "3. Concede a tiny point only if it makes sense, otherwise defend your stance.\n"
                    "Respond strictly in JSON format:\n"
                    "{\n"
                    '  "main_argument": "Core point of your answer in 1 simple line",\n'
                    '  "evidence": "1 simple reason or everyday example",\n'
                    '  "counterargument": "1 simple sentence responding to the opponent",\n'
                    '  "concession": "Brief simple concession or null",\n'
                    '  "speech": "Your direct answer in strictly 2 short, simple sentences"\n'
                    "}"
                )
                user_prompt = f"Previous debate transcript:\n{transcript_str}\n\nQuestion you must answer: {answering_question}"
            max_tokens = 350
        else:
            # Standard Round
            system_prompt = (
                f"{identity}\n"
                f"You are participating in Round {round_number} of a debate on: \"{topic}\".\n"
                f"Your assigned stance is: {assigned_position}.\n"
                f"Your opponent is {opponent_profile.name} representing {opponent_position}.\n\n"
                "CRITICAL RULES — SIMPLE & SHORT LANGUAGE:\n"
                "1. Keep your speech strictly SHORT: 2 to 3 short sentences total (under 50 words).\n"
                "2. Use extremely SIMPLE, everyday words. Absolutely NO academic jargon, big words, or pretentious vocabulary.\n"
                "3. Get straight to the point. Directly challenge the opponent's previous point.\n"
                "4. You may make a 1-sentence concession if it makes sense (e.g., 'I agree that X, but Y is a bigger problem.').\n"
                "Respond strictly in JSON format:\n"
                "{\n"
                '  "main_argument": "1 short, simple line summarizing your main claim",\n'
                '  "evidence": "1 simple everyday example or plain reason",\n'
                '  "counterargument": "1 simple sentence directly answering opponent",\n'
                '  "concession": "1 simple sentence concession, or null if none",\n'
                '  "speech": "Your spoken argument in strictly 2 to 3 short, simple sentences (plain words only!)"\n'
                "}"
            )
            user_prompt = f"Previous debate transcript:\n{transcript_str}\n\nDeliver your Round {round_number} argument now in simple, short words."
            max_tokens = 400

        data = await groq_service.generate_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.75,
            max_tokens=max_tokens
        )
        return data
