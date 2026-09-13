import logging
from typing import List, Dict, Any
from backend.models.schemas import FactCheckClaim, VerdictType
from backend.services.groq_service import groq_service

logger = logging.getLogger("ideon.fact_checker")

class FactChecker:
    """Evaluates factual and argumentative assertions made during debate turns."""

    async def analyze_speech(self, speaker_name: str, speech: str, topic: str) -> List[FactCheckClaim]:
        """Extract 1-3 key claims and classify their factual standing."""
        system_prompt = (
            "You are an impartial, rigorous Fact-Checking Assistant for an intellectual debate arena.\n"
            "Your task is to analyze the speaker's statement, identify up to 2 key factual, empirical, or logical claims, "
            "and classify each claim into exactly ONE of the following categories:\n"
            "- SUPPORTED: Well-established consensus, empirical fact, or widely documented historical/scientific reality.\n"
            "- QUESTIONABLE: Misleading context, disputed statistics, cherry-picked data, or overgeneralized assertions.\n"
            "- FALSE: Demonstrably incorrect assertion of fact.\n"
            "- OPINION: Subjective value judgment, normative proposal, moral stance, or speculative forecast.\n"
            "- UNVERIFIABLE: An empirical claim whose factual validity cannot be reliably determined without live primary citation.\n\n"
            "CRITICAL RULES — SIMPLE & SHORT LANGUAGE:\n"
            "1. NEVER fabricate fake citations, research links, or false URLs.\n"
            "2. Distinguish clearly between value statements (OPINION) and factual assertions.\n"
            "3. If a claim is an unreferenced specific statistic or anecdote, label it UNVERIFIABLE or QUESTIONABLE.\n"
            "4. Keep 'explanation' strictly to 1 short, simple sentence in plain English (under 20 words).\n"
            "Respond strictly in JSON format:\n"
            "{\n"
            '  "claims": [\n'
            "    {\n"
            '      "claim": "Specific concise claim quoted or paraphrased (short)",\n'
            '      "verdict": "SUPPORTED" | "QUESTIONABLE" | "FALSE" | "OPINION" | "UNVERIFIABLE",\n'
            '      "explanation": "1 short, simple sentence in plain everyday English",\n'
            '      "confidence": float between 0.5 and 1.0\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        user_prompt = (
            f"Debate Topic: {topic}\n"
            f"Speaker: {speaker_name}\n"
            f"Statement:\n\"{speech}\"\n\n"
            "Extract and classify key claims strictly in JSON."
        )

        try:
            data = await groq_service.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,
                max_tokens=400
            )

            raw_claims = data.get("claims", [])
            valid_claims: List[FactCheckClaim] = []
            for item in raw_claims:
                verdict_str = str(item.get("verdict", "OPINION")).upper().strip()
                if verdict_str not in ("SUPPORTED", "QUESTIONABLE", "FALSE", "OPINION", "UNVERIFIABLE"):
                    verdict_str = "UNVERIFIABLE"
                
                try:
                    conf = float(item.get("confidence", 0.85))
                    conf = max(0.5, min(1.0, conf))
                except (ValueError, TypeError):
                    conf = 0.85

                valid_claims.append(FactCheckClaim(
                    claim=str(item.get("claim", ""))[:140],
                    verdict=verdict_str,  # type: ignore
                    explanation=str(item.get("explanation", "Evaluated by AI Fact Checker."))[:250],
                    confidence=round(conf, 2)
                ))

            return valid_claims[:2]

        except Exception as e:
            logger.warning(f"Fact checking skipped/failed: {e}")
            return []

fact_checker = FactChecker()
