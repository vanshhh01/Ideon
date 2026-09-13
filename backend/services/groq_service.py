import os
import json
import re
import logging
from typing import Dict, Any, Optional, List
from groq import AsyncGroq, APIConnectionError, RateLimitError, APIStatusError
from backend.config import settings

logger = logging.getLogger("ideon.groq_service")

# Ordered list of high-quality fallback models supported by Groq
RELIABLE_FALLBACK_MODELS = [
    "qwen/qwen3.8-27b",
    "groq/compound-mini",
    "groq/compound",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
]

class GroqService:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = (api_key or settings.GROQ_API_KEY).strip() if (api_key or settings.GROQ_API_KEY) else ""
        self._model = model or settings.GROQ_MODEL
        self._client: Optional[AsyncGroq] = None
        if self._api_key:
            self._client = AsyncGroq(api_key=self._api_key)

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key and len(self._api_key) > 5)

    @property
    def current_model(self) -> str:
        return self._model

    def update_credentials(self, api_key: Optional[str] = None, model: Optional[str] = None):
        if api_key is not None:
            self._api_key = api_key.strip()
            self._client = AsyncGroq(api_key=self._api_key) if self._api_key else None
        if model is not None and model.strip():
            self._model = model.strip()

    async def list_accessible_models(self) -> List[str]:
        """Fetch models list from Groq to verify which are accessible with the active key."""
        if not self._client:
            return RELIABLE_FALLBACK_MODELS
        try:
            models_response = await self._client.models.list()
            active_ids = [
                m.id for m in models_response.data
                if not any(ex in m.id.lower() for ex in ["whisper", "guard", "orpheus", "safeguard"])
            ]
            if active_ids:
                return active_ids
        except Exception as e:
            logger.warning(f"Could not retrieve live models list: {e}")
        return RELIABLE_FALLBACK_MODELS

    def clean_json_string(self, text: str) -> str:
        """Strip markdown code blocks and extract raw JSON."""
        text = text.strip()
        pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
        match = re.search(pattern, text)
        if match:
            text = match.group(1).strip()
        return text

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1500,
        model_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate structured JSON with automatic retries and model fallbacks on 404."""
        if not self._client:
            raise ValueError(
                "Groq API key is not configured. Please provide GROQ_API_KEY in backend/.env "
                "or via the IDEON settings modal."
            )

        models_to_try = [model_override or self._model]
        for m in RELIABLE_FALLBACK_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        last_error = None

        for target_model in models_to_try:
            for attempt in range(2):
                try:
                    response = await self._client.chat.completions.create(
                        model=target_model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        response_format={"type": "json_object"},
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )

                    raw_content = response.choices[0].message.content or "{}"
                    cleaned = self.clean_json_string(raw_content)
                    parsed = json.loads(cleaned)
                    
                    # If fallback succeeded, update current model to avoid future 404s
                    if target_model != self._model:
                        logger.info(f"Switched active model from '{self._model}' to working model '{target_model}'.")
                        self._model = target_model

                    return parsed

                except json.JSONDecodeError as jde:
                    logger.warning(f"Malformed JSON from {target_model} on attempt {attempt+1}: {jde}")
                    if attempt == 1:
                        first_brace = raw_content.find("{")
                        last_brace = raw_content.rfind("}")
                        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                            try:
                                return json.loads(raw_content[first_brace:last_brace+1])
                            except Exception:
                                pass

                except RateLimitError as rle:
                    logger.warning(f"Groq RateLimitError on {target_model}: {rle}. Trying next fallback model...")
                    last_error = rle
                    break

                except APIStatusError as ase:
                    err_str = f"{str(ase.message)} {str(getattr(ase, 'body', ''))}".lower()
                    is_model_unavailable = (
                        ase.status_code in (400, 404) and any(
                            kw in err_str for kw in [
                                "model_decommissioned",
                                "decommissioned",
                                "model_not_found",
                                "does not exist",
                                "do not have access",
                                "not supported",
                                "terms_required",
                                "model_terms_required",
                                "json_validate_failed"
                            ]
                        )
                    )
                    if is_model_unavailable:
                        logger.warning(f"Model '{target_model}' unavailable ({ase.status_code}): {ase.message}. Trying next fallback model...")
                        last_error = ase
                        break
                    logger.error(f"Groq APIStatusError ({ase.status_code}): {ase.message}")
                    raise RuntimeError(f"Groq API error ({ase.status_code}): {ase.message}") from ase

                except APIConnectionError as ace:
                    logger.error(f"Groq Connection Error: {ace}")
                    raise RuntimeError("Could not connect to Groq API. Please check your internet connection.") from ace

                except Exception as e:
                    logger.exception(f"Unexpected error in GroqService on {target_model}: {e}")
                    last_error = e
                    break

        if last_error:
            raise RuntimeError(f"Groq API error across all tried models: {last_error}")
        raise RuntimeError("Failed to obtain valid response from Groq API.")

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1200,
        model_override: Optional[str] = None
    ) -> str:
        """Generate standard text from Groq with fallback."""
        if not self._client:
            raise ValueError("Groq API key is not configured.")

        models_to_try = [model_override or self._model]
        for m in RELIABLE_FALLBACK_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        for target_model in models_to_try:
            try:
                response = await self._client.chat.completions.create(
                    model=target_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                if target_model != self._model:
                    self._model = target_model
                return response.choices[0].message.content or ""
            except APIStatusError as ase:
                err_str = f"{str(ase.message)} {str(getattr(ase, 'body', ''))}".lower()
                if ase.status_code in (400, 404) and any(
                    kw in err_str for kw in [
                        "model_decommissioned", "decommissioned", "model_not_found",
                        "does not exist", "do not have access", "not supported",
                        "terms_required", "model_terms_required"
                    ]
                ):
                    continue
                raise
            except RateLimitError as rle:
                logger.warning(f"Groq RateLimitError on {target_model} in generate_text: {rle}. Trying next model...")
                continue

        raise RuntimeError("Failed to generate text on all Groq models.")

# Singleton instance
groq_service = GroqService()
