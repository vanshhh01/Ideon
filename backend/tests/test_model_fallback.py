import pytest
from backend.services.groq_service import GroqService, RELIABLE_FALLBACK_MODELS

def test_reliable_fallback_models_exist():
    assert "qwen/qwen3.8-27b" in RELIABLE_FALLBACK_MODELS
    assert "groq/compound-mini" in RELIABLE_FALLBACK_MODELS
    assert len(RELIABLE_FALLBACK_MODELS) >= 5

def test_groq_service_clean_json():
    service = GroqService()
    text = "```json\n{\"test\": true}\n```"
    cleaned = service.clean_json_string(text)
    assert cleaned == '{"test": true}'
