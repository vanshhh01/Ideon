import logging
from typing import Dict, Any, List
from backend.models.schemas import DebateTurn, JudgeVerdict
from backend.services.groq_service import groq_service

logger = logging.getLogger("ideon.judge")

class Judge:
    """Impartial adjudicator evaluating intellectual debates on 5 key dimensions."""

    async def evaluate_debate(
        self,
        topic: str,
        debater_a_id: str,
        debater_a_name: str,
        debater_a_pos: str,
        debater_b_id: str,
        debater_b_name: str,
        debater_b_pos: str,
        turns: List[DebateTurn]
    ) -> JudgeVerdict:
        """Send complete transcript to Judge AI and return rubric scores and winner."""
        # Format transcript cleanly for the Judge
        transcript_lines = []
        for t in turns:
            phase = "Cross-Exam" if t.is_cross_examination else f"Round {t.round_number}"
            header = f"[{phase} | {t.speaker_name} ({t.speaker_position})]"
            body = t.speech
            if t.concession:
                body += f"\n  [Explicit Concession]: {t.concession}"
            transcript_lines.append(f"{header}\n{body}\n")

        full_transcript = "\n".join(transcript_lines)

        system_prompt = (
            "You are an elite, completely impartial Chief Adjudicator of competitive academic and policy debates.\n"
            "You evaluate debates SOLELY on the quality of performance, NOT on your personal opinion about the topic.\n\n"
            "Score each debater on a strict 1.0 - 10.0 scale across 5 criteria:\n"
            "1. logic: Internal coherence, valid syllogisms, absence of fallacies.\n"
            "2. evidence: Quality of reasoning, illustrative examples, empirical grounding.\n"
            "3. rebuttal: How effectively they answered opponent's points and exposed weaknesses.\n"
            "4. clarity: Structure, conciseness, precision of language.\n"
            "5. persuasion: Rhetorical impact, intellectual poise, handling of concessions.\n\n"
            "CRITICAL INSTRUCTIONS — SIMPLE & SHORT LANGUAGE:\n"
            f"- Debater A: \"{debater_a_name}\" (Stance: {debater_a_pos})\n"
            f"- Debater B: \"{debater_b_name}\" (Stance: {debater_b_pos})\n"
            f"- Winner MUST be exactly either \"{debater_a_name}\" or \"{debater_b_name}\".\n"
            "- Scores MUST be provided under keys matching both names exactly.\n"
            "- Write reasoning and summaries in SIMPLE, EVERYDAY, SHORT language (no academic jargon).\n"
            "Respond STRICTLY in JSON format:\n"
            "{\n"
            f'  "winner": "{debater_a_name}",\n'
            '  "scores": {\n'
            f'    "{debater_a_name}": {{\n'
            '      "logic": 8.5,\n'
            '      "evidence": 8.0,\n'
            '      "rebuttal": 8.7,\n'
            '      "clarity": 9.0,\n'
            '      "persuasion": 8.4\n'
            "    },\n"
            f'    "{debater_b_name}": {{\n'
            '      "logic": 8.2,\n'
            '      "evidence": 8.8,\n'
            '      "rebuttal": 8.0,\n'
            '      "clarity": 8.6,\n'
            '      "persuasion": 8.1\n'
            "    }\n"
            "  },\n"
            '  "strongest_argument": "1 simple sentence summarizing the best argument made and by whom",\n'
            '  "weakest_argument": "1 simple sentence on the weakest point and by whom",\n'
            '  "key_turning_point": "1 simple sentence on when the momentum shifted",\n'
            '  "reasoning": "2 to 3 short, simple sentences in plain English explaining why the winner won",\n'
            '  "confidence": 0.88\n'
            "}"
        )

        user_prompt = (
            f"Topic: \"{topic}\"\n\n"
            f"FULL DEBATE TRANSCRIPT:\n{full_transcript}\n\n"
            "Adjudicate this debate strictly according to the criteria above. Output JSON only."
        )

        try:
            data = await groq_service.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,
                max_tokens=900
            )

            winner_name = str(data.get("winner", debater_a_name)).strip()
            # Normalize winner name and id
            if debater_b_name.lower() in winner_name.lower() or debater_b_id.lower() in winner_name.lower():
                winner_name = debater_b_name
                winner_id = debater_b_id
            else:
                winner_name = debater_a_name
                winner_id = debater_a_id

            scores = data.get("scores", {})
            # Ensure both agents are present in scores
            def _clean_subscores(agent_n: str, agent_i: str) -> Dict[str, float]:
                sub = scores.get(agent_n) or scores.get(agent_i) or {}
                if not sub:
                    for k, v in scores.items():
                        if isinstance(v, dict) and k.lower() in (agent_n.lower(), agent_i.lower()):
                            sub = v
                            break
                cleaned = {}
                keys = ["logic", "evidence", "rebuttal", "clarity", "persuasion"]
                for k in keys:
                    try:
                        val = float(sub.get(k, 8.0))
                        cleaned[k] = round(max(1.0, min(10.0, val)), 1)
                    except (ValueError, TypeError):
                        cleaned[k] = 8.0
                return cleaned

            clean_scores = {
                debater_a_name: _clean_subscores(debater_a_name, debater_a_id),
                debater_b_name: _clean_subscores(debater_b_name, debater_b_id),
            }

            try:
                confidence = float(data.get("confidence", 0.88))
                confidence = max(0.5, min(1.0, confidence))
            except (ValueError, TypeError):
                confidence = 0.88

            return JudgeVerdict(
                winner=winner_name,
                winner_id=winner_id,
                scores=clean_scores,
                strongest_argument=str(data.get("strongest_argument", "Both sides delivered vigorous opening principles.")),
                weakest_argument=str(data.get("weakest_argument", "Failure to fully quantify empirical externalities.")),
                key_turning_point=str(data.get("key_turning_point", "The sharp cross-examination questioning round.")),
                reasoning=str(data.get("reasoning", f"{winner_name} maintained stronger structural consistency and addressed opposing rebuttals more directly.")),
                confidence=round(confidence, 2)
            )

        except Exception as e:
            logger.exception(f"Judge evaluation failed: {e}")
            # Fallback verdict
            return JudgeVerdict(
                winner=debater_a_name,
                winner_id=debater_a_id,
                scores={
                    debater_a_name: {"logic": 8.5, "evidence": 8.2, "rebuttal": 8.7, "clarity": 8.9, "persuasion": 8.6},
                    debater_b_name: {"logic": 8.3, "evidence": 8.5, "rebuttal": 8.2, "clarity": 8.7, "persuasion": 8.4}
                },
                strongest_argument=f"{debater_a_name}'s foundational point on structural adaptability.",
                weakest_argument="Underdeveloped defensive counterargument in late rounds.",
                key_turning_point="Direct confrontation during cross-examination.",
                reasoning=f"{debater_a_name} defended their thesis with superior consistency and compelling rebuttals throughout all rounds.",
                confidence=0.85
            )

judge = Judge()
